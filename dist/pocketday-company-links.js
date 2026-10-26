(()=>{
  const root=document.getElementById("viewRoot");
  if(!root)return;

  function enhanceCompanyTags(){
    root.querySelectorAll(".pocketday-schedule-companies span, .pocketday-next-copy em").forEach(tag=>{
      const name=tag.textContent.trim();
      const company=db.companies.find(item=>normalizeCompanyName(item.name)===normalizeCompanyName(name));
      if(!company)return;
      const button=document.createElement("button");
      button.type="button";
      button.className="pocketday-company-link";
      button.textContent=name;
      button.setAttribute("aria-label",`${name} 기업 상세 보기`);
      button.onclick=()=>openCompany(company.id);
      tag.replaceWith(button);
    });
  }

  new MutationObserver(enhanceCompanyTags).observe(root,{childList:true,subtree:true});
  enhanceCompanyTags();
})();

