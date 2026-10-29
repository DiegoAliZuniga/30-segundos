/* Apps Script bridge avoids opaque no-cors writes: every mutation gets a receipt.
 * Demo storage is isolated and never used as a fallback for a failed live request.
 */
var ThirtyAPI = (function () {
  'use strict';
  const C=ThirtyCore, KEY='thirty-demo-projection-v3';
  const id=()=>C.uuid();
  const copy=x=>JSON.parse(JSON.stringify(x));
  function makeDemo() {
    const config=C.defaults(); Object.assign(config,{unlock:4,collectionOpen:true,showRaw:true,allowHome:true,attempts:2});
    const session={id:'demo-session',code:'DEMO30',title:'Exploración · 30 segundos',version:1,config,updatedAt:new Date().toISOString()};
    const participants=[],attempts=[];
    [22,27,28,29,30,31,31,32,34,35,38,41].forEach((v,i)=>{
      const p={id:'demo-p-'+i,sessionId:session.id,name:'Participante '+(i+1),gender:i%2?'Mujer':'Hombre',group:i<6?'Grupo A':'Grupo B',source:'class',extra:{},createdAt:new Date().toISOString(),token:'seeded-not-for-login'};participants.push(p);
      attempts.push({id:'demo-a-'+i,participantId:p.id,sessionId:p.sessionId,trial:1,elapsedMs:v*1000,secondsRounded:v,target:30,group:p.group,gender:p.gender,source:'class',mode:'pair',background:'quiet',status:'valid',reason:'',configVersion:1,startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()});
    });
    [24,28,30,29,30,30,32,31,30,33,35,37].forEach((v,i)=>{const p=participants[i];attempts.push({id:'demo-second-'+i,participantId:p.id,sessionId:p.sessionId,trial:2,elapsedMs:v*1000,secondsRounded:v,target:30,group:p.group,gender:p.gender,source:'class',mode:'pair',background:'quiet',status:'valid',reason:'',configVersion:1,startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()});});
    return {sessions:[session],participants,attempts,answers:[],audit:[]};
  }
  class API {
    constructor() {this.mode='unconfigured';this.pending=new Map();this.nonce=id();this.onStatus=()=>{};this.listener=this.receive.bind(this);window.addEventListener('message',this.listener);}
    async live(url) {
      if(!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(url))throw new Error('La conexión requiere la URL de Apps Script terminada en /exec.');
      this.mode='live';this.bridgeWindow=null;this.bridgeOrigin=null;
      const wait=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;});
      this.iframe=document.createElement('iframe');this.iframe.title='Servicio de registro';this.iframe.hidden=true;
      this.iframe.src=url+'?origin='+encodeURIComponent(location.origin)+'&nonce='+this.nonce;document.body.append(this.iframe);
      const timeout=setTimeout(()=>this.rejectReady(new Error('No se pudo conectar. Revisa el despliegue, ALLOWED_ORIGINS y las restricciones del navegador.')),25000);
      try {await wait;this.onStatus('Conectado');} finally {clearTimeout(timeout);}
    }
    receive(event) {
      const m=event.data;
      const validOrigin=/^https:\/\/[a-zA-Z0-9.-]+\.googleusercontent\.com$/.test(event.origin)||event.origin==='https://script.google.com';
      if(!validOrigin||!m||m.channel!=='thirty-seconds'||m.nonce!==this.nonce)return;
      if(m.type==='ready'&&!this.bridgeWindow) {this.bridgeWindow=event.source;this.bridgeOrigin=event.origin;this.resolveReady?.();return;}
      if(event.source!==this.bridgeWindow||event.origin!==this.bridgeOrigin)return;
      if(m.type==='response') {const item=this.pending.get(m.id);if(!item)return;clearTimeout(item.timeout);this.pending.delete(m.id);m.result?.ok?item.resolve(m.result.data):item.reject(new Error(m.result?.error||'Solicitud rechazada.'));}
    }
    demo() {this.mode='demo';if(!localStorage.getItem(KEY))localStorage.setItem(KEY,JSON.stringify(makeDemo()));this.onStatus('Demostración local');}
    resetDemo() {localStorage.setItem(KEY,JSON.stringify(makeDemo()));}
    async call(action,payload={}) {
      if(this.mode==='demo')return this.demoCall(action,payload);
      if(this.mode!=='live'||!this.bridgeWindow)throw new Error('El servicio todavía no está conectado.');
      const requestId=id();
      return new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>{this.pending.delete(requestId);reject(new Error('No recibimos la confirmación. El registro puede haberse guardado; reintenta para verificarlo sin duplicarlo.'));},35000);
        this.pending.set(requestId,{resolve,reject,timeout});
        this.bridgeWindow.postMessage({channel:'thirty-seconds',nonce:this.nonce,type:'request',id:requestId,action,payload},this.bridgeOrigin);
      });
    }
    demoCall(action,p) {
      const db=JSON.parse(localStorage.getItem(KEY)); let data;
      const admin=['listSessions','createSession','teacherSnapshot','updateSession','reviewAttempt'];
      if(admin.includes(action))C.assert(p.token==='demo-teacher','Ingresa al portal docente de demostración.');
      const s=db.sessions.find(x=>x.id===p.sessionId);
      if(action==='login')return {token:'demo-teacher',teacher:{id:'demo',name:'Docente de demostración'}};
      if(action==='logout')return {saved:true};
      if(action==='listSessions')return copy(db.sessions);
      if(action==='lookup'){const found=db.sessions.find(x=>x.code===String(p.code||'').toUpperCase());C.assert(found,'No encontramos esa sesión. En la demostración usa DEMO30.');found.config=C.config(found.config);return copy(found);}
      if(action==='createSession'){const x={id:id(),code:id().slice(0,7).toUpperCase(),title:C.text(p.title,120),config:C.config(p.config||{}),version:1,updatedAt:new Date().toISOString()};C.assert(x.title,'Escribe el nombre de la sesión.');db.sessions.push(x);data=x;}
      else {
        C.assert(s,'Sesión no encontrada.');s.config=C.config(s.config);
        if(action==='register'){
          C.assert(s.config.collectionOpen||s.config.unlock===1,'El registro está cerrado.');
          const old=db.participants.find(x=>x.registrationId===p.registrationId&&x.sessionId===s.id);
          if(old){C.assert(old.token===p.participantToken,'Credencial de registro inválida.');return {participant:this.clean(old)};}
          const r=Object.assign(C.profile(p.profile,s.config),{id:id(),sessionId:s.id,registrationId:p.registrationId,token:p.participantToken,createdAt:new Date().toISOString()});db.participants.push(r);data={participant:this.clean(r)};
        } else if(action==='teacherSnapshot')data={session:s,participants:db.participants.filter(x=>x.sessionId===s.id).map(this.clean),attempts:db.attempts.filter(x=>x.sessionId===s.id),answers:db.answers.filter(x=>x.sessionId===s.id)};
        else if(action==='updateSession'){C.assert(s.version===p.version,'Otro docente modificó la sesión. Actualiza antes de guardar.');s.config=C.config(p.config);s.version++;s.updatedAt=new Date().toISOString();data=s;}
        else if(action==='reviewAttempt'){const a=db.attempts.find(x=>x.id===p.attemptId&&x.sessionId===s.id);C.assert(a&&a.status!=='running'&&a.elapsedMs>0&&['valid','invalid'].includes(p.status),'Intento inválido.');C.assert(C.text(p.reason,300),'Escribe el motivo.');a.status=p.status;a.reason=p.reason;data={saved:true};}
        else {
          const r=db.participants.find(x=>x.id===p.participantId&&x.sessionId===s.id&&x.token===p.participantToken);C.assert(r,'Acceso de participante inválido.');
          const own=db.attempts.filter(x=>x.sessionId===s.id&&x.participantId===r.id),c=s.config,pc=C.participantConfig(c,r.source);
          if(action==='studentSnapshot') {
            const reveal=C.feedbackAllowed(pc,own),scoped=db.attempts.filter(x=>x.sessionId===s.id&&x.status==='valid'&&(c.studentScope==='all'||(c.studentScope==='group'&&x.group===r.group)||(c.studentScope==='own'&&x.participantId===r.id)));
            const analysis=r.source==='home'?[]:C.analysisViews(scoped,c),homeAnalysis=r.source==='home'||c.unlock<4||c.showTaskResults===false?[]:C.analysisViews(scoped.filter(x=>x.source==='home'),{...c,showRaw:false,showTable:true,showChart:true,showStats:false,showAutoMean:false});
            data={session:s,participant:this.clean(r),feedbackVisible:reveal,own:own.map(x=>{const z={id:x.id,status:x.status,consumed:x.status==='valid'||(r.source==='home'&&x.elapsedMs>0),trial:x.trial,mode:x.mode,background:x.background,reason:x.reason,configVersion:x.configVersion,target:x.target};if(reveal&&x.elapsedMs!=null)z.seconds=C.round(x.elapsedMs/1000,c.precision);return z;}),answers:r.source==='home'?[]:db.answers.filter(x=>x.sessionId===s.id&&x.participantId===r.id),analysis,homeAnalysis};
          } else if(action==='startAttempt') {
            C.assert(c.collectionOpen&&c.unlock>=2,'La recolección está cerrada.');C.assert(r.source!=='home'||c.allowHome,'La tarea está cerrada.');
            const prior=own.find(x=>x.id===p.attemptId);if(prior)return {attempt:{id:prior.id,trial:prior.trial,target:prior.target,mode:prior.mode,background:prior.background,status:prior.status,snapshot:copy(prior.snapshot)}};
            own.filter(x=>x.status==='running'&&Date.now()-Date.parse(x.startedAt)>(x.snapshot.maxSeconds+120)*1000).forEach(x=>{x.status='invalid';x.reason='Intento abandonado';});
            C.assert(!own.some(x=>x.status==='running'),'Ya hay un intento en curso.');const used=C.usedAttempts(own,r.source);C.assert(used<pc.attempts,'Ya completaste los intentos.');C.assert(c.modes.includes(p.mode),'Modalidad no habilitada.');
            const requested=c.allowBackgroundChoice?p.background:c.background;C.assert(C.backgrounds.includes(requested)&&(!c.allowBackgroundChoice||c.backgroundChoices.includes(requested)),'Fondo no habilitado.');
            const background=p.reduceMotion&&c.respectReducedMotion?'quiet':requested;
            const a={id:p.attemptId,sessionId:s.id,participantId:r.id,trial:used+1,target:c.target,mode:p.mode,background,backgroundRequested:requested,source:r.source,group:r.group,gender:r.gender,status:'running',reason:'',configVersion:s.version,startedAt:new Date().toISOString(),snapshot:{target:c.target,toleranceLow:c.toleranceLow,toleranceHigh:c.toleranceHigh,precision:c.precision,maxSeconds:c.maxSeconds,background,changeMin:c.changeMin,changeMax:c.changeMax}};db.attempts.push(a);data={attempt:a};
          } else if(action==='finishAttempt') {
            const a=own.find(x=>x.id===p.attemptId);C.assert(a,'Intento no encontrado.');if(a.status==='running'){a.elapsedMs=Math.round(C.number(p.elapsedMs,1,(a.snapshot.maxSeconds+1)*1000,'Tiempo'));a.secondsRounded=C.round(a.elapsedMs/1000,a.snapshot.precision);a.status=p.interrupted?'invalid':'valid';a.reason=p.interrupted?(p.reason||'Interrumpido'):'';a.finishedAt=new Date().toISOString();a.changes=p.changes||0;}data={saved:true,id:a.id,status:a.status};
          } else if(action==='cancelAttempt'){const a=own.find(x=>x.id===p.attemptId);C.assert(a,'Intento no encontrado.');if(a.status==='running'){a.status='invalid';a.reason=p.reason||'Cancelado';}data={saved:true};}
          else if(action==='saveAnswers'){
            C.assert(Number(p.phase)<=c.unlock,'Momento no habilitado.');const key=s.id+':'+r.id+':'+p.phase,old=db.answers.find(x=>x.id===key),a={id:key,sessionId:s.id,participantId:r.id,phase:Number(p.phase),values:C.cleanLearningValues(p.values,c,p.phase),questions:copy(c.questions[p.phase]),configVersion:s.version,updatedAt:new Date().toISOString()};if(old)Object.assign(old,a);else db.answers.push(a);data={saved:true};
          } else throw new Error('Acción desconocida.');
        }
      }
      localStorage.setItem(KEY,JSON.stringify(db));return copy(data);
    }
    clean(x) {const r=copy(x);delete r.token;delete r.registrationId;return r;}
  }
  return {API,makeDemo};
})();
