/* Shared rules: browser, Apps Script and Node tests. No external dependencies. */
var ThirtyCore = (function () {
  'use strict';
  const modes = ['self', 'pair', 'hold', 'manual'];
  const backgrounds = ['quiet', 'colors', 'patterns', 'mixed'];
  const phaseQuestions = {
    1: [
      ['question1', 'Escribe una pregunta que podamos investigar con las estimaciones.'],
      ['prediction', '¿Obtendremos todos el mismo tiempo? Predice algunos resultados y explica.'],
      ['accuracy', 'Antes de medir, ¿qué significa estimar bien? Propón un intervalo aceptable.'],
      ['confidence', '¿Crees que lograrás estimar 30 segundos dentro del intervalo? Explica tu predicción.'],
      ['protocol', '¿Qué debemos controlar para que las mediciones sean comparables? Escribe el protocolo.']
    ],
    2: [
      ['population', '¿De quiénes obtenemos los datos? ¿Cuál es la población que queremos describir?'],
      ['variable', '¿Qué medimos, en qué unidad y cómo? ¿Es una variable discreta o continua?'],
      ['conditions', '¿Por qué debemos medir de la misma manera en cada intento? ¿Se respetó el protocolo acordado?']
    ],
    3: [
      ['center', '¿Qué valor podría representar al grupo? Si la media es el tiempo objetivo, ¿todos acertaron?'],
      ['shape', '¿Dónde se concentran los datos? ¿Hay uno o varios valores más frecuentes?'],
      ['comparison', 'Compara grupos o intentos. ¿Qué diferencias observas y qué condiciones podrían explicarlas?']
    ],
    4: [
      ['conclusion', 'Responde la pregunta investigativa con evidencia: centro, valores extremos, recorrido y proporción en el intervalo acordado.'],
      ['generalization', '¿A quiénes podemos extender la conclusión? ¿La muestra representa a todo el nivel?'],
      ['variability', 'Si repetimos mañana o con otra sección, ¿esperamos exactamente los mismos resultados? Explica.'],
      ['limitations', '¿Qué limitaciones hubo? Considera contar mentalmente, observar otros intentos, redondear y usar dispositivos distintos.'],
      ['expansion', '¿Qué podría cambiar en las frecuencias, porcentajes y medidas al incorporar estimaciones de familiares o amigos? ¿Por qué ampliar la muestra no garantiza que sea representativa?']
    ]
  };
  function defaults() {
    return {
      schemaVersion: 2,
      unlock: 1, collectionOpen: false, allowHome: false,
      homeAnonymous: true, homeAttempts: 2, showEvaluation: true,
      includeZero: true, showAutoMean: true,
      agreedProtocol: '', sharedAnalysisTrial: '1', sharedAnalysisView: 'raw',
      studentTrials: ['1','2','all'],
      showTaskResults: true,
      target: 30, attempts: 1, maxSeconds: 120, precision: 1,
      toleranceLow: 25, toleranceHigh: 35, feedback: 'teacher',
      resultsReleased: false, showRaw: false, showTable: false,
      showChart: false, showStats: false, allowManualAnalysis: true,
      studentScope: 'all', comparison: ['group', 'trial', 'source'],
      groups: ['Grupo A', 'Grupo B'], modes: ['self', 'pair', 'hold'],
      defaultMode: 'pair', background: 'quiet', allowBackgroundChoice: false,
      backgroundChoices: ['quiet', 'colors', 'patterns', 'mixed'],
      changeMin: 1800, changeMax: 5000, respectReducedMotion: true,
      collectName: true, requireName: true, collectGender: true, requireGender: false,
      genderOptions: ['Mujer', 'Hombre', 'No binario', 'Otra identidad', 'Prefiero no responder'],
      extraFields: [], questions: JSON.parse(JSON.stringify(phaseQuestions)),
      question: '¿Cómo son las estimaciones de 30 segundos realizadas por nuestro grupo?'
    };
  }
  function assert(ok, message) { if (!ok) throw new Error(message); }
  function uuid() {
    const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }
  function text(value, max) { return String(value == null ? '' : value).trim().slice(0, max || 200); }
  function number(value, lo, hi, label) {
    const n = Number(value); assert(Number.isFinite(n) && n >= lo && n <= hi, label + ': valor fuera del intervalo permitido.'); return n;
  }
  function list(value, max, label) {
    assert(Array.isArray(value) && value.length > 0 && value.length <= max, label + ': lista vacía o demasiado larga.');
    const out = value.map(v => text(v, 80)); assert(out.every(Boolean), label + ': hay un valor vacío.');
    assert(new Set(out).size === out.length, label + ': hay valores repetidos.'); return out;
  }
  function config(input) {
    const d = defaults(), c = Object.assign(d, input || {});
    if(!input||Number(input.schemaVersion||0)<2){
      c.homeAttempts=2;c.schemaVersion=2;
      const questions=JSON.parse(JSON.stringify(c.questions));
      questions[1]=questions[1].filter(q=>q[1]!=='Escribe otra pregunta investigativa sobre el mismo tema.').map(q=>{
        if(q[0]==='accuracy'&&q[1]==='¿Qué significa estimar bien? Propón un intervalo aceptable.')return [q[0],'Antes de medir, ¿qué significa estimar bien? Propón un intervalo aceptable.'];
        if(q[0]==='confidence'&&q[1].includes('error máximo de cinco segundos'))return [q[0],'¿Crees que lograrás estimar 30 segundos dentro del intervalo? Explica tu predicción.'];
        if(q[0]==='confidence'&&q[1].includes('diferencia máxima de cinco segundos'))return [q[0],'¿Crees que lograrás estimar 30 segundos dentro del intervalo? Explica tu predicción.'];return q;
      });
      const accuracy=questions[1].findIndex(q=>q[0]==='accuracy'),confidence=questions[1].findIndex(q=>q[0]==='confidence');
      if(accuracy>=0&&confidence>=0&&accuracy>confidence){const q=questions[1].splice(accuracy,1)[0];questions[1].splice(confidence,0,q);}
      questions[2]=questions[2].filter(q=>!q[1].startsWith('¿Qué datos obtuvimos por observación y medición?'));
      questions[3]=questions[3].filter(q=>!q[1].startsWith('¿Cuánto suman las frecuencias absolutas y las porcentuales?'));
      c.questions=questions;
    }
    c.unlock = number(c.unlock, 1, 4, 'Momento'); assert(Number.isInteger(c.unlock), 'Momento inválido.');
    c.target = number(c.target, 5, 180, 'Tiempo objetivo');
    c.attempts = number(c.attempts, 1, 10, 'Intentos'); assert(Number.isInteger(c.attempts), 'Los intentos deben ser enteros.');
    c.homeAttempts = number(c.homeAttempts, 1, 10, 'Intentos de la tarea'); assert(Number.isInteger(c.homeAttempts), 'Los intentos de la tarea deben ser enteros.');
    c.maxSeconds = number(c.maxSeconds, c.target + 5, 300, 'Límite de seguridad');
    c.precision = number(c.precision, 0.01, 5, 'Redondeo'); assert([0.01, 0.1, 1, 5].includes(c.precision), 'Redondeo inválido.');
    c.toleranceLow = number(c.toleranceLow, 0, 300, 'Límite inferior');
    c.toleranceHigh = number(c.toleranceHigh, c.toleranceLow, 300, 'Límite superior');
    c.changeMin = number(c.changeMin, 1500, 30000, 'Cambio mínimo');
    c.changeMax = number(c.changeMax, c.changeMin, 60000, 'Cambio máximo');
    c.groups = list(c.groups, 20, 'Grupos'); c.genderOptions = list(c.genderOptions, 12, 'Opciones de género');
    c.studentTrials=list(c.studentTrials,11,'Intentos visibles').map(String);assert(c.studentTrials.every(v=>v==='all'||/^(10|[1-9])$/.test(v)),'Intento visible inválido.');
    c.modes = list(c.modes, 4, 'Modalidades'); assert(c.modes.every(v => modes.includes(v)), 'Modalidad desconocida.');
    assert(c.modes.includes(c.defaultMode), 'La modalidad inicial debe estar habilitada.');
    assert(backgrounds.includes(c.background), 'Fondo desconocido.');
    c.backgroundChoices = list(c.backgroundChoices, 4, 'Fondos'); assert(c.backgroundChoices.every(v => backgrounds.includes(v)), 'Fondo inválido.');
    assert(['immediate', 'after', 'teacher'].includes(c.feedback), 'Devolución inválida.');
    assert(['all', 'group', 'own'].includes(c.studentScope), 'Visibilidad inválida.');
    assert(Array.isArray(c.comparison) && c.comparison.every(v => ['group','gender','trial','source','mode','background'].includes(v)), 'Comparación inválida.');
    const bools = ['collectionOpen','allowHome','homeAnonymous','showEvaluation','includeZero','showAutoMean','showTaskResults','resultsReleased','showRaw','showTable','showChart','showStats','allowManualAnalysis','allowBackgroundChoice','respectReducedMotion','collectName','requireName','collectGender','requireGender'];
    bools.forEach(k => { assert(typeof c[k] === 'boolean', 'Opción inválida: ' + k); });
    if (!c.collectName) c.requireName = false; if (!c.collectGender) c.requireGender = false;
    assert(Array.isArray(c.extraFields) && c.extraFields.length <= 8, 'Máximo ocho campos adicionales.');
    c.extraFields = c.extraFields.map(f => {
      const id = text(f.id, 30); assert(/^[a-z][a-z0-9_]{0,29}$/.test(id) && !['__proto__','constructor','prototype'].includes(id), 'Identificador de campo inválido.');
      assert(['text','number','select'].includes(f.type), 'Tipo de campo inválido.');
      const label = text(f.label, 80); assert(label, 'Falta el nombre de un campo.');
      return {id, label, type:f.type, required:!!f.required, options:f.type === 'select' ? list(f.options, 20, label) : []};
    });
    assert(new Set(c.extraFields.map(f => f.id)).size === c.extraFields.length, 'Identificadores de campos repetidos.');
    c.agreedProtocol = text(c.agreedProtocol,3000);
    c.sharedAnalysisTrial=String(c.sharedAnalysisTrial);assert(c.sharedAnalysisTrial==='all'||/^(10|[1-9])$/.test(c.sharedAnalysisTrial),'Intento compartido inválido.');
    assert(['raw','table','chart','stats'].includes(c.sharedAnalysisView),'Representación compartida inválida.');
    c.question = text(c.question, 500); assert(c.question, 'Falta la pregunta investigativa.');
    const q = {};
    for (let i=1;i<=4;i++) {
      assert(Array.isArray(c.questions[i]) && c.questions[i].length <= 12, 'Preguntas del momento ' + i + ': formato inválido.');
      q[i] = c.questions[i].map((x,j) => { assert(Array.isArray(x) && x.length === 2 && /^[a-zA-Z0-9_]{1,40}$/.test(x[0]) && text(x[1],800), 'Pregunta inválida.'); return [x[0], text(x[1],800)]; });
      assert(new Set(q[i].map(x=>x[0])).size===q[i].length,'Identificadores de preguntas repetidos.');
    }
    c.questions=q; return c;
  }
  function autonomousInstructions() { return 'Inicia cuando estés listo. Detén la medición cuando estimes el tiempo.'; }
  function protocolText(c) { return text(c.agreedProtocol,3000) || autonomousInstructions(); }
  function frequencyWork(rows,total) {
    const proposed=proposedSummary(rows),n=total==null?proposed.n:Number(total);
    const validTotal=Number.isFinite(n)&&n>0;
    const result=rows.map(row=>{
      const raw=String(row.count??'').trim(),count=Number(raw.replace(',','.'));
      const valid=raw!==''&&Number.isInteger(count)&&count>=0;
      return {...row,denominator:validTotal?String(n):'',percentage:valid&&validTotal?String(count/n*100):''};
    });
    return {rows:result,n,percentage:validTotal&&proposed.n!=null?proposed.n/n*100:null};
  }
  function participantConfig(c, source) {
    const out=Object.assign({},c);
    if(source==='home') {
      out.attempts=c.homeAttempts==null?2:c.homeAttempts;
      if(c.homeAnonymous!==false){out.collectName=false;out.requireName=false;out.requireGender=false;out.extraFields=[];}
    }
    return out;
  }
  function profile(input, c) {
    const source=input.source||'class';c=participantConfig(c,source);
    if(source==='home'){
      assert(c.allowHome,'La tarea fuera del aula no está habilitada.');
      assert(input.voluntary===true,'Confirma que la participación es voluntaria.');
      assert(input.firstParticipation===true,'Cada persona debe participar una sola vez. Confirma que aún no ha participado en esta investigación.');
    }
    const p = { name:c.collectName ? text(input.name,120) : '', gender:c.collectGender ? text(input.gender,80) : '', group:text(input.group,80), source:input.source || 'class', extra:{} };
    assert(!c.requireName || p.name, 'Escribe tu nombre.');
    assert(!c.requireGender || p.gender, 'Selecciona una opción de género.');
    assert(!p.gender || c.genderOptions.includes(p.gender), 'Opción de género inválida.');
    assert(c.groups.includes(p.group), 'Selecciona un grupo disponible.');
    assert(['class','home'].includes(p.source), 'Procedencia inválida.');
    assert(p.source !== 'home' || c.allowHome, 'La tarea fuera del aula no está habilitada.');
    c.extraFields.forEach(f => {
      const v=text((input.extra || {})[f.id],200); assert(!f.required || v, 'Completa: ' + f.label);
      if (v && f.type==='select') assert(f.options.includes(v), 'Opción inválida: ' + f.label);
      if (v && f.type==='number') assert(Number.isFinite(Number(v)),'Número inválido: '+f.label);
      p.extra[f.id]=v;
    });if(source==='home'){p.voluntary=true;p.firstParticipation=true;}return p;
  }
  function usedAttempts(records,source) {return records.filter(r=>r.status==='valid'||(source==='home'&&r.status==='invalid'&&((r.elapsedMs||0)>0||r.consumed===true))).length;}
  function cleanLearningValues(input,c,phase) {
    input=input||{};const values={};
    c.questions[phase].forEach(q=>{values[q[0]]=text(input[q[0]],3000);});
    if(Number(phase)===3&&c.allowManualAnalysis){
      values.analysisTrial=text(input.analysisTrial||'1',20);values.manual={};
      ['mean','mode','min','max','range','percentage'].forEach(k=>values.manual[k]=text((input.manual||{})[k],200));
      assert(Array.isArray(input.frequency||[])&&(input.frequency||[]).length<=120,'Tabla demasiado grande.');
      values.frequency=(input.frequency||[]).map(row=>({value:text(row.value,50),count:text(row.count,50),denominator:text(row.denominator,50),percentage:text(row.percentage,50)}));
      values.worksheets={};
      Object.entries(input.worksheets||{}).forEach(([trial,sheet])=>{
        assert(trial==='all'||/^(10|[1-9])$/.test(trial),'Intento de trabajo inválido.');assert(Array.isArray(sheet.frequency||[])&&(sheet.frequency||[]).length<=120,'Tabla demasiado grande.');
        const manual={};['mean','mode','min','max','range','percentage'].forEach(k=>manual[k]=text((sheet.manual||{})[k],200));
        values.worksheets[trial]={manual,frequency:(sheet.frequency||[]).map(row=>({value:text(row.value,50),count:text(row.count,50),denominator:text(row.denominator,50),percentage:text(row.percentage,50)}))};
      });
      assert(values.analysisTrial==='all'||/^(10|[1-9])$/.test(values.analysisTrial),'Intento de análisis inválido.');values.worksheets[values.analysisTrial]={manual:values.manual,frequency:values.frequency};
    }
    if(Number(phase)===4&&c.showEvaluation!==false){
      const e=input.evaluation||{};values.evaluation={};
      ['clarity','learning','usability'].forEach(k=>{const v=text(e[k],1);assert(!v||['1','2','3','4','5'].includes(v),'Selecciona una valoración de 1 a 5.');values.evaluation[k]=v;});
      values.evaluation.suggestion=text(e.suggestion,1500);
    }
    return values;
  }
  function round(n, step) { return Math.round(Math.round(n / step) * step * 100) / 100; }
  function summarize(records, c) {
    const valid = records.filter(r => r.status === 'valid' && Number.isFinite(r.elapsedMs));
    const values = valid.map(r => round(r.elapsedMs / 1000, c.precision));
    const counts = new Map(); values.forEach(x=>counts.set(x,(counts.get(x)||0)+1));
    const table = Array.from(counts, ([value,count])=>({value,count,relative:count/values.length})).sort((a,b)=>a.value-b.value);
    const n=values.length, freq = Math.max(0,...table.map(x=>x.count));
    const min=n?Math.min(...values):null, max=n?Math.max(...values):null;
    const mean=n?values.reduce((a,b)=>a+b,0)/n:null;
    const within=values.filter(x=>x>=c.toleranceLow && x<=c.toleranceHigh).length;
    const unique=new Set(valid.map(r=>r.participantId)).size;
    const mae=n?values.reduce((sum,v)=>sum+Math.abs(v-c.target),0)/n:null;
    return {n,unique,values,table,min,max,mean,range:n?max-min:null,modes:freq>1?table.filter(x=>x.count===freq).map(x=>x.value):[],within,percentage:n?100*within/n:null,mae};
  }
  function select(records, filters) {
    const f=filters||{}; return records.filter(r => r.status==='valid' &&
      (!f.group||r.group===f.group) && (!f.gender||r.gender===f.gender) &&
      (!f.source||r.source===f.source) && (!f.mode||r.mode===f.mode) && (!f.background||r.background===f.background) &&
      (!f.trial||f.trial==='all'||String(r.trial)===String(f.trial)));
  }
  function expandFrequencies(table,step,domain) {
    if(!table.length&&!domain)return {table:[],complete:true};
    const values=table.map(r=>r.value),lo=domain?domain.min:Math.min(...values),hi=domain?domain.max:Math.max(...values);
    if(lo==null||hi==null)return {table:[],complete:true};
    const units=Math.round(step*100),start=Math.round(lo*100),end=Math.round(hi*100),size=Math.round((end-start)/units)+1;
    if(size>1000)return {table:table.slice(),complete:false};
    const counts=new Map(table.map(r=>[Math.round(r.value*100),r]));
    return {table:Array.from({length:size},(_,i)=>{const value=start+i*units;return counts.get(value)||{value:value/100,count:0,relative:0};}),complete:true};
  }
  function analysisViews(records,c) {
    const auto=c.showAutoMean!==false&&c.unlock>=3;
    if(!(c.showRaw||c.showTable||c.showChart||c.showStats||auto))return [];
    const valid=select(records,{trial:'all'});
    const trials=Array.from(new Set(['1','2','all',...valid.map(r=>String(r.trial))])).filter(v=>(c.studentTrials||['1','2','all']).includes(v));
    return trials.map(trial=>{
      const selected=select(valid,{trial}),sum=summarize(selected,c),entry={trial,n:sum.n,unique:sum.unique,comparisons:{}};
      if(auto)entry.mean=sum.mean;
      if(c.showRaw)entry.raw=selected.map(r=>({seconds:round(r.elapsedMs/1000,c.precision),trial:r.trial,group:r.group}));
      if(c.showTable||c.showChart){const expanded=c.includeZero===false?{table:sum.table,complete:false}:expandFrequencies(sum.table,c.precision,{min:sum.min,max:sum.max});entry.table=expanded.table;entry.zeroComplete=expanded.complete;}
      if(c.showStats){entry.stats=Object.assign({},sum);delete entry.stats.values;delete entry.stats.table;
        c.comparison.filter(k=>k!=='trial').forEach(k=>{entry.comparisons[k]=Array.from(new Set(selected.map(r=>r[k]||'Sin respuesta'))).map(value=>{const stats=summarize(selected.filter(r=>(r[k]||'Sin respuesta')===value),c);delete stats.values;delete stats.table;return {value,stats};});});
      }
      return entry;
    });
  }
  function proposedSummary(rows) {
    const numeric=v=>Number(String(v).replace(',','.'));
    const active=rows.filter(r=>String(r.value||'').trim()||String(r.count||'').trim());
    const valid=active.every(r=>String(r.value).trim()!==''&&String(r.count).trim()!==''&&Number.isFinite(numeric(r.value))&&numeric(r.value)>=0&&Number.isInteger(numeric(r.count))&&numeric(r.count)>=0);
    const n=valid?active.reduce((a,r)=>a+numeric(r.count),0):null;
    const mean=n>0?active.reduce((a,r)=>a+numeric(r.value)*numeric(r.count),0)/n:null;
    const percentages=rows.filter(r=>String(r.percentage||'').trim()).map(r=>numeric(r.percentage));
    return {n,mean,percentage:percentages.every(Number.isFinite)?percentages.reduce((a,b)=>a+b,0):null,valid};
  }
  function feedbackAllowed(c, own) { return c.feedback==='immediate' || (c.feedback==='after' && own.filter(r=>r.status==='valid').length>=c.attempts) || (c.feedback==='teacher' && c.resultsReleased); }
  function escapeHTML(x) { return String(x==null?'':x).replace(/[&<>"']/g, v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v])); }
  function csv(rows, cols) {
    function cell(v) { let x=String(v==null?'':v); if (/^[\s]*[=+@-]/.test(x)) x="'"+x; return '"'+x.replace(/"/g,'""')+'"'; }
    return '\ufeff'+[cols.map(cell).join(','),...rows.map(r=>cols.map(k=>cell(r[k])).join(','))].join('\r\n');
  }
  return {defaults,config,profile,participantConfig,usedAttempts,cleanLearningValues,summarize,select,expandFrequencies,analysisViews,proposedSummary,round,feedbackAllowed,escapeHTML,csv,assert,uuid,text,number,modes,backgrounds,phaseQuestions, autonomousInstructions, protocolText, frequencyWork};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = ThirtyCore;
