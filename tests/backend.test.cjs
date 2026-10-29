const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {harness}=require('./backend-harness.cjs');
test('Bootstrap retira claves de inicialización y preserva hojas ajenas',()=>{const h=harness();assert.equal(h.props.has('BOOTSTRAP_TEACHERS'),false);const teachers=JSON.parse(h.props.get('TEACHERS_JSON'));assert.equal(teachers.length,2);assert.ok(teachers.every(t=>t.keyHash.length===64&&!t.key));assert.deepEqual([...h.sheets.keys()].sort(),['TS_Auditoria','TS_Intentos','TS_Participantes','TS_Respuestas','TS_Sesiones'].sort());});
test('Controles docentes, origen y credenciales se validan en el servidor',()=>{const h=harness();assert.throws(()=>h.call('createSession',{token:'bogus',title:'x'}),/docente/);assert.throws(()=>h.call('login',{id:'docente1',key:'wrong'}),/autorizado/);const result=h.ctx.dispatch({origin:'https://other.example',nonce:h.nonce,action:'listSessions',payload:{token:h.token}});assert.equal(result.ok,false);assert.equal(h.ctx.allowedOrigin_('https://example.github.io.evil.example'),false);});
test('El acceso docente caduca, se revoca y se elimina al cerrar sesión',()=>{
  const h=harness();const entry=[...h.cache.entries()].find(([k,v])=>k.startsWith('auth:')&&JSON.parse(v).id==='docente1'),login=JSON.parse(entry[1]);h.cache.set(entry[0],JSON.stringify({...login,expires:Date.now()-1}));assert.throws(()=>h.call('listSessions',{token:h.token}),/caducó/);
  const next=h.call('login',{id:'docente1',key:'demo-test-secret-1'}).token;h.props.set('AUTH_VERSION','revoked');assert.throws(()=>h.call('listSessions',{token:next}),/caducó/);
  const fresh=h.call('login',{id:'docente1',key:'demo-test-secret-1'}).token;h.call('logout',{token:fresh});assert.throws(()=>h.call('listSessions',{token:fresh}),/caducó/);
});
test('Sesiones independientes, varios docentes y conflicto de edición',()=>{const h=harness(),s=h.create(),other=h.create();const c={...s.config,unlock:2,collectionOpen:true};const updated=h.call('updateSession',{token:h.secondToken,sessionId:s.id,version:s.version,config:c});assert.equal(updated.version,2);assert.throws(()=>h.call('updateSession',{token:h.token,sessionId:s.id,version:1,config:c}),/Otro docente/);assert.equal(h.call('lookup',{code:other.code}).config.unlock,1);});
test('Registro idempotente, identidad privada y token de participante',()=>{const h=harness(),s=h.create(),r=h.register(s);const again=h.call('register',r.request);assert.equal(again.participant.id,r.participant.id);assert.equal(h.ctx.rows_('participants').length,1);assert.ok(!('tokenHash'in again.participant));assert.throws(()=>h.call('studentSnapshot',{...r.args,participantToken:'wrong'}),/inválido/);});
test('Cronómetro requiere etapa, colección abierta y cupo',()=>{
  const h=harness(),s=h.create(),r=h.register(s),aid=crypto.randomUUID();
  assert.throws(()=>h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'}),/cerrada/);
  h.call('updateSession',{token:h.token,sessionId:s.id,version:1,config:{...s.config,unlock:2,collectionOpen:true}});
  h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});assert.throws(()=>h.call('startAttempt',{...r.args,attemptId:crypto.randomUUID(),mode:'pair'}),/en curso/);
  h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:29400});assert.throws(()=>h.call('startAttempt',{...r.args,attemptId:crypto.randomUUID(),mode:'pair'}),/permitidos/);
});
test('Reintentos de envío no duplican, y nunca devuelven tiempos ocultos',()=>{
  const h=harness(),s=h.create({unlock:2,collectionOpen:true}),r=h.register(s),aid=crypto.randomUUID();
  h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:32123});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:32123});
  assert.equal(h.ctx.rows_('attempts').length,1);
  const snapshot=h.call('studentSnapshot',r.args);assert.ok(!('seconds'in snapshot.own[0]));assert.deepEqual(snapshot.analysis,[]);
  const replay=h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});assert.ok(!('elapsedMs'in replay.attempt));assert.ok(!('secondsRounded'in replay.attempt));
  const teacher=h.call('teacherSnapshot',{token:h.token,sessionId:s.id});assert.equal(teacher.attempts[0].elapsedMs,32123);assert.ok(!('tokenHash'in teacher.participants[0]));
});
test('Tabla, gráfico, medidas y datos brutos se autorizan por separado',()=>{
  const h=harness(),s=h.create({unlock:3,collectionOpen:true,showTable:true}),r=h.register(s),aid=crypto.randomUUID();
  h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:31200});
  let data=h.call('studentSnapshot',r.args);assert.equal(data.analysis[0].table[0].value,31);assert.ok(!data.analysis[0].stats&&!data.analysis[0].raw);
  h.call('updateSession',{token:h.token,sessionId:s.id,version:1,config:{...s.config,showTable:false,showStats:true}});
  data=h.call('studentSnapshot',r.args);assert.ok(data.analysis[0].stats);assert.ok(!data.analysis[0].stats.values&&!data.analysis[0].stats.table&&!data.analysis[0].raw&&!data.analysis[0].table);
});
test('Scope de grupo no envía datos de otro grupo ni nombres colectivos',()=>{
  const h=harness(),s=h.create({unlock:3,collectionOpen:true,studentScope:'group',showRaw:true}),a=h.register(s),b=h.register(s,{name:'Nombre privado',group:'Grupo B'});
  [a,b].forEach((r,i)=>{const aid=crypto.randomUUID();h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:(28+i)*1000});});
  const data=h.call('studentSnapshot',a.args);assert.equal(data.analysis[0].n,1);assert.ok(!JSON.stringify(data).includes('Nombre privado'));assert.equal(data.analysis[0].raw[0].seconds,28);
});
test('Un intento conserva protocolo al cambiar configuración o cerrar recolección',()=>{
  const h=harness(),s=h.create({unlock:2,collectionOpen:true,background:'colors'}),r=h.register(s),aid=crypto.randomUUID();
  const a=h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair',reduceMotion:true}).attempt;assert.equal(a.background,'quiet');
  h.call('updateSession',{token:h.token,sessionId:s.id,version:1,config:{...s.config,collectionOpen:false,target:40}});
  h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:30555,changes:0});const saved=h.ctx.rows_('attempts')[0];assert.equal(saved.target,30);assert.equal(saved.configVersion,1);assert.equal(saved.secondsRounded,31);assert.equal(saved.backgroundRequested,'colors');
});
test('Interrupciones y revisión docente conservan el tiempo y actualizan conteos',()=>{
  const h=harness(),s=h.create({unlock:2,collectionOpen:true}),r=h.register(s),aid=crypto.randomUUID();h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});
  h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:18000,interrupted:true,reason:'Se ocultó la pestaña'});assert.equal(h.ctx.rows_('attempts')[0].status,'invalid');
  const next=crypto.randomUUID();h.call('startAttempt',{...r.args,attemptId:next,mode:'self'});h.call('finishAttempt',{...r.args,attemptId:next,elapsedMs:28000});
  h.call('reviewAttempt',{token:h.secondToken,sessionId:s.id,attemptId:aid,status:'valid',reason:'Revisión documentada'});assert.equal(h.ctx.rows_('attempts')[0].elapsedMs,18000);assert.equal(h.ctx.rows_('audit').at(-1).teacher,'docente2');
});
test('Tarea agrega personas a la misma sesión sin nombres ni campos identificadores',()=>{
  const h=harness(),s=h.create({unlock:2,collectionOpen:true,allowHome:true,extraFields:[{id:'edad',label:'Edad',type:'number',required:true}]}),r=h.register(s,{source:'home',extra:{edad:'45'},voluntary:true,firstParticipation:true});assert.equal(r.participant.source,'home');assert.equal(Object.keys(r.participant.extra).length,0);assert.equal(r.participant.name,'');
  const no=h.create({unlock:2,collectionOpen:true});assert.throws(()=>h.register(no,{source:'home'}),/tarea/);
});
test('Tarea exige voluntariedad, persona nueva y un intento independiente del cupo del aula',()=>{
  const h=harness(),s=h.create({unlock:2,collectionOpen:true,allowHome:true,attempts:3,homeAttempts:1});
  assert.throws(()=>h.register(s,{source:'home'}),/voluntaria/);
  assert.throws(()=>h.register(s,{source:'home',voluntary:true}),/sola vez/);
  const r=h.register(s,{source:'home',voluntary:true,firstParticipation:true});const aid=crypto.randomUUID();
  h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:30200});
  assert.throws(()=>h.call('startAttempt',{...r.args,attemptId:crypto.randomUUID(),mode:'pair'}),/permitidos/);
  assert.equal(h.call('teacherSnapshot',{token:h.token,sessionId:s.id}).participants[0].name,'');
});
test('Porcentajes propuestos y evaluación se conservan; se rechazan valoraciones fuera de escala',()=>{
  const h=harness(),s=h.create({unlock:4,collectionOpen:true}),r=h.register(s);
  h.call('saveAnswers',{...r.args,phase:3,values:{frequency:[{value:'30',count:'2',percentage:'25'}],manual:{mean:'30'}}});
  h.call('saveAnswers',{...r.args,phase:4,values:{conclusion:'Hay variabilidad.',evaluation:{clarity:'4',learning:'5',usability:'3',suggestion:'Más tiempo para discutir.'}}});
  const data=h.call('teacherSnapshot',{token:h.token,sessionId:s.id});assert.equal(data.answers.find(a=>a.phase===3).values.frequency[0].percentage,'25');assert.equal(data.answers.find(a=>a.phase===4).values.evaluation.learning,'5');
  assert.throws(()=>h.call('saveAnswers',{...r.args,phase:4,values:{evaluation:{clarity:'9'}}}),/1 a 5/);
});
test('Respuestas son privadas, actualizables e incluyen versión de preguntas',()=>{
  const h=harness(),s=h.create({unlock:3,collectionOpen:true}),r=h.register(s),other=h.register(s,{name:'Otra persona'});
  h.call('saveAnswers',{...r.args,phase:3,values:{center:'Una media puede ocultar diferencias.',manual:{mean:'30'},frequency:[{value:'30',count:'1'}],injected:'no'}});
  h.call('saveAnswers',{...r.args,phase:3,values:{center:'Respuesta revisada.'}});assert.equal(h.ctx.rows_('answers').length,1);assert.ok(h.ctx.rows_('answers')[0].questions.length);assert.equal(h.call('studentSnapshot',other.args).answers.length,0);assert.throws(()=>h.call('saveAnswers',{...r.args,phase:4,values:{}}),/habilitado/);
});
test('Google verifica firma RSA, audiencia, caducidad, correo y nonce',()=>{
  const h=harness();h.props.set('GOOGLE_CLIENT_ID','client-test');const keys=crypto.generateKeyPairSync('rsa',{modulusLength:2048}),jwk=keys.publicKey.export({format:'jwk'});h.ctx.googleJWKS={keys:[{...jwk,alg:'RS256',kid:'test-key'}]};
  const claims={aud:'client-test',iss:'https://accounts.google.com',sub:'stable-id',exp:Date.now()/1000+300,email_verified:true,email:'one@example.com',hd:'example.com',nonce:h.nonce};
  function sign(p){const a=Buffer.from(JSON.stringify({alg:'RS256',kid:'test-key'})).toString('base64url'),b=Buffer.from(JSON.stringify(p)).toString('base64url'),sig=crypto.sign('RSA-SHA256',Buffer.from(a+'.'+b),keys.privateKey).toString('base64url');return a+'.'+b+'.'+sig;}
  assert.equal(h.call('login',{method:'google',credential:sign(claims)}).teacher.id,'docente1');assert.throws(()=>h.call('login',{method:'google',credential:sign({...claims,nonce:'wrong'})}),/válida/);
  assert.throws(()=>h.call('login',{method:'google',credential:sign({...claims,email:'unlisted@example.com'})}),/autorizado/);
  assert.throws(()=>h.call('login',{method:'google',credential:sign({...claims,aud:'other-client'})}),/válida/);
  assert.throws(()=>h.call('login',{method:'google',credential:sign({...claims,exp:Date.now()/1000-5})}),/válida/);
  const good=sign(claims),parts=good.split('.');parts[1]=Buffer.from(JSON.stringify({...claims,email:'two@example.com'})).toString('base64url');assert.throws(()=>h.call('login',{method:'google',credential:parts.join('.')}),/Firma/);
});
test('Simulación de veinte dispositivos: cuarenta mediciones sin duplicados',()=>{
  const h=harness(),s=h.create({unlock:2,collectionOpen:true,attempts:2}),people=Array.from({length:20},(_,i)=>h.register(s,{name:'Persona '+i,group:i%2?'Grupo A':'Grupo B'}));
  for(let trial=1;trial<=2;trial++)for(const [i,r]of people.entries()){const aid=crypto.randomUUID();h.call('startAttempt',{...r.args,attemptId:aid,mode:'self'});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:(20+i)*1000});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:(20+i)*1000});}
  const snap=h.call('teacherSnapshot',{token:h.token,sessionId:s.id});assert.equal(snap.participants.length,20);assert.equal(snap.attempts.length,40);assert.equal(new Set(snap.attempts.map(x=>x.id)).size,40);
});
test('La tarea permite dos intentos y solo recibe sus propios resultados',()=>{
  const h=harness(),s=h.create({unlock:4,collectionOpen:true,allowHome:true,showRaw:true,showTable:true,showStats:true,showTaskResults:true}),r=h.register(s,{source:'home',voluntary:true,firstParticipation:true});
  for(let i=0;i<2;i++){const aid=crypto.randomUUID();h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:30000+i*1000});}
  assert.throws(()=>h.call('startAttempt',{...r.args,attemptId:crypto.randomUUID(),mode:'pair'}),/permitidos/);const home=h.call('studentSnapshot',r.args);assert.equal(home.own.length,2);assert.deepEqual(home.analysis,[]);assert.deepEqual(home.homeAnalysis,[]);assert.deepEqual(home.answers,[]);
  const student=h.register(s,{name:'Estudiante'}),snapshot=h.call('studentSnapshot',student.args);assert.deepEqual(snapshot.homeAnalysis,[]);const teacher=h.call('teacherSnapshot',{token:h.token,sessionId:s.id});assert.equal(teacher.attempts.filter(a=>a.source==='home').length,2);
});
test('El docente controla qué intento se entrega a los estudiantes y sus filas cero',()=>{
  const h=harness(),s=h.create({unlock:3,collectionOpen:true,attempts:2,showTable:true,studentTrials:['1']}),r=h.register(s);
  for(let i=0;i<2;i++){const aid=crypto.randomUUID();h.call('startAttempt',{...r.args,attemptId:aid,mode:'pair'});h.call('finishAttempt',{...r.args,attemptId:aid,elapsedMs:30000+i*30000});}
  const snapshot=h.call('studentSnapshot',r.args);assert.deepEqual(snapshot.analysis.map(v=>v.trial),['1']);assert.deepEqual(snapshot.analysis[0].table.map(v=>v.value),[30]);
});
test('Se conserva una tabla de trabajo distinta para cada intento',()=>{
  const h=harness(),s=h.create({unlock:3,collectionOpen:true}),r=h.register(s);
  h.call('saveAnswers',{...r.args,phase:3,values:{analysisTrial:'2',manual:{mean:'30,75'},frequency:[{value:'30',count:'2',denominator:'12',percentage:'16,67'}],worksheets:{'1':{manual:{mean:'31,5'},frequency:[{value:'22',count:'1',denominator:'12',percentage:'8,33'}]}}}});
  const values=h.call('teacherSnapshot',{token:h.token,sessionId:s.id}).answers[0].values;assert.equal(values.worksheets['1'].frequency[0].value,'22');assert.equal(values.worksheets['2'].frequency[0].value,'30');assert.equal(values.worksheets['2'].frequency[0].denominator,'12');
});
test('Consulta rápida de configuración: veinte dispositivos no releen las tablas y reciben el cambio de sección',()=>{
  const h=harness(),s=h.create();let reads=[];const original=h.ctx.rows_;h.ctx.rows_=key=>{reads.push(key);return original(key);};
  for(let i=0;i<20;i++)assert.deepEqual(h.call('sessionStatus',{sessionId:s.id,version:s.version}),{version:s.version,changed:false});assert.deepEqual(reads,[]);
  const updated=h.call('updateSession',{token:h.token,sessionId:s.id,version:s.version,config:{...s.config,unlock:3,agreedProtocol:'Protocolo del grupo'}});reads=[];
  const state=h.call('sessionStatus',{sessionId:s.id,version:s.version});assert.equal(state.session.config.unlock,3);assert.equal(state.session.config.agreedProtocol,'Protocolo del grupo');assert.equal(state.session.version,updated.version);assert.deepEqual(reads,[]);assert.ok(!('participants' in state));assert.ok(!('attempts' in state));
  h.cache.delete('session-state:'+s.id);reads=[];h.call('sessionStatus',{sessionId:s.id,version:0});assert.deepEqual(reads,['sessions']);reads=[];h.call('sessionStatus',{sessionId:s.id,version:0});assert.deepEqual(reads,[]);
});
test('Cada intento conserva el protocolo acordado aunque luego cambie',()=>{
  const h=harness(),s=h.create({unlock:2,collectionOpen:true,agreedProtocol:'Nosotros iniciamos y detenemos sin contar.'}),p=h.register(s);h.call('startAttempt',{...p.args,attemptId:crypto.randomUUID(),mode:'self',background:'quiet'});
  h.call('updateSession',{token:h.token,sessionId:s.id,version:s.version,config:{...s.config,agreedProtocol:'Nuevo protocolo'}});
  const snap=h.call('teacherSnapshot',{token:h.token,sessionId:s.id});assert.equal(snap.attempts[0].snapshot.agreedProtocol,'Nosotros iniciamos y detenemos sin contar.');assert.equal(snap.session.config.agreedProtocol,'Nuevo protocolo');
});
