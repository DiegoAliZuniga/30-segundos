const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../assets/core.js');
const records=values=>values.map((x,i)=>({status:'valid',elapsedMs:x*1000,participantId:'p'+i,trial:1,group:'Grupo A'}));
test('Estadísticas: n, media, moda, extremos, recorrido y porcentaje inclusivo',()=>{
  const c=C.defaults(),s=C.summarize(records([27,31,29,34,30,28,31]),c);
  assert.equal(s.n,7);assert.equal(s.unique,7);assert.equal(s.mean,30);assert.deepEqual(s.modes,[31]);assert.equal(s.min,27);assert.equal(s.max,34);assert.equal(s.range,7);assert.equal(s.percentage,100);assert.equal(s.table.find(r=>r.value===31).count,2);
});
test('Media cercana al objetivo puede ocultar errores grandes',()=>{const s=C.summarize(records([20,40]),C.defaults());assert.equal(s.mean,30);assert.equal(s.mae,10);assert.equal(s.within,0);assert.deepEqual(s.modes,[]);});
test('Multimoda y conjunto vacío no fabrican resultados',()=>{assert.deepEqual(C.summarize(records([28,28,32,32]),C.defaults()).modes,[28,32]);const s=C.summarize([],C.defaults());assert.equal(s.mean,null);assert.equal(s.range,null);assert.equal(s.percentage,null);assert.deepEqual(s.table,[]);});
test('Redondeo conserva conteos y permite décimas',()=>{const c=C.defaults();c.precision=.1;const s=C.summarize(records([29.44,29.46,29.45]),c);assert.deepEqual(s.table.map(x=>[x.value,x.count]),[[29.4,1],[29.5,2]]);assert.equal(C.round(30.01,1),30);});
test('Invalidaciones, personas repetidas y selección por intento',()=>{const r=records([28,30,40]);r[1].participantId=r[0].participantId;r[1].trial=2;r[2].status='invalid';assert.equal(C.summarize(r,C.defaults()).n,2);assert.equal(C.summarize(r,C.defaults()).unique,1);assert.equal(C.select(r,{trial:'1'}).length,1);});
test('Configuración rechaza ritmos rápidos, campos duplicados y protocolos imposibles',()=>{
  assert.throws(()=>C.config({changeMin:300}),/Cambio mínimo/);assert.throws(()=>C.config({toleranceLow:40,toleranceHigh:20}),/Límite superior/);assert.throws(()=>C.config({modes:['self'],defaultMode:'pair'}),/inicial/);assert.throws(()=>C.config({attempts:1.5}),/enteros/);assert.throws(()=>C.config({extraFields:[{id:'constructor',type:'text',label:'Campo'}]}),/Identificador/);
});
test('Perfil, tarea y campos adicionales tienen validación',()=>{const c=C.config({extraFields:[{id:'edad',label:'Edad',type:'number',required:true}]});assert.throws(()=>C.profile({name:'Nombre',group:'Grupo A',extra:{edad:'abc'}},c),/Número/);assert.throws(()=>C.profile({name:'Nombre',group:'Grupo A',source:'home',extra:{edad:'12'}},c),/tarea/);const p=C.profile({name:' Nombre ',group:'Grupo A',gender:'',extra:{edad:'12'}},c);assert.equal(p.name,'Nombre');assert.equal(p.extra.edad,'12');});
test('Devolución configurada por docente y número de intentos',()=>{const c=C.defaults();c.feedback='after';c.attempts=2;assert.equal(C.feedbackAllowed(c,records([30])),false);assert.equal(C.feedbackAllowed(c,records([30,31])),true);c.feedback='teacher';assert.equal(C.feedbackAllowed(c,records([30,31])),false);c.resultsReleased=true;assert.equal(C.feedbackAllowed(c,[]),true);});
test('Escapado y CSV previenen HTML activo y fórmulas inyectadas',()=>{assert.equal(C.escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');const s=C.csv([{name:'=HYPERLINK("x")',note:'a,b\nline'}],['name','note']);assert.ok(s.includes("'=HYPERLINK"));assert.ok(s.includes('"a,b\nline"'));});
test('Las preguntas aprobadas tienen cinco ítems y omiten las preguntas retiradas',()=>{
  const c=C.defaults();assert.equal(c.questions[1].length,5);assert.deepEqual(c.questions[1].map(q=>q[0]),['question1','prediction','accuracy','confidence','protocol']);assert.ok(!c.questions[2].some(q=>q[0]==='method'));assert.ok(!c.questions[3].some(q=>q[0]==='frequencies'));
});
test('Se completan las frecuencias cero sin cambiar n, porcentajes ni media',()=>{
  const c=C.defaults(),r=records([27,30,30,33]),views=C.analysisViews(r,{...c,unlock:3,showTable:true});const first=views.find(v=>v.trial==='1');
  assert.deepEqual(first.table.map(x=>x.value),[27,28,29,30,31,32,33]);assert.equal(first.table.find(x=>x.value===28).count,0);assert.equal(first.table.reduce((n,x)=>n+x.count,0),4);assert.equal(first.mean,30);
});
test('La tabla propuesta admite frecuencia cero, suma totales y calcula media ponderada',()=>{
  const sum=C.proposedSummary([{value:'27',count:'1',percentage:'25'},{value:'28',count:'0',percentage:'0'},{value:'31',count:'3',percentage:'75'}]);assert.equal(sum.n,4);assert.equal(sum.percentage,100);assert.equal(sum.mean,30);assert.equal(C.proposedSummary([{value:'27',count:'x'}]).valid,false);
});
test('La selección de intentos no revela extremos de un intento oculto',()=>{
  const r=records([30,90]);r[1].trial=2;const views=C.analysisViews(r,{...C.defaults(),unlock:3,showTable:true,studentTrials:['1']});assert.equal(views.length,1);assert.deepEqual(views[0].table.map(x=>x.value),[30]);assert.equal(views[0].mean,30);
});
test('Las sesiones anteriores reciben las correcciones sin perder preguntas personalizadas',()=>{
  const old=C.defaults();delete old.schemaVersion;old.homeAttempts=1;old.questions[1].push(['question2','Escribe otra pregunta investigativa sobre el mismo tema.']);old.questions[2].push(['method','¿Qué datos obtuvimos por observación y medición? ¿Qué información obtuvimos por interrogación al preguntar las predicciones? ¿En qué se diferencian?'],['custom','Pregunta propia del docente']);const updated=C.config(old);assert.equal(updated.homeAttempts,2);assert.equal(updated.questions[1].length,5);assert.ok(!updated.questions[2].some(q=>q[0]==='method'));assert.ok(updated.questions[2].some(q=>q[0]==='custom'));
});
test('El protocolo compartido es editable y utiliza la instrucción autónoma cuando está vacío',()=>{
  const c=C.config({agreedProtocol:'  Cada persona inicia y detiene sin mirar un reloj.  '});assert.equal(C.protocolText(c),'Cada persona inicia y detiene sin mirar un reloj.');assert.equal(C.protocolText(C.defaults()),C.autonomousInstructions());assert.equal(C.config({agreedProtocol:'x'.repeat(4000)}).agreedProtocol.length,3000);
});
test('Los porcentajes automáticos usan el total autorizado y no dividen entre cero',()=>{
  const work=C.frequencyWork([{value:'27',count:'2',percentage:'99'},{value:'28',count:'0'},{value:'30',count:'10'}],12);assert.ok(Math.abs(Number(work.rows[0].percentage)-100/6)<1e-10);assert.equal(work.rows[1].percentage,'0');assert.equal(work.percentage,100);assert.equal(work.rows[0].denominator,'12');assert.equal(C.frequencyWork([{value:'30',count:''}],12).rows[0].percentage,'');assert.equal(C.frequencyWork([{value:'30',count:'0'}],0).percentage,null);assert.equal(C.frequencyWork([{value:'30',count:'0'}],0).rows[0].percentage,'');
  const partial=C.frequencyWork([{value:'30',count:'3'}],12);assert.equal(partial.percentage,25);assert.equal(C.frequencyWork([{value:'30',count:'3'}]).percentage,100);
});
