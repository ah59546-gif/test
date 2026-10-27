(()=>{
  const root=document.getElementById("viewRoot");
  const storageKey="pocket-crm-company-remaining-rounds-v1";
  const companyTypeStorageKey="pocket-crm-company-types-v1";
  const adminMetaStorageKey="pocket-crm-admin-company-terms-v1";
  const statuses=["-","대기","완료","진행중"];
  const companyTypes=["포켓","외부"];
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

    const heading=document.createElement("th");
    heading.dataset.remainingRounds="";
    heading.textContent="잔여회차";
    table.querySelector("thead tr")?.append(heading);

    table.querySelectorAll("tbody tr").forEach(row=>{
      const onlyCell=row.cells.length===1?row.cells[0]:null;
      if(onlyCell&&onlyCell.colSpan>1){
        onlyCell.colSpan=7;
        return;
      }
      const companyId=row.querySelector("[data-company]")?.dataset.company||"";
      const cell=document.createElement("td");
      cell.className="company-remaining-rounds";
      const select=document.createElement("select");
      select.className="company-remaining-select";
      select.setAttribute("aria-label",`${row.querySelector("[data-company]")?.textContent.trim()||"기업"} 잔여회차`);
      select.innerHTML=statuses.map(status=>`<option value="${status}">${status}</option>`).join("");
      const saved=readStatuses()[companyId];
      select.value=statuses.includes(saved)?saved:"-";
      select.dataset.state=select.value;
      select.addEventListener("change",()=>{
        select.dataset.state=select.value;
        if(companyId){
          saveStatus(companyId,select.value);
          render();
        }
      });
      cell.append(select);
      row.append(cell);
    });
  }

  function syncAll(){
    syncRemainingRoundsColumn();
    syncCompanyDetailStatus();
    syncAdminCompanyDetails();
  }

  new MutationObserver(syncAll).observe(root,{childList:true,subtree:true});
  window.addEventListener("storage",event=>{
    if(event.key===storageKey)syncCompanyDetailStatus();
    if(event.key===companyTypeStorageKey)syncCompanyDetailStatus();
    if(event.key===adminMetaStorageKey)syncAdminCompanyDetails();
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
})();

