(()=>{
  "use strict";

  const SUPABASE_URL="https://ilnklntqkdbbtzzbhqrl.supabase.co";
  const SUPABASE_KEY="sb_publishable_5ZOv7q88mKDVjefos5I3FA_ZxKGM3d7";
  const TABLE="pocket_investor_crm_state";
  const SESSION_KEY="pocket-crm-supabase-session-v1";
  const ALLOWED_EMAILS=new Set(["design@pocket.company","pocket.kjy01@gmail.com"]);
  const SHARED_KEYS=new Set([
    "pocket-crm-relational-v2",
    "pocket-crm-investor-interest-companies-v1",
    "pocket-crm-pocketday-schedule-v4",
    "pocket-crm-pocketday-operation-types-v1",
    "pocket-crm-company-remaining-rounds-v1",
    "pocket-crm-company-types-v1",
    "pocket-crm-admin-company-terms-v1",
    "pocket-crm-company-notes-v1",
    "pocket-crm-linked-investor-v1"
  ]);

  const nativeSetItem=Storage.prototype.setItem;
  let session=readSession();
  let applyingRemote=false;
  let syncReady=false;
  const pendingKeys=new Set();
  const timers=new Map();

  Storage.prototype.setItem=function(key,value){
    nativeSetItem.call(this,key,value);
    if(this===localStorage&&!applyingRemote&&SHARED_KEYS.has(String(key))){
      queuePush(String(key));
    }
  };

  function readSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null}
  }

  function saveSession(next){
    session=next;
    if(next)nativeSetItem.call(localStorage,SESSION_KEY,JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  }

  function parseAuthRedirect(){
    const raw=location.hash.replace(/^#/,"");
    if(!raw.includes("access_token="))return false;
    const params=new URLSearchParams(raw);
    const accessToken=params.get("access_token");
    const refreshToken=params.get("refresh_token");
    if(!accessToken||!refreshToken)return false;
    saveSession({
      access_token:accessToken,
      refresh_token:refreshToken,
      expires_at:Math.floor(Date.now()/1000)+Number(params.get("expires_in")||3600),
      user:null
    });
    history.replaceState(null,"",`${location.pathname}${location.search}#/admin/adminHome`);
    return true;
  }

  function authHeaders(token=session?.access_token){
    const headers={apikey:SUPABASE_KEY,"content-type":"application/json"};
    if(token)headers.Authorization=`Bearer ${token}`;
    return headers;
  }

  async function authRequest(path,body){
    const response=await fetch(`${SUPABASE_URL}/auth/v1/${path}`,{
      method:"POST",headers:authHeaders(null),body:JSON.stringify(body)
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(payload.msg||payload.message||payload.error_description||payload.error||"인증 요청에 실패했습니다.");
    return payload;
  }

  async function refreshSession(){
    if(!session?.refresh_token)return false;
    try{
      const next=await authRequest("token?grant_type=refresh_token",{refresh_token:session.refresh_token});
      saveSession(normalizeSession(next));
      return true;
    }catch{
      saveSession(null);
      return false;
    }
  }

  function normalizeSession(payload){
    return {
      access_token:payload.access_token,
      refresh_token:payload.refresh_token,
      expires_at:Math.floor(Date.now()/1000)+Number(payload.expires_in||3600),
      user:payload.user||null
    };
  }

  function sessionEmail(){
    if(session?.user?.email)return String(session.user.email).toLowerCase();
    const token=session?.access_token||"";
    try{
      const json=JSON.parse(decodeURIComponent(escape(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))));
      return String(json.email||"").toLowerCase();
    }catch{return ""}
  }

  async function ensureSession(){
    if(!session?.access_token)return false;
    if(Number(session.expires_at||0)<=Math.floor(Date.now()/1000)+60){
      if(!await refreshSession())return false;
    }
    if(!ALLOWED_EMAILS.has(sessionEmail())){
      saveSession(null);
      return false;
    }
    return true;
  }

  async function rest(path,options={},retry=true){
    if(!await ensureSession())throw new Error("로그인이 필요합니다.");
    const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
      ...options,
      headers:{...authHeaders(),...(options.headers||{})}
    });
    if(response.status===401&&retry&&await refreshSession())return rest(path,options,false);
    if(!response.ok){
      const payload=await response.json().catch(()=>({}));
      throw new Error(payload.message||payload.hint||"공용 데이터 저장에 실패했습니다.");
    }
    if(response.status===204)return null;
    return response.json().catch(()=>null);
  }

  function queuePush(key){
    pendingKeys.add(key);
    if(!syncReady||!session)return;
    clearTimeout(timers.get(key));
    timers.set(key,setTimeout(()=>pushKey(key),280));
  }

  async function pushKey(key){
    if(!SHARED_KEYS.has(key)||!session)return;
    const value=localStorage.getItem(key);
    if(value===null)return;
    try{
      setStatus("saving","저장 중");
      await rest(`${TABLE}?on_conflict=storage_key`,{
        method:"POST",
        headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify({storage_key:key,storage_value:value,updated_at:new Date().toISOString(),updated_by:session.user?.id||null})
      });
      pendingKeys.delete(key);
      setStatus("ok","공용 데이터 연결됨");
    }catch(error){
      setStatus("error","저장 재시도 필요");
      console.error("Pocket CRM shared sync push failed",error);
    }
  }

  async function fetchRows(){
    return await rest(`${TABLE}?select=storage_key,storage_value,updated_at&order=storage_key.asc`)||[];
  }

  async function pushAllLocal(){
    const rows=[...SHARED_KEYS].map(key=>{
      const value=localStorage.getItem(key);
      return value===null?null:{storage_key:key,storage_value:value,updated_at:new Date().toISOString(),updated_by:session.user?.id||null};
    }).filter(Boolean);
    if(!rows.length)return false;
    await rest(`${TABLE}?on_conflict=storage_key`,{
      method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)
    });
    return true;
  }

  async function pullRemote({reload=true}={}){
    const rows=await fetchRows();
    if(!rows.length){
      await pushAllLocal();
      return false;
    }
    let changed=false;
    applyingRemote=true;
    try{
      rows.forEach(row=>{
        if(SHARED_KEYS.has(row.storage_key)&&localStorage.getItem(row.storage_key)!==row.storage_value){
          nativeSetItem.call(localStorage,row.storage_key,row.storage_value);
          changed=true;
        }
      });
    }finally{applyingRemote=false}
    if(changed&&reload){
      nativeSetItem.call(sessionStorage,"pocket-crm-synced-reload","1");
      location.reload();
    }
    return changed;
  }

  function injectStyles(){
    const style=document.createElement("style");
    style.textContent=`
      .shared-sync-chip{position:fixed;z-index:99990;right:18px;bottom:18px;display:flex;align-items:center;gap:8px;border:1px solid #d7e0f1;background:rgba(255,255,255,.94);box-shadow:0 8px 24px rgba(24,43,82,.12);border-radius:999px;padding:8px 11px;font:600 12px/1.2 inherit;color:#60708d}
      .shared-sync-chip i{width:8px;height:8px;border-radius:50%;background:#22b573}.shared-sync-chip[data-state=saving] i{background:#f3b62f}.shared-sync-chip[data-state=error] i{background:#ef4c62}
      .shared-sync-chip button{border:0;background:transparent;color:#315cff;font:700 12px inherit;cursor:pointer;padding:0 0 0 5px}
    `;
    document.head.appendChild(style);
  }

  function renderChip(){
    document.querySelector(".shared-sync-chip")?.remove();
    const chip=document.createElement("div");
    chip.className="shared-sync-chip";
    chip.dataset.state="ok";
    chip.innerHTML=`<i></i><span>공용 데이터 연결됨</span><button type="button">연결 해제</button>`;
    chip.querySelector("button").onclick=async()=>{
      try{if(session?.access_token)await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:authHeaders()})}catch{}
      saveSession(null);
      chip.remove();
    };
    document.body.appendChild(chip);
  }

  function setStatus(state,label){
    const chip=document.querySelector(".shared-sync-chip");
    if(!chip)return;
    chip.dataset.state=state;
    const span=chip.querySelector("span");
    if(span)span.textContent=label;
  }

  async function connectAndSync(){
    if(!await ensureSession())return;
    renderChip();
    setStatus("saving","공용 데이터 확인 중");
    try{
      await pullRemote({reload:true});
      syncReady=true;
      [...pendingKeys].forEach(queuePush);
      setStatus("ok","공용 데이터 연결됨");
    }catch(error){
      console.error("Pocket CRM shared sync initialization failed",error);
      setStatus("error","연결 확인 필요");
    }
  }

  async function init(){
    injectStyles();
    parseAuthRedirect();
    if(await ensureSession())await connectAndSync();

    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible"&&syncReady&&session)pullRemote({reload:true}).catch(()=>setStatus("error","연결 확인 필요"));
    });
    window.addEventListener("focus",()=>{
      if(syncReady&&session)pullRemote({reload:true}).catch(()=>setStatus("error","연결 확인 필요"));
    });
    setInterval(()=>{
      if(session&&Number(session.expires_at||0)<=Math.floor(Date.now()/1000)+300)refreshSession();
    },60000);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();

