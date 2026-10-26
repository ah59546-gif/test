(()=>{
  const paymentView="reviewerPayments";
  roleViews.admin.add(paymentView);
  viewMeta[paymentView]=["DATABASE 05","심사비 지급","포켓데이 심사역별 심사비 지급 상태를 확인하고 관리합니다."];

  function ensurePaymentNav(){
    if(currentRole!=="admin")return;
    const nav=document.getElementById("sideNav");
    if(!nav||nav.querySelector(`[data-view="${paymentView}"]`))return;
    const button=document.createElement("button");
    button.className=`nav-item${currentView===paymentView?" active":""}`;
    button.dataset.view=paymentView;
    button.innerHTML="<i>₩</i><span>심사비 지급</span>";
    nav.append(button);
    bindSideNav();
  }

  function renderPaymentPage(){
    const records=visibleMeetings().sort((a,b)=>b.date.localeCompare(a.date));
    const paid=records.filter(item=>item.paymentStatus==="지급").length;
    const unpaid=records.length-paid;
    const investorCount=new Set(records.map(item=>item.investorId)).size;
    const rows=records.map(item=>`<tr><td>${fmtDate(item.date)}</td><td><button class="entity-link" data-investor="${item.investorId}">${esc(item.investor.name)}</button></td><td>${esc(item.investor.firm||"—")}</td><td><button class="entity-link" data-company="${item.companyId}">${esc(item.company.name)}</button></td><td><span class="reviewer-payment-type">${esc(item.type||"포켓데이")}</span></td><td><select class="status-select payment-select" data-payment-id="${item.id}" aria-label="${esc(item.investor.name)} 심사비 지급 상태"><option ${item.paymentStatus!=="지급"?"selected":""}>미지급</option><option ${item.paymentStatus==="지급"?"selected":""}>지급</option></select></td></tr>`).join("");
    return `<div class="reviewer-payment-page"><section class="reviewer-payment-summary"><article><span>전체 심사 건수</span><strong>${records.length}<small>건</small></strong></article><article class="unpaid"><span>미지급</span><strong>${unpaid}<small>건</small></strong></article><article class="paid"><span>지급 완료</span><strong>${paid}<small>건</small></strong></article><article><span>참여 심사역</span><strong>${investorCount}<small>명</small></strong></article></section><section class="panel reviewer-payment-panel"><header><div><span>REVIEWER PAYMENT</span><h2>심사비 지급 내역</h2></div><p>지급 상태를 변경하면 미팅 이력에도 동일하게 반영됩니다.</p></header><div class="table-wrap"><table><thead><tr><th>포켓데이 날짜</th><th>심사역</th><th>소속 투자사</th><th>참여 기업</th><th>구분</th><th>지급 상태</th></tr></thead><tbody>${rows||`<tr><td colspan="6"><div class="empty">등록된 심사비 지급 대상이 없습니다.</div></td></tr>`}</tbody></table></div></section></div>`;
  }

  const originalRender=render;
  render=function(){
    if(currentView!==paymentView){
      originalRender();
      ensurePaymentNav();
      return;
    }
    const meta=viewMeta[paymentView];
    document.getElementById("pageHeading").hidden=false;
    document.getElementById("pageEyebrow").textContent=meta[0];
    document.getElementById("pageTitle").textContent=meta[1];
    document.getElementById("pageSubtitle").textContent=meta[2];
    root.innerHTML=renderPaymentPage();
    renderAdminSidebarStats();
    bindDynamic();
    ensurePaymentNav();
  };

  const originalSetRoleChrome=setRoleChrome;
  setRoleChrome=function(role){
    originalSetRoleChrome(role);
    ensurePaymentNav();
  };

  document.addEventListener("change",event=>{
    if(currentView===paymentView&&event.target.matches("[data-payment-id]"))setTimeout(()=>render(),0);
  });

  ensurePaymentNav();
  if(location.hash.replace(/^#\/?/,"").split("/")[1]===paymentView)restoreRoute();
})();

