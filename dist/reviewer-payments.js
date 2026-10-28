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
    db.reviewerPayments=db.reviewerPayments||[];
    const meetingRecords=db.meetings.map(joined).filter(item=>item.investor&&match(item.company?.name,item.investor.name,item.investor.firm,item.type,item.paymentStatus));
    const manualRecords=db.reviewerPayments.map(item=>({...item,investor:inv(item.investorId),manual:true})).filter(item=>item.investor&&match(item.investor.name,item.investor.firm,item.type,item.paymentStatus));
    const records=[...meetingRecords,...manualRecords].sort((a,b)=>b.date.localeCompare(a.date));
    const paid=records.filter(item=>item.paymentStatus==="지급").length;
    const unpaid=records.length-paid;
    const investorCount=new Set(records.map(item=>item.investorId)).size;
    const rows=records.map(item=>{const manual=item.manual||item.source==="심사비 지급"||String(item.id).startsWith("mtg-payment-");const statusAttribute=item.manual?`data-manual-payment-id="${item.id}"`:`data-payment-id="${item.id}"`;return `<tr><td>${fmtDate(item.date)}</td><td><button class="entity-link" data-investor="${item.investorId}">${esc(item.investor.name)}</button></td><td>${esc(item.investor.firm||"—")}</td><td><span class="reviewer-payment-type">${esc(item.type||"포켓데이")}</span></td><td><select class="status-select payment-select" ${statusAttribute} aria-label="${esc(item.investor.name)} 심사비 지급 상태"><option ${item.paymentStatus!=="지급"?"selected":""}>미지급</option><option ${item.paymentStatus==="지급"?"selected":""}>지급</option></select></td><td>${manual?`<button type="button" class="reviewer-payment-delete" data-delete-payment="${item.id}" aria-label="${esc(item.investor.name)} 심사비 내역 삭제">삭제</button>`:`<span class="reviewer-payment-locked" title="자동 연결된 항목은 미팅 이력에서 관리합니다.">—</span>`}</td></tr>`}).join("");
    return `<div class="reviewer-payment-page"><section class="reviewer-payment-summary"><article><span>전체 심사 건수</span><strong>${records.length}<small>건</small></strong></article><article class="unpaid"><span>미지급</span><strong>${unpaid}<small>건</small></strong></article><article class="paid"><span>지급 완료</span><strong>${paid}<small>건</small></strong></article><article><span>참여 심사역</span><strong>${investorCount}<small>명</small></strong></article></section><section class="panel reviewer-payment-panel"><header><div><span>REVIEWER PAYMENT</span><h2>심사비 지급 내역</h2></div><div class="reviewer-payment-header-actions"><p>심사역별 지급 상태를 한곳에서 관리합니다.</p><button type="button" class="primary-button reviewer-payment-add" data-open-reviewer-payment>＋ 심사비 추가</button></div></header><div class="table-wrap"><table><thead><tr><th>포켓데이 날짜</th><th>심사역</th><th>소속 투자사</th><th>구분</th><th>지급 상태</th><th>관리</th></tr></thead><tbody>${rows||`<tr><td colspan="6"><div class="empty reviewer-payment-empty"><strong>등록된 심사비 지급 대상이 없습니다.</strong><span>심사비 추가 버튼을 눌러 직접 등록해 주세요.</span><button type="button" class="primary-button" data-open-reviewer-payment>＋ 첫 심사비 추가</button></div></td></tr>`}</tbody></table></div></section></div>`;
  }

  function deletePaymentRecord(id){
    db.reviewerPayments=db.reviewerPayments||[];
    const payment=db.reviewerPayments.find(item=>item.id===id);
    const meeting=db.meetings.find(item=>item.id===id);
    const manual=meeting&&(meeting.source==="심사비 지급"||String(meeting.id).startsWith("mtg-payment-"));
    if(!payment&&!manual){showToast("자동 연결된 항목은 미팅 이력에서 관리해 주세요.");return}
    if(!window.confirm("이 심사비 지급 내역을 삭제할까요?"))return;
    if(payment)db.reviewerPayments=db.reviewerPayments.filter(item=>item.id!==id);
    if(manual)db.meetings=db.meetings.filter(item=>item.id!==id);
    save();
    render();
    showToast("심사비 지급 내역을 삭제했습니다.");
  }

  function ensurePaymentModal(){
    if(document.getElementById("reviewerPaymentModal"))return;
    document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop" id="reviewerPaymentModal" hidden>
      <section class="modal reviewer-payment-modal" role="dialog" aria-modal="true" aria-labelledby="reviewerPaymentModalTitle">
        <header class="modal-head"><div><span class="eyebrow">REVIEWER PAYMENT</span><h2 id="reviewerPaymentModalTitle">심사비 지급 대상 추가</h2></div><button type="button" class="icon-button" data-close-reviewer-payment aria-label="닫기">×</button></header>
        <p class="modal-intro">심사역 이름을 검색해 심사비 지급 내역을 등록합니다.</p>
        <form id="reviewerPaymentForm">
          <div class="form-grid">
            <label><span>포켓데이 날짜 *</span><input name="date" type="date" required /></label>
            <label><span>심사역 *</span><input name="investorSearch" list="reviewerPaymentInvestorOptions" autocomplete="off" required placeholder="심사역 이름 검색" /><datalist id="reviewerPaymentInvestorOptions"></datalist><input name="investorId" type="hidden" /></label>
            <label><span>구분</span><select name="type"><option>포켓데이</option><option>외부</option><option>기타</option></select></label>
            <label><span>지급 상태</span><select name="paymentStatus"><option>미지급</option><option>지급</option></select></label>
            <label class="form-wide"><span>소속 투자사</span><input name="firm" readonly aria-readonly="true" placeholder="심사역 선택 시 자동 표시" /></label>
          </div>
          <div class="modal-actions"><button type="button" class="ghost-button" data-close-reviewer-payment>취소</button><button type="submit" class="primary-button">심사비 내역에 저장</button></div>
        </form>
      </section>
    </div>`);
    const modal=document.getElementById("reviewerPaymentModal");
    const form=document.getElementById("reviewerPaymentForm");
    modal.addEventListener("click",event=>{if(event.target===modal)closePaymentModal()});
    modal.querySelectorAll("[data-close-reviewer-payment]").forEach(button=>button.addEventListener("click",closePaymentModal));
    form.elements.investorSearch.addEventListener("input",syncPaymentInvestor);
    form.addEventListener("submit",savePaymentRecord);
  }

  function paymentInvestorLabel(person){return [person.name,person.firm].filter(Boolean).join(" · ")}

  function selectedPaymentInvestor(form){
    const value=form.elements.investorSearch.value.trim();
    return db.investors.find(item=>item.id===form.elements.investorId.value)||db.investors.find(item=>paymentInvestorLabel(item)===value||item.name===value);
  }

  function syncPaymentInvestor(){
    const form=document.getElementById("reviewerPaymentForm");
    const value=form.elements.investorSearch.value.trim();
    const investor=db.investors.find(item=>paymentInvestorLabel(item)===value||item.name===value);
    form.elements.investorId.value=investor?.id||"";
    form.elements.firm.value=investor?.firm||"—";
    form.elements.investorSearch.setCustomValidity("");
  }

  function syncPaymentFirm(){
    const form=document.getElementById("reviewerPaymentForm");
    const investor=selectedPaymentInvestor(form);
    form.elements.firm.value=investor?.firm||"—";
  }

  function openPaymentModal(){
    ensurePaymentModal();
    if(!db.investors.length){
      showToast("심사역을 먼저 추가해 주세요.");
      switchView("investors");
      return;
    }
    const modal=document.getElementById("reviewerPaymentModal");
    const form=document.getElementById("reviewerPaymentForm");
    form.reset();
    form.elements.investorId.value="";
    document.getElementById("reviewerPaymentInvestorOptions").innerHTML=db.investors.map(item=>`<option value="${esc(paymentInvestorLabel(item))}"></option>`).join("");
    form.elements.date.value=new Date().toISOString().slice(0,10);
    syncPaymentFirm();
    modal.hidden=false;
    setTimeout(()=>form.elements.investorSearch.focus(),0);
  }

  function closePaymentModal(){
    const modal=document.getElementById("reviewerPaymentModal");
    if(modal)modal.hidden=true;
  }

  function savePaymentRecord(event){
    event.preventDefault();
    const form=event.currentTarget;
    const values=Object.fromEntries(new FormData(form).entries());
    const investor=selectedPaymentInvestor(form);
    if(!investor){form.elements.investorSearch.setCustomValidity("검색 결과에서 심사역을 선택해 주세요.");form.elements.investorSearch.reportValidity();return}
    db.reviewerPayments=db.reviewerPayments||[];
    db.reviewerPayments.unshift({id:`payment-${Date.now()}`,investorId:investor.id,date:values.date,type:values.type||"포켓데이",paymentStatus:values.paymentStatus||"미지급",updatedAt:today(),source:"심사비 지급"});
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
    document.querySelectorAll("[data-delete-payment]").forEach(button=>button.onclick=()=>deletePaymentRecord(button.dataset.deletePayment));
    ensurePaymentNav();
  };

  const originalSetRoleChrome=setRoleChrome;
  setRoleChrome=function(role){
    originalSetRoleChrome(role);
    ensurePaymentNav();
  };

  document.addEventListener("change",event=>{
    if(currentView===paymentView&&event.target.matches("[data-manual-payment-id]")){
      const payment=db.reviewerPayments?.find(item=>item.id===event.target.dataset.manualPaymentId);
      if(payment){payment.paymentStatus=event.target.value;payment.updatedAt=today();save();showToast("지급 상태를 저장했습니다.");render()}
      return;
    }
    if(currentView===paymentView&&event.target.matches("[data-payment-id]"))setTimeout(()=>render(),0);
  });

  document.addEventListener("keydown",event=>{if(event.key==="Escape")closePaymentModal()});

  ensurePaymentModal();
  ensurePaymentNav();
  if(location.hash.replace(/^#\/?/,"").split("/")[1]===paymentView)restoreRoute();
})();


