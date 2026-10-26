(()=>{
  const root=document.getElementById("viewRoot");
  const storageKey="pocket-crm-company-remaining-rounds-v1";
  const adminMetaStorageKey="pocket-crm-admin-company-terms-v1";
  const statuses=["-","대기","완료","진행중"];
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

  function readAdminMeta(){
    try{return JSON.parse(localStorage.getItem(adminMetaStorageKey)||"{}")}catch{return {}}
  }

  function saveAdminMeta(companyId,values){
    const saved=readAdminMeta();
    saved[companyId]={investmentStatus:values.investmentStatus||"-",contractTerms:String(values.contractTerms||"").trim()};
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

    let statusCard=stack.querySelector(".company-detail-remaining-status");
    if(!statusCard){
      statusCard=document.createElement("div");
      statusCard.className="company-detail-remaining-status";
      statusCard.innerHTML="<small>잔여회차</small><strong>-</strong>";
      stack.append(statusCard);
    }

    const saved=readStatuses()[companyId];
    const status=statuses.includes(saved)?saved:"-";
    statusCard.dataset.state=status;
    const statusValue=statusCard.querySelector("strong");
    if(statusValue.textContent!==status)statusValue.textContent=status;
  }

  function syncAdminCompanyDetails(){
    const grid=root.querySelector(".company-detail-page .company-info-grid");
    const editButton=root.querySelector(".company-detail-page [data-edit-company]");
    if(!grid||!editButton)return;
    const companyId=editButton.dataset.editCompany;
    const meta=readAdminMeta()[companyId]||{};
    const values={investmentStatus:meta.investmentStatus||"-",contractTerms:meta.contractTerms||"-"};
    const fields=[
      {key:"investmentStatus",icon:"✓",label:"투자 여부",className:"company-admin-investment"},
      {key:"contractTerms",icon:"▧",label:"계약조건",className:"company-admin-contract"}
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
    const contract=document.createElement("label");
    contract.className="form-wide";
    contract.dataset.adminCompanyMeta="";
    contract.innerHTML='<span>계약조건</span><input name="adminContractTerms" placeholder="예: 보통주 투자, 주요 계약 조건" />';
    grid.append(investment,contract);
  }

  function populateAdminMetaForm(companyId){
    ensureAdminMetaFields();
    const form=document.getElementById("companyForm");
    const fields=[...form.querySelectorAll("[data-admin-company-meta]")];
    fields.forEach(field=>field.hidden=!companyId);
    if(!companyId)return;
    const meta=readAdminMeta()[companyId]||{};
    form.elements.adminInvestmentStatus.value=meta.investmentStatus||"-";
    form.elements.adminContractTerms.value=meta.contractTerms||"";
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
        if(companyId)saveStatus(companyId,select.value);
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
    const values={investmentStatus:form.elements.adminInvestmentStatus.value,contractTerms:form.elements.adminContractTerms.value};
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

