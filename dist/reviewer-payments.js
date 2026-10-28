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
    return `<div class="reviewer-payment-page"><section class="reviewer-payment-summary"><article><span>전체 심사 건수</span><strong>${records.length}<small>건</small></strong></article><article class="unpaid"><span>미지급</span><strong>${unpaid}<small>건</small></strong></article><article class="paid"><span>지급 완료</span><strong>${paid}<small>건</small></strong></article><article><span>참여 심사역</span><strong>${investorCount}<small>명</small></strong></article></section><section class="panel reviewer-payment-panel"><header><div><span>REVIEWER PAYMENT</span><h2>심사비 지급 내역</h2></div><div class="reviewer-payment-header-actions"><p>지급 상태를 변경하면 미팅 이력에도 동일하게 반영됩니다.</p><button type="button" class="primary-button reviewer-payment-add" data-open-reviewer-payment>＋ 심사비 추가</button></div></header><div class="table-wrap"><table><thead><tr><th>포켓데이 날짜</th><th>심사역</th><th>소속 투자사</th><th>참여 기업</th><th>구분</th><th>지급 상태</th></tr></thead><tbody>${rows||`<tr><td colspan="6"><div class="empty reviewer-payment-empty"><strong>등록된 심사비 지급 대상이 없습니다.</strong><span>심사비 추가 버튼을 눌러 직접 등록해 주세요.</span><button type="button" class="primary-button" data-open-reviewer-payment>＋ 첫 심사비 추가</button></div></td></tr>`}</tbody></table></div></section></div>`;
  }

  function ensurePaymentModal(){
    if(document.getElementById("reviewerPaymentModal"))return;
    document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop" id="reviewerPaymentModal" hidden>
      <section class="modal reviewer-payment-modal" role="dialog" aria-modal="true" aria-labelledby="reviewerPaymentModalTitle">
        <header class="modal-head"><div><span class="eyebrow">REVIEWER PAYMENT</span><h2 id="reviewerPaymentModalTitle">심사비 지급 대상 추가</h2></div><button type="button" class="icon-button" data-close-reviewer-payment aria-label="닫기">×</button></header>
        <p class="modal-intro">포켓데이 심사 정보를 등록하면 심사비 지급 내역과 미팅 이력에 함께 반영됩니다.</p>
        <form id="reviewerPaymentForm">
          <div class="form-grid">
            <label><span>포켓데이 날짜 *</span><input name="date" type="date" required /></label>
            <label><span>심사역 *</span><select name="investorId" required></select></label>
            <label><span>참여 기업 *</span><select name="companyId" required></select></label>
            <label><span>구분</span><select name="type"><option>포켓데이</option><option>외부</option><option>기타</option></select></label>
            <label><span>지급 상태</span><select name="paymentStatus"><option>미지급</option><option>지급</option></select></label>
            <label><span>소속 투자사</span><input name="firm" readonly aria-readonly="true" placeholder="심사역 선택 시 자동 표시" /></label>
          </div>
          <div class="modal-actions"><button type="button" class="ghost-button" data-close-reviewer-payment>취소</button><button type="submit" class="primary-button">심사비 내역에 저장</button></div>
        </form>
      </section>
    </div>`);
    const modal=document.getElementById("reviewerPaymentModal");
    const form=document.getElementById("reviewerPaymentForm");
    modal.addEventListener("click",event=>{if(event.target===modal)closePaymentModal()});
    modal.querySelectorAll("[data-close-reviewer-payment]").forEach(button=>button.addEventListener("click",closePaymentModal));
    form.elements.investorId.addEventListener("change",syncPaymentFirm);
    form.addEventListener("submit",savePaymentRecord);
  }

  function syncPaymentFirm(){
    const form=document.getElementById("reviewerPaymentForm");
    const investor=db.investors.find(item=>item.id===form.elements.investorId.value);
    form.elements.firm.value=investor?.firm||"—";
  }

  function openPaymentModal(){
    ensurePaymentModal();
    if(!db.investors.length||!db.companies.length){
      showToast(!db.investors.length?"심사역을 먼저 추가해 주세요.":"기업을 먼저 추가해 주세요.");
      switchView(!db.investors.length?"investors":"companies");
      return;
    }
    const modal=document.getElementById("reviewerPaymentModal");
    const form=document.getElementById("reviewerPaymentForm");
    form.reset();
    form.elements.investorId.innerHTML=db.investors.map(item=>`<option value="${item.id}">${esc(item.name)}${item.firm?` · ${esc(item.firm)}`:""}</option>`).join("");
    form.elements.companyId.innerHTML=db.companies.map(item=>`<option value="${item.id}">${esc(item.name)}</option>`).join("");
    form.elements.date.value=new Date().toISOString().slice(0,10);
    syncPaymentFirm();
    modal.hidden=false;
    setTimeout(()=>form.elements.date.focus(),0);
  }

  function closePaymentModal(){
    const modal=document.getElementById("reviewerPaymentModal");
    if(modal)modal.hidden=true;
  }

  function savePaymentRecord(event){
    event.preventDefault();
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form).entries());
    const investor=db.investors.find(item=>item.id===values.investorId);
    const company=db.companies.find(item=>item.id===values.companyId);
    if(!investor||!company){showToast("심사역과 기업을 다시 선택해 주세요.");return}
    db.meetings.unshift({id:`mtg-payment-${Date.now()}`,companyId:company.id,investorId:investor.id,date:values.date,type:values.type||"포켓데이",investmentStatus:"검토 전",followupStatus:"미정",followupDate:"",amount:0,paymentStatus:values.paymentStatus||"미지급",updatedAt:today(),memo:"심사비 지급 대상 직접 등록",source:"심사비 지급"});
    save();
    form.reset();
    closePaymentModal();
    showToast("심사비 지급 대상을 추가했습니다.");
    render();
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
    document.querySelectorAll("[data-open-reviewer-payment]").forEach(button=>button.onclick=openPaymentModal);
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

  document.addEventListener("keydown",event=>{if(event.key==="Escape")closePaymentModal()});

  ensurePaymentModal();
  ensurePaymentNav();
  if(location.hash.replace(/^#\/?/,"").split("/")[1]===paymentView)restoreRoute();
})();


