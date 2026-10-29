(()=>{
  const toList=value=>Array.isArray(value)?value.filter(Boolean):String(value||"").split(",").map(item=>item.trim()).filter(Boolean);
  const tags=values=>toList(values).map(value=>`<span class="tag">${esc(value)}</span>`).join("");
  const homeInvestorKey="pocket-crm-linked-investor-v1";
  const markerDot=person=>person?.marker?`<span class="investor-status-dot ${person.marker}" aria-label="${person.marker==="red"?"빨간점":"노란점"} 표시"></span>`:"";

  db.investors.forEach(person=>{
    person.fund=String(person.fund||"").trim();
    person.rounds=toList(person.rounds);
    person.focus=toList(person.focus);
    person.marker=["yellow","red"].includes(person.marker)?person.marker:"";
  });
  let linkedInvestorId=localStorage.getItem(homeInvestorKey)||db.investors[0]?.id||"";

  renderInvestors=function(){
    const people=db.investors.filter(person=>{
      const aggregate=investorAgg(person);
      return match(person.name,person.firm,person.fund,person.operatorType,person.title,...person.rounds,...person.focus,...aggregate.ms.flatMap(meeting=>[meeting.company?.name,meeting.memo]));
    });
    const rows=people.map(person=>{
      const aggregate=investorAgg(person);
      const operatorType=person.operatorType||operatorTypeForFirm(person.firm);
      return `<tr><td><div class="entity-cell"><i class="entity-mark">${initials(person.name)}</i><div><div class="investor-name-line"><button class="entity-link" data-investor="${person.id}">${esc(person.name)}</button>${markerDot(person)}</div>${person.email?`<small>${esc(person.email)}</small>`:""}${person.phone?`<small>연락처 ${esc(person.phone)}</small>`:""}</div></div></td><td><div class="firm-with-type">${person.firm?`<span>${esc(person.firm)}</span>`:""}${operatorTypeBadges(operatorType)}</div></td><td>${esc(person.title)}</td><td><div class="investor-preference-tags">${tags(person.rounds)}</div></td><td><div class="investor-preference-tags">${tags(person.focus)}</div></td><td>${esc(person.fund||"—")}</td><td>${aggregate.followups}</td><td>${aggregate.done}</td></tr>`;
    }).join("");
    return `<div class="list-header"><p>직접 등록한 심사역의 기본 정보와 연결된 이력을 관리합니다.</p><button class="primary-button" data-open-investor>＋ 심사역 추가</button></div><section class="panel db-table investor-list-table"><div class="table-wrap"><table><thead><tr><th>심사역</th><th>소속 투자사 · 운영사 종류</th><th>직책</th><th>관심 라운드</th><th>관심 분야</th><th>펀드</th><th>후속 미팅</th><th>투자 완료</th></tr></thead><tbody>${rows||`<tr><td colspan="8"><div class="empty investor-empty"><strong>등록된 심사역이 없습니다.</strong><span>심사역 추가 버튼을 눌러 직접 등록해 주세요.</span><button class="primary-button" data-open-investor>＋ 첫 심사역 추가</button></div></td></tr>`}</tbody></table></div></section>`;
  };

  const originalOpenInvestorModal=openInvestorModal;
  openInvestorModal=function(id=""){
    originalOpenInvestorModal(id);
    const person=id?inv(id):null;
    document.getElementById("investorForm").elements.fund.value=person?.fund||"";
    document.getElementById("investorForm").elements.rounds.value=toList(person?.rounds).join(", ");
    document.getElementById("investorForm").elements.marker.value=person?.marker||"";
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
    const values={name:data.name.trim(),firm:data.firm.trim(),fund:data.fund.trim(),operatorType:data.operatorType,title:data.title.trim(),email,phone:data.phone.trim(),marker:["yellow","red"].includes(data.marker)?data.marker:"",rounds:toList(data.rounds),focus:toList(data.focus)};
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

  function eventHasInvestor(event,person){
    return (event.investors||[]).some(value=>pocketdayInvestorDetails(value).name.trim()===person.name.trim());
  }

  renderInvestorHome=function(){
    const person=db.investors.find(item=>item.id===linkedInvestorId)||db.investors[0];
    if(!person)return `<div class="role-dashboard investor-dashboard"><section class="linked-investor-empty"><h1>등록된 심사역이 없습니다.</h1><p>관리자 페이지의 심사역 목록에서 먼저 심사역을 추가해 주세요.</p></section></div>`;
    linkedInvestorId=person.id;
    const eventHistory=pocketdaySchedule.filter(event=>eventHasInvestor(event,person)).map(event=>({...event,status:event.status==="완료"?"참여 완료":"참여 예정"}));
    const companyHistory=eventHistory.flatMap(event=>event.companies.map(company=>({company,event:`${pocketdayLabel(event)} 포켓데이`,date:event.date,status:event.status})));
    const eventRows=eventHistory.map(event=>`<article class="pocket-history-row" data-pocket-row data-search="${esc(`${event.id} ${event.round||""} ${event.companies.join(" ")}`)}"><div class="pocket-event-info"><time>${esc(event.date)}</time><div><h2>${esc(pocketdayLabel(event))} 포켓데이</h2><span class="pocket-status ${event.status==="참여 완료"?"done":""}">${event.status}</span></div><p>운영구분 · ${esc(pocketdayOperationType(event))}</p></div><div class="pocket-company-list"><strong>참여 기업</strong><div>${event.companies.map(name=>`<span>${esc(name)}</span>`).join("")}</div></div><button class="pocket-row-open" data-pocket-open aria-label="${esc(pocketdayLabel(event))} 포켓데이 심사 관리 열기">›</button></article>`).join("");
    const companyRows=companyHistory.map(item=>`<article class="pocket-history-row company-view-row" data-pocket-row data-search="${esc(`${item.company} ${item.event}`)}"><div class="pocket-event-info"><time>${item.date}</time><div><h2>${esc(item.company)}</h2><span class="pocket-status ${item.status==="참여 완료"?"done":""}">${item.status}</span></div><p>검토 기업 · 포켓데이 참여 이력</p></div><div class="pocket-company-list"><strong>참여 행사</strong><div><span>${item.event}</span></div></div><button class="pocket-row-open" data-pocket-open aria-label="${esc(item.company)} 심사 관리 열기">›</button></article>`).join("");
    const options=db.investors.map(item=>`<option value="${item.id}" ${item.id===person.id?"selected":""}>${esc(item.name)}${item.firm?` · ${esc(item.firm)}`:""}</option>`).join("");
    const empty=`<div class="linked-investor-no-history">선택한 심사역의 포켓데이 참여 이력이 없습니다.</div>`;
    const reviewedCompanies=new Set(companyHistory.map(item=>item.company)).size;
    const realInterestIds=new Set(db.meetings.filter(meeting=>meeting.type==="포켓데이").map(meeting=>meeting.companyId));
    const interestCount=realInterestIds.size?[...investorInterestCompanyIds].filter(id=>realInterestIds.has(id)).length:investorInterestCompanyIds.size;
    const interestCard=`<button type="button" data-go="investorReview" aria-label="관심 기업 페이지로 이동" class="role-stat-card purple is-link"><div class="role-stat-icon">★</div><div><span>관심 기업</span><strong>${interestCount}<small>건</small></strong><p>심사 관리에서 표시한 기업</p></div><b>›</b></button>`;
    return `<div class="role-dashboard investor-dashboard pocket-history-page investor-home-dashboard"><header class="role-greeting"><div><span class="role-overline">INVESTOR DASHBOARD</span><h1>${esc(person.name)} 심사역님, 안녕하세요! <i>👋</i></h1><p>포켓데이 참여 이력과 관심 기업, 투자 검토 현황을 한곳에서 확인하세요.</p></div><section class="investor-dashboard-selector"><div class="linked-investor-profile"><i>${initials(person.name)}</i><div><strong>${markerDot(person)}${esc(person.name)} 심사역</strong><p>${esc(person.firm||"소속 미등록")}${person.title?` · ${esc(person.title)}`:""}</p></div></div><label><span>심사역 선택</span><select data-linked-investor>${options}</select></label></section></header><section class="role-stat-grid">${roleStat("▣","포켓데이 참여",eventHistory.length,"참여한 공식 프로그램","blue")}${roleStat("◎","검토 기업",reviewedCompanies,"포켓데이 참여 기업 기준","mint")}${interestCard}</section><header class="pocket-history-title investor-home-history-title"><span class="role-overline">ACTIVITY</span><h1>${esc(person.name)} 심사역 참여 이력</h1><p>포켓데이별·기업별 심사 이력을 확인하세요.</p></header><div class="pocket-view-tabs"><button class="${pocketViewMode==="event"?"active":""}" data-pocket-tab="event">포켓데이별 보기</button><button class="${pocketViewMode==="company"?"active":""}" data-pocket-tab="company">기업별 보기</button></div><section class="pocket-history-panel"><div class="pocket-history-tools"><label><span>⌕</span><input type="search" data-pocket-search placeholder="회차 또는 기업명으로 검색해보세요." aria-label="포켓데이 이력 검색"></label></div><div class="pocket-history-list ${pocketViewMode==="company"?"company-mode":""}">${pocketViewMode==="event"?(eventRows||empty):(companyRows||empty)}</div><div class="pocket-search-empty" hidden>검색 결과가 없습니다.</div></section></div>`;
  };

  document.addEventListener("change",event=>{
    const select=event.target.closest("[data-linked-investor]");
    if(!select)return;
    linkedInvestorId=select.value;
    localStorage.setItem(homeInvestorKey,linkedInvestorId);
    render();
  });

  const root=document.getElementById("viewRoot");
  function enhanceInvestorDetail(){
    const grid=root.querySelector(".investor-detail-page .investor-info-grid.full-page");
    if(!grid||grid.querySelector("[data-investor-rounds]"))return;
    const person=selectedInvestorId?inv(selectedInvestorId):null;
    if(!person)return;
    const title=root.querySelector(".investor-detail-identity h1");
    if(title&&!title.querySelector(".investor-status-dot"))title.insertAdjacentHTML("afterbegin",markerDot(person));
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
  render();
})();


