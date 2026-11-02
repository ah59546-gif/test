import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const SHARED_KEY="pocket-crm-relational-v2";
const SESSION_KEY="pocket-crm-supabase-session-v1";

class MockStorage{
  constructor(){this.values=new Map()}
  getItem(key){return this.values.has(String(key))?this.values.get(String(key)):null}
  setItem(key,value){this.values.set(String(key),String(value))}
  removeItem(key){this.values.delete(String(key))}
}

function wait(milliseconds){
  return new Promise(resolve=>setTimeout(resolve,milliseconds));
}

test("창이 다시 활성화돼도 저장 전 원격 값이 새 입력을 덮어쓰지 않는다",async()=>{
  const source=await readFile(new URL("../dist/shared-sync.js",import.meta.url),"utf8");
  const localStorage=new MockStorage();
  const sessionStorage=new MockStorage();
  localStorage.setItem(SESSION_KEY,JSON.stringify({
    access_token:"test-token",
    refresh_token:"test-refresh",
    expires_at:Math.floor(Date.now()/1000)+3600,
    user:{id:"test-user",email:"design@pocket.company"}
  }));
  localStorage.setItem(SHARED_KEY,"old-value");

  let remoteValue="old-value";
  let reloadCount=0;
  let syncChip=null;
  const documentListeners=new Map();
  const windowListeners=new Map();

  const document={
    readyState:"complete",
    visibilityState:"visible",
    head:{appendChild(){}},
    body:{appendChild(element){if(element.className==="shared-sync-chip")syncChip=element}},
    addEventListener(type,handler){documentListeners.set(type,handler)},
    querySelector(selector){return selector===".shared-sync-chip"?syncChip:null},
    createElement(){
      const span={textContent:""};
      const button={onclick:null};
      return {
        className:"",
        dataset:{},
        textContent:"",
        set innerHTML(value){this.html=value},
        get innerHTML(){return this.html||""},
        querySelector(selector){return selector==="span"?span:selector==="button"?button:null},
        remove(){if(syncChip===this)syncChip=null}
      };
    }
  };

  const context=vm.createContext({
    Storage:MockStorage,
    localStorage,
    sessionStorage,
    document,
    window:{
      addEventListener(type,handler){windowListeners.set(type,handler)},
      dispatchEvent(){}
    },
    location:{hash:"",pathname:"/",search:"",reload(){reloadCount+=1}},
    history:{replaceState(){}},
    CustomEvent:class CustomEvent{constructor(type){this.type=type}},
    fetch:async(url,options={})=>{
      if(options.method==="POST"){
        const row=JSON.parse(options.body);
        await wait(25);
        remoteValue=row.storage_value;
        return {ok:true,status:204,json:async()=>null};
      }
      return {
        ok:true,
        status:200,
        json:async()=>[{storage_key:SHARED_KEY,storage_value:remoteValue,updated_at:new Date().toISOString()}]
      };
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval:()=>0,
    clearInterval:()=>{},
    URLSearchParams,
    Date,
    Math,
    JSON,
    Promise,
    Set,
    Map
  });

  vm.runInContext(source,context,{filename:"shared-sync.js"});
  await wait(20);
  assert.equal(typeof windowListeners.get("focus"),"function");

  localStorage.setItem(SHARED_KEY,"new-value");
  windowListeners.get("focus")();
  await wait(80);

  assert.equal(remoteValue,"new-value");
  assert.equal(localStorage.getItem(SHARED_KEY),"new-value");
  assert.equal(reloadCount,0);
});

