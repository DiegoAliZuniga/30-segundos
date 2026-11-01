(() => {
  'use strict';
  const C=ThirtyCore, E=C.escapeHTML, api=new ThirtyAPI.API(), $=x=>document.getElementById(x);
  const cfg=window.THIRTY_CONFIG||{};
  const phaseNames=['Preguntar','Recolectar','Analizar','Interpretar'];
  const modeNames={self:'Autónomo',pair:'En pareja',hold:'Mantener y soltar',manual:'Medición externa'};
  const bgNames={quiet:'Fondo tranquilo',colors:'Colores suaves',patterns:'Patrones',mixed:'Colores y patrones'};
  const comparisonNames={group:'Grupo',gender:'Género',trial:'Intento',source:'Procedencia',mode:'Modalidad',background:'Fondo'};
  const sourceNames={class:'Aula',home:'Tarea fuera del aula'};
  const S={route:'home',session:null,pendingSession:null,participant:null,participantToken:null,phase:1,teacher:null,teacherToken:null,snapshot:null,teacherTab:'overview',analysisTrial:'1',filter:{trial:'1'},dirtySettings:false,extraFields:[],measure:null,busy:false,polling:false,pendingRegistration:null,homeTrial:'1',projectionPhase:1,projectionTrial:'1',projectionView:'raw',projectionZero:true,qrOpen:false,analysisView:'raw',teacherView:'raw',protocolDraft:null,protocolDirty:false,watching:false,watchVersion:0,lastFullSync:0};
  const namespace=()=>api.mode==='demo'?'demo-projection-v3':'live:'+cfg.appsScriptUrl;
  const storageKey=k=>'thirty:'+namespace()+':'+k;
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(storageKey(key)))||fallback;}catch{return fallback;}};
  const write=(key,val)=>localStorage.setItem(storageKey(key),JSON.stringify(val));
  const credentials=()=>({sessionId:S.session.id,participantId:S.participant.id,participantToken:S.participantToken});
  const teacherArgs=()=>({token:S.teacherToken,sessionId:S.session?.id});
  const fmt=(x,d=2)=>x==null?'—':Number(x).toLocaleString('es-CR',{maximumFractionDigits:d});
  const field=(label,name,value,type='text',help='',required=false)=>`<div class="field"><label for="${E(name)}">${E(label)}${required?'':' <span class="optional">(opcional)</span>'}</label><input id="${E(name)}" name="${E(name)}" type="${type}" value="${E(value??'')}" ${required?'required':''} maxlength="200">${help?`<small>${E(help)}</small>`:''}</div>`;
  const options=(values,current,labels={})=>values.map(v=>`<option value="${E(v)}" ${String(v)===String(current)?'selected':''}>${E(labels[v]||v)}</option>`).join('');
  const select=(label,name,values,current,labels={},help='')=>`<div class="field"><label for="${E(name)}">${E(label)}</label><select id="${E(name)}" name="${E(name)}">${options(values,current,labels)}</select>${help?`<small>${E(help)}</small>`:''}</div>`;
  const check=(label,name,checked)=>`<label class="check"><input name="${E(name)}" type="checkbox" ${checked?'checked':''}><span>${E(label)}</span></label>`;
  const questionsForm=(phase,values={})=>`<form id="phase-form" data-phase="${phase}">${phase===3&&S.session.config.allowManualAnalysis?manualAnalysis(values)+'<h3 style="margin-top:32px">Tu análisis</h3>':''}${S.session.config.questions[phase].map(([key,q])=>`<div class="form-question"><label for="q-${E(key)}">${E(q)}</label><textarea id="q-${E(key)}" name="${E(key)}" maxlength="3000">${E(values[key]||'')}</textarea></div>`).join('')}${phase===4&&S.session.config.showEvaluation!==false&&S.participant.source!=='home'?evaluationForm(values.evaluation||{}):''}<div class="actions"><button class="primary" type="submit">Guardar respuestas</button><span class="saved-label" id="phase-save-status"></span></div></form>`;

  function toast(message) {const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>{el.hidden=true;},6000);}
  function notice(message,kind='') {return `<div class="notice ${kind}" role="status">${E(message)}</div>`;}
  function banner() {
    let html=api.mode==='demo'?`<div class="banner warning"><strong>Demostración local.</strong> Los datos de ejemplo y tus cambios quedan en este navegador. No se envían a Google Sheets.</div>`:'';
    const queue=read('outbox',[]);
    if(queue.length)html+=`<div class="banner warning">${queue.length} registro(s) sin confirmación. Conserva este navegador y vuelve a intentar la sincronización. <button data-action="sync">Reintentar envío</button></div>`;
    $('environment-banner').innerHTML=html;
  }
  function render() {
    $('teacher-button').hidden=S.route==='student'&&S.participant?.source==='home';
    banner();
    if(S.route==='home')renderHome();
    else if(S.route==='register')renderRegister();
    else if(S.route==='student')renderStudent();
    else if(S.route==='teacherLogin')renderLogin();
    else if(S.route==='teacherSessions')renderSessions();
    else if(S.route==='teacher')renderTeacher();
  }
  function focusPage(){ $('main').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
  function renderHome() {
    const ready=api.mode==='live'||api.mode==='demo';
    $('main').innerHTML=`<div class="landing"><div class="hero"><div class="hero-copy"><p class="eyebrow">EXPERIMENTAR PARA ENTENDER</p><h1>¿Cuánto duran<br>30 segundos?</h1><p class="muted">Parece una pregunta sencilla. Descubramos qué pasa cuando un grupo intenta responderla sin mirar el reloj.</p><p class="small muted">Vamos a formular preguntas, medir nuestras estimaciones y usar los datos para construir una conclusión.</p><div class="inline"><span class="pill">Sin reloj a la vista</span><span class="pill">Datos de tu grupo</span></div><div class="hero-mosaic" aria-hidden="true"><img src="assets/geometria.png" alt="" width="740" height="493"></div></div><section class="panel entry-panel" aria-labelledby="enter-heading"><h2 id="enter-heading">Entra al laboratorio</h2><p class="small muted">Tu docente te dará el código de la sesión. Puedes usar un dispositivo propio o compartirlo por turnos.</p><form id="join-form">${field('Código de sesión','session-code',new URLSearchParams(location.search).get('s')||(api.mode==='demo'?'DEMO30':''),'text','',true)}<button class="primary full" ${ready?'':'disabled'}>Buscar sesión</button><p id="join-error" class="error-text" role="alert"></p></form>${!ready?notice('La conexión con Google Sheets aún no está configurada. Puedes explorar la demostración.') : ''}${cfg.demoEnabled&&api.mode!=='demo'?'<div class="divider"></div><button class="full" data-action="demo">Explorar la demostración</button>':''}${api.mode==='demo'?'<div class="divider"></div><button class="quiet full" data-action="reset-demo">Restablecer datos de ejemplo</button>':''}</section></div><div class="phase-preview">${phaseNames.map((name,i)=>`<div><div class="phase-label"><span class="phase-number">${i+1}</span>${name}</div><p>${['¿Qué queremos saber y cómo lo investigamos?','Un mismo protocolo, distintas estimaciones.','Organizar los datos para reconocer patrones.','Responder con evidencia y reconocer límites.'][i]}</p></div>`).join('')}</div></div>`;
  }
  function renderRegister() {
    const s=S.pendingSession,base=s.config,source=S.registrationSource||'class',c=C.participantConfig(base,source),roster=read('roster',[]).filter(x=>x.sessionId===s.id);
    $('main').innerHTML=`<div class="login" style="max-width:720px"><p class="eyebrow">SESIÓN ${E(s.code)}</p><h1 style="font-size:2.4rem">${E(s.title)}</h1>${roster.length?`<section class="panel compact"><h3>Continuar en este dispositivo</h3><p class="small muted">Selecciona tu nombre únicamente si ya te registraste aquí.</p><div class="inline"><select id="roster-select" aria-label="Participantes de este dispositivo">${options(roster.map(x=>x.id),'',Object.fromEntries(roster.map(x=>[x.id,(x.name||'Participante '+x.id.slice(0,6))+' · '+x.group])))}</select><button data-action="resume">Continuar</button></div></section>`:''}<section class="panel"><h2>Registrar participante</h2><p class="small muted">Usaremos un código interno para relacionar tus respuestas e intentos. Las vistas compartidas no muestran nombres.</p><form id="register-form">${base.allowHome?select('Lugar de participación','participant-source',['class','home'],source,sourceNames,'Escoge primero si participas en el aula o en la tarea.'):''}${c.collectName?field('Nombre','participant-name','','text','Solo lo verá el equipo docente.',c.requireName):''}${select('Grupo','participant-group',c.groups,c.groups[0])}${c.collectGender?`<div class="field"><label for="participant-gender">Género ${c.requireGender?'':'<span class="optional">(opcional)</span>'}</label><select name="participant-gender" id="participant-gender" ${c.requireGender?'required':''}>${options(['',...c.genderOptions],'',{'':'Selecciona una opción'})}</select></div>`:''}${source==='home'?notice(`Participación voluntaria. Cada persona realiza ${c.attempts} intentos y debe ser nueva en esta investigación. `+(base.homeAnonymous!==false?'No se solicitan nombre ni campos adicionales.':'El docente configuró los campos de registro.')):''}${c.extraFields.map(f=>f.type==='select'?select(f.label,'extra-'+f.id,['',...f.options],'',{'':'Selecciona una opción'}):field(f.label,'extra-'+f.id,'',f.type,'',f.required)).join('')}${source==='home'?check('La persona acepta participar voluntariamente.','home-voluntary',false)+check('La persona aún no ha participado en esta investigación, ni en el aula ni en la tarea.','home-first',false):''}<p class="small muted">Estos datos se usarán para la actividad y su análisis. En un dispositivo compartido, quien use este navegador podrá acceder a los participantes registrados aquí.</p><button class="primary full">Entrar a la actividad</button><p id="register-error" class="error-text" role="alert"></p></form></section></div>`;
  }
  function sidebar(student=true) {
    const s=S.session,items=student?phaseNames:['Seguimiento','Configurar','Resultados','Respuestas','Proyectar'];
    return `<aside class="sidebar"><div class="sidebar-inner"><p class="session-title">${E(s.title)}</p><span class="pill code">${E(s.code)}</span>${student?`<div class="participant-card"><strong>${E(S.participant.name||'Participante')}</strong><small>${E(S.participant.group)} · ${E(sourceNames[S.participant.source])}</small></div>`:`<div class="participant-card"><strong>${E(S.teacher.name)}</strong><small>Moderación docente</small></div>`}<nav class="nav-list" aria-label="${student?'Momentos de la investigación':'Panel docente'}">${items.map((name,i)=>{
      const key=student?i+1:['overview','settings','results','responses','projection'][i],active=student?S.phase===key:S.teacherTab===key,locked=student&&key>s.config.unlock;
      return `<button data-action="${student?'phase':'teacher-tab'}" data-value="${key}" ${active?'class="active" aria-current="step"':''}><span class="nav-num">${student?i+1:['◷','⚙','▥','≡','▣'][i]}</span>${name}${locked?'<span class="lock-label">Pendiente</span>':''}</button>`;
    }).join('')}</nav><div class="actions">${student?'<button class="quiet" data-action="switch">Cambiar participante</button>':'<button class="quiet" data-action="sessions">Ver sesiones</button><button class="quiet" data-action="logout">Cerrar acceso</button>'}</div>${student?`<details style="margin-top:18px"><summary class="small">Continuar en otro dispositivo</summary><p class="small muted" style="margin-top:12px">El enlace personal abre tus respuestas e intentos. Consérvalo para volver a entrar y compártelo solo contigo.</p><button data-action="private-link">Copiar mi enlace personal</button></details>`:''}</div></aside>`;
  }
  function answerValues(phase) {
    const saved=S.snapshot?.answers?.find(a=>Number(a.phase)===Number(phase))?.values||{};
    const values=read('draft:'+S.participant.id+':'+phase,saved);
    if(Number(phase)===3){const sheet=values.worksheets?.[S.analysisTrial]||(String(values.analysisTrial||'1')===S.analysisTrial?{manual:values.manual,frequency:values.frequency}:{});return {...values,manual:sheet.manual||{},frequency:sheet.frequency||[]};}
    return values;
  }
  function evaluationForm(values) {
    const labels={clarity:'Las instrucciones me resultaron claras.',learning:'La actividad me ayudó a comprender cómo recolectar y analizar datos.',usability:'Pude utilizar la aplicación sin dificultades.'};
    return `<div class="divider"></div><h3>Evaluación de la actividad</h3><p class="small muted">Este cuestionario evalúa la actividad, no tu desempeño. Responde si deseas: 1 significa totalmente en desacuerdo y 5 totalmente de acuerdo.</p>${Object.entries(labels).map(([key,label])=>select(label,'evaluation-'+key,['','1','2','3','4','5'],values[key]||'',{'':'Sin responder'})).join('')}<div class="field"><label for="evaluation-suggestion">¿Qué mejorarías o cambiarías de la actividad?</label><textarea id="evaluation-suggestion" name="evaluation-suggestion" maxlength="1500">${E(values.suggestion||'')}</textarea></div>`;
  }
  function evaluationSummary(values) {
    if(!values)return '';
    const labels={clarity:'Claridad de instrucciones',learning:'Aprendizaje',usability:'Uso de la aplicación'};
    return `<h3>Evaluación de la actividad</h3><ul class="small">${Object.entries(labels).map(([key,label])=>`<li>${label}: ${E(values[key]||'Sin responder')}${values[key]?' / 5':''}</li>`).join('')}</ul><p style="white-space:pre-wrap">${E(values.suggestion||'Sin sugerencias registradas.')}</p>`;
  }
  function closingPanel() {
    if(S.participant.source==='home')return '<section class="panel"><h3>Gracias por participar</h3><p>Tu medición se incorpora a la investigación del grupo. Realiza únicamente el intento indicado; el estudiantado analizará después el conjunto ampliado.</p></section>';
    return `<section class="panel"><h3>Cierre: conversemos con evidencia</h3><p class="small muted">Retoma la pregunta investigativa. Relaciona cómo recolectamos los datos, cómo los organizamos y qué permiten afirmar las medidas. Un promedio de 30 segundos no significa que todas las personas estimaron con la misma precisión.</p><h3>Tarea: ampliar la investigación</h3><p>Invita a familiares o amigos que aún no hayan participado. Explica el mismo protocolo, sin mostrar relojes ni resultados de otras personas. Cada persona nueva realiza dos intentos y su participación es voluntaria.</p><p class="small muted">Usa el enlace de la sesión y selecciona “Tarea fuera del aula”. El registro de la tarea puede realizarse sin nombres ni campos que identifiquen a la persona. Antes de registrar, pregunta si ya participó; el sistema no puede reconocer automáticamente a una persona anónima desde otro dispositivo.</p>${S.session.config.allowHome?notice('El docente habilitó la tarea. Comparte el enlace de la sesión para registrar a cada persona nueva.','success'):notice('La tarea se abrirá cuando lo indique el docente.')}<button type="button" data-action="copy-home">Copiar enlace para la tarea</button>${qrPanel()}<p class="small muted" style="margin-top:15px">En la siguiente lección se comparará el grupo inicial con el conjunto ampliado. Aumentar el número de datos no garantiza, por sí solo, que la muestra sea representativa.</p></section>`;
  }
  function expansionTable(records,c) {
    const first=C.select(records,{trial:'1'}),initial=first.filter(a=>a.source==='class'),home=first.filter(a=>a.source==='home');
    const sets=[['Grupo inicial · aula',initial],['Nuevas personas · tarea',home],['Conjunto ampliado · aula + tarea',first]];
    return `<section class="panel"><h3>Del grupo inicial al conjunto ampliado</h3><p class="small muted">Se compara el primer intento válido de cada persona en toda la sesión. Esta tabla no usa los filtros anteriores. Las personas nuevas de la tarea amplían la muestra; repetir mediciones bajo una misma identidad no añade personas.</p><div class="table-wrap"><table><thead><tr><th>Conjunto</th><th>Personas</th><th>Media (s)</th><th>Moda (s)</th><th>Mínimo (s)</th><th>Máximo (s)</th><th>Recorrido (s)</th><th>En el intervalo (%)</th></tr></thead><tbody>${sets.map(([label,rows])=>{const sum=C.summarize(rows,c);return `<tr><td>${label}</td><td>${sum.unique}</td><td>${fmt(sum.mean)}</td><td>${sum.n?(sum.modes.length?sum.modes.map(x=>fmt(x)).join(', '):'Sin moda'):'—'}</td><td>${fmt(sum.min)}</td><td>${fmt(sum.max)}</td><td>${fmt(sum.range)}</td><td>${fmt(sum.percentage)}</td></tr>`;}).join('')}</tbody></table></div><p class="small muted" style="margin-top:15px">Interpreta los cambios considerando de quiénes y cómo se obtuvieron los datos. Una muestra mayor no garantiza representatividad.</p></section>`;
  }
  function syncSharedAnalysis() {
    const c=S.session.config,views=S.snapshot.analysis||[];
    const shared=c.sharedAnalysisTrial+'|'+c.sharedAnalysisView;
    if(S.lastSharedSelection!==shared){if(views.some(v=>v.trial===c.sharedAnalysisTrial))S.analysisTrial=c.sharedAnalysisTrial;S.analysisView=c.sharedAnalysisView;S.lastSharedSelection=shared;}
  }
  function renderStudent() {
    syncSharedAnalysis();
    const phase=S.phase,c=S.session.config;
    const views=S.snapshot.analysis||[];if(phase>=3&&views.length&&!views.some(v=>v.trial===S.analysisTrial))S.analysisTrial=views[0].trial;
    const values=answerValues(phase);
    if(S.participant.source==='home'){
      S.phase=2;$('main').innerHTML=`<section class="content experiment-only"><div class="content-header"><h1>Recolectar</h1><p>Mediremos el tiempo real cuando consideres que ha transcurrido el tiempo objetivo.</p></div>${protocolPanel()}${recollection()}<div class="actions"><button data-action="switch">Registrar otra persona</button></div></section>`;return;
    }
    const intro=['Construyamos una pregunta que necesite datos para responderse.','Mediremos el tiempo real cuando consideres que ha transcurrido el tiempo objetivo.','Primero observa y organiza. Después compara tus ideas con las representaciones que habilite tu docente.','Vuelve a la pregunta inicial. ¿Qué puedes afirmar a partir de los datos?'];
    let body;
    if(phase>c.unlock)body=`<div class="empty"><h3>Este momento está pendiente</h3><p>Tu docente lo habilitará cuando el grupo esté listo. Puedes volver a los momentos anteriores.</p></div>`;
    else if(phase===1)body=`<section class="panel"><h3>Pregunta de investigación</h3><p>${E(c.question)}</p>${questionsForm(phase,values)}</section>`;
    else if(phase===2)body=protocolPanel()+recollection()+(S.participant.source==='home'?notice('Como participante de la tarea, solo debes realizar la medición. El estudiantado se encargará después del análisis estadístico.'): `<section class="panel"><h3>Interroguemos los datos</h3>${questionsForm(phase,values)}</section>`);
    else if(phase===3)body=studentAnalysis()+`<section class="panel">${questionsForm(phase,values)}</section>`;
    else body=studentAnalysis()+closingPanel()+`<section class="panel"><h3>Una conclusión con evidencia</h3>${questionsForm(phase,values)}</section>`;
    $('main').innerHTML=`<div class="workbench">${sidebar()}<section class="content"><div class="content-header"><p class="eyebrow">MOMENTO ${phase} DE 4</p><h1>${phaseNames[phase-1]}</h1><p>${intro[phase-1]}</p></div>${body}</section></div>`;
  }
  function recollection() {
    const c=C.participantConfig(S.session.config,S.participant.source),own=S.snapshot.own||[],used=C.usedAttempts(own,S.participant.source),running=own.find(x=>x.status==='running'),open=c.collectionOpen&&c.unlock>=2&&(S.participant.source!=='home'||c.allowHome);
    const completed=used>=c.attempts,pending=read('outbox',[]).length>0;
    return `<section class="panel"><div class="inline" style="justify-content:space-between"><h2 class="no-margin">Estima ${fmt(c.target)} segundos</h2><span class="pill">${used} / ${c.attempts} intentos</span></div><p class="muted small" style="margin-top:17px">Sin mirar relojes. Mantén la pestaña visible y sigue el protocolo acordado. Los intentos cancelados o interrumpidos quedan registrados aparte. ${S.participant.source==='home'?`En la tarea se realizan ${c.attempts} intentos por persona; una medición interrumpida también cuenta como intento.`:''}</p>${!open?notice('La recolección está cerrada. Tu docente puede volver a abrirla.'):''}${completed?notice('Completaste los intentos permitidos. '+(S.participant.source==='home'?'Gracias por participar.':'Continúa con las preguntas de este momento.'),'success'):''}${running?notice('Hay un intento pendiente. Si se interrumpió, puedes cancelarlo para volver a medir.','warning'):''}<form id="prepare-measure"><div class="grid2">${select('Modalidad','measure-mode-choice',c.modes,c.modes.includes(read('last-mode',c.defaultMode))?read('last-mode',c.defaultMode):c.defaultMode,modeNames)}${c.allowBackgroundChoice?select('Fondo experimental','measure-background-choice',c.backgroundChoices,c.backgroundChoices[0],bgNames):`<div><label>Fondo experimental</label><p class="small muted">${E(bgNames[c.background])}. Lo elige el docente.</p></div>`}</div><div class="actions"><button class="primary" ${!open||completed||running||pending?'disabled':''}>Preparar intento</button>${running?`<button type="button" data-action="cancel-running" data-id="${E(running.id)}">Cancelar intento pendiente</button>`:''}</div></form><details style="margin-top:18px"><summary class="small">¿Cómo funciona cada modalidad?</summary><ul class="small muted"><li><strong>Autónomo:</strong> tú inicias y detienes la medición.</li><li><strong>En pareja:</strong> un compañero maneja los botones cuando dices “ya” y “alto”.</li><li><strong>Mantener y soltar:</strong> mantén presionado el botón o la barra espaciadora; suelta cuando estimes el tiempo.</li><li><strong>Medición externa:</strong> registra un tiempo medido con otro cronómetro; debe estar habilitada y se analiza como una condición distinta.</li></ul></details></section><section class="panel"><h3>Tus intentos</h3>${own.length?`<div class="table-wrap"><table><thead><tr><th>Intento</th><th>Modalidad</th><th>Estado</th><th>Tiempo</th></tr></thead><tbody>${own.map(a=>`<tr><td>${a.trial}</td><td>${E(modeNames[a.mode])}</td><td>${E(a.status==='valid'?'Registrado':a.status==='running'?'Pendiente':'Interrumpido')}${a.reason?`<small style="display:block">${E(a.reason)}</small>`:''}</td><td>${a.seconds!=null?fmt(a.seconds)+' s':'Oculto'}</td></tr>`).join('')}</tbody></table></div>`: '<p class="muted small">Todavía no tienes intentos registrados.</p>'}${!S.snapshot.feedbackVisible?'<p class="small muted" style="margin-top:14px">Tu docente decide cuándo se muestran los tiempos.</p>':''}</section>`;
  }
  function protocolPanel(editable=false) {
    const c=S.session.config,value=S.protocolDraft??c.agreedProtocol??'';
    if(!editable)return `<section class="panel protocol-panel"><h3>Protocolo acordado</h3><p class="protocol-copy">${E(C.protocolText(c))}</p></section>`;
    return `<section class="panel protocol-panel"><h2>Protocolo acordado</h2><p class="small muted">Escribe lo que acordaron como grupo o utiliza las instrucciones del experimento autónomo.</p><div class="field"><label for="agreed-protocol">Protocolo del grupo</label><textarea id="agreed-protocol" maxlength="3000" placeholder="${E(C.autonomousInstructions())}">${E(value)}</textarea></div><div class="actions"><button data-action="protocol-autonomous">Usar instrucciones de Autónomo</button><button class="primary" data-action="protocol-save">Guardar protocolo</button><span class="small muted">${S.protocolDirty?'Cambios sin guardar':'Guardado en la sesión'}</span></div><p class="small muted">Si dejas el campo vacío, se muestran las instrucciones de Autónomo.</p></section>`;
  }
  function analysisContent(view,kind,c) {
    if(kind==='raw')return `<h3>Datos brutos · segundos</h3><div class="data-cloud projection-cloud">${(view.raw||[]).map(x=>`<span class="datum">${fmt(x.seconds)}</span>`).join('')}</div>`;
    if(kind==='table')return frequencyTable(view.table||[]);
    if(kind==='chart')return barChart(view.table||[]);
    return view.stats?metrics(view.stats,c):notice('Las medidas se mostrarán cuando las habilite tu docente.');
  }
  function analysisWorkbench(view,{trial,kind,trialAction,viewAction,trials,available}) {
    const labels={raw:'Datos brutos',table:'Tabla de frecuencias',chart:'Gráfico',stats:'Medidas'};
    return `<div class="analysis-workbench"><h3>Analizar las estimaciones</h3>${trialButtons(trialAction,trial,trials)}<div class="segmented" role="group" aria-label="Representación del análisis">${Object.entries(labels).map(([key,label])=>`<button type="button" data-action="${viewAction}" data-value="${key}" aria-pressed="${kind===key}" ${available.includes(key)?'':'disabled'}>${label}</button>`).join('')}</div><p class="small muted">${view.n} mediciones válidas · ${view.unique} personas · redondeo a ${fmt(S.session.config.precision)} s.</p>${trial==='all'?notice('Esta selección reúne mediciones repetidas. El número de mediciones puede ser mayor que el número de personas.'):''}${available.length?analysisContent(view,kind,S.session.config):notice('Tu docente habilitará los datos, tablas, gráficos y medidas. La media automática está en tu tabla de trabajo.')}</div>`;
  }
  function studentAnalysis() {
    const c=S.session.config,views=S.snapshot.analysis||[];
    const trial=views.some(x=>x.trial===S.analysisTrial)?S.analysisTrial:(views[0]?.trial||'1');S.analysisTrial=trial;
    const view=views.find(x=>x.trial===trial);
    if(!view)return '<section class="panel"><h3>Resultados de la sesión</h3><p class="muted small">Tu docente habilitará los datos, tablas y gráficos para el análisis.</p></section>';
    const available=Object.entries({raw:c.showRaw&&view.raw,table:c.showTable&&view.table,chart:c.showChart&&view.table,stats:c.showStats&&view.stats}).filter(x=>x[1]).map(x=>x[0]);
    const kind=available.includes(S.analysisView)?S.analysisView:available[0];S.analysisView=kind||c.sharedAnalysisView;
    let html=`<section class="panel"><h2>Resultados ${c.studentScope==='group'?'de tu grupo':c.studentScope==='own'?'personales':'de la sesión'}</h2>${analysisWorkbench(view,{trial,kind,trialAction:'analysis-trial',viewAction:'analysis-view',trials:views.map(x=>x.trial),available})}`;
    if(kind==='stats'&&c.showStats&&view.comparisons)Object.keys(view.comparisons).forEach(k=>html+=comparisonTable(k,view.comparisons[k]));
    if(view.zeroComplete===false&&c.includeZero!==false)html+=notice('El rango tiene más de 1000 valores posibles. Se muestran los valores observados; usa un redondeo mayor para incluir todos los ceros.');
    return html+'</section>';
  }
  function frequencyTable(table) {
    const n=table.reduce((total,row)=>total+row.count,0);
    return `<h3 style="margin-top:26px">Tabla de frecuencias</h3><div class="table-wrap"><table><thead><tr><th>Tiempo redondeado (s)</th><th>Frecuencia absoluta</th><th>Cálculo del porcentaje</th><th>Frecuencia porcentual</th></tr></thead><tbody>${table.map(r=>`<tr><td>${fmt(r.value)}</td><td>${r.count}</td><td>${n?'('+r.count+' ÷ '+n+') × 100':'—'}</td><td>${n?fmt(r.count/n*100):'—'} %</td></tr>`).join('')}</tbody><tfoot><tr><th>Total</th><td>${n}</td><td>${n?'('+n+' ÷ '+n+') × 100':'Sin datos'}</td><td>${n?'100':'0'} %</td></tr></tfoot></table></div>${n?'<p class="small muted">Los porcentajes se calculan automáticamente. El total teórico es 100 %; la suma de los porcentajes mostrados puede variar por el redondeo.</p>':'<p class="small muted">No hay mediciones válidas en esta selección.</p>'}`;
  }
  function barChart(table) {
    return '<h3 style="margin-top:26px">Distribución de las estimaciones</h3>'+ThirtyCharts.barSVG(table,{step:S.session.config.precision});
  }
  function metrics(sum,c) {
    const list=[['Media',sum.mean,'s'],['Moda',sum.modes.length?sum.modes.map(x=>fmt(x)).join(', '):'Sin moda',''],['Mínimo',sum.min,'s'],['Máximo',sum.max,'s'],['Recorrido',sum.range,'s'],['En el intervalo',sum.percentage,'%']];
    return `<div class="metrics">${list.map(([label,value,unit])=>`<div class="metric"><span>${label}</span><strong>${typeof value==='string'?E(value):fmt(value)} <small>${unit}</small></strong></div>`).join('')}</div><p class="small muted">Intervalo inclusivo: [${fmt(c.toleranceLow)}, ${fmt(c.toleranceHigh)}] s. ${sum.within} de ${sum.n} mediciones. Las medidas usan el mismo redondeo que la tabla. La moda se informa solo cuando algún valor se repite.</p>${sum.mean!=null?notice(`Una media cercana a ${fmt(c.target)} s puede ocultar estimaciones muy alejadas. El error absoluto medio de esta selección es ${fmt(sum.mae)} s.`):''}`;
  }
  function comparisonTable(key,rows) {return `<h3 style="margin-top:27px">Comparación por ${comparisonNames[key].toLowerCase()}</h3><div class="table-wrap"><table><thead><tr><th>${comparisonNames[key]}</th><th>Mediciones</th><th>Personas</th><th>Media (s)</th><th>Recorrido (s)</th><th>Error medio absoluto (s)</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${E(key==='source'?sourceNames[r.value]||r.value:key==='mode'?modeNames[r.value]||r.value:key==='background'?bgNames[r.value]||r.value:r.value)}</td><td>${r.stats.n}</td><td>${r.stats.unique}</td><td>${fmt(r.stats.mean)}</td><td>${fmt(r.stats.range)}</td><td>${fmt(r.stats.mae)}</td></tr>`).join('')}</tbody></table></div>`;}
  function manualAnalysis(values) {
    const manual=values.manual||{},freq=values.frequency?.length?values.frequency:[{value:'',count:''},{value:'',count:''},{value:'',count:''}],sum=C.proposedSummary(freq),work=C.frequencyWork(freq,(S.snapshot.analysis||[]).find(x=>x.trial===S.analysisTrial)?.n);
    const view=(S.snapshot.analysis||[]).find(x=>x.trial===S.analysisTrial),mean=view&&Object.hasOwn(view,'mean')?view.mean:sum.mean;
    const item=(label,key,value,readonly=false)=>`<div class="field"><label for="manual-${key}">${label}</label><input id="manual-${key}" name="manual-${key}" value="${E(value??'')}" ${readonly?'readonly aria-readonly="true"':''} inputmode="decimal" maxlength="200"></div>`;
    return `<h3>Construye tu tabla y tus medidas</h3><p class="small muted">Completa los tiempos y las frecuencias absolutas. Cada porcentaje se calcula automáticamente y muestra (frecuencia absoluta ÷ total de datos) × 100. La fila Total usa los valores sin redondear.</p><div class="table-wrap"><table class="freq-edit"><thead><tr><th>Tiempo (s)</th><th>Frecuencia absoluta</th><th>Cálculo del porcentaje</th><th>Frecuencia porcentual (%)</th><th>Acción</th></tr></thead><tbody id="frequency-body">${work.rows.map(f=>frequencyRow(f)).join('')}</tbody><tfoot><tr><th>Total</th><td><output id="frequency-total">${sum.n==null?'Revisa los datos':sum.n}</output></td><td>Número de datos: <span id="frequency-n">${work.n??'—'}</span></td><td><output id="percentage-total">${fmt(work.percentage)}</output> %</td><td></td></tr></tfoot></table></div><div class="actions"><button type="button" data-action="add-frequency">Agregar fila</button><button type="button" data-action="manual-chart">Dibujar mi gráfico</button></div><div id="manual-chart-slot"></div><div class="grid3" style="margin-top:24px">${item('Media aritmética (automática)','mean',mean==null?'':fmt(mean),true)}${[['Moda(s)','mode'],['Mínimo (s)','min'],['Máximo (s)','max'],['Recorrido (s)','range'],['Porcentaje en el intervalo','percentage']].map(([label,key])=>item(label,key,manual[key]||'')).join('')}</div><p class="small muted" id="mean-description">${view&&Object.hasOwn(view,'mean')?'La media se calcula con las mediciones de la selección actual.':'La media se calcula automáticamente con los tiempos y las frecuencias de tu tabla.'}</p>${S.session.config.showStats?'<button type="button" data-action="check-analysis">Comparar mis medidas</button><div id="manual-check" role="status" style="margin-top:16px"></div>':''}`;
  }
  function frequencyRow(f={value:'',count:''}) {
    return `<tr><td><input data-freq="value" aria-label="Tiempo en segundos" value="${E(f.value)}" inputmode="decimal" maxlength="50"></td><td><input data-freq="count" aria-label="Frecuencia absoluta" value="${E(f.count)}" inputmode="numeric" maxlength="50"></td><td><span class="percent-work">(<output data-numerator>${E(f.count||'fa')}</output> ÷ <input data-freq="denominator" aria-label="Total de datos para calcular el porcentaje" value="${E(f.denominator||'')}" readonly aria-readonly="true" placeholder="N" inputmode="numeric" maxlength="50">) × 100 =</span></td><td><input data-freq="percentage" aria-label="Frecuencia porcentual" value="${f.percentage===''?'':fmt(f.percentage)}" readonly aria-readonly="true" inputmode="decimal" maxlength="50"></td><td><button type="button" data-action="remove-frequency">Quitar</button></td></tr>`;
  }
  function renderLogin() {
    const demo=api.mode==='demo';
    $('main').innerHTML=`<div class="login"><p class="eyebrow">MODERACIÓN</p><h1 style="font-size:2.6rem">Portal docente</h1><section class="panel"><h2>Acceder</h2><p class="small muted">Controla la sesión y consulta los registros individuales.</p>${demo?'<button class="primary full" data-action="demo-login">Entrar como docente de demostración</button><p class="small muted" style="margin-top:14px">Este acceso sirve solo para explorar datos locales.</p>':`<form id="teacher-login-form">${field('ID docente','teacher-id','','text','El ID que se configuró para tu cuenta.',true)}<div class="field"><label for="teacher-key">Clave docente</label><input id="teacher-key" name="teacher-key" type="password" autocomplete="current-password" required maxlength="200"></div><button class="primary full" ${api.mode==='live'&&api.bridgeWindow?'':'disabled'}>Entrar con clave</button><p id="login-error" class="error-text" role="alert"></p></form><div class="divider"></div><h3>Acceso con Google</h3>${cfg.googleClientId?'<div id="google-signin"></div><p class="small muted">Usa una cuenta habilitada por quien administra la actividad.</p>':'<p class="small muted">Disponible cuando se configure el acceso Google. Puedes usar tu ID y clave mientras tanto.</p>'}`}</section></div>`;
    if(!demo&&cfg.googleClientId)googleButton();
  }
  async function googleButton() {
    try {
      if(!window.google?.accounts){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>reject(new Error('No se pudo cargar el acceso Google.'));document.head.append(script);});}
      if(!$('google-signin'))return;
      google.accounts.id.initialize({client_id:cfg.googleClientId,nonce:api.nonce,callback:async response=>{try{await login({method:'google',credential:response.credential});}catch(e){toast(e.message);}}});
      google.accounts.id.renderButton($('google-signin'),{theme:'outline',size:'large',text:'signin_with',locale:'es'});
    }catch(e){toast(e.message);}
  }
  function renderSessions() {
    const sessions=S.sessions||[];
    $('main').innerHTML=`<div class="landing"><div class="content-header"><p class="eyebrow">PORTAL DOCENTE · ${E(S.teacher.name)}</p><h1 style="font-size:2.7rem">Tus sesiones</h1><p>Cada sesión conserva participantes, condiciones, intentos y respuestas. Reabre una sesión para ampliar la muestra en la tarea.</p></div><section class="panel"><form id="create-session-form"><div class="grid2">${field('Nombre de la sesión','new-session-title','','text','Por ejemplo: Séptimo 7-2 · octubre',true)}<div class="field"><label for="session-template">Configuración inicial</label><select id="session-template" name="session-template"><option value="default">Comenzar en Preguntar</option>${sessions.map(s=>`<option value="${E(s.id)}">Copiar preferencias de ${E(s.title)}</option>`).join('')}</select></div></div><button class="primary">Crear sesión</button></form></section><div class="session-list">${sessions.map(s=>`<article class="session-item"><div><h3>${E(s.title)}</h3><p><span class="code">${E(s.code)}</span> · Momento ${s.config.unlock} · ${s.config.collectionOpen?'Recolección abierta':'Recolección cerrada'}</p></div><button data-action="open-session" data-id="${E(s.id)}">Abrir sesión</button></article>`).join('')}</div>${!sessions.length?'<p class="muted" style="margin-top:25px">Crea una sesión para comenzar.</p>':''}<div class="actions"><button class="quiet" data-action="logout">Cerrar acceso docente</button></div></div>`;
  }
  function renderTeacher() {
    const titles={overview:['Seguimiento','Acompaña la actividad y decide cuándo avanzar.'],settings:['Configurar la sesión','Las preferencias se aplican a los nuevos intentos. Cada medición conserva las condiciones con las que comenzó.'],results:['Resultados','Explora los datos válidos y compara condiciones sin perder de vista cómo se produjeron.'],responses:['Respuestas','Revisa las preguntas, los razonamientos y las conclusiones de cada participante.']};
    if(S.teacherTab==='projection'){renderProjection();return;}
    const [title,intro]=titles[S.teacherTab];
    $('main').innerHTML=`<div class="workbench">${sidebar(false)}<section class="content"><div class="content-header"><p class="eyebrow">PORTAL DOCENTE</p><h1>${title}</h1><p>${intro}</p></div>${S.teacherTab==='overview'?teacherOverview():S.teacherTab==='settings'?settingsForm():S.teacherTab==='results'?teacherResults():teacherResponses()}</section></div>`;
  }
  function teacherOverview() {
    const snap=S.snapshot,c=S.session.config,valid=snap.attempts.filter(a=>a.status==='valid'),sum=C.summarize(C.select(valid,{trial:'1'}),c),participants=snap.participants;
    return `<section class="panel compact"><h3>Día 2 · Secuencia de la lección</h3><p class="small muted">Repaso: 1:20–1:35 p. m. · Investigación de 30 segundos: 1:35–2:30 p. m. · Cierre y tarea: 2:30–2:45 p. m.</p><a class="small" href="https://jeopardy-matematico-web.onrender.com" target="_blank" rel="noopener">Abrir el recurso de repaso indicado en el planeamiento</a></section><div class="metrics"><div class="metric"><span>Participantes registrados</span><strong>${participants.length}</strong></div><div class="metric"><span>Mediciones válidas</span><strong>${valid.length}</strong></div><div class="metric"><span>Intentos en curso</span><strong>${snap.attempts.filter(x=>x.status==='running').length}</strong></div></div><section class="panel"><h3>Invita al grupo</h3><div class="inline"><span class="pill code" style="font-size:1.4rem">${E(S.session.code)}</span><button data-action="copy-room">Copiar enlace de la sesión</button></div><p class="small muted" style="margin-top:15px">Funciona por turnos en dos dispositivos o con participantes distribuidos en veinte. No requiere cuentas Google para estudiantes.</p></section><section class="panel"><h3>Ritmo de la actividad</h3>${select('Último momento habilitado','quick-phase',[1,2,3,4],c.unlock,Object.fromEntries(phaseNames.map((x,i)=>[i+1,(i+1)+' · '+x])))}<div class="checks">${check('Abrir recolección','quick-collection',c.collectionOpen)}${check('Permitir tarea fuera del aula','quick-home',c.allowHome)}${check('Revelar resultados personales','quick-release',c.resultsReleased)}</div><div class="actions"><button class="primary" data-action="quick-save">Aplicar cambios</button><button data-action="teacher-tab" data-value="settings">Todas las preferencias</button><button data-action="prepare-homework">Preparar tarea del día 2</button><button data-action="teacher-tab" data-value="projection">Proyectar en clase</button></div><p class="small muted" style="margin-top:14px">La devolución personal sigue la modalidad configurada: inmediata, tras completar intentos o al revelarla. Los datos colectivos se habilitan por separado.</p></section><section class="panel"><h3>Participación por grupo</h3><div class="table-wrap"><table><thead><tr><th>Grupo</th><th>Personas</th><th>Mediciones válidas</th></tr></thead><tbody>${c.groups.map(group=>`<tr><td>${E(group)}</td><td>${participants.filter(x=>x.group===group).length}</td><td>${valid.filter(x=>x.group===group).length}</td></tr>`).join('')}</tbody></table></div>${participants.length?`<details style="margin-top:20px"><summary class="small">Participantes e intentos pendientes</summary><div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Nombre</th><th>Grupo</th><th>Válidos</th><th>Respuestas guardadas</th></tr></thead><tbody>${participants.map(p=>`<tr><td>${E(p.name||p.id.slice(0,8))}</td><td>${E(p.group)}</td><td>${valid.filter(x=>x.participantId===p.id).length} / ${C.participantConfig(c,p.source).attempts}</td><td>${[...new Set(snap.answers.filter(x=>x.participantId===p.id).map(x=>x.phase))].sort().join(', ')||'Ninguna'}</td></tr>`).join('')}</tbody></table></div></details>`:''}</section><section class="panel"><h3>Vista rápida · primer intento</h3>${metrics(sum,c)}</section>`;
  }
  function settingsForm() {
    const c=S.session.config; S.extraFields=JSON.parse(JSON.stringify(c.extraFields));S.settingsBaseVersion=S.session.version;
    const num=(label,k,lo,hi,step=1,help='')=>`<div class="field"><label for="set-${k}">${label}</label><input id="set-${k}" name="${k}" value="${E(c[k])}" type="number" min="${lo}" max="${hi}" step="${step}" required>${help?`<small>${E(help)}</small>`:''}</div>`;
    const group=(title,body,open=false)=>`<details class="settings-group" ${open?'open':''}><summary>${title}</summary><div class="settings-body">${body}</div></details>`;
    return `<form id="settings-form">${group('Actividad y muestra',`<div class="field"><label for="set-question">Pregunta investigativa principal</label><textarea id="set-question" name="question" maxlength="500" required>${E(c.question)}</textarea></div><div class="grid2">${select('Último momento habilitado','unlock',[1,2,3,4],c.unlock,Object.fromEntries(phaseNames.map((x,i)=>[i+1,(i+1)+' · '+x])))}<div class="field"><label for="set-groups">Grupos</label><textarea id="set-groups" name="groups" required>${E(c.groups.join('\n'))}</textarea><small>Un grupo por línea. Agrega un grupo específico si la tarea amplía la muestra.</small></div></div><div class="checks">${check('Abrir recolección','collectionOpen',c.collectionOpen)}${check('Permitir tarea fuera del aula','allowHome',c.allowHome)}</div>`,true)}${group('Protocolo acordado',`<div class="field"><label for="set-protocol">Protocolo del grupo</label><textarea id="set-protocol" name="agreedProtocol" maxlength="3000" placeholder="${E(C.autonomousInstructions())}">${E(c.agreedProtocol||'')}</textarea><small>Déjalo vacío para usar las instrucciones de Autónomo.</small></div>`)}${group('Medición e intentos',`<div class="grid3">${num('Tiempo objetivo (s)','target',5,180,1)}${num('Intentos por participante','attempts',1,10)}${num('Límite de seguridad (s)','maxSeconds',10,300,1,'Al llegar al límite, se detiene y marca el intento como interrumpido.')}</div><div class="field"><label>Modalidades habilitadas</label><div class="checks">${C.modes.map(x=>check(modeNames[x],'mode-'+x,c.modes.includes(x))).join('')}</div></div><div class="grid2">${select('Modalidad inicial','defaultMode',C.modes,c.defaultMode,modeNames)}${select('Redondeo para tablas y medidas','precision',[0.01,0.1,1,5],c.precision,{0.01:'Centésimas · 0,01 s',0.1:'Décimas · 0,1 s',1:'Segundos · 1 s',5:'Múltiplos de 5 s'},'Siempre se conserva el tiempo original en milisegundos.')}</div><div class="grid2">${num('Intervalo aceptable: mínimo (s)','toleranceLow',0,300,0.01)}${num('Intervalo aceptable: máximo (s)','toleranceHigh',0,300,0.01)}</div>`)}${group('Fondos y condiciones experimentales',`<div class="grid2">${select('Fondo elegido por el docente','background',C.backgrounds,c.background,bgNames)}<div>${check('Permitir que el participante elija su fondo','allowBackgroundChoice',c.allowBackgroundChoice)}${check('Respetar la preferencia de reducir movimiento','respectReducedMotion',c.respectReducedMotion)}</div></div><div class="field"><label>Fondos que puede elegir el participante</label><div class="checks">${C.backgrounds.map(x=>check(bgNames[x],'bg-'+x,c.backgroundChoices.includes(x))).join('')}</div></div><div class="grid2">${num('Cambio más temprano (milisegundos)','changeMin',1500,30000,100)}${num('Cambio más tardío (milisegundos)','changeMax',1500,60000,100)}</div><p class="small muted">Los cambios ocurren a intervalos aleatorios. Los fondos no garantizan que se deje de contar mentalmente: son una condición experimental que queda registrada. No se usan destellos rápidos.</p>`)}${group('Registro de participantes',`<div class="grid2"><div>${check('Pedir nombre','collectName',c.collectName)}${check('Nombre obligatorio','requireName',c.requireName)}</div><div>${check('Pedir género','collectGender',c.collectGender)}${check('Género obligatorio','requireGender',c.requireGender)}</div></div><div class="field"><label for="set-gender">Opciones de género</label><textarea id="set-gender" name="genderOptions">${E(c.genderOptions.join('\n'))}</textarea><small>Una opción por línea. Se recomienda conservar “Prefiero no responder”.</small></div><h3>Registro de la tarea</h3>${check('No pedir nombre ni campos adicionales en la tarea','homeAnonymous',c.homeAnonymous!==false)}${num('Intentos por persona en la tarea','homeAttempts',1,10)}<p class="small muted">El día 2 corregido establece participación voluntaria, personas nuevas y dos intentos por persona. El género permanece opcional en el registro sin nombres.</p><h3>Campos adicionales</h3><div id="extra-fields-list">${extraFieldsList()}</div><div class="grid2">${field('Nombre del campo','extra-label','','text','Por ejemplo: Edad, sección o institución.')}${select('Tipo de respuesta','extra-type',['text','number','select'],'text',{text:'Texto',number:'Número',select:'Lista de opciones'})}</div><div class="field"><label for="extra-options">Opciones para una lista</label><textarea id="extra-options" name="extra-options" placeholder="Una opción por línea"></textarea></div>${check('El campo adicional será obligatorio','extra-required',false)}<button type="button" data-action="add-extra">Agregar campo</button><p class="small muted" style="margin-top:14px">Los campos nuevos se solicitan en registros nuevos. Los registros anteriores conservan sus valores originales.</p>`)}${group('Devolución y análisis',`<div class="grid2">${select('Cuándo mostrar tiempos personales','feedback',['immediate','after','teacher'],c.feedback,{immediate:'Inmediatamente',after:'Al completar todos los intentos',teacher:'Cuando el docente los revele'})}${select('Datos que puede analizar el participante','studentScope',['all','group','own'],c.studentScope,{all:'Toda la sesión',group:'Solo su grupo',own:'Solo sus intentos'})}</div>${check('Revelar resultados personales','resultsReleased',c.resultsReleased)}<h3 style="margin-top:21px">Representaciones visibles para estudiantes</h3><div class="checks">${check('Datos brutos','showRaw',c.showRaw)}${check('Tabla de frecuencias','showTable',c.showTable)}${check('Gráfico de barras','showChart',c.showChart)}${check('Medidas y comparaciones','showStats',c.showStats)}${check('Tabla y cálculos hechos por estudiantes','allowManualAnalysis',c.allowManualAnalysis)}</div>${check('Mostrar el cuestionario de evaluación al finalizar','showEvaluation',c.showEvaluation!==false)}${check('Incluir valores con frecuencia 0 en tablas y gráficos','includeZero',c.includeZero!==false)}${check('Calcular y mostrar la media automáticamente en Analizar','showAutoMean',c.showAutoMean!==false)}<h3 style="margin-top:21px">Intentos visibles para estudiantes</h3><div class="checks">${['1','2','all',...Array.from({length:Math.max(2,c.attempts,c.homeAttempts)-2},(_,i)=>String(i+3))].map(v=>`<label class="check"><input type="checkbox" name="visible-trial-${v}" value="${v}" ${(c.studentTrials||['1','2','all']).includes(v)?'checked':''}><span>${v==='all'?'Todos los intentos':'Intento '+v}</span></label>`).join('')}</div><h3 style="margin-top:21px">Comparaciones disponibles</h3><div class="checks">${Object.keys(comparisonNames).map(k=>check(comparisonNames[k],'compare-'+k,c.comparison.includes(k))).join('')}</div><p class="small muted">Mostrar una tabla o un gráfico permite conocer los tiempos. Para evitar esa influencia durante la medición, mantén ocultos también los resultados colectivos.</p>`)}${group('Preguntas de los cuatro momentos',phaseNames.map((name,i)=>`<h3>${i+1}. ${name}</h3>${c.questions[i+1].map(([key,q])=>`<div class="field"><label for="edit-q-${i+1}-${E(key)}">Pregunta</label><textarea id="edit-q-${i+1}-${E(key)}" data-question-phase="${i+1}" data-question-id="${E(key)}" maxlength="800">${E(q)}</textarea></div>`).join('')}`).join(''))}<div class="settings-actions"><span><strong class="small">Preferencias de la sesión</strong><small class="muted" style="display:block">Versión ${S.settingsBaseVersion}. Guarda para aplicar a nuevos intentos.</small></span><div class="inline"><button type="button" data-action="reload-settings">Descartar cambios</button><button class="primary" type="submit">Guardar preferencias</button></div></div><p class="error-text" id="settings-error" role="alert"></p></form>`;
  }
  function extraFieldsList(){return `<ul class="mini-list">${S.extraFields.map((f,i)=>`<li><span>${E(f.label)}<small>${E({text:'Texto',number:'Número',select:'Lista'}[f.type])} · ${f.required?'Obligatorio':'Opcional'}</small></span><button type="button" data-action="remove-extra" data-index="${i}">Quitar</button></li>`).join('')}</ul>`;}
  function teacherResults() {
    const c=S.session.config,records=S.snapshot.attempts,selected=C.select(records,S.filter),sum=C.summarize(selected,c);
    let html=`<section class="panel"><h3>Selecciona las mediciones</h3><div class="filter-row">${select('Intento','filter-trial',['all',...Array.from(new Set(records.map(x=>String(x.trial)))).sort()],S.filter.trial,{'all':'Todos los intentos'})}${select('Grupo','filter-group',['',...new Set(records.map(x=>x.group))],S.filter.group||'',{'':'Todos los grupos'})}${select('Procedencia','filter-source',['','class','home'],S.filter.source||'',Object.assign({'':'Todas'},sourceNames))}</div><div class="filter-row">${select('Modalidad','filter-mode',['',...new Set(records.map(x=>x.mode))],S.filter.mode||'',Object.assign({'':'Todas'},modeNames))}${select('Fondo','filter-background',['',...new Set(records.map(x=>x.background))],S.filter.background||'',Object.assign({'':'Todos'},bgNames))}${select('Género','filter-gender',['',...new Set(records.map(x=>x.gender).filter(Boolean))],S.filter.gender||'',{'':'Todos'})}</div><p class="small muted">${sum.n} mediciones válidas de ${sum.unique} personas. ${records.filter(x=>x.status==='invalid').length} intentos excluidos en la sesión.</p>${S.filter.trial==='all'?notice('Las mediciones repetidas de una misma persona no son observaciones independientes. Para describir personas, selecciona un intento.'):''}${new Set(selected.map(x=>x.target)).size>1?notice('Esta selección mezcla tiempos objetivo distintos. Revisa las condiciones antes de interpretar las medidas.','warning'):''}${new Set(selected.map(x=>x.configVersion)).size>1?notice('Hay varias versiones del protocolo. Cada fila conserva su versión y condiciones.','warning'):''}${analysisWorkbench({n:sum.n,unique:sum.unique,raw:sum.values.map(seconds=>({seconds})),table:teacherTable(selected,c),stats:sum},{trial:S.filter.trial,kind:S.teacherView,trialAction:'teacher-trial',viewAction:'teacher-view',trials:['1','2','all',...new Set(records.map(a=>String(a.trial)))],available:['raw','table','chart','stats']})}<div class="actions"><button data-action="export-attempts">Descargar intentos CSV</button><button data-action="export-anonymous">Descargar datos anónimos</button><button data-action="export-frequency">Descargar frecuencias CSV</button><button data-action="export-session">Respaldo completo JSON</button></div></section>`;
    c.comparison.forEach(k=>{
      if(k==='trial') {
        const cohort=C.select(records,{...S.filter,trial:'all'}),first=cohort.filter(x=>x.trial===1),second=cohort.filter(x=>x.trial===2);
        const pairs=first.map(a=>{const b=second.find(x=>x.participantId===a.participantId);return b?{a,b}:null;}).filter(Boolean);
        html+=`<section class="panel"><h3>Comparación de intentos 1 y 2</h3><p class="small muted">Solo personas con ambos intentos válidos. Una media más cercana al objetivo no basta: compara los errores absolutos.</p><div class="table-wrap"><table><thead><tr><th>Código interno</th><th>Intento 1 (s)</th><th>Intento 2 (s)</th><th>Cambio del error absoluto (s)</th></tr></thead><tbody>${pairs.map(({a,b})=>`<tr><td>${E(a.participantId.slice(0,8))}</td><td>${fmt(a.elapsedMs/1000)}</td><td>${fmt(b.elapsedMs/1000)}</td><td>${fmt(Math.abs(b.elapsedMs/1000-b.target)-Math.abs(a.elapsedMs/1000-a.target))}</td></tr>`).join('')}</tbody></table></div><p class="small muted" style="margin-top:14px">${pairs.length} pares. Un cambio negativo significa menor error. Las versiones y condiciones de los intentos pueden diferir.</p></section>`;
      } else html+=`<section class="panel">${comparisonTable(k,[...new Set(selected.map(x=>x[k]||'Sin respuesta'))].map(value=>({value,stats:C.summarize(selected.filter(x=>(x[k]||'Sin respuesta')===value),c)})))}</section>`;
    });
    html+=expansionTable(records,c);
    html+=`<section class="panel"><h3>Registros y revisión docente</h3><p class="small muted">La revisión conserva el tiempo original y registra el motivo. Los intentos marcados como inválidos se excluyen de los cálculos.</p><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Intento</th><th>Tiempo original (s)</th><th>Condiciones</th><th>Estado</th><th>Revisión</th></tr></thead><tbody>${records.map(a=>{const p=S.snapshot.participants.find(x=>x.id===a.participantId);return `<tr><td>${E(p?.name||a.participantId.slice(0,8))}</td><td>${a.trial}</td><td>${a.elapsedMs!=null?fmt(a.elapsedMs/1000,3):'—'}</td><td>${E(modeNames[a.mode])}<small style="display:block">${E(bgNames[a.background])} · Objetivo ${fmt(a.target)} s · v${a.configVersion}</small></td><td>${E({valid:'Válido',invalid:'Inválido',running:'Pendiente'}[a.status])}${a.reason?`<small style="display:block">${E(a.reason)}</small>`:''}</td><td>${a.elapsedMs!=null?`<button data-action="review" data-id="${E(a.id)}">Revisar</button>`:''}</td></tr>`;}).join('')}</tbody></table></div><div id="review-slot"></div></section>`;
    return html;
  }
  function teacherResponses() {
    const selected=S.responseParticipant||S.snapshot.participants[0]?.id,p=S.snapshot.participants.find(x=>x.id===selected),answers=S.snapshot.answers.filter(x=>x.participantId===selected);
    return `<section class="panel"><h3>Respuestas por participante</h3>${select('Participante','response-participant',S.snapshot.participants.map(x=>x.id),selected,Object.fromEntries(S.snapshot.participants.map(x=>[x.id,(x.name||x.id.slice(0,8))+' · '+x.group])))}<div class="actions"><button data-action="export-answers">Descargar respuestas CSV</button></div></section>${p?phaseNames.map((name,i)=>{const a=answers.find(x=>Number(x.phase)===i+1);return `<section class="panel"><h3>${i+1}. ${name}</h3>${a?(a.questions||S.session.config.questions[i+1]).map(([key,q])=>`<p class="small" style="font-weight:650">${E(q)}</p><p style="white-space:pre-wrap">${E(a.values[key]||'Sin respuesta')}</p>`).join('')+(a.values.worksheets?worksheetSummary(a.values.worksheets):a.values.manual?`<h3>Medidas propuestas</h3><p class="small">${Object.entries(a.values.manual).map(([k,v])=>`${E({mean:'Media',mode:'Moda',min:'Mínimo',max:'Máximo',range:'Recorrido',percentage:'Porcentaje en el intervalo'}[k]||k)}: ${E(v||'—')}`).join(' · ')}</p>${a.values.frequency?`<div class="table-wrap"><table><thead><tr><th>Tiempo propuesto</th><th>Frecuencia absoluta propuesta</th><th>Cálculo</th><th>Frecuencia porcentual propuesta</th></tr></thead><tbody>${a.values.frequency.map(f=>`<tr><td>${E(f.value)}</td><td>${E(f.count)}</td><td>(${E(f.count||'fa')} ÷ ${E(f.denominator||'N')}) × 100</td><td>${E(f.percentage||'—')}</td></tr>`).join('')}</tbody></table></div>`:''}`:'')+evaluationSummary(a.values.evaluation):'<p class="small muted">No se han guardado respuestas en este momento.</p>'}</section>`;}).join(''):'<div class="empty">Todavía no hay participantes.</div>'}`;
  }
  function renderPreservingEditor() {
    const active=document.activeElement,main=$('main'),fields=Array.from(main.querySelectorAll?.('input,textarea,select')||[]),index=fields.indexOf(active);
    const focus=index<0?null:{id:active.id,index,name:active.name,start:active.selectionStart,end:active.selectionEnd};
    const top=window.scrollY||0,left=window.scrollX||0;render();
    if(focus){const next=focus.id?$(focus.id):Array.from($('main').querySelectorAll?.('input,textarea,select')||[])[focus.index];if(next&&next.name===focus.name){next.focus({preventScroll:true});try{next.setSelectionRange(focus.start,focus.end);}catch(error){}}}
    window.scrollTo({top,left,behavior:'instant'});
  }
  async function snapshot(renderAfter=true) {
    const sessionId=S.session?.id,route=S.route,participantId=S.participant?.id;
    let data;
    if(route==='student')data=await api.call('studentSnapshot',credentials());
    else if(route==='teacher')data=await api.call('teacherSnapshot',teacherArgs());
    else return false;
    if(S.route!==route||S.session?.id!==sessionId||(route==='student'&&S.participant?.id!==participantId))return false;
    if(Number(data.session.version)<Number(S.session.version||0))return false;
    S.snapshot=data;S.lastFullSync=Date.now();
    if(!S.dirtySettings)S.session=data.session;
    if(route==='student')S.participant=data.participant;
    if(renderAfter)renderPreservingEditor();return true;
  }
  async function watchSession() {
    if(S.watching||S.busy||S.measure||document.hidden||Date.now()<(S.nextWatchAt||0)||!S.session||!['student','teacher'].includes(S.route))return;
    const sessionId=S.session.id,route=S.route;S.watching=true;
    try {
      const state=await api.call('sessionStatus',{sessionId,version:Math.max(S.session.version||0,S.watchVersion||0)});S.watchFailures=0;S.nextWatchAt=0;
      if(S.session?.id!==sessionId||S.route!==route||!state.changed||!state.session)return;
      if(state.session.version<=Number(S.session.version||0))return;
      S.watchVersion=state.version;
      if(S.dirtySettings){toast('Otro docente actualizó la sesión. Guarda o descarta tus cambios para revisar la nueva versión.');return;}
      saveDraft();S.session=state.session;
      if(S.snapshot){S.snapshot.session=state.session;if(route==='student'){S.snapshot.analysis=[];S.snapshot.homeAnalysis=[];if(!C.feedbackAllowed(C.participantConfig(state.session.config,S.participant.source),S.snapshot.own||[])){S.snapshot.feedbackVisible=false;(S.snapshot.own||[]).forEach(a=>delete a.seconds);}}}
      renderPreservingEditor();
      if(await snapshot(false))renderPreservingEditor();
    } catch(error) {
      // Full snapshots remain available if an older server has not been updated yet.
      S.watchFailures=(S.watchFailures||0)+1;S.nextWatchAt=Date.now()+Math.min(30000,3000*Math.pow(2,S.watchFailures-1));
    } finally {S.watching=false;}
  }
  async function enterParticipant(p,token,s) {
    S.session=s;S.participant=p;S.participantToken=token;S.route='student';S.phase=p.source==='home'?2:1;S.analysisTrial='1';S.lastSharedSelection=null;S.watchVersion=0;await snapshot();focusPage();
  }
  async function login(payload) {
    const result=await api.call('login',payload);S.teacher=result.teacher;S.teacherToken=result.token;
    sessionStorage.setItem(storageKey('teacher'),JSON.stringify(result));await loadSessions();focusPage();
  }
  async function loadSessions() {S.sessions=await api.call('listSessions',{token:S.teacherToken});S.route='teacherSessions';render();}
  async function openSession(id) {S.session=S.sessions.find(x=>x.id===id);S.route='teacher';S.teacherTab='overview';S.dirtySettings=false;S.filter={trial:'1'};S.protocolDraft=null;S.protocolDirty=false;S.watchVersion=0;await snapshot();focusPage();}
  async function saveConfig(c,version=S.session.version) {const updated=await api.call('updateSession',Object.assign(teacherArgs(),{config:C.config(c),version}));S.session=updated;S.watchVersion=updated.version;if(S.snapshot)S.snapshot.session=updated;S.dirtySettings=false;render();toast('Preferencias guardadas.');}
  function formValues(form) {
    const values={};S.session.config.questions[S.phase].forEach(([key])=>{values[key]=form.elements.namedItem(key)?.value||'';});
    if(S.phase===3&&S.session.config.allowManualAnalysis){values.analysisTrial=S.analysisTrial;values.manual={};['mean','mode','min','max','range','percentage'].forEach(k=>values.manual[k]=form.elements.namedItem('manual-'+k)?.value||'');values.frequency=Array.from(form.querySelectorAll('#frequency-body tr')).map(tr=>({value:tr.querySelector('[data-freq=value]').value,count:tr.querySelector('[data-freq=count]').value,denominator:tr.querySelector('[data-freq=denominator]').value,percentage:tr.querySelector('[data-freq=percentage]').value}));const previous=read('draft:'+S.participant.id+':3',S.snapshot.answers?.find(a=>Number(a.phase)===3)?.values||{});values.worksheets={...(previous.worksheets||{}),[S.analysisTrial]:{manual:values.manual,frequency:values.frequency}};}if(S.phase===4&&S.session.config.showEvaluation!==false){values.evaluation={};['clarity','learning','usability','suggestion'].forEach(k=>values.evaluation[k]=form.elements.namedItem('evaluation-'+k)?.value||'');}return values;
  }
  function saveDraft(){const form=$('phase-form');if(form&&form.elements&&S.participant)write('draft:'+S.participant.id+':'+S.phase,formValues(form));}
  function settingsValues(form) {
    const c=JSON.parse(JSON.stringify(S.session.config)),fd=new FormData(form),bools=['collectionOpen','allowHome','resultsReleased','showRaw','showTable','showChart','showStats','allowManualAnalysis','allowBackgroundChoice','respectReducedMotion','collectName','requireName','collectGender','requireGender','homeAnonymous','showEvaluation','includeZero','showAutoMean'];
    bools.forEach(k=>c[k]=fd.has(k));['unlock','target','attempts','maxSeconds','homeAttempts','precision','toleranceLow','toleranceHigh','changeMin','changeMax'].forEach(k=>c[k]=Number(fd.get(k)));
    ['question','agreedProtocol','defaultMode','background','feedback','studentScope'].forEach(k=>c[k]=fd.get(k));
    c.groups=String(fd.get('groups')).split('\n').map(x=>x.trim()).filter(Boolean);c.genderOptions=String(fd.get('genderOptions')).split('\n').map(x=>x.trim()).filter(Boolean);
    c.studentTrials=Array.from(form.querySelectorAll('[name^=visible-trial-]:checked')).map(el=>el.value);
    c.modes=C.modes.filter(x=>fd.has('mode-'+x));c.backgroundChoices=C.backgrounds.filter(x=>fd.has('bg-'+x));c.comparison=Object.keys(comparisonNames).filter(x=>fd.has('compare-'+x));c.extraFields=S.extraFields;
    for(let phase=1;phase<=4;phase++)c.questions[phase]=Array.from(form.querySelectorAll(`[data-question-phase="${phase}"]`)).map(el=>[el.dataset.questionId,el.value.trim()]);return C.config(c);
  }
  function download(content,name,type='text/plain;charset=utf-8') {const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Enlace copiado.');}catch{const el=document.createElement('textarea');el.value=text;document.body.append(el);el.select();document.execCommand('copy');el.remove();toast('Enlace copiado.');}}
  function roomURL(){const u=new URL(location.href);u.hash='';u.search='';u.searchParams.set('s',S.session.code);return u.href;}
  function queueFinish(payload){const q=read('outbox',[]);if(!q.some(x=>x.payload.attemptId===payload.attemptId))q.push({action:'finishAttempt',payload,createdAt:new Date().toISOString()});write('outbox',q);banner();}
  async function flushQueue(show=false) {
    if(S.syncing)return;S.syncing=true;
    try{let q=read('outbox',[]);while(q.length){await api.call(q[0].action,q[0].payload);q.shift();write('outbox',q);}banner();if(show)toast('Todos los registros recibieron confirmación.');}
    catch(e){if(show)toast(e.message);$('connection').textContent='Hay registros pendientes';}
    finally{S.syncing=false;}
  }
  async function prepareMeasure(form) {
    const mode=form.elements['measure-mode-choice'].value,bg=form.elements['measure-background-choice']?.value||S.session.config.background;
    write('last-mode',mode);
    const attemptId=C.uuid(),startPayload=Object.assign(credentials(),{attemptId,mode,background:bg,reduceMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
    const reserved=await api.call('startAttempt',startPayload);S.measure={attempt:reserved.attempt,credentials:credentials(),started:null,ended:false,changes:0,mode};
    const a=S.measure.attempt;C.assert(a.status==='running','Este intento ya terminó. Actualiza la página.');
    $('measure-mode').textContent=modeNames[mode];$('measure-title').textContent=`¿Cuándo han pasado ${fmt(a.target)} segundos?`;
    $('measure-kicker').textContent='TIEMPO PARA ESTIMAR';$('measure-instructions').textContent=mode==='pair'?'Tu compañero inicia y detiene cuando dices “ya” y “alto”.':mode==='hold'?'Mantén presionado el botón o la barra espaciadora. Suelta cuando estimes el tiempo.':mode==='manual'?'Introduce el tiempo que midió el cronómetro externo. Registra la misma unidad: segundos.':C.autonomousInstructions();
    $('measure-hint').textContent='El tiempo permanecerá oculto.';$('measure-control').textContent=mode==='hold'?'Mantén presionado':'Iniciar';$('measure-control').disabled=false;
    const surface=$('measure-surface');surface.className='measure-surface';surface.style.backgroundColor='#f1f4fa';
    $('measure-control').hidden=mode==='manual';let manual=$('manual-measure-form');if(manual)manual.remove();
    if(mode==='manual'){manual=document.createElement('form');manual.id='manual-measure-form';manual.innerHTML=`${field('Tiempo externo (s)','external-seconds','','number','',true)}<button class="primary full">Registrar medición externa</button>`;manual.querySelector('input').min='0.001';manual.querySelector('input').max=a.snapshot.maxSeconds;manual.querySelector('input').step='0.001';$('measure-control').after(manual);}
    $('measure-dialog').showModal();$('measure-control').focus();
  }
  function startClock() {
    const m=S.measure;if(!m||m.started!=null||m.ended)return;m.started=performance.now();$('measure-surface').classList.add('timer-running');
    $('measure-control').textContent=m.mode==='hold'?'Suelta cuando lo estimes':'Detener';$('measure-title').textContent='El tiempo está en tus manos.';$('measure-kicker').textContent='ESTIMA SIN MIRAR UN RELOJ';
    $('measure-instructions').textContent=m.mode==='pair'?'Detén cuando tu compañero diga “alto”.':m.mode==='hold'?'Suelta el botón o la barra espaciadora cuando lo estimes.':'Detén cuando consideres que transcurrió el tiempo objetivo.';
    m.limit=setTimeout(()=>finishMeasure(true,'Se alcanzó el límite de seguridad'),m.attempt.snapshot.maxSeconds*1000);scheduleBackground();
  }
  function randomDelay(min,max){const r=new Uint32Array(1);crypto.getRandomValues(r);return min+(r[0]/4294967296)*(max-min);}
  function scheduleBackground() {
    const m=S.measure;if(!m||m.ended||m.attempt.background==='quiet')return;
    const snap=m.attempt.snapshot;
    m.bgTimer=setTimeout(()=>{const current=S.measure;if(!current||current.ended)return;const surface=$('measure-surface'),colors=['#e7edf8','#e5f0e9','#f5e9e2','#ece6f5','#e2eff1'];let next=Math.floor(randomDelay(0,colors.length));if(next===current.lastColor)next=(next+1)%colors.length;current.lastColor=next;surface.style.backgroundColor=['colors','mixed'].includes(current.attempt.background)?colors[next]:'#f1f4fa';surface.classList.remove('pattern-dots','pattern-lines','pattern-grid');if(['patterns','mixed'].includes(current.attempt.background)){const patterns=['pattern-dots','pattern-lines','pattern-grid'];let p=Math.floor(randomDelay(0,3));if(p===current.lastPattern)p=(p+1)%3;current.lastPattern=p;surface.classList.add(patterns[p]);}current.changes++;scheduleBackground();},randomDelay(snap.changeMin,snap.changeMax));
  }
  async function finishMeasure(interrupted=false,reason='',manualMs=null) {
    const m=S.measure;if(!m||m.ended)return;if(m.started==null&&manualMs==null)return;
    m.ended=true;clearTimeout(m.bgTimer);clearTimeout(m.limit);
    const elapsedMs=manualMs==null?Math.max(1,Math.min(Math.round(performance.now()-m.started),(m.attempt.snapshot.maxSeconds+0.5)*1000)):manualMs;
    const payload=Object.assign({},m.credentials,{attemptId:m.attempt.id,elapsedMs,interrupted,reason,changes:m.changes});
    queueFinish(payload);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('measure-dialog').close();S.measure=null;
    await flushQueue(false);
    try{await snapshot();toast(read('outbox',[]).length?'Medición pendiente de confirmación. No cierres este navegador.':interrupted?'Intento registrado como interrumpido.':'Medición registrada.');}catch(e){toast(e.message);}
  }
  async function abortMeasure(reason='Cancelado por el participante') {
    const m=S.measure;if(!m||m.ended)return;
    if(m.started!=null)return finishMeasure(true,reason);
    m.ended=true;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});$('measure-dialog').close();S.measure=null;
    try{await api.call('cancelAttempt',Object.assign(m.credentials,{attemptId:m.attempt.id,reason}));await snapshot();}catch(e){toast(e.message);}
  }
  function worksheetSummary(sheets) {
    return Object.entries(sheets).map(([trial,sheet])=>`<details class="settings-group" open><summary>Trabajo propuesto · ${trial==='all'?'todos los intentos':'intento '+E(trial)}</summary><div class="settings-body"><p class="small">Media automática: ${E(sheet.manual?.mean||'—')} s · Moda: ${E(sheet.manual?.mode||'—')} · Mínimo: ${E(sheet.manual?.min||'—')} · Máximo: ${E(sheet.manual?.max||'—')} · Recorrido: ${E(sheet.manual?.range||'—')}</p><div class="table-wrap"><table><thead><tr><th>Tiempo (s)</th><th>Frecuencia absoluta</th><th>Cálculo porcentual</th><th>Frecuencia porcentual</th></tr></thead><tbody>${(sheet.frequency||[]).map(row=>`<tr><td>${E(row.value)}</td><td>${E(row.count)}</td><td>(${E(row.count||'fa')} ÷ ${E(row.denominator||'N')}) × 100</td><td>${E(row.percentage)}</td></tr>`).join('')}</tbody></table></div></div></details>`).join('');
  }
  function trialButtons(action,current,available=['1','2','all']) {
    const list=Array.from(new Set(['1','2','all',...available]));
    return `<div class="segmented" role="group" aria-label="Seleccionar intento">${list.map(value=>`<button type="button" data-action="${action}" data-value="${value}" aria-pressed="${String(current)===value}" ${available.includes(value)?'':'disabled'}>${value==='all'?'Todos los intentos':value==='1'?'1.er intento':value==='2'?'2.º intento':'Intento '+E(value)}</button>`).join('')}</div>`;
  }
  function homeURL() {
    const url=new URL(roomURL());url.searchParams.set('source','home');return url.href;
  }
  function qrPanel() {
    const url=homeURL(),qr=qrcode(0,'M');qr.addData(url,'Byte');qr.make();
    const size=qr.getModuleCount(),margin=4,dimension=size+margin*2;let path='';
    for(let row=0;row<size;row++)for(let col=0;col<size;col++)if(qr.isDark(row,col))path+=`M${col+margin} ${row+margin}h1v1h-1z`;
    return `<details class="qr-details" ${S.qrOpen?'open':''}><summary>Mostrar QR para la tarea</summary><div class="qr-layout"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" class="task-qr" role="img" aria-label="Código QR del enlace de la tarea" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg><div><p>Escanea para entrar directamente al experimento de la tarea.</p><p class="small home-link">${E(url)}</p><button type="button" data-action="copy-home">Copiar enlace para la tarea</button>${location.protocol==='file:'?'<p class="small muted">Para abrir este QR en otro dispositivo, publica primero el sitio y usa el enlace de GitHub Pages.</p>':''}</div></div></details>`;
  }
  function homeworkBreakdown() {
    if(S.route!=='teacher')return '';
    const views=C.analysisViews(S.snapshot.attempts.filter(a=>a.source==='home'),{...S.session.config,unlock:4,showTable:true,showChart:true,showRaw:false,showStats:false,showAutoMean:false,studentTrials:['1','2','all']}),trial=views.some(v=>v.trial===S.homeTrial)?S.homeTrial:(views[0]?.trial||'1');S.homeTrial=trial;
    const view=views.find(v=>v.trial===trial);
    return `<div class="home-breakdown"><h3>Resultados de la tarea por intento</h3>${trialButtons('home-trial',trial,views.map(v=>v.trial))}${view?`<p class="small muted">${view.n} mediciones válidas de ${view.unique} personas de la tarea.</p>${trial==='all'?notice('Cada persona puede aportar dos mediciones; todos los intentos no equivale a personas distintas.'):''}${frequencyTable(view.table||[])}${barChart(view.table||[])}`:notice('El docente puede habilitar las tablas y gráficos de la tarea en Interpretar.')}</div>`;
  }
  function updateManualTotals() {
    if(!$('frequency-body'))return;
    const elements=Array.from($('frequency-body').querySelectorAll('tr'));
    const rows=elements.map(tr=>{const get=k=>tr.querySelector(`[data-freq=${k}]`).value;return {value:get('value'),count:get('count')};});
    const sum=C.proposedSummary(rows),view=(S.snapshot.analysis||[]).find(v=>v.trial===S.analysisTrial),work=C.frequencyWork(rows,view?.n);
    elements.forEach((tr,i)=>{const row=work.rows[i];tr.querySelector('[data-numerator]').textContent=String(row.count).trim()||'fa';tr.querySelector('[data-freq=denominator]').value=row.denominator;tr.querySelector('[data-freq=percentage]').value=row.percentage===''?'':fmt(row.percentage);});
    $('frequency-total').textContent=sum.n==null?'Revisa los datos':String(sum.n);$('percentage-total').textContent=fmt(work.percentage);$('frequency-n').textContent=work.n??'—';
    const mean=view&&Object.hasOwn(view,'mean')?view.mean:sum.mean;$('manual-mean').value=mean==null?'':fmt(mean);
  }
  function teacherTable(records,c) {
    const summary=C.summarize(records,c);
    if(c.includeZero===false)return summary.table;
    return C.expandFrequencies(summary.table,c.precision,{min:summary.min,max:summary.max}).table;
  }
  function renderProjection() {
    const c=S.session.config,phase=S.projectionPhase,trial=S.projectionTrial;
    const records=C.select(S.snapshot.attempts,{trial}),sum=C.summarize(records,c);
    const table=S.projectionZero?C.expandFrequencies(sum.table,c.precision,{min:sum.min,max:sum.max}).table:sum.table;
    const prompts=c.questions[phase].map((q,i)=>`<li><span>${i+1}</span><p>${E(q[1])}</p></li>`).join('');
    let content;
    if(phase===1)content=`<section class="panel"><h2>La pregunta que vamos a investigar</h2><p class="projection-question">${E(c.question)}</p><ol class="discussion-prompts">${prompts}</ol></section>`;
    else if(phase===2)content=protocolPanel(true)+`<section class="panel"><p>En el aula: ${c.attempts} intento(s). En la tarea: ${c.homeAttempts} intento(s) por persona nueva.</p><button class="primary" data-action="projection-collection">${c.collectionOpen?'Cerrar recolección':'Abrir recolección'}</button><ol class="discussion-prompts">${prompts}</ol></section>`;
    else if(phase===3)content=`<section class="panel">${analysisWorkbench({n:sum.n,unique:sum.unique,raw:sum.values.map(seconds=>({seconds})),table,stats:sum},{trial,kind:S.projectionView,trialAction:'projection-trial',viewAction:'projection-view',trials:['1','2','all',...new Set(S.snapshot.attempts.map(a=>String(a.trial)))],available:['raw','table','chart','stats']})}<div class="actions"><button data-action="projection-zero" aria-pressed="${S.projectionZero}">${S.projectionZero?'Ocultar':'Incluir'} frecuencias 0</button><button class="primary" data-action="projection-reveal">Mostrar esta selección a estudiantes</button></div><p class="small muted">Los resultados de la sesión muestran la misma representación al compartirla. El grupo conserva las selecciones que tenga autorizadas.</p><h3 style="margin-top:32px">Construir, calcular y argumentar</h3><p>Completen las frecuencias absolutas y observen el cálculo automático de los porcentajes y de la media. Después respondan:</p><ol class="discussion-prompts">${prompts}</ol></section>`;
    else content=`<section class="panel"><h2>Interpretar y ampliar la investigación</h2><ol class="discussion-prompts">${prompts}</ol><h3>Tarea: dos intentos por persona nueva</h3><p>Participación voluntaria de familiares o amigos. Mantengan el protocolo y no registren de nuevo a alguien que ya participó.</p>${qrPanel()}${homeworkBreakdown()}<div class="actions"><button class="primary" data-action="prepare-homework">Preparar tarea del día 2</button></div></section>${expansionTable(S.snapshot.attempts,c)}`;
    $('main').innerHTML=`<section id="projection-stage" class="projection-stage"><div class="projection-toolbar"><div><p class="eyebrow">PROYECCIÓN EN CLASE · ${E(S.session.code)}</p><h1>${phase}. ${phaseNames[phase-1]}</h1></div><div class="inline"><button data-action="projection-fullscreen">Pantalla completa</button><button data-action="teacher-tab" data-value="overview">Salir de proyección</button></div></div><nav class="projection-steps" aria-label="Secciones de la clase">${phaseNames.map((name,i)=>`<button data-action="projection-phase" data-value="${i+1}" aria-current="${phase===i+1?'step':'false'}">${i+1}. ${name}<small>${c.unlock>=i+1?'Habilitado para estudiantes':'Pendiente de habilitar'}</small></button>`).join('')}</nav><div class="projection-release"><span>Estudiantes: habilitado hasta <strong>${phaseNames[c.unlock-1]}</strong></span><button class="primary" data-action="projection-unlock">Habilitar ${phaseNames[phase-1]} para estudiantes</button></div>${content}</section>`;
  }

  document.addEventListener('submit',async event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement))return;event.preventDefault();
    if(S.busy)return;S.busy=true;const submit=form.querySelector('button[type=submit],button:not([type])');if(submit)submit.disabled=true;
    try {
      if(form.id==='join-form'){const session=await api.call('lookup',{code:form.elements['session-code'].value.trim()});S.pendingSession=session;S.registrationSource=new URLSearchParams(location.search).get('source')==='home'?'home':'class';S.pendingRegistration=null;S.route='register';render();focusPage();}
      else if(form.id==='register-form'){
        const fd=new FormData(form),source=fd.get('participant-source')||'class',c=C.participantConfig(S.pendingSession.config,source),profile={name:fd.get('participant-name')||'',gender:fd.get('participant-gender')||'',group:fd.get('participant-group'),source:fd.get('participant-source')||'class',extra:{},voluntary:fd.has('home-voluntary'),firstParticipation:fd.has('home-first')};c.extraFields.forEach(f=>profile.extra[f.id]=fd.get('extra-'+f.id)||'');
        if(!S.pendingRegistration)S.pendingRegistration={registrationId:C.uuid(),token:C.uuid()+C.uuid()};
        const entry=S.pendingRegistration,result=await api.call('register',{sessionId:S.pendingSession.id,profile,registrationId:entry.registrationId,participantToken:entry.token});
        const roster=read('roster',[]);if(!roster.some(x=>x.id===result.participant.id))roster.push(Object.assign({},result.participant,{token:entry.token}));write('roster',roster);S.pendingRegistration=null;await enterParticipant(result.participant,entry.token,S.pendingSession);
      } else if(form.id==='teacher-login-form')await login({method:'key',id:form.elements['teacher-id'].value,key:form.elements['teacher-key'].value});
      else if(form.id==='create-session-form'){const template=S.sessions.find(x=>x.id===form.elements['session-template'].value);const config=template?JSON.parse(JSON.stringify(template.config)):C.defaults();config.collectionOpen=false;config.unlock=1;config.resultsReleased=false;const created=await api.call('createSession',{token:S.teacherToken,title:form.elements['new-session-title'].value,config});await loadSessions();await openSession(created.id);toast('Sesión creada. Comparte su código para comenzar.');}
      else if(form.id==='phase-form'){const phase=S.phase,values=formValues(form);write('draft:'+S.participant.id+':'+phase,values);await api.call('saveAnswers',Object.assign(credentials(),{phase,values}));await snapshot(false);$('phase-save-status').textContent='Respuestas guardadas';toast('Respuestas guardadas.');}
      else if(form.id==='settings-form'){const c=settingsValues(form);await saveConfig(c,S.settingsBaseVersion);}
      else if(form.id==='prepare-measure')await prepareMeasure(form);
      else if(form.id==='manual-measure-form'){const n=Number(form.elements['external-seconds'].value);C.number(n,.001,S.measure.attempt.snapshot.maxSeconds,'Tiempo externo');await finishMeasure(false,'',Math.round(n*1000));}
      else if(form.id==='review-form'){await api.call('reviewAttempt',Object.assign(teacherArgs(),{attemptId:form.dataset.attemptId,status:form.elements['review-status'].value,reason:form.elements['review-reason'].value}));await snapshot();toast('Revisión registrada.');}
    }catch(e){const slot=form.querySelector('[role=alert]');if(slot)slot.textContent=e.message;else toast(e.message);}
    finally{S.busy=false;if(submit&&submit.isConnected)submit.disabled=false;}
  });
  document.addEventListener('toggle',event=>{if(event.target.matches?.('.qr-details'))S.qrOpen=event.target.open;},true);
  document.addEventListener('input',event=>{if(event.target.closest('#phase-form')){updateManualTotals();saveDraft();}if(event.target.closest('#settings-form'))S.dirtySettings=true;if(event.target.id==='agreed-protocol'){S.protocolDraft=event.target.value;S.protocolDirty=true;}});
  document.addEventListener('change',async event=>{
    const el=event.target;if(el.closest('#phase-form'))saveDraft();if(el.closest('#settings-form'))S.dirtySettings=true;
    if(el.id==='analysis-trial'){saveDraft();S.analysisTrial=el.value;render();}
    else if(el.id==='participant-source'){S.registrationSource=el.value;renderRegister();}
    else if(el.id.startsWith('filter-')){S.filter[el.id.replace('filter-','')]=el.value;render();}
    else if(el.id==='response-participant'){S.responseParticipant=el.value;render();}
  });
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action;
    try {
      if(action==='demo'){api.demo();S.route='home';S.teacher=null;S.teacherToken=null;S.participant=null;render();}
      else if(action==='reset-demo'){api.resetDemo();write('roster',[]);write('outbox',[]);render();toast('Datos de ejemplo restablecidos.');}
      else if(action==='demo-login')await login({method:'demo'});
      else if(action==='resume'){const p=read('roster',[]).find(x=>x.id===$('roster-select').value);await enterParticipant(p,p.token,S.pendingSession);}
      else if(action==='phase'){if(S.participant?.source==='home')return;saveDraft();S.phase=Number(button.dataset.value);render();focusPage();}
      else if(action==='analysis-view'){S.analysisView=button.dataset.value;render();}
      else if(action==='teacher-view'){S.teacherView=button.dataset.value;render();}
      else if(action==='protocol-autonomous'){S.protocolDraft=C.autonomousInstructions();S.protocolDirty=true;render();}
      else if(action==='protocol-save'){const value=$('agreed-protocol').value;await saveConfig({...S.session.config,agreedProtocol:value});S.protocolDraft=null;S.protocolDirty=false;render();}
      else if(action==='analysis-trial'){saveDraft();S.analysisTrial=button.dataset.value;render();}
      else if(action==='home-trial'){saveDraft();S.homeTrial=button.dataset.value;render();}
      else if(action==='teacher-trial'){S.filter.trial=button.dataset.value;render();}
      else if(action==='teacher-tab'){if(S.dirtySettings&&!confirm('Hay preferencias sin guardar. ¿Descartar esos cambios y salir de Configurar?'))return;if(S.teacherTab==='projection'&&button.dataset.value!=='projection'&&document.fullscreenElement)await document.exitFullscreen();S.teacherTab=button.dataset.value;S.dirtySettings=false;await snapshot();focusPage();}
      else if(action==='switch'){saveDraft();S.pendingSession=S.session;S.registrationSource=S.participant.source==='home'?'home':'class';S.pendingRegistration=null;S.route='register';render();focusPage();}
      else if(action==='sessions'){if(S.dirtySettings&&!confirm('Hay preferencias sin guardar. ¿Descartar esos cambios y ver las sesiones?'))return;S.dirtySettings=false;await loadSessions();}
      else if(action==='open-session')await openSession(button.dataset.id);
      else if(action==='logout'){if(S.dirtySettings&&!confirm('Hay preferencias sin guardar. ¿Descartar esos cambios y cerrar el acceso?'))return;S.dirtySettings=false;await api.call('logout',{token:S.teacherToken});S.teacher=null;S.teacherToken=null;sessionStorage.removeItem(storageKey('teacher'));S.route='home';render();}
      else if(action==='copy-room')await copyText(roomURL());
      else if(action==='copy-home')await copyText(homeURL());
      else if(action==='private-link'){const u=new URL(roomURL());u.hash=new URLSearchParams({participant:S.participant.id,token:S.participantToken,session:S.session.id}).toString();await copyText(u.href);}
      else if(action==='quick-save'){const c=JSON.parse(JSON.stringify(S.session.config));c.unlock=Number($('quick-phase').value);c.collectionOpen=document.querySelector('[name=quick-collection]').checked;c.allowHome=document.querySelector('[name=quick-home]').checked;c.resultsReleased=document.querySelector('[name=quick-release]').checked;await saveConfig(c);}
      else if(action==='prepare-homework'){const c=JSON.parse(JSON.stringify(S.session.config));Object.assign(c,{unlock:4,allowHome:true,collectionOpen:true,homeAnonymous:true,homeAttempts:2,studentTrials:['1','2','all'],feedback:'teacher',resultsReleased:false,showRaw:false,showTable:false,showChart:false,showStats:false});await saveConfig(c);toast('Tarea abierta: dos intentos por persona nueva, sin nombres y con resultados ocultos.');}
      else if(action==='reload-settings'){S.dirtySettings=false;await snapshot();}
      else if(action==='add-extra'){C.assert(S.extraFields.length<8,'Máximo ocho campos adicionales.');const label=$('extra-label').value.trim(),type=$('extra-type').value;C.assert(label,'Escribe el nombre del campo.');const id='field_'+C.uuid().slice(0,8);const f={id,label,type,required:document.querySelector('[name=extra-required]').checked,options:type==='select'?$('extra-options').value.split('\n').map(x=>x.trim()).filter(Boolean):[]};if(type==='select')C.assert(f.options.length,'Agrega las opciones de la lista.');S.extraFields.push(f);$('extra-fields-list').innerHTML=extraFieldsList();$('extra-label').value='';$('extra-options').value='';S.dirtySettings=true;}
      else if(action==='remove-extra'){S.extraFields.splice(Number(button.dataset.index),1);$('extra-fields-list').innerHTML=extraFieldsList();S.dirtySettings=true;}
      else if(action==='add-frequency'){C.assert($('frequency-body').rows.length<120,'Máximo 120 filas.');$('frequency-body').insertAdjacentHTML('beforeend',frequencyRow());updateManualTotals();saveDraft();}
      else if(action==='remove-frequency'){button.closest('tr').remove();updateManualTotals();saveDraft();}
      else if(action==='manual-chart'){
        const proposed=formValues($('phase-form')).frequency.filter(r=>r.value.trim()||r.count.trim()).map(r=>({value:Number(r.value.replace(',','.')),count:Number(r.count)}));
        C.assert(proposed.length>0,'Completa al menos una fila de tu tabla.');C.assert(proposed.every(r=>Number.isFinite(r.value)&&r.value>=0&&r.value<=300&&Number.isInteger(r.count)&&r.count>=0),'Cada fila necesita un tiempo válido y una frecuencia entera mayor o igual a cero.');C.assert(proposed.some(r=>r.count>0),'Registra al menos una frecuencia mayor que cero.');C.assert(new Set(proposed.map(r=>r.value)).size===proposed.length,'Cada valor debe aparecer una sola vez en la tabla.');
        proposed.sort((a,b)=>a.value-b.value);$('manual-chart-slot').innerHTML=notice('Este gráfico representa tu tabla propuesta, no verifica todavía los datos del experimento.')+barChart(C.expandFrequencies(proposed,S.session.config.precision).table);saveDraft();
      }
      else if(action==='check-analysis'){
        const view=S.snapshot.analysis.find(x=>x.trial===S.analysisTrial),sum=view?.stats;C.assert(sum?.n,'No hay cálculos visibles para esta selección.');const v=formValues($('phase-form')).manual,parse=x=>Number(String(x).replace(',','.'));
        const labels={mean:'Media',min:'Mínimo',max:'Máximo',range:'Recorrido',percentage:'Porcentaje'};let lines=Object.entries(labels).map(([k,label])=>{const value=String(v[k]||'').trim(),ok=value&&Math.abs(parse(value)-sum[k])<=.06;return `${label}: ${ok?'coincide':'revisa'} (referencia: ${fmt(sum[k])}${k==='percentage'?' %':' s'}).`;});
        lines.push('Moda: compara '+(v.mode||'tu respuesta')+' con '+(sum.modes.length?sum.modes.map(x=>fmt(x)).join(', ')+' s':'sin moda')+'.');$('manual-check').innerHTML=notice(lines.join(' '));
      }
      else if(action==='cancel-running'){await api.call('cancelAttempt',Object.assign(credentials(),{attemptId:button.dataset.id,reason:'Cancelado tras interrumpir la actividad'}));await snapshot();}
      else if(action==='projection-phase'){S.projectionPhase=Number(button.dataset.value);render();focusPage();}
      else if(action==='projection-trial'){S.projectionTrial=button.dataset.value;render();}
      else if(action==='projection-view'){S.projectionView=button.dataset.value;render();}
      else if(action==='projection-zero'){S.projectionZero=!S.projectionZero;render();}
      else if(action==='projection-unlock'){const c={...S.session.config,unlock:S.projectionPhase};await saveConfig(c);}
      else if(action==='projection-reveal'){const c={...S.session.config,unlock:Math.max(3,S.session.config.unlock),studentTrials:[S.projectionTrial],includeZero:S.projectionZero,sharedAnalysisTrial:S.projectionTrial,sharedAnalysisView:S.projectionView};c[{raw:'showRaw',table:'showTable',chart:'showChart',stats:'showStats'}[S.projectionView]]=true;await saveConfig(c);}
      else if(action==='projection-collection'){await saveConfig({...S.session.config,unlock:Math.max(2,S.session.config.unlock),collectionOpen:!S.session.config.collectionOpen});}
      else if(action==='projection-fullscreen'){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('No se pudo activar pantalla completa en este navegador.');}}
      else if(action==='sync'){await flushQueue(true);await snapshot();}
      else if(action==='review'){
        const a=S.snapshot.attempts.find(x=>x.id===button.dataset.id);$('review-slot').innerHTML=`<form id="review-form" class="review-form" data-attempt-id="${E(a.id)}" style="margin-top:24px"><h3>Revisar intento ${a.trial}</h3>${select('Estado','review-status',['valid','invalid'],a.status,{valid:'Válido',invalid:'Inválido'})}${field('Motivo de la revisión','review-reason',a.reason||'','text','Se conserva en la auditoría.',true)}<button class="primary">Guardar revisión</button></form>`;$('review-slot').scrollIntoView({block:'nearest'});
      }
      else if(action.startsWith('export-'))exportData(action);
    }catch(e){toast(e.message);}
  });
  function exportData(action) {
    const snap=S.snapshot,c=S.session.config;
    if(action==='export-session'){download(JSON.stringify({exportedAt:new Date().toISOString(),...snap},null,2),S.session.code+'-respaldo.json','application/json');return;}
    let rows,cols,name;
    if(action==='export-frequency'){rows=teacherTable(C.select(snap.attempts,S.filter),c).map(x=>({seconds:x.value,frequency:x.count,percentage:x.relative*100}));cols=['seconds','frequency','percentage'];name='frecuencias';}
    else if(action==='export-answers'){rows=snap.answers.map(a=>({participantId:a.participantId,name:snap.participants.find(x=>x.id===a.participantId)?.name||'',phase:a.phase,values:JSON.stringify(a.values),updatedAt:a.updatedAt}));cols=['participantId','name','phase','values','updatedAt'];name='respuestas';}
    else {
      rows=snap.attempts.map(a=>Object.assign({},a,{name:snap.participants.find(x=>x.id===a.participantId)?.name||'',seconds:a.elapsedMs==null?'':a.elapsedMs/1000,extras:JSON.stringify(snap.participants.find(x=>x.id===a.participantId)?.extra||{})}));
      if(action==='export-anonymous'){const aliases=new Map();snap.participants.forEach((p,i)=>aliases.set(p.id,'P'+String(i+1).padStart(3,'0')));rows=rows.filter(a=>a.status==='valid').map(a=>({...a,participantId:aliases.get(a.participantId)}));cols=['participantId','trial','seconds','secondsRounded','target','group','source','mode','background','status','configVersion'];name='datos-anonimos';}
      else {cols=['id','participantId','name','gender','group','source','trial','elapsedMs','seconds','secondsRounded','target','mode','background','status','reason','configVersion','startedAt','finishedAt','extras'];name='intentos';}
    }download(C.csv(rows,cols),S.session.code+'-'+name+'.csv','text/csv;charset=utf-8');
  }
  document.querySelector('.brand')?.addEventListener('click',event=>{event.preventDefault();$('home-button').click();});
  $('home-button').addEventListener('click',()=>{if(S.dirtySettings&&!confirm('Hay preferencias sin guardar. ¿Descartar esos cambios y volver al inicio?'))return;S.dirtySettings=false;saveDraft();S.route='home';render();focusPage();});
  $('teacher-button').addEventListener('click',async()=>{if(S.dirtySettings&&!confirm('Hay preferencias sin guardar. ¿Descartar esos cambios y cambiar de vista?'))return;S.dirtySettings=false;saveDraft();try{if(S.teacherToken)await loadSessions();else{S.route='teacherLogin';render();}focusPage();}catch(e){S.teacherToken=null;S.route='teacherLogin';render();toast(e.message);}});
  $('measure-control').addEventListener('click',()=>{if(S.measure?.mode==='hold')return;if(S.measure?.started==null)startClock();else finishMeasure();});
  $('measure-control').addEventListener('pointerdown',event=>{if(S.measure?.mode!=='hold'||event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);startClock();});
  $('measure-control').addEventListener('pointerup',event=>{if(S.measure?.mode==='hold'){event.preventDefault();finishMeasure();}});
  $('measure-control').addEventListener('pointercancel',()=>{if(S.measure?.started!=null)finishMeasure(true,'El contacto con el botón se interrumpió');});
  $('measure-control').addEventListener('keydown',event=>{if(S.measure?.mode==='hold'&&[' ','Enter'].includes(event.key)){event.preventDefault();if(!event.repeat)startClock();}});
  $('measure-control').addEventListener('keyup',event=>{if(S.measure?.mode==='hold'&&[' ','Enter'].includes(event.key)){event.preventDefault();finishMeasure();}});
  $('abort-measure').addEventListener('click',()=>abortMeasure());
  $('fullscreen-measure').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('measure-surface').requestFullscreen)await $('measure-surface').requestFullscreen();else toast('Este navegador no ofrece pantalla completa. Oculta los relojes visibles antes de medir.');}catch{toast('No se pudo activar pantalla completa. Puedes medir siguiendo el protocolo acordado.');}});
  $('measure-dialog').addEventListener('cancel',event=>{event.preventDefault();abortMeasure();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.measure?.started!=null)finishMeasure(true,'La pestaña dejó de estar visible');});
  window.addEventListener('beforeunload',event=>{if(S.measure?.started!=null||read('outbox',[]).length||S.dirtySettings){event.preventDefault();event.returnValue='';}});
  api.onStatus=text=>{$('connection').textContent=text;};
  async function poll() {
    if(S.polling||S.busy||S.measure||S.watching||document.hidden||!['student','teacher'].includes(S.route))return;
    S.polling=true;
    try {
      await flushQueue();const previous=JSON.stringify(S.snapshot);
      if(await snapshot(false)){
        $('connection').textContent=read('outbox',[]).length?'Hay registros pendientes':api.mode==='demo'?'Demostración local':'Conectado';
        if(!S.dirtySettings&&previous!==JSON.stringify(S.snapshot))renderPreservingEditor();
      }
    }catch(error){$('connection').textContent='Sin actualización';}
    finally{S.polling=false;}
  }
  async function initialize() {
    if(cfg.standaloneDemo)api.demo();render();
    if(cfg.appsScriptUrl){$('connection').textContent='Conectando…';try{await api.live(cfg.appsScriptUrl);render();const saved=sessionStorage.getItem(storageKey('teacher'));if(saved){const t=JSON.parse(saved);S.teacher=t.teacher;S.teacherToken=t.token;}
      const hash=new URLSearchParams(location.hash.slice(1));if(hash.has('participant')&&hash.has('token')&&hash.has('session')){
        S.session={id:hash.get('session')};S.participant={id:hash.get('participant')};S.participantToken=hash.get('token');S.route='student';await snapshot();
        const roster=read('roster',[]);if(!roster.some(x=>x.id===S.participant.id))roster.push({...S.participant,token:S.participantToken});write('roster',roster);history.replaceState(null,'',location.pathname+location.search);
      }
    }catch(e){$('connection').textContent='Conexión pendiente';toast(e.message);}}
    else $('connection').textContent=api.mode==='demo'?'Demostración local':'Sin configurar';
    const entry=new URLSearchParams(location.search);
    if(S.route==='home'&&entry.get('source')==='home'&&entry.get('s')&&(api.mode==='demo'||api.bridgeWindow)){try{S.pendingSession=await api.call('lookup',{code:entry.get('s')});S.registrationSource='home';S.route='register';render();}catch(error){toast(error.message);}}
    const interval=Math.max(15,Number(cfg.pollSeconds)||20)*1000;
    setInterval(poll,interval+Math.round(Math.random()*1000));
    const controls=Math.max(3,Math.min(10,Number(cfg.controlPollSeconds)||3))*1000;
    setInterval(watchSession,controls+Math.round(Math.random()*350));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){watchSession();poll();}});
  }
  initialize();
})();
