(()=>{
  const root=document.getElementById("viewRoot");
  const storageKey="pocket-crm-company-remaining-rounds-v1";
  const paymentStorageKey="pocket-crm-company-payment-status-v1";
  const companyTypeStorageKey="pocket-crm-company-types-v1";
  const adminMetaStorageKey="pocket-crm-admin-company-terms-v1";
  const companyNoteStorageKey="pocket-crm-company-notes-v1";
  const statuses=["-","대기","완료","진행중"];
  const paymentStatuses=["-","결제완료","미결제","선잔금"];
  const companyTypes=["포켓","외부"];
  let activeStatusFilter="";
  if(!root)return;

  function readStatuses(){
    try{return JSON.parse(localStorage.getItem(storageKey)||"{}")}catch{return {}}
  }

  function saveStatus(companyId,status){
    const saved=readStatuses();
    if(status==="-")delete saved[companyId];
    else saved[companyId]=status;
    localStorage.setItem(storageKey,JSON.stringify(saved));
  }

  function readPaymentStatuses(){
    try{return JSON.parse(localStorage.getItem(paymentStorageKey)||"{}")}catch{return {}}
  }

  function savePaymentStatus(companyId,status){
    const saved=readPaymentStatuses();
    if(status==="-")delete saved[companyId];
    else saved[companyId]=status;
    localStorage.setItem(paymentStorageKey,JSON.stringify(saved));
  }

  function readCompanyTypes(){
    try{return JSON.parse(localStorage.getItem(companyTypeStorageKey)||"{}")}catch{return {}}
  }

  function saveCompanyType(companyId,type){
    if(!companyId||!companyTypes.includes(type))return;
    const saved=readCompanyTypes();
    saved[companyId]=type;
    localStorage.setItem(companyTypeStorageKey,JSON.stringify(saved));
  }

  function readAdminMeta(){
    try{return JSON.parse(localStorage.getItem(adminMetaStorageKey)||"{}")}catch{return {}}
  }

  function saveAdminMeta(companyId,values){
    const saved=readAdminMeta();
    saved[companyId]={
      ...saved[companyId],
      investmentStatus:values.investmentStatus||"-",
      paymentStatus:values.paymentStatus||"-",
      contractAmount:String(values.contractAmount||"").trim(),
      successFee:String(values.successFee||"").trim()
    };
    localStorage.setItem(adminMetaStorageKey,JSON.stringify(saved));
  }

  function readCompanyNotes(){
    try{return JSON.parse(localStorage.getItem(companyNoteStorageKey)||"{}")}catch{return {}}
  }

  function saveCompanyNote(companyId,text){
    if(!companyId)return null;
    const saved=readCompanyNotes();
    const value=String(text||"").trim();
    if(!value){
      delete saved[companyId];
      localStorage.setItem(companyNoteStorageKey,JSON.stringify(saved));
      return null;
    }
    const record={text:value,updatedAt:new Date().toISOString()};
    saved[companyId]=record;
    localStorage.setItem(companyNoteStorageKey,JSON.stringify(saved));
    return record;
  }

  function formatNoteTime(value){
    if(!value)return "아직 저장된 메모가 없습니다.";
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return "저장된 메모";
    return `${new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date)} 저장`;
  }

  function currentCompanyId(){
    const editButton=root.querySelector("[data-edit-company]");
    if(editButton?.dataset.editCompany)return editButton.dataset.editCompany;
    const parts=location.hash.replace(/^#\/?/,"").split("/");
    return parts[1]==="companyDetail"?decodeURIComponent(parts[2]||""):"";
  }

  function syncCompanyDetailStatus(){
    const brand=root.querySelector(".company-detail-page .meeting-company-brand");
    if(!brand)return;
    const companyId=currentCompanyId();
    const logo=brand.querySelector(".meeting-company-logo");
    if(!companyId||!logo)return;

    let stack=brand.querySelector(".company-detail-logo-stack");
    if(!stack){
      stack=document.createElement("div");
      stack.className="company-detail-logo-stack";
      logo.before(stack);
      stack.append(logo);
    }

    let metaRow=stack.querySelector(".company-detail-meta-row");
    if(!metaRow){
      metaRow=document.createElement("div");
      metaRow.className="company-detail-meta-row";
      stack.append(metaRow);
    }

    let statusCard=stack.querySelector(".company-detail-remaining-status");
    if(!statusCard){
      statusCard=document.createElement("div");
      statusCard.className="company-detail-remaining-status";
      statusCard.innerHTML="<small>잔여회차</small><strong>-</strong>";
    }
    if(statusCard.parentElement!==metaRow)metaRow.prepend(statusCard);

    const saved=readStatuses()[companyId];
    const status=statuses.includes(saved)?saved:"-";
    statusCard.dataset.state=status;
    const statusValue=statusCard.querySelector("strong");
    if(statusValue.textContent!==status)statusValue.textContent=status;

    let typeCard=metaRow.querySelector(".company-detail-type-select");
    if(!typeCard){
      typeCard=document.createElement("div");
      typeCard.className="company-detail-type-select";
      typeCard.innerHTML=`<small>기업 구분</small><div>${companyTypes.map(type=>`<button type="button" data-company-type="${type}" aria-pressed="false">${type}</button>`).join("")}</div>`;
      typeCard.addEventListener("click",event=>{
        const button=event.target.closest("[data-company-type]");
        if(!button)return;
        saveCompanyType(currentCompanyId(),button.dataset.companyType);
        syncCompanyDetailStatus();
      });
      metaRow.append(typeCard);
    }
    const savedType=readCompanyTypes()[companyId];
    const companyType=companyTypes.includes(savedType)?savedType:"포켓";
    typeCard.querySelectorAll("[data-company-type]").forEach(button=>{
      const selected=button.dataset.companyType===companyType;
      if(button.getAttribute("aria-pressed")!==String(selected))button.setAttribute("aria-pressed",String(selected));
    });
  }

  function syncAdminCompanyDetails(){
    const grid=root.querySelector(".company-detail-page .company-info-grid");
    const editButton=root.querySelector(".company-detail-page [data-edit-company]");
    if(!grid||!editButton)return;
    const companyId=editButton.dataset.editCompany;
    const meta=readAdminMeta()[companyId]||{};
    const values={
      investmentStatus:meta.investmentStatus||"-",
      paymentStatus:meta.paymentStatus||"-",
      contractAmount:meta.contractAmount||meta.contractTerms||"-",
      successFee:meta.successFee||"-"
    };
    const fields=[
      {key:"investmentStatus",icon:"✓",label:"투자 여부",className:"company-admin-investment"},
      {key:"paymentStatus",icon:"◉",label:"결제 여부",className:"company-admin-payment"},
      {key:"contractAmount",icon:"₩",label:"계약금액",className:"company-admin-contract-amount"},
      {key:"successFee",icon:"%",label:"성공보수",className:"company-admin-success-fee"}
    ];

    fields.forEach(field=>{
      let card=grid.querySelector(`[data-admin-company-field="${field.key}"]`);
      if(!card){
        card=document.createElement("div");
        card.className=field.className;
        card.dataset.adminCompanyField=field.key;
        card.innerHTML=`<i>${field.icon}</i><span><small>${field.label}</small><strong>-</strong></span>`;
        grid.append(card);
      }
      const value=card.querySelector("strong");
      if(value.textContent!==values[field.key])value.textContent=values[field.key];
    });
  }

  function syncCompanyNote(){
    const page=root.querySelector(".company-detail-page");
    const editButton=page?.querySelector("[data-edit-company]");
    const workspace=page?.querySelector(".company-detail-workspace");
    if(!page||!editButton||!workspace)return;
    const companyId=editButton.dataset.editCompany;
    let panel=page.querySelector("[data-company-note-panel]");
    if(!panel){
      panel=document.createElement("section");
      panel.className="company-note-panel";
      panel.dataset.companyNotePanel="";
      panel.innerHTML=`<header><div><span class="company-note-icon">✎</span><div><h2>특이사항 메모</h2><p>대표자 요청사항, 다음 연락 일정, 계약 검토 내용을 자유롭게 기록하세요.</p></div></div><b>관리자 전용</b></header><label><span class="sr-only">특이사항 메모</span><textarea maxlength="2000" data-company-note-input placeholder="예: 다음 미팅 전 매출 자료 확인 필요&#10;계약서 수정본 전달 후 대표자 회신 대기"></textarea></label><footer><span data-company-note-status>아직 저장된 메모가 없습니다.</span><div><small data-company-note-count>0 / 2000</small><button type="button" data-save-company-note>메모 저장</button></div></footer>`;
      workspace.prepend(panel);
      const textarea=panel.querySelector("[data-company-note-input]");
      const updateCount=()=>{const count=`${textarea.value.length} / 2000`;const node=panel.querySelector("[data-company-note-count]");if(node.textContent!==count)node.textContent=count};
      const submitNote=()=>{
        const record=saveCompanyNote(currentCompanyId(),textarea.value);
        const status=panel.querySelector("[data-company-note-status]");
        const label=formatNoteTime(record?.updatedAt);
        if(status.textContent!==label)status.textContent=label;
        updateCount();
        if(typeof showToast==="function")showToast(record?"특이사항 메모를 저장했습니다.":"특이사항 메모를 비웠습니다.");
      };
      textarea.addEventListener("input",updateCount);
      textarea.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){event.preventDefault();submitNote()}});
      panel.querySelector("[data-save-company-note]").addEventListener("click",submitNote);
    }
    const note=readCompanyNotes()[companyId]||{};
    const textarea=panel.querySelector("[data-company-note-input]");
    if(document.activeElement!==textarea&&textarea.value!==(note.text||""))textarea.value=note.text||"";
    const count=`${textarea.value.length} / 2000`;
    const countNode=panel.querySelector("[data-company-note-count]");
    if(countNode.textContent!==count)countNode.textContent=count;
    const statusLabel=formatNoteTime(note.updatedAt);
    const status=panel.querySelector("[data-company-note-status]");
    if(status.textContent!==statusLabel)status.textContent=statusLabel;
  }

  function ensureAdminMetaFields(){
    const form=document.getElementById("companyForm");
    const grid=form?.querySelector(".form-grid");
    if(!grid||form.elements.adminInvestmentStatus)return;

    const investment=document.createElement("label");
    investment.dataset.adminCompanyMeta="";
    investment.innerHTML='<span>투자 여부</span><select name="adminInvestmentStatus"><option value="-">-</option><option value="투자">투자</option><option value="미투자">미투자</option></select>';
    const payment=document.createElement("label");
    payment.dataset.adminCompanyMeta="";
    payment.innerHTML='<span>결제 여부</span><select name="adminPaymentStatus"><option value="-">-</option><option value="미결제">미결제</option><option value="결제완료">결제완료</option></select>';
    const contractAmount=document.createElement("label");
    contractAmount.dataset.adminCompanyMeta="";
    contractAmount.innerHTML='<span>계약금액</span><input name="adminContractAmount" placeholder="예: 30,000,000원" />';
    const successFee=document.createElement("label");
    successFee.dataset.adminCompanyMeta="";
    successFee.innerHTML='<span>성공보수</span><input name="adminSuccessFee" placeholder="예: 5% 또는 10,000,000원" />';
    grid.append(investment,payment,contractAmount,successFee);
  }

  function populateAdminMetaForm(companyId){
    ensureAdminMetaFields();
    const form=document.getElementById("companyForm");
    const fields=[...form.querySelectorAll("[data-admin-company-meta]")];
    fields.forEach(field=>field.hidden=!companyId);
    if(!companyId)return;
    const meta=readAdminMeta()[companyId]||{};
    form.elements.adminInvestmentStatus.value=meta.investmentStatus||"-";
    form.elements.adminPaymentStatus.value=meta.paymentStatus||"-";
    form.elements.adminContractAmount.value=meta.contractAmount||meta.contractTerms||"";
    form.elements.adminSuccessFee.value=meta.successFee||"";
  }

  function syncRemainingRoundsColumn(){
    const table=[...root.querySelectorAll(".db-table table")].find(candidate=>{
      const labels=[...candidate.querySelectorAll("thead th")].map(cell=>cell.textContent.trim());
      return labels.join("|")==="기업|대표자|업종|단계|미팅|만난 심사역";
    });
    if(!table||table.querySelector("th[data-remaining-rounds]"))return;

    table.querySelectorAll("thead th")[1]?.remove();
    table.querySelectorAll("tbody tr").forEach(row=>{
      if(row.cells.length>1)row.cells[1]?.remove();
    });

    const heading=document.createElement("th");
    heading.dataset.remainingRounds="";
    heading.setAttribute("aria-label","진행상태 필터");
    heading.innerHTML=`<label class="company-status-filter"><span>진행상태</span><i aria-hidden="true">▼</i><select aria-label="진행상태 필터"><option value="">전체</option>${statuses.map(status=>`<option value="${status}">${status}</option>`).join("")}</select></label>`;
    const filterSelect=heading.querySelector("select");
    filterSelect.value=activeStatusFilter;
    filterSelect.addEventListener("change",()=>{
      activeStatusFilter=filterSelect.value;
      applyCompanyStatusFilter(table);
    });
    table.querySelector("thead tr")?.append(heading);
    const paymentHeading=document.createElement("th");
    paymentHeading.dataset.companyPaymentStatus="";
    paymentHeading.textContent="결제상태";
    table.querySelector("thead tr")?.append(paymentHeading);

    const savedCompanyTypes=readCompanyTypes();
    const savedPaymentStatuses=readPaymentStatuses();
    table.querySelectorAll("tbody tr").forEach(row=>{
      const onlyCell=row.cells.length===1?row.cells[0]:null;
      if(onlyCell&&onlyCell.colSpan>1){
        onlyCell.colSpan=7;
        return;
      }
      const companyId=row.querySelector("[data-company]")?.dataset.company||"";
      const companyLink=row.querySelector("[data-company]");
      const savedCompanyType=savedCompanyTypes[companyId];
      const companyType=companyTypes.includes(savedCompanyType)?savedCompanyType:"포켓";
      if(companyLink){
        const typeBadge=document.createElement("span");
        typeBadge.className=`company-list-type-badge ${companyType==="외부"?"external":"pocket"}`;
        typeBadge.textContent=companyType;
        typeBadge.setAttribute("aria-label",`기업 구분 ${companyType}`);
        companyLink.insertAdjacentElement("afterend",typeBadge);
      }
      const cell=document.createElement("td");
      cell.className="company-remaining-rounds";
      const select=document.createElement("select");
      select.className="company-remaining-select";
      select.setAttribute("aria-label",`${row.querySelector("[data-company]")?.textContent.trim()||"기업"} 잔여회차`);
      select.innerHTML=statuses.map(status=>`<option value="${status}">${status}</option>`).join("");
      const saved=readStatuses()[companyId];
      select.value=statuses.includes(saved)?saved:"-";
      select.dataset.state=select.value;
      row.dataset.companyProgressStatus=select.value;
      select.addEventListener("change",()=>{
        select.dataset.state=select.value;
        row.dataset.companyProgressStatus=select.value;
        if(companyId){
          saveStatus(companyId,select.value);
          render();
        }
      });
      cell.append(select);
      row.append(cell);

      const paymentCell=document.createElement("td");
      paymentCell.className="company-payment-status";
      const paymentSelect=document.createElement("select");
      paymentSelect.className="company-payment-select";
      paymentSelect.setAttribute("aria-label",`${row.querySelector("[data-company]")?.textContent.trim()||"기업"} 결제상태`);
      paymentSelect.innerHTML=paymentStatuses.map(status=>`<option value="${status}">${status}</option>`).join("");
      const savedPayment=savedPaymentStatuses[companyId];
      paymentSelect.value=paymentStatuses.includes(savedPayment)?savedPayment:"-";
      paymentSelect.dataset.state=paymentSelect.value;
      paymentSelect.addEventListener("change",()=>{
        paymentSelect.dataset.state=paymentSelect.value;
        if(companyId){
          savePaymentStatus(companyId,paymentSelect.value);
          if(typeof showToast==="function")showToast("결제상태를 저장했습니다.");
        }
      });
      paymentCell.append(paymentSelect);
      row.append(paymentCell);
    });
    const emptyRow=document.createElement("tr");
    emptyRow.dataset.companyStatusEmpty="";
    emptyRow.hidden=true;
    emptyRow.innerHTML='<td colspan="7"><div class="empty">선택한 진행상태의 기업이 없습니다.</div></td>';
    table.tBodies[0]?.append(emptyRow);
    applyCompanyStatusFilter(table);
  }

  function applyCompanyStatusFilter(table){
    const rows=[...table.querySelectorAll("tbody tr[data-company-progress-status]")];
    rows.forEach(row=>{row.hidden=Boolean(activeStatusFilter)&&row.dataset.companyProgressStatus!==activeStatusFilter});
    const emptyRow=table.querySelector("[data-company-status-empty]");
    if(emptyRow)emptyRow.hidden=!activeStatusFilter||rows.some(row=>!row.hidden);
  }

  function syncAll(){
    syncRemainingRoundsColumn();
    syncCompanyDetailStatus();
    syncAdminCompanyDetails();
    syncCompanyNote();
  }

  new MutationObserver(syncAll).observe(root,{childList:true,subtree:true});
  window.addEventListener("storage",event=>{
    if(event.key===storageKey)syncCompanyDetailStatus();
    if(event.key===paymentStorageKey&&root.querySelector(".company-payment-status"))render();
    if(event.key===companyTypeStorageKey)syncCompanyDetailStatus();
    if(event.key===adminMetaStorageKey)syncAdminCompanyDetails();
    if(event.key===companyNoteStorageKey)syncCompanyNote();
  });
  ensureAdminMetaFields();
  document.addEventListener("click",event=>{
    const edit=event.target.closest("[data-edit-company]");
    const add=event.target.closest("[data-add-company]");
    if(edit||add)populateAdminMetaForm(edit?.dataset.editCompany||"");
  });
  document.getElementById("companyForm")?.addEventListener("submit",event=>{
    const form=event.currentTarget;
    const companyId=form.elements.id.value;
    if(!companyId)return;
    const values={
      investmentStatus:form.elements.adminInvestmentStatus.value,
      paymentStatus:form.elements.adminPaymentStatus.value,
      contractAmount:form.elements.adminContractAmount.value,
      successFee:form.elements.adminSuccessFee.value
    };
    setTimeout(()=>{
      if(document.getElementById("companyModal").hidden){
        saveAdminMeta(companyId,values);
        syncAdminCompanyDetails();
      }
    },0);
  },true);
  syncRemainingRoundsColumn();
  syncCompanyDetailStatus();
  syncAdminCompanyDetails();
  syncCompanyNote();
})();


