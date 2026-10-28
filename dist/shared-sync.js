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
  let loginMessage="";
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
      loginMessage="이 CRM에 허용되지 않은 계정입니다.";
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
      .shared-sync-lock{position:fixed;inset:0;z-index:100000;background:rgba(12,25,57,.66);backdrop-filter:blur(8px);display:grid;place-items:center;padding:24px}
      .shared-sync-card{width:min(460px,100%);background:#fff;border-radius:24px;box-shadow:0 30px 90px rgba(12,25,57,.3);padding:30px;color:#101d40;font-family:inherit}
      .shared-sync-card .sync-eyebrow{display:block;color:#315cff;font-size:12px;font-weight:800;letter-spacing:.14em;margin-bottom:10px}
      .shared-sync-card h2{font-size:25px;margin:0 0 8px}.shared-sync-card p{color:#6b7895;line-height:1.65;margin:0 0 20px}
      .shared-sync-card label{display:block;color:#182544;font-weight:700;font-size:14px;margin:14px 0 7px}
      .shared-sync-card input{width:100%;box-sizing:border-box;border:1px solid #cbd6ea;border-radius:12px;padding:13px 14px;font:inherit;outline:none}
      .shared-sync-card input:focus{border-color:#315cff;box-shadow:0 0 0 3px rgba(49,92,255,.12)}
      .shared-sync-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px}
      .shared-sync-actions button{border:1px solid #bfcceb;border-radius:12px;padding:12px;font:inherit;font-weight:800;cursor:pointer;background:#fff;color:#254ecb}
      .shared-sync-actions button[type=submit]{background:#315cff;color:#fff;border-color:#315cff}
      .shared-sync-message{min-height:22px;margin-top:14px!important;color:#3154b8!important;font-size:13px}
      .shared-sync-hint{font-size:12px!important;margin-top:12px!important;color:#7b87a0!important}
      .shared-sync-chip{position:fixed;z-index:99990;right:18px;bottom:18px;display:flex;align-items:center;gap:8px;border:1px solid #d7e0f1;background:rgba(255,255,255,.94);box-shadow:0 8px 24px rgba(24,43,82,.12);border-radius:999px;padding:8px 11px;font:600 12px/1.2 inherit;color:#60708d}
      .shared-sync-chip i{width:8px;height:8px;border-radius:50%;background:#22b573}.shared-sync-chip[data-state=saving] i{background:#f3b62f}.shared-sync-chip[data-state=error] i{background:#ef4c62}
      .shared-sync-chip button{border:0;background:transparent;color:#315cff;font:700 12px inherit;cursor:pointer;padding:0 0 0 5px}
    `;
    document.head.appendChild(style);
  }

  function renderLogin(){
    document.querySelector(".shared-sync-lock")?.remove();
    const lock=document.createElement("div");
    lock.className="shared-sync-lock";
    lock.innerHTML=`<form class="shared-sync-card" id="sharedSyncForm">
      <span class="sync-eyebrow">POCKET CRM CLOUD</span>
      <h2>공용 데이터에 로그인</h2>
      <p>GitHub Pages와 Sites에서 같은 CRM 데이터를 사용합니다. 허용된 계정으로 로그인해 주세요.</p>
      <label for="sharedSyncEmail">이메일</label>
      <input id="sharedSyncEmail" name="email" type="email" autocomplete="username" required placeholder="name@company.com">
      <label for="sharedSyncPassword">비밀번호</label>
      <input id="sharedSyncPassword" name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="6자 이상">
      <div class="shared-sync-actions"><button type="button" id="sharedSyncSignup">처음 계정 만들기</button><button type="submit">로그인</button></div>
      <p class="shared-sync-message" id="sharedSyncMessage">${escapeHtml(loginMessage)}</p>
      <p class="shared-sync-hint">허용 계정: design@pocket.company · pocket.kjy01@gmail.com</p>
    </form>`;
    document.body.appendChild(lock);
    const form=lock.querySelector("form");
    const message=lock.querySelector("#sharedSyncMessage");
    const fields=()=>({email:form.email.value.trim().toLowerCase(),password:form.password.value});
    const validate=()=>{
      const values=fields();
      if(!ALLOWED_EMAILS.has(values.email))throw new Error("허용된 계정으로 입력해 주세요.");
      if(values.password.length<6)throw new Error("비밀번호는 6자 이상이어야 합니다.");
      return values;
    };
    form.onsubmit=async event=>{
      event.preventDefault();
      try{
        message.textContent="로그인 중입니다…";
        const values=validate();
        const payload=await authRequest("token?grant_type=password",values);
        saveSession(normalizeSession(payload));
        await connectAndSync();
      }catch(error){message.textContent=koreanAuthError(error.message)}
    };
    lock.querySelector("#sharedSyncSignup").onclick=async()=>{
      try{
        message.textContent="계정을 만드는 중입니다…";
        const values=validate();
        const payload=await authRequest("signup",{...values,data:{app:"pocket-investor-crm"}});
        if(payload.access_token){
          saveSession(normalizeSession(payload));
          await connectAndSync();
        }else{
          message.textContent="확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 이 화면에서 로그인해 주세요.";
        }
      }catch(error){message.textContent=koreanAuthError(error.message)}
    };
  }

  function koreanAuthError(message=""){
    if(/already registered|already been registered|user already exists/i.test(message))return "이미 만든 계정입니다. 오른쪽 로그인 버튼을 눌러 주세요.";
    if(/invalid login credentials/i.test(message))return "이메일 또는 비밀번호가 맞지 않습니다. 처음이면 계정 만들기를 눌러 주세요.";
    if(/email not confirmed/i.test(message))return "확인 메일의 링크를 먼저 눌러 이메일 인증을 완료해 주세요.";
    if(/password/i.test(message)&&/least|short|characters/i.test(message))return "비밀번호를 6자 이상으로 입력해 주세요.";
    return message||"요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  function escapeHtml(value=""){
    return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }

  function renderChip(){
    document.querySelector(".shared-sync-chip")?.remove();
    const chip=document.createElement("div");
    chip.className="shared-sync-chip";
    chip.dataset.state="ok";
    chip.innerHTML=`<i></i><span>공용 데이터 연결됨</span><button type="button">로그아웃</button>`;
    chip.querySelector("button").onclick=async()=>{
      try{if(session?.access_token)await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:authHeaders()})}catch{}
      saveSession(null);
      renderLogin();
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
    if(!await ensureSession()){
      renderLogin();
      return;
    }
    document.querySelector(".shared-sync-lock")?.remove();
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
    else renderLogin();

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
