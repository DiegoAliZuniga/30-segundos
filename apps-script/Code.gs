/* 30 segundos — server-side authorization and append-safe Google Sheets storage.
 * Install using docs/GUIA.md. Only doGet and dispatch are public RPC endpoints.
 */
var TS_SHEET_ID_ = '1g6cQuJ0M47_wlQfWcrt2S22w1Mp2RdPAB6xp2j8un9U';
var TS_TABLES_ = {
  sessions: ['TS_Sesiones', ['id','code','title','version','updatedAt','record_json']],
  participants: ['TS_Participantes', ['id','sessionId','name','gender','group','source','extra','createdAt','record_json']],
  attempts: ['TS_Intentos', ['id','sessionId','participantId','trial','elapsedMs','secondsRounded','target','mode','background','source','group','gender','status','reason','configVersion','startedAt','finishedAt','record_json']],
  answers: ['TS_Respuestas', ['id','sessionId','participantId','phase','configVersion','questions','values','updatedAt','record_json']],
  audit: ['TS_Auditoria', ['id','at','teacher','action','sessionId','record_json']]
};
function props_() { return PropertiesService.getScriptProperties(); }
function uuid_() { return Utilities.getUuid(); }
function now_() { return new Date().toISOString(); }
function hash_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8).map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join(''); }
function constantEqual_(a,b) { a=String(a||'');b=String(b||'');var diff=a.length^b.length;for(var i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0; }
function book_() { return SpreadsheetApp.openById(props_().getProperty('SPREADSHEET_ID') || TS_SHEET_ID_); }
function sheet_(key) {
  var spec=TS_TABLES_[key],s=book_().getSheetByName(spec[0]);
  if(!s) {s=book_().insertSheet(spec[0]);s.appendRow(spec[1]);s.setFrozenRows(1);}
  var h=s.getRange(1,1,1,spec[1].length).getValues()[0];
  ThirtyCore.assert(h.join('|')===spec[1].join('|'),'Las columnas de '+spec[0]+' no coinciden. No se modificó la pestaña; revisa la guía.');return s;
}
function rows_(key) {
  var s=sheet_(key),n=s.getLastRow();if(n<2)return [];
  return s.getRange(2,1,n-1,TS_TABLES_[key][1].length).getValues().map(function(row,i){var obj=JSON.parse(row[row.length-1]);obj._row=i+2;return obj;});
}
function safeCell_(v) { if(v===null||v===undefined)return '';if(typeof v==='object')v=JSON.stringify(v);if(typeof v==='string' && /^[\s]*[=+@-]/.test(v))return "'"+v;return v; }
function put_(key,obj) {
  var s=sheet_(key),h=TS_TABLES_[key][1],row=obj._row,clean=JSON.parse(JSON.stringify(obj));delete clean._row;
  var cells=h.map(function(k){return safeCell_(k==='record_json'?JSON.stringify(clean):clean[k]);});
  if(row)s.getRange(row,1,1,h.length).setValues([cells]);else s.appendRow(cells);if(key==='sessions')cacheSessionState_(clean);return clean;
}
function strip_(obj) { var x=JSON.parse(JSON.stringify(obj));delete x._row;delete x.tokenHash;delete x.registrationId;return x; }
function startPublic_(a) {return {id:a.id,trial:a.trial,target:a.target,mode:a.mode,background:a.background,status:a.status,snapshot:a.snapshot};}
function find_(key,id) { var x=rows_(key).find(function(r){return r.id===id;});ThirtyCore.assert(x,'Registro no encontrado.');return x; }
function audit_(teacher,action,sessionId,detail) {put_('audit',{id:uuid_(),at:now_(),teacher:teacher.id,action:action,sessionId:sessionId||'',detail:detail||{}});}
function teachers_() { return JSON.parse(props_().getProperty('TEACHERS_JSON')||'[]'); }
function setupFromProperties_() {
  // Run manually in the Apps Script editor; not callable through google.script.run.
  var raw=props_().getProperty('BOOTSTRAP_TEACHERS');
  ThirtyCore.assert(raw,'Primero configura BOOTSTRAP_TEACHERS en las propiedades del script.');
  var input=JSON.parse(raw);ThirtyCore.assert(Array.isArray(input)&&input.length>0&&input.length<=20,'Lista docente inválida.');
  var previous=teachers_(),out=[];
  input.forEach(function(t){
    var id=ThirtyCore.text(t.id,40);ThirtyCore.assert(/^[a-z0-9_-]{2,40}$/.test(id),'ID docente inválido.');
    var old=previous.find(function(x){return x.id===id;}),key=String(t.key||''),salt=uuid_();
    ThirtyCore.assert(key.length>=12 || old,'Cada docente nuevo necesita una clave de al menos 12 caracteres.');
    out.push({id:id,name:ThirtyCore.text(t.name||id,100),email:ThirtyCore.text(t.email,180).toLowerCase(),googleSub:ThirtyCore.text(t.googleSub||(old&&old.googleSub)||'',100),salt:key?salt:old.salt,keyHash:key?hash_(salt+'|'+key):old.keyHash,active:true});
  });
  ThirtyCore.assert(new Set(out.map(function(t){return t.id;})).size===out.length,'IDs docentes repetidos.');
  props_().setProperty('TEACHERS_JSON',JSON.stringify(out));props_().deleteProperty('BOOTSTRAP_TEACHERS');
  props_().setProperty('AUTH_VERSION',uuid_());
  Object.keys(TS_TABLES_).forEach(sheet_);
  return 'Configuración completa. Las claves iniciales se eliminaron de BOOTSTRAP_TEACHERS.';
}
function allowedOrigin_(origin) {
  var list=(props_().getProperty('ALLOWED_ORIGINS')||'').split(',').map(function(x){return x.trim();}).filter(Boolean);
  return list.includes(origin) && /^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(origin);
}
function doGet(e) {
  var origin=String((e.parameter||{}).origin||''),nonce=String((e.parameter||{}).nonce||'');
  if(!allowedOrigin_(origin)||! /^[a-zA-Z0-9-]{16,80}$/.test(nonce))return HtmlService.createHtmlOutput('Origen no habilitado. Revisa ALLOWED_ORIGINS y la URL de GitHub Pages.');
  var t=HtmlService.createTemplateFromFile('Bridge');t.parentOrigin=JSON.stringify(origin);t.channelNonce=JSON.stringify(nonce);
  return t.evaluate().setTitle('30 segundos · conexión').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function teacher_(token) {
  ThirtyCore.assert(typeof token==='string'&&token.length>=30,'Inicia sesión como docente.');
  var raw=CacheService.getScriptCache().get('auth:'+hash_(token));ThirtyCore.assert(raw,'La sesión docente caducó. Vuelve a ingresar.');
  var login=JSON.parse(raw),t=teachers_().find(function(x){return x.id===login.id&&x.active;});
  ThirtyCore.assert(t&&login.expires>Date.now()&&login.version===props_().getProperty('AUTH_VERSION'),'La sesión docente caducó.');return t;
}
function bytesHex_(bytes) {return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function b64Bytes_(s) {ThirtyCore.assert(/^[A-Za-z0-9_-]+$/.test(s),'Token Google mal formado.');return Utilities.base64DecodeWebSafe(s+'='.repeat((4-s.length%4)%4));}
function modPow_(base,exponent,modulus) {var result=BigInt(1),zero=BigInt(0),one=BigInt(1),two=BigInt(2);while(exponent>zero){if(exponent%two===one)result=result*base%modulus;exponent/=two;base=base*base%modulus;}return result;}
function googleKeys_(refresh) {
  var cache=CacheService.getScriptCache(),cached=!refresh&&cache.get('google:jwks');if(cached)return JSON.parse(cached);
  var response=UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v3/certs',{muteHttpExceptions:true});ThirtyCore.assert(response.getResponseCode()===200,'No se pudieron obtener las claves públicas de Google.');
  var raw=response.getContentText(),data=JSON.parse(raw);ThirtyCore.assert(Array.isArray(data.keys),'Claves públicas Google inválidas.');
  var headers=response.getAllHeaders(),ttl=3600;Object.keys(headers).forEach(function(k){if(k.toLowerCase()==='cache-control'){var match=String(headers[k]).match(/max-age=(\d+)/);if(match)ttl=Math.min(21600,Math.max(60,Number(match[1])));}});
  cache.put('google:jwks',raw,ttl);return data;
}
function verifyGoogle_(credential) {
  ThirtyCore.assert(typeof credential==='string'&&credential.length<8000,'Credencial inválida.');
  var parts=credential.split('.');ThirtyCore.assert(parts.length===3,'Token Google mal formado.');
  var header=JSON.parse(Utilities.newBlob(b64Bytes_(parts[0])).getDataAsString('UTF-8'));
  ThirtyCore.assert(header.alg==='RS256'&&typeof header.kid==='string','Firma Google no admitida.');
  var keys=googleKeys_(false).keys,key=keys.find(function(k){return k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256';});
  if(!key)key=googleKeys_(true).keys.find(function(k){return k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256';});
  ThirtyCore.assert(key,'Clave de firma Google desconocida.');
  var nBytes=b64Bytes_(key.n),signature=b64Bytes_(parts[2]),modulus=BigInt('0x'+bytesHex_(nBytes)),exponent=BigInt('0x'+bytesHex_(b64Bytes_(key.e))),sig=BigInt('0x'+bytesHex_(signature));
  ThirtyCore.assert(signature.length===nBytes.length&&sig<modulus,'Firma Google inválida.');
  var digest=hash_(parts[0]+'.'+parts[1]),digestInfo='3031300d060960864801650304020105000420'+digest,padding=nBytes.length-digestInfo.length/2-3;
  ThirtyCore.assert(padding>=8,'Clave RSA Google inválida.');
  var expected='0001'+'ff'.repeat(padding)+'00'+digestInfo,actual=modPow_(sig,exponent,modulus).toString(16).padStart(nBytes.length*2,'0');
  ThirtyCore.assert(constantEqual_(expected,actual),'Firma Google inválida.');
  return JSON.parse(Utilities.newBlob(b64Bytes_(parts[1])).getDataAsString('UTF-8'));
}
function login_(p,bridgeNonce) {
  var cache=CacheService.getScriptCache(),id=ThirtyCore.text(p.id,40),rateKey='login:'+hash_(id||String(p.credential||'').slice(-30));
  var attempts=Number(cache.get(rateKey)||0);ThirtyCore.assert(attempts<8,'Demasiados intentos. Espera diez minutos.');cache.put(rateKey,String(attempts+1),600);
  var t;
  if(p.method==='google') {
    var clientId=props_().getProperty('GOOGLE_CLIENT_ID');ThirtyCore.assert(clientId,'El acceso Google todavía no está configurado.');
    var claim=verifyGoogle_(p.credential);
    ThirtyCore.assert(claim.aud===clientId&&['accounts.google.com','https://accounts.google.com'].includes(claim.iss)&&Number(claim.exp)*1000>Date.now()&&(claim.email_verified===true||claim.email_verified==='true')&&constantEqual_(claim.nonce,bridgeNonce),'Credencial Google no válida para esta aplicación.');
    ThirtyCore.assert(!claim.iat||Number(claim.iat)*1000<=Date.now()+60000,'Token Google emitido en el futuro.');
    t=teachers_().find(function(x){return x.active&&(x.googleSub?x.googleSub===claim.sub:(x.email&&x.email===String(claim.email||'').toLowerCase()&&(String(claim.email).endsWith('@gmail.com')||!!claim.hd)));});
  } else {
    t=teachers_().find(function(x){return x.id===id&&x.active;});
    if(!t||!constantEqual_(hash_(t.salt+'|'+String(p.key||'')),t.keyHash))t=null;
  }
  ThirtyCore.assert(t,'Acceso no autorizado. Revisa tu ID y clave o la cuenta Google.');
  cache.remove(rateKey);var token=uuid_()+uuid_();
  cache.put('auth:'+hash_(token),JSON.stringify({id:t.id,expires:Date.now()+7200000,version:props_().getProperty('AUTH_VERSION')}),7200);
  return {token:token,teacher:{id:t.id,name:t.name}};
}
function cacheSessionState_(s) {
  try {CacheService.getScriptCache().put('session-state:'+s.id,JSON.stringify(sessionPublic_(s)),21600);}catch(error){}
}
function sessionStatus_(p) {
  var id=ThirtyCore.text(p.sessionId,80);ThirtyCore.assert(id,'Falta la sesión.');
  var cache=CacheService.getScriptCache(),raw=cache.get('session-state:'+id),s;
  if(raw){try{s=JSON.parse(raw);}catch(error){}}
  if(!s){
    // The same lock as preference writes prevents an older cache fill from
    // overwriting a more recent section release during simultaneous requests.
    var lock=LockService.getScriptLock();ThirtyCore.assert(lock.tryLock(5000),'Actualización ocupada. Vuelve a intentar.');
    try {raw=cache.get('session-state:'+id);if(raw){try{s=JSON.parse(raw);}catch(error){}}
      if(!s){s=sessionPublic_(find_('sessions',id));cacheSessionState_(s);}
    } finally {lock.releaseLock();}
  }
  return Number(p.version)===s.version?{version:s.version,changed:false}:{version:s.version,changed:true,session:s};
}
function session_(p) {var s=find_('sessions',p.sessionId);s.config=ThirtyCore.config(s.config);return s;}
function participant_(p) {
  var r=find_('participants',p.participantId);ThirtyCore.assert(r.sessionId===p.sessionId&&constantEqual_(hash_(String(p.participantToken||'')),r.tokenHash),'Acceso de participante inválido.');return r;
}
function sessionPublic_(s) {s.config=ThirtyCore.config(s.config);return {id:s.id,code:s.code,title:s.title,version:s.version,updatedAt:s.updatedAt,config:s.config};}
function register_(p,s) {
  var c=s.config;ThirtyCore.assert(c.collectionOpen||c.unlock===1,'El registro está cerrado.');
  var r=ThirtyCore.profile(p.profile||{},c),registrationId=ThirtyCore.text(p.registrationId,80),token=String(p.participantToken||'');
  ThirtyCore.assert(/^[a-zA-Z0-9-]{16,80}$/.test(registrationId)&&/^[a-zA-Z0-9-]{32,100}$/.test(token),'Identificación de registro inválida.');
  var existing=rows_('participants').find(function(x){return x.sessionId===s.id&&x.registrationId===registrationId;});
  if(existing){ThirtyCore.assert(constantEqual_(existing.tokenHash,hash_(token)),'El registro ya existe con otra credencial.');return {participant:strip_(existing)};}
  r.id=uuid_();r.sessionId=s.id;r.createdAt=now_();r.tokenHash=hash_(token);r.registrationId=registrationId;put_('participants',r);
  return {participant:strip_(r)};
}
function snapshot_(s,r,isTeacher) {
  var all=rows_('attempts').filter(function(x){return x.sessionId===s.id;});
  var participants=isTeacher?rows_('participants').filter(function(x){return x.sessionId===s.id;}):[];
  var answers=rows_('answers').filter(function(x){return x.sessionId===s.id;});
  if(isTeacher)return {session:sessionPublic_(s),participants:participants.map(strip_),attempts:all.map(strip_),answers:answers.map(strip_)};
  var own=all.filter(function(x){return x.participantId===r.id;}),reveal=ThirtyCore.feedbackAllowed(ThirtyCore.participantConfig(s.config,r.source),own);
  var c=s.config;
  var scoped=all.filter(function(x){return x.status==='valid'&&(c.studentScope==='all'||(c.studentScope==='group'&&x.group===r.group)||(c.studentScope==='own'&&x.participantId===r.id));});
  var analysis=r.source==='home'?[]:ThirtyCore.analysisViews(scoped,c);
  var taskConfig=Object.assign({},c,{showRaw:false,showTable:true,showChart:true,showStats:false,showAutoMean:false});
  var homeAnalysis=r.source==='home'||c.unlock<4||c.showTaskResults===false?[]:ThirtyCore.analysisViews(scoped.filter(function(x){return x.source==='home';}),taskConfig);
  return {session:sessionPublic_(s),participant:strip_(r),own:own.map(function(x){var a={id:x.id,trial:x.trial,status:x.status,consumed:x.status==='valid'||(r.source==='home'&&x.elapsedMs>0),mode:x.mode,background:x.background,reason:x.reason||'',configVersion:x.configVersion,target:x.target};if(reveal&&x.elapsedMs!=null)a.seconds=ThirtyCore.round(x.elapsedMs/1000,c.precision);return a;}),answers:r.source==='home'?[]:answers.filter(function(x){return x.participantId===r.id;}).map(strip_),analysis:analysis,homeAnalysis:homeAnalysis,feedbackVisible:reveal};
}
function start_(p,s,r) {
  var c=ThirtyCore.participantConfig(s.config,r.source);ThirtyCore.assert(c.collectionOpen&&c.unlock>=2,'La recolección está cerrada.');ThirtyCore.assert(r.source!=='home'||c.allowHome,'La tarea está cerrada.');
  var existing=rows_('attempts').filter(function(x){return x.sessionId===s.id&&x.participantId===r.id;});
  var id=ThirtyCore.text(p.attemptId,80);ThirtyCore.assert(/^[a-zA-Z0-9-]{16,80}$/.test(id),'Identificador de intento inválido.');
  var prior=existing.find(function(x){return x.id===id;});if(prior)return {attempt:startPublic_(prior)};
  // Running leases expire after the safety limit plus two minutes; stale drafts don't block a new trial.
  existing.filter(function(x){return x.status==='running'&&Date.now()-Date.parse(x.startedAt)>(x.snapshot.maxSeconds+120)*1000;}).forEach(function(x){x.status='invalid';x.reason='Intento interrumpido o abandonado';put_('attempts',x);});
  ThirtyCore.assert(!existing.some(function(x){return x.status==='running';}),'Ya hay un intento en curso para esta persona.');
  var used=ThirtyCore.usedAttempts(existing,r.source);
  ThirtyCore.assert(used<c.attempts,'Ya completaste los intentos permitidos.');
  ThirtyCore.assert(c.modes.includes(p.mode),'Esta modalidad no está habilitada.');
  var requested=c.allowBackgroundChoice?p.background:c.background;ThirtyCore.assert(ThirtyCore.backgrounds.includes(requested)&&(!c.allowBackgroundChoice||c.backgroundChoices.includes(requested)),'Fondo no habilitado.');
  var actual=(p.reduceMotion&&c.respectReducedMotion)?'quiet':requested;
  var a={id:id,sessionId:s.id,participantId:r.id,trial:used+1,elapsedMs:null,secondsRounded:null,target:c.target,mode:p.mode,background:actual,backgroundRequested:requested,source:r.source,group:r.group,gender:r.gender,status:'running',reason:'',configVersion:s.version,startedAt:now_(),finishedAt:'',snapshot:{agreedProtocol:ThirtyCore.protocolText(c),target:c.target,toleranceLow:c.toleranceLow,toleranceHigh:c.toleranceHigh,precision:c.precision,maxSeconds:c.maxSeconds,background:actual,backgroundRequested:requested,changeMin:c.changeMin,changeMax:c.changeMax,respectReducedMotion:c.respectReducedMotion}};
  put_('attempts',a);return {attempt:startPublic_(a)};
}
function finish_(p,s,r) {
  var a=find_('attempts',p.attemptId);ThirtyCore.assert(a.sessionId===s.id&&a.participantId===r.id,'Intento de otra persona.');
  if(a.status!=='running'){ThirtyCore.assert(a.elapsedMs!=null,'Este intento ya fue cancelado. Su medición pendiente requiere revisión docente.');return {saved:true,id:a.id,status:a.status};}
  var elapsed=ThirtyCore.number(p.elapsedMs,1,(a.snapshot.maxSeconds+1)*1000,'Tiempo medido');
  ThirtyCore.assert(Date.now()-Date.parse(a.startedAt)<30*86400000,'El intento caducó. Solicita una revisión docente.');
  a.elapsedMs=Math.round(elapsed);a.secondsRounded=ThirtyCore.round(elapsed/1000,a.snapshot.precision);
  a.status=p.interrupted?'invalid':'valid';a.reason=p.interrupted?ThirtyCore.text(p.reason||'Intento interrumpido',300):'';
  a.changes=ThirtyCore.number(p.changes||0,0,500,'Cambios de fondo');a.finishedAt=now_();put_('attempts',a);
  return {saved:true,id:a.id,status:a.status};
}
function saveAnswers_(p,s,r) {
  var phase=ThirtyCore.number(p.phase,1,4,'Momento');ThirtyCore.assert(Number.isInteger(phase)&&phase<=s.config.unlock,'Este momento aún no está habilitado.');
  var values=ThirtyCore.cleanLearningValues(p.values,s.config,phase);
  var id=s.id+':'+r.id+':'+phase,old=rows_('answers').find(function(x){return x.id===id;});
  put_('answers',{id:id,_row:old&&old._row,sessionId:s.id,participantId:r.id,phase:phase,values:values,questions:s.config.questions[phase],configVersion:s.version,updatedAt:now_()});return {saved:true};
}
function dispatch(request) {
  try {
    ThirtyCore.assert(request&&typeof request==='object'&&JSON.stringify(request).length<60000,'Solicitud inválida.');
    ThirtyCore.assert(allowedOrigin_(request.origin)&&/^[a-zA-Z0-9-]{16,80}$/.test(String(request.nonce||'')),'Origen no autorizado.');
    var p=request.payload||{},action=request.action;
    if(action==='login')return {ok:true,data:login_(p,request.nonce)};
    if(action==='logout'){teacher_(p.token);CacheService.getScriptCache().remove('auth:'+hash_(p.token));return {ok:true,data:{saved:true}};}
    var teacherActions=['listSessions','createSession','teacherSnapshot','updateSession','reviewAttempt'];
    var t=teacherActions.includes(action)?teacher_(p.token):null;
    var lock=LockService.getScriptLock(),mutations=['createSession','updateSession','reviewAttempt','register','startAttempt','finishAttempt','cancelAttempt','saveAnswers'];
    var locked=mutations.includes(action);if(locked)ThirtyCore.assert(lock.tryLock(15000),'El servicio está ocupado. Vuelve a intentar.');
    try {
      var data;
      if(action==='sessionStatus')data=sessionStatus_(p);
      else if(action==='listSessions')data=rows_('sessions').map(sessionPublic_);
      else if(action==='createSession') {
        var title=ThirtyCore.text(p.title,120);ThirtyCore.assert(title,'Escribe el nombre de la sesión.');var code;
        do {code=uuid_().replace(/-/g,'').slice(0,7).toUpperCase();}while(rows_('sessions').some(function(x){return x.code===code;}));
        var s={id:uuid_(),code:code,title:title,config:ThirtyCore.config(p.config||{}),version:1,createdBy:t.id,updatedAt:now_()};put_('sessions',s);audit_(t,action,s.id);data=sessionPublic_(s);
      } else if(action==='lookup') {
        var code=ThirtyCore.text(p.code,20).toUpperCase(),found=rows_('sessions').find(function(x){return x.code===code;});ThirtyCore.assert(found,'No encontramos esa sesión. Revisa el código.');data=sessionPublic_(found);
      } else {
        var s=session_(p);
        if(action==='teacherSnapshot')data=snapshot_(s,null,true);
        else if(action==='updateSession') {
          ThirtyCore.assert(Number(p.version)===s.version,'Otro docente modificó la sesión. Actualiza antes de guardar.');
          s.config=ThirtyCore.config(p.config);s.version++;s.updatedAt=now_();put_('sessions',s);audit_(t,action,s.id,{version:s.version});data=sessionPublic_(s);
        } else if(action==='reviewAttempt') {
          var a=find_('attempts',p.attemptId);ThirtyCore.assert(a.sessionId===s.id&&['valid','invalid'].includes(p.status)&&a.status!=='running'&&a.elapsedMs>0,'No se puede revisar ese intento.');
          var reason=ThirtyCore.text(p.reason,300);ThirtyCore.assert(reason,'Escribe el motivo de la revisión.');a.status=p.status;a.reason=reason;a.reviewedBy=t.id;put_('attempts',a);audit_(t,action,s.id,{attemptId:a.id,status:a.status,reason:reason});data={saved:true};
        } else if(action==='register')data=register_(p,s);
        else {
          var r=participant_(p);
          if(action==='studentSnapshot')data=snapshot_(s,r,false);
          else if(action==='startAttempt')data=start_(p,s,r);
          else if(action==='finishAttempt')data=finish_(p,s,r);
          else if(action==='cancelAttempt') {var a=find_('attempts',p.attemptId);ThirtyCore.assert(a.participantId===r.id&&a.sessionId===s.id,'Intento de otra persona.');if(a.status==='running'){a.status='invalid';a.reason=ThirtyCore.text(p.reason||'Cancelado antes de medir',300);put_('attempts',a);}data={saved:true};}
          else if(action==='saveAnswers')data=saveAnswers_(p,s,r);
          else throw new Error('Acción desconocida.');
        }
      }
      return {ok:true,data:data};
    } finally {if(locked)lock.releaseLock();}
  } catch(e) {return {ok:false,error:e.message||'No se pudo completar la solicitud.'};}
}
