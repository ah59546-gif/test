(()=>{
  const root=document.getElementById("viewRoot");
  if(!root)return;

  function syncParticipationStat(){
    const page=root.querySelector(".investor-detail-page");
    const stats=page?.querySelector(".investor-detail-stats");
    const pocketdayList=page?.querySelector(".investor-pocketday-list");
    if(!stats||!pocketdayList)return;

    const count=pocketdayList.querySelectorAll(":scope > article").length;
    let card=stats.querySelector("[data-participation-stat]");
    if(!card){
      card=document.createElement("article");
      card.dataset.participationStat="";
      card.innerHTML="<strong></strong><span>누적 참여 횟수</span>";
      stats.append(card);
    }

    const value=card.querySelector("strong");
    if(value&&value.textContent!==String(count))value.textContent=String(count);
  }

  new MutationObserver(syncParticipationStat).observe(root,{childList:true,subtree:true});
  syncParticipationStat();
})();

