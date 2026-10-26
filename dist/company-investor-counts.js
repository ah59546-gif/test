(()=>{
  const root=document.getElementById("viewRoot");
  if(!root)return;

  function participationCount(company){
    if(!company)return 0;
    const pocketdays=companyWorkspaceData(company).pocketdays||[];
    return pocketdays.reduce((total,event)=>total+(event.investors||[]).length,0);
  }

  function syncCompanyInvestorCounts(){
    const table=[...root.querySelectorAll(".db-table table")].find(candidate=>
      [...candidate.querySelectorAll("thead th")].some(cell=>cell.textContent.trim()==="만난 심사역")
    );
    if(!table)return;

    const headers=[...table.querySelectorAll("thead th")].map(cell=>cell.textContent.trim());
    const investorIndex=headers.indexOf("만난 심사역");
    if(investorIndex<0)return;

    table.querySelectorAll("tbody tr").forEach(row=>{
      const companyId=row.querySelector("[data-company]")?.dataset.company;
      const cell=row.cells[investorIndex];
      if(!companyId||!cell)return;
      const count=String(participationCount(com(companyId)));
      if(cell.textContent.trim()!==count)cell.textContent=count;
      cell.dataset.pocketdayInvestorTotal="";
      cell.title="기업 상세페이지의 회차별 참여 심사역 합계";
    });
  }

  new MutationObserver(syncCompanyInvestorCounts).observe(root,{childList:true,subtree:true});
  syncCompanyInvestorCounts();
})();

