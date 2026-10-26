(()=>{
  const root=document.getElementById("viewRoot");
  const storageKey="pocket-crm-company-remaining-rounds-v1";
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
    statusCard.querySelector("strong").textContent=status;
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
  }

  new MutationObserver(syncAll).observe(root,{childList:true,subtree:true});
  window.addEventListener("storage",event=>{
    if(event.key===storageKey)syncCompanyDetailStatus();
  });
  syncRemainingRoundsColumn();
  syncCompanyDetailStatus();
})();

