/* Admin entry lock for public GitHub Pages.
   This is a browser convenience gate, not an authorization boundary.
   Private CRM records remain protected by the existing server authentication/RLS. */
(()=>{
  "use strict";
  const ACCESS_KEY="pocket-crm-admin-entry-until-v1";
  const ACCESS_DURATION=30*60*1000;
  const PASSWORD_DIGEST="62f5d588fd39c2bbb6b72efa9c5e95a317903f4b2906cb4599c109cf9c25e0f1";
  const html=document.documentElement;
  let expiresAt=0;
  let expiryTimer=null;
  let screen=null;
  let pendingAction=null;
  let baseRestore=null;
  let baseLeave=null;
  try{expiresAt=Number(sessionStorage.getItem(ACCESS_KEY))||0}catch{}
  const isAdminRoute=()=>{try{return decodeURIComponent(location.hash.replace(/^#\/?/,"").split("/")[0])==="admin"}catch{return false}};
  const hasAccess=()=>expiresAt>Date.now();
  const hideContent=()=>html.classList.add("admin-access-locked");
  if(isAdminRoute()&&!hasAccess())hideContent();

  function rememberAccess(until){
    expiresAt=until;
    try{if(until)sessionStorage.setItem(ACCESS_KEY,String(until));else sessionStorage.removeItem(ACCESS_KEY)}catch{}
    clearTimeout(expiryTimer);
    if(until)expiryTimer=setTimeout(()=>{rememberAccess(0);if(isAdminRoute())lock(()=>baseRestore?.())},Math.max(0,until-Date.now()));
  }
  function hideScreen(){
    if(screen){screen.hidden=true;screen.querySelector("form").reset();screen.querySelector("[data-admin-error]").hidden=true}
    html.classList.remove("admin-access-locked");
  }
  function lock(action){
    pendingAction=action;
    hideContent();
    if(!screen)return;
    screen.hidden=false;
    screen.querySelector("[data-admin-error]").hidden=true;
    const field=screen.querySelector("input");
    field.value="";
    field.removeAttribute("aria-invalid");
    field.focus();
  }
  function guardRoute(event){
    if(isAdminRoute()&&!hasAccess()){
      event?.stopImmediatePropagation();
      lock(()=>baseRestore?.());
    }else{
      hideScreen();
    }
  }
  window.addEventListener("hashchange",guardRoute,true);
  window.addEventListener("popstate",guardRoute,true);

  function boot(){
    screen=document.createElement("section");
    screen.id="adminAccessScreen";
    screen.className="admin-access-screen";
    screen.hidden=true;
    screen.setAttribute("aria-labelledby","adminAccessTitle");
    screen.innerHTML=`<div class="admin-access-card">
      <a class="admin-access-brand" href="#" data-admin-home><span>P</span><strong>POCKET</strong></a>
      <div class="admin-access-symbol" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></svg></div>
      <h1 id="adminAccessTitle">관리자 입장</h1>
      <p>관리자 비밀번호를 입력해 주세요.</p>
      <form id="adminAccessForm">
        <label for="adminAccessPassword">비밀번호</label>
        <div class="admin-access-input"><input id="adminAccessPassword" name="password" type="password" autocomplete="current-password" placeholder="비밀번호 입력" required aria-describedby="adminAccessError" /><button type="button" class="admin-access-toggle" aria-controls="adminAccessPassword" aria-label="비밀번호 보기">보기</button></div>
        <p id="adminAccessError" data-admin-error role="alert" hidden>비밀번호가 맞지 않아요. 다시 입력해 주세요.</p>
        <button type="submit" class="admin-access-submit">관리자 화면 열기</button>
      </form>
      <button type="button" class="admin-access-back" data-admin-home>HOME으로 돌아가기</button>
    </div>`;
    document.body.appendChild(screen);
    const originalEnter=enterRole;
    baseRestore=restoreRoute;
    baseLeave=leaveWorkspace;
    enterRole=function(role){
      if(role==="admin"&&!hasAccess()){lock(()=>originalEnter(role));return}
      hideScreen();
      return originalEnter(role);
    };
    restoreRoute=function(){
      if(isAdminRoute()&&!hasAccess()){lock(()=>baseRestore());return}
      hideScreen();
      return baseRestore();
    };
    leaveWorkspace=function(){
      rememberAccess(0);
      pendingAction=null;
      hideScreen();
      return baseLeave();
    };
    const backHome=event=>{
      event.preventDefault();
      rememberAccess(0);
      pendingAction=null;
      hideScreen();
      baseLeave();
      document.querySelector('[data-enter-role="admin"]')?.focus();
    };
    screen.querySelectorAll("[data-admin-home]").forEach(button=>button.addEventListener("click",backHome));
    const input=screen.querySelector("input");
    const toggle=screen.querySelector(".admin-access-toggle");
    toggle.onclick=()=>{
      const showing=input.type==="password";
      input.type=showing?"text":"password";
      toggle.textContent=showing?"숨기기":"보기";
      toggle.setAttribute("aria-label",showing?"비밀번호 숨기기":"비밀번호 보기");
      input.focus();
    };
    input.addEventListener("input",()=>{input.removeAttribute("aria-invalid");screen.querySelector("[data-admin-error]").hidden=true});
    screen.querySelector("form").addEventListener("keydown",event=>{if(event.key==="Enter"&&event.isComposing)event.preventDefault()});
    screen.querySelector("form").onsubmit=async event=>{
      event.preventDefault();
      const submit=screen.querySelector('[type="submit"]');
      if(submit.disabled)return;
      submit.disabled=true;
      try{
        const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(input.value));
        const actual=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,"0")).join("");
        if(actual!==PASSWORD_DIGEST){
          input.setAttribute("aria-invalid","true");
          screen.querySelector("[data-admin-error]").hidden=false;
          input.select();
          return;
        }
        rememberAccess(Date.now()+ACCESS_DURATION);
        const action=pendingAction||(()=>originalEnter("admin"));
        pendingAction=null;
        hideScreen();
        action();
        document.querySelector("#pageTitle")?.focus({preventScroll:true});
      }catch{
        const error=screen.querySelector("[data-admin-error]");
        error.textContent="입장 화면을 불러오지 못했어요. 새로고침 후 다시 입력해 주세요.";
        error.hidden=false;
      }finally{submit.disabled=false}
    };
    const lockButton=document.createElement("button");
    lockButton.type="button";
    lockButton.id="adminAccessLock";
    lockButton.className="admin-access-lock";
    lockButton.textContent="관리자 잠금";
    lockButton.onclick=()=>{rememberAccess(0);lock(()=>baseRestore())};
    document.getElementById("backToPortal")?.after(lockButton);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&isAdminRoute()&&!hasAccess())lock(()=>baseRestore())});
    window.addEventListener("pageshow",()=>{if(isAdminRoute()&&!hasAccess())lock(()=>baseRestore())});
    rememberAccess(hasAccess()?expiresAt:0);
    guardRoute();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();

