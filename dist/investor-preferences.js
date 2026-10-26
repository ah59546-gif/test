(()=>{
  const toList=value=>Array.isArray(value)?value.filter(Boolean):String(value||"").split(",").map(item=>item.trim()).filter(Boolean);
  const tags=values=>toList(values).map(value=>`<span class="tag">${esc(value)}</span>`).join("");

  db.investors.forEach(person=>{
    person.rounds=toList(person.rounds);
    person.focus=toList(person.focus);
  });

  renderInvestors=function(){
    const people=db.investors.filter(person=>{
      const aggregate=investorAgg(person);
      return match(person.name,person.firm,person.operatorType,person.title,...person.rounds,...person.focus,...aggregate.ms.flatMap(meeting=>[meeting.company?.name,meeting.memo]));
    });
    const rows=people.map(person=>{
      const aggregate=investorAgg(person);
      const operatorType=person.operatorType||operatorTypeForFirm(person.firm);
      return `<tr><td><div class="entity-cell"><i class="entity-mark">${initials(person.name)}</i><div><button class="entity-link" data-investor="${person.id}">${esc(person.name)}</button>${person.email?`<small>${esc(person.email)}</small>`:""}${person.phone?`<small>연락처 ${esc(person.phone)}</small>`:""}</div></div></td><td><div class="firm-with-type">${person.firm?`<span>${esc(person.firm)}</span>`:""}${operatorTypeBadges(operatorType)}</div></td><td>${esc(person.title)}</td><td><div class="investor-preference-tags">${tags(person.rounds)}</div></td><td><div class="investor-preference-tags">${tags(person.focus)}</div></td><td>${aggregate.followups}</td><td>${aggregate.done}</td></tr>`;
    }).join("");
    return `<div class="list-header"><p>직접 등록한 심사역의 기본 정보와 연결된 이력을 관리합니다.</p><button class="primary-button" data-open-investor>＋ 심사역 추가</button></div><section class="panel db-table investor-list-table"><div class="table-wrap"><table><thead><tr><th>심사역</th><th>소속 투자사 · 운영사 종류</th><th>직책</th><th>관심 라운드</th><th>관심 분야</th><th>후속 미팅</th><th>투자 완료</th></tr></thead><tbody>${rows||`<tr><td colspan="7"><div class="empty investor-empty"><strong>등록된 심사역이 없습니다.</strong><span>심사역 추가 버튼을 눌러 직접 등록해 주세요.</span><button class="primary-button" data-open-investor>＋ 첫 심사역 추가</button></div></td></tr>`}</tbody></table></div></section>`;
  };

  const originalOpenInvestorModal=openInvestorModal;
  openInvestorModal=function(id=""){
    originalOpenInvestorModal(id);
    const person=id?inv(id):null;
    document.getElementById("investorForm").elements.rounds.value=toList(person?.rounds).join(", ");
  };

  document.getElementById("investorForm").onsubmit=event=>{
    event.preventDefault();
    const form=event.currentTarget;
    const data=Object.fromEntries(new FormData(form).entries());
    const email=data.email.trim();
    if(email&&db.investors.some(person=>person.id!==data.id&&person.email?.toLowerCase()===email.toLowerCase())){
      showToast("이미 등록된 이메일입니다.");
      return;
    }
    const values={name:data.name.trim(),firm:data.firm.trim(),operatorType:data.operatorType,title:data.title.trim(),email,phone:data.phone.trim(),rounds:toList(data.rounds),focus:toList(data.focus)};
    if(data.id){
      const person=inv(data.id);
      if(!person){showToast("수정할 심사역을 찾지 못했습니다.");return}
      Object.assign(person,values);
      selectedInvestorId=person.id;
      save();
      fillSelects();
      form.reset();
      closeInvestorModal();
      showToast("심사역 정보를 수정했습니다.");
      render();
    }else{
      db.investors.unshift({id:`inv-${Date.now()}`,...values});
      save();
      fillSelects();
      form.reset();
      closeInvestorModal();
      showToast("심사역을 목록에 추가했습니다.");
      switchView("investors");
    }
  };

  const root=document.getElementById("viewRoot");
  function enhanceInvestorDetail(){
    const grid=root.querySelector(".investor-detail-page .investor-info-grid.full-page");
    if(!grid||grid.querySelector("[data-investor-rounds]"))return;
    const person=selectedInvestorId?inv(selectedInvestorId):null;
    if(!person)return;
    const focusCard=[...grid.children].find(card=>card.querySelector("small")?.textContent.trim()==="관심 분야");
    if(!focusCard)return;
    const card=document.createElement("div");
    card.className="investor-info-card";
    card.dataset.investorRounds="";
    card.innerHTML=`<i>◉</i><span><small>관심 라운드</small><strong class="investor-preference-tags">${tags(person.rounds)||'<em class="investor-info-empty">—</em>'}</strong></span>`;
    grid.insertBefore(card,focusCard);
  }
  new MutationObserver(enhanceInvestorDetail).observe(root,{childList:true,subtree:true});
  enhanceInvestorDetail();
})();

