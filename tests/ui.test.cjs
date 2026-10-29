/* DOM-free rendering and transport tests. These do not replace a real-browser pilot. */
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function assertMarkup(html){const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),m=>m[1]);assert.equal(ids.length,new Set(ids).size,'IDs repetidos en la vista');for(const match of html.matchAll(/<label[^>]*\bfor="([^"]+)"/g))assert.ok(ids.includes(match[1]),'Etiqueta sin campo: '+match[1]);}
function ui(){
  const elements=new Map(),storage=new Map(),events={};
  const el=id=>{if(!elements.has(id))elements.set(id,{id,innerHTML:'',textContent:'',hidden:false,style:{},classList:{add(){},remove(){}},addEventListener(){},focus(){},append(){}});return elements.get(id);};
  const ctx=vm.createContext({console,Date,Map,Set,JSON,Math,Number,String,Array,Object,Error,Boolean,URL,URLSearchParams,Uint32Array,crypto:crypto.webcrypto,
    setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,Blob,location:{href:'https://example.github.io/30-segundos/',origin:'https://example.github.io',search:'',hash:'',pathname:'/30-segundos/'},
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},sessionStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{getElementById:el,activeElement:null,hidden:false,addEventListener:(event,fn)=>events[event]=fn,createElement:()=>el('new'),body:{append(){}},querySelectorAll:()=>[],querySelector:()=>null},
    navigator:{},performance:{now:()=>1000},matchMedia:()=>({matches:false}),history:{replaceState(){}},HTMLFormElement:class{},confirm:()=>true
  });ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};ctx.THIRTY_CONFIG={demoEnabled:true,appsScriptUrl:''};
  for(const file of ['core.js','charts.js','vendor/qrcode.js','vendor/qrcode_UTF8.js','api.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets',file),'utf8'),ctx);
  const app=fs.readFileSync(path.join(__dirname,'../assets/app.js'),'utf8').replace('  initialize();','  globalThis.__ui = {S, api, render, startClock, settingsValues, formValues, exportData, trialButtons, teacherTable, renderProjection, qrPanel, watchSession, snapshot, saveConfig};');vm.runInContext(app,ctx);
  return {ctx,el,storage,events,u:ctx.__ui};
}
test('Todos los recorridos generan contenido y escapan nombres',()=>{
  const h=ui(),{S,api,render}=h.u;api.demo();const db=JSON.parse(h.storage.get('thirty-demo-projection-v3'));const s=db.sessions[0];
  S.session=s;S.pendingSession=s;S.sessions=[s];S.teacher={id:'demo',name:'Docente <script>'};S.teacherToken='demo-teacher';
  const p=api.demoCall('register',{sessionId:s.id,registrationId:crypto.randomUUID(),participantToken:'test-token',profile:{name:'<script>alert(1)</script>',group:'Grupo A',gender:'Mujer'}}).participant;
  S.participant=p;S.participantToken='test-token';
  for(const route of ['home','register','teacherLogin','teacherSessions']){S.route=route;render();assert.ok(h.el('main').innerHTML.includes('<h1'),route+' debe tener título');assertMarkup(h.el('main').innerHTML);}
  S.route='student';S.snapshot=api.demoCall('studentSnapshot',{sessionId:s.id,participantId:p.id,participantToken:'test-token'});
  for(let phase=1;phase<=4;phase++){S.phase=phase;render();const html=h.el('main').innerHTML;assert.ok(html.includes('MOMENTO '+phase));assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(html.includes('&lt;script&gt;'));assertMarkup(html);}
  S.route='teacher';S.snapshot=api.demoCall('teacherSnapshot',{sessionId:s.id,token:'demo-teacher'});
  for(const tab of ['overview','settings','results','responses']){S.teacherTab=tab;render();assert.ok(h.el('main').innerHTML.includes('PORTAL DOCENTE'));assert.ok(!h.el('main').innerHTML.includes('Docente <script>'));assertMarkup(h.el('main').innerHTML);}
});
test('Momento bloqueado y representaciones ocultas no se renderizan',()=>{
  const h=ui(),{S,api,render}=h.u;api.demo();const s=api.demoCall('lookup',{code:'DEMO30'});s.config.unlock=1;
  const p=api.demoCall('register',{sessionId:s.id,registrationId:'r',participantToken:'t',profile:{name:'Nombre',group:'Grupo A'}}).participant;
  S.route='student';S.session=s;S.participant=p;S.snapshot={own:[],answers:[],analysis:[]};S.phase=3;render();assert.ok(h.el('main').innerHTML.includes('Este momento está pendiente'));assert.ok(!h.el('main').innerHTML.includes('frequency-body'));
  S.phase=1;render();assert.ok(h.el('main').innerHTML.includes('phase-form'));
});
test('Puente RPC rechaza respuestas de origen y canal incorrectos',async()=>{
  const h=ui(),a=h.u.api;a.mode='live';const sent=[];a.bridgeOrigin='https://script.googleusercontent.com';a.bridgeWindow={postMessage:x=>sent.push(x)};
  const request=a.call('lookup',{code:'ROOM'}),message=sent[0];
  a.receive({origin:'https://evil.example',source:a.bridgeWindow,data:{channel:'thirty-seconds',nonce:a.nonce,type:'response',id:message.id,result:{ok:true,data:'bad'}}});assert.equal(a.pending.size,1);
  a.receive({origin:a.bridgeOrigin,source:a.bridgeWindow,data:{channel:'thirty-seconds',nonce:'wrong',type:'response',id:message.id,result:{ok:true,data:'bad'}}});assert.equal(a.pending.size,1);
  a.receive({origin:a.bridgeOrigin,source:a.bridgeWindow,data:{channel:'thirty-seconds',nonce:a.nonce,type:'response',id:message.id,result:{ok:true,data:{title:'OK'}}}});assert.equal((await request).title,'OK');assert.equal(a.pending.size,0);
});
test('Demostración tiene datos propios y no sustituye errores de conexión real',async()=>{
  const h=ui(),a=h.u.api;assert.equal(a.mode,'unconfigured');await assert.rejects(a.call('lookup',{code:'DEMO30'}),/conectado/);a.demo();assert.equal((await a.call('lookup',{code:'DEMO30'})).id,'demo-session');a.mode='live';await assert.rejects(a.call('lookup',{code:'DEMO30'}),/conectado/);assert.equal(a.mode,'live');
});
test('Día 2 muestra porcentajes, cierre y evaluación; la tarea registra sin nombre',()=>{
  const h=ui(),{S,api,render}=h.u;api.demo();const s=api.demoCall('lookup',{code:'DEMO30'});S.pendingSession=s;S.registrationSource='home';S.route='register';render();
  let html=h.el('main').innerHTML;assert.ok(!html.includes('id="participant-name"'));assert.ok(html.includes('home-voluntary'));assert.ok(html.includes('home-first'));assertMarkup(html);
  const p=api.demoCall('register',{sessionId:s.id,registrationId:crypto.randomUUID(),participantToken:'t',profile:{name:'No guardar',source:'home',group:'Grupo A',voluntary:true,firstParticipation:true}}).participant;
  assert.equal(p.name,'');S.participant=p;S.participantToken='t';S.session=s;S.route='student';S.snapshot=api.demoCall('studentSnapshot',{sessionId:s.id,participantId:p.id,participantToken:'t'});S.participant={...p,source:'class'};S.phase=3;render();html=h.el('main').innerHTML;assert.ok(html.includes('Frecuencia porcentual (%)'));assert.ok(html.includes('data-freq="percentage"'));assertMarkup(html);
  S.participant={...p,source:'class'};S.phase=4;render();html=h.el('main').innerHTML;assert.ok(html.includes('evaluación de la actividad')||html.includes('Evaluación de la actividad'));assert.ok(html.includes('Tarea: ampliar la investigación'));assertMarkup(html);
});
test('El análisis coloca la construcción antes de las preguntas y usa media automática',()=>{
  const h=ui(),{S,api,render}=h.u;api.demo();const session=api.demoCall('lookup',{code:'DEMO30'}),p=api.demoCall('register',{sessionId:session.id,registrationId:'classroom-render',participantToken:'t',profile:{name:'Prueba',group:'Grupo A'}}).participant;
  Object.assign(S,{route:'student',session,participant:p,participantToken:'t',phase:3,snapshot:api.demoCall('studentSnapshot',{sessionId:session.id,participantId:p.id,participantToken:'t'})});render();const html=h.el('main').innerHTML;
  assert.ok(html.indexOf('Construye tu tabla y tus medidas')<html.indexOf('Tu análisis'));const form=html.slice(html.indexOf('id="phase-form"'));assert.ok(!form.includes('(opcional)'));assert.match(form,/<input id="manual-mean"[^>]*readonly/);assert.ok(form.includes('id="frequency-total"'));assert.ok(form.includes('id="percentage-total"'));assert.ok(form.includes('data-freq="denominator"'));assertMarkup(html);
});
test('Proyección guía las cuatro secciones, selecciona intentos y no muestra nombres',()=>{
  const h=ui(),{S,api,render}=h.u;api.demo();const session=api.demoCall('lookup',{code:'DEMO30'});Object.assign(S,{route:'teacher',teacherTab:'projection',session,teacher:{name:'Nombre privado del docente'},snapshot:api.demoCall('teacherSnapshot',{sessionId:session.id,token:'demo-teacher'})});
  for(let phase=1;phase<=4;phase++){S.projectionPhase=phase;for(const view of ['raw','table','chart','stats']){S.projectionView=view;render();const html=h.el('main').innerHTML;assert.ok(html.includes('projection-stage'));assert.ok(html.includes('Habilitar '+['Preguntar','Recolectar','Analizar','Interpretar'][phase-1]));assert.ok(!html.includes('Nombre privado del docente'));if(phase===3){assert.ok(html.includes('data-action="projection-trial"'));assert.ok(html.includes('Mostrar esta selección a estudiantes'));}assertMarkup(html);}}
});
test('La tarea se limita al experimento incluso si el momento solicitado es interpretar',()=>{
  const h=ui(),{S,api,render}=h.u;api.demo();const session=api.demoCall('lookup',{code:'DEMO30'}),p=api.demoCall('register',{sessionId:session.id,registrationId:'home-view',participantToken:'t',profile:{source:'home',group:'Grupo A',voluntary:true,firstParticipation:true}}).participant;
  Object.assign(S,{route:'student',session,participant:p,participantToken:'t',phase:4,snapshot:api.demoCall('studentSnapshot',{sessionId:session.id,participantId:p.id,participantToken:'t'})});render();const html=h.el('main').innerHTML;assert.ok(html.includes('experiment-only'));assert.ok(html.includes('0 / 2 intentos'));assert.ok(!html.includes('Momentos de la investigación'));assert.ok(!html.includes('Tu análisis'));assert.ok(!html.includes('phase-form'));assertMarkup(html);
});
test('Las gráficas SVG incluyen ejes, marcas y la frecuencia cero',()=>{
  const h=ui(),html=h.ctx.ThirtyCharts.barSVG([{value:29,count:2},{value:30,count:0},{value:31,count:3}],{step:1});assert.ok(html.includes('chart-axis'));assert.ok(html.includes('chart-zero'));assert.ok(html.includes('Tiempo registrado (segundos)'));assert.ok(html.includes('Frecuencia absoluta'));assert.ok(html.includes('30 segundos: 0'));assert.ok(html.includes('>0</text>'));
});
function participantView(){const h=ui(),{S,api}=h.u;api.demo();const session=api.demoCall('lookup',{code:'DEMO30'}),r=api.demoCall('register',{sessionId:session.id,registrationId:crypto.randomUUID(),participantToken:'t',profile:{name:'Prueba',group:'Grupo A'}}).participant;Object.assign(S,{route:'student',session,participant:r,participantToken:'t',phase:3,snapshot:api.demoCall('studentSnapshot',{sessionId:session.id,participantId:r.id,participantToken:'t'})});return h;}
test('Resultados utiliza los mismos controles y cálculos que proyección, según permisos',()=>{
 const h=participantView(),{S,render}=h.u;Object.assign(S.session.config,{showTable:true,showChart:true,showStats:true,sharedAnalysisView:'table',sharedAnalysisTrial:'2'});S.snapshot=h.u.api.demoCall('studentSnapshot',{sessionId:S.session.id,participantId:S.participant.id,participantToken:'t'});S.session.config.showTable=true;S.session.config.showChart=true;S.session.config.showStats=true;S.snapshot.analysis=h.ctx.ThirtyCore.analysisViews(h.u.api.demoCall('teacherSnapshot',{sessionId:S.session.id,token:'demo-teacher'}).attempts,S.session.config);render();const html=h.el('main').innerHTML;assert.ok(html.includes('Resultados de la sesión'));assert.ok(html.includes('Representación del análisis'));assert.ok(html.includes('data-action="analysis-view"'));assert.match(html,/data-action="analysis-trial" data-value="2" aria-pressed="true"/);assert.ok(html.includes('Cálculo del porcentaje'));assert.ok(html.includes('(4 ÷ 12) × 100'));assertMarkup(html);
});
test('El porcentaje y su denominador son automáticos, con fórmula visible',()=>{
 const h=participantView(),{S,render}=h.u;h.storage.set('thirty:demo-projection-v3:draft:'+S.participant.id+':3',JSON.stringify({analysisTrial:'1',frequency:[{value:'30',count:'3',denominator:'99',percentage:'99'}]}));render();const html=h.el('main').innerHTML;assert.match(html,/data-freq="denominator"[^>]*value="12"[^>]*readonly/);assert.match(html,/data-freq="percentage"[^>]*value="25"[^>]*readonly/);assert.ok(html.includes('× 100 ='));assert.ok(html.includes('id="percentage-total">25'));assertMarkup(html);
});
test('El protocolo editable aparece en proyección y se comparte con el experimento sin HTML activo',()=>{
 const h=participantView(),{S,api,render}=h.u;S.phase=2;S.session.config.agreedProtocol='Acuerdo <script>alert(1)</script>';render();assert.ok(h.el('main').innerHTML.includes('Acuerdo &lt;script&gt;'));assert.ok(!h.el('main').innerHTML.includes('<script>alert'));
 Object.assign(S,{route:'teacher',teacherTab:'projection',projectionPhase:2,teacher:{name:'Docente'},snapshot:api.demoCall('teacherSnapshot',{sessionId:S.session.id,token:'demo-teacher'})});render();const html=h.el('main').innerHTML;assert.ok(html.includes('id="agreed-protocol"'));assert.ok(html.includes('Usar instrucciones de Autónomo'));assert.ok(!html.includes('Un protocolo común'));assertMarkup(html);
});
test('La consulta rápida solo pide una instantánea cuando cambian las preferencias y actualiza mientras se escribe',async()=>{
 const h=participantView(),{S,api,watchSession}=h.u;let calls=[];const original=api.call.bind(api);api.call=async(action,payload)=>{calls.push(action);return original(action,payload);};await watchSession();assert.deepEqual(calls,['sessionStatus']);
 const updated=api.demoCall('updateSession',{sessionId:S.session.id,token:'demo-teacher',version:S.session.version,config:{...S.session.config,unlock:2}});h.ctx.document.activeElement={matches:()=>true};calls=[];await watchSession();assert.deepEqual(calls,['sessionStatus','studentSnapshot']);assert.equal(S.session.version,updated.version);assert.ok(h.el('main').innerHTML.includes('Este momento está pendiente'));
});
test('Una respuesta de red antigua no revierte una habilitación más reciente',async()=>{
 const h=participantView(),{S,api,snapshot}=h.u;const old=JSON.parse(JSON.stringify(S.snapshot));let finish;api.call=()=>new Promise(resolve=>finish=resolve);const request=snapshot(false);S.session={...S.session,version:S.session.version+1};const retained=S.snapshot;finish(old);assert.equal(await request,false);assert.equal(S.snapshot,retained);assert.equal(S.session.version,old.session.version+1);
});
test('Compartir otro intento carga su tabla de trabajo y no mezcla el borrador anterior',()=>{
 const h=participantView(),{S,render}=h.u;h.storage.set('thirty:demo-projection-v3:draft:'+S.participant.id+':3',JSON.stringify({worksheets:{'1':{frequency:[{value:'22',count:'1'}]},'2':{frequency:[{value:'24',count:'1'}]}}}));render();assert.match(h.el('main').innerHTML,/data-freq="value"[^>]*value="22"/);S.session.config.sharedAnalysisTrial='2';render();assert.equal(S.analysisTrial,'2');assert.match(h.el('main').innerHTML,/data-freq="value"[^>]*value="24"/);assert.ok(!h.el('main').innerHTML.includes('data-freq="value" aria-label="Tiempo en segundos" value="22"'));
});
