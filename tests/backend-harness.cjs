const vm=require('node:vm');
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
function harness(){
  const props=new Map(),cache=new Map(),sheets=new Map();
  class Sheet {
    constructor(){this.rows=[];}
    appendRow(row){this.rows.push([...row]);return this;}
    setFrozenRows(){}
    getLastRow(){return this.rows.length;}
    getRange(r,c,n=1,m=1){return {getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>this.rows[r-1+i]?.[c-1+j]??'')),setValues:values=>{values.forEach((row,i)=>{if(!this.rows[r-1+i])this.rows[r-1+i]=[];row.forEach((v,j)=>this.rows[r-1+i][c-1+j]=v);});}};}
  }
  const ctx=vm.createContext({console,Date,Map,Set,JSON,Math,Number,String,Array,Object,Error,Boolean,
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,v)=>{props.set(k,v);return this;},deleteProperty:k=>props.delete(k)})},
    CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v),remove:k=>cache.delete(k)})},
    SpreadsheetApp:{openById:()=>({getSheetByName:k=>sheets.get(k),insertSheet:k=>{const s=new Sheet();sheets.set(k,s);return s;}})},
    LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
    Utilities:{getUuid:crypto.randomUUID,Charset:{UTF_8:'utf8'},DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_algorithm,value)=>[...crypto.createHash('sha256').update(value).digest()],base64DecodeWebSafe:s=>[...Buffer.from(s,'base64url')],newBlob:bytes=>({getDataAsString:()=>Buffer.from(bytes).toString('utf8')})},
    UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getAllHeaders:()=>({'Cache-Control':'max-age=3600'}),getContentText:()=>JSON.stringify(ctx.googleJWKS||{keys:[]})})}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Core.gs'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../apps-script/Code.gs'),'utf8'),ctx);
  const origin='https://example.github.io',nonce=crypto.randomUUID();
  props.set('ALLOWED_ORIGINS',origin);
  props.set('BOOTSTRAP_TEACHERS',JSON.stringify([{id:'docente1',name:'Docente 1',key:'demo-test-secret-1',email:'one@example.com'},{id:'docente2',name:'Docente 2',key:'demo-test-secret-2',email:'two@example.com'}]));
  ctx.setupFromProperties_();
  function dispatch(action,payload={}){return JSON.parse(JSON.stringify(ctx.dispatch({origin,nonce,action,payload})));}
  function call(action,payload={}){const r=dispatch(action,payload);if(!r.ok)throw new Error(r.error);return r.data;}
  const token=call('login',{id:'docente1',key:'demo-test-secret-1'}).token;
  const secondToken=call('login',{id:'docente2',key:'demo-test-secret-2'}).token;
  function create(config={}){return call('createSession',{token,title:'Clase de prueba',config:Object.assign(ctx.ThirtyCore.defaults(),config)});}
  function register(s,profile={}){
    const participantToken=crypto.randomUUID()+crypto.randomUUID(),registrationId=crypto.randomUUID();
    const request={sessionId:s.id,registrationId,participantToken,profile:Object.assign({name:'Persona de prueba',group:'Grupo A',gender:'Mujer',source:'class'},profile)};
    const result=call('register',request);return {participant:result.participant,args:{sessionId:s.id,participantId:result.participant.id,participantToken},request};
  }
  return {ctx,props,cache,sheets,dispatch,call,token,secondToken,create,register,origin,nonce};
}
module.exports={harness};
