(()=>{
  const root=document.getElementById("viewRoot");
  if(!root)return;

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
      const cell=document.createElement("td");
      cell.className="company-remaining-rounds";
      cell.textContent="—";
      row.append(cell);
    });
  }

  new MutationObserver(syncRemainingRoundsColumn).observe(root,{childList:true,subtree:true});
  syncRemainingRoundsColumn();
})();

