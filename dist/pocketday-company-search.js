(()=>{
  const root=document.getElementById("viewRoot");
  if(!root)return;

  let query="";
  const normalize=value=>String(value||"").trim().toLowerCase();

  function filterRows(page){
    const rows=[...page.querySelectorAll(".pocketday-schedule-list > article")];
    const term=normalize(query);
    let visibleCount=0;

    rows.forEach(row=>{
      const companyNames=normalize(row.querySelector(".pocketday-schedule-companies")?.textContent);
      const matches=!term||companyNames.includes(term);
      row.hidden=!matches;
      if(matches)visibleCount+=1;
    });

    let empty=page.querySelector("[data-company-search-empty]");
    if(!empty){
      empty=document.createElement("div");
      empty.className="pocketday-company-search-empty";
      empty.dataset.companySearchEmpty="";
      empty.innerHTML="<strong>검색된 기업이 없습니다.</strong><p>기업명을 다시 확인해 주세요.</p>";
      page.querySelector(".pocketday-schedule-list")?.append(empty);
    }
    empty.hidden=!term||visibleCount>0||rows.length===0;
  }

  function mount(){
    const page=root.querySelector(".pocketday-admin-page");
    if(!page)return;
    const actions=page.querySelector(".pocketday-schedule-actions");
    if(!actions)return;

    let input=actions.querySelector("[data-company-search]");
    if(!input){
      const label=document.createElement("label");
      label.className="pocketday-company-search";
      label.innerHTML='<span aria-hidden="true">⌕</span><input type="search" data-company-search placeholder="기업명 검색" aria-label="포켓데이 참여 기업 검색">';
      const addButton=actions.querySelector("[data-add-pocketday]");
      actions.insertBefore(label,addButton);
      input=label.querySelector("input");
      input.addEventListener("input",event=>{
        query=event.target.value;
        filterRows(page);
      });
    }
    input.value=query;
    filterRows(page);
  }

  new MutationObserver(mount).observe(root,{childList:true,subtree:true});
  mount();
})();

