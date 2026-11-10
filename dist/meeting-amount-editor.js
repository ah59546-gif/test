function parseMeetingAmount(value){
  const text=String(value).trim().replace(/[,\s]/g,"").replace(/원$/,"");
  const invalid=()=>new Error("예: 5억, 5천만원 또는 50,000,000으로 입력해 주세요.");
  if(!text||text.length>100||!/^[\d.조억만천백십]+$/.test(text))throw invalid();
  const scaled=(number,multiplier)=>{
    if(!/^\d+(?:\.\d+)?$/.test(number))throw invalid();
    const [whole,fraction=""]=number.split(".");
    const divisor=10n**BigInt(fraction.length);
    const amount=BigInt(whole+fraction)*BigInt(multiplier);
    if(amount%divisor!==0n)throw new Error("1원 단위까지 입력할 수 있어요.");
    return amount/divisor;
  };
  const group=(value,multiplier)=>{
    if(/^\d+(?:\.\d+)?$/.test(value))return scaled(value,multiplier);
    let total=0n,cursor=0,previous=10000;
    for(const token of value.matchAll(/(\d+(?:\.\d+)?)([천백십]?)/g)){
      if(token.index!==cursor)throw invalid();
      const unit=({천:1000,백:100,십:10})[token[2]]||1;
      if(unit>=previous)throw invalid();
      total+=scaled(token[1],unit*multiplier);
      previous=unit;cursor+=token[0].length;
    }
    if(!cursor||cursor!==value.length)throw invalid();
    return total;
  };
  let total=0n,cursor=0,previous=Infinity;
  for(const token of text.matchAll(/[조억만]/g)){
    const unit=({조:1000000000000,억:100000000,만:10000})[token[0]];
    if(unit>=previous)throw invalid();
    total+=group(text.slice(cursor,token.index),unit);
    previous=unit;cursor=token.index+1;
  }
  if(cursor<text.length)total+=group(text.slice(cursor),1);
  if(total>BigInt(Number.MAX_SAFE_INTEGER))throw new Error("입력 가능한 최대 금액을 초과했어요.");
  return Number(total);
}
async function updateMeetingAmount(meetingId,value){
  const amount=parseMeetingAmount(value);
  const meeting=db.meetings.find(item=>item.id===meetingId);
  if(!meeting)throw new Error("수정할 미팅 기록을 찾지 못했어요.");
  meeting.amount=amount;
  meeting.updatedAt=new Date().toISOString();
  await saveAndSync();
  return meeting;
}
function meetingAmountCell(item){
  const meeting=db.meetings.find(record=>record.id===item.id);
  if(!meeting||currentRole!=="admin")return fmtMoney(Number(item.amount)||0);
  const label=[com(meeting.companyId)?.name,inv(meeting.investorId)?.name].filter(Boolean).join(" · ");
  return `<button type="button" class="meeting-amount-trigger" data-meeting-amount-edit="${esc(meeting.id)}" aria-label="${esc(label)} 투자금액 수정" title="금액을 눌러 수정"><span>${fmtMoney(Number(meeting.amount)||0)}</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m15.5 4.5 4 4M4 20l4.5-1 12-12a2.8 2.8 0 0 0-4-4l-12 12L4 20Z"/></svg></button>`;
}
(()=>{
  function closeEditor(form){
    const meeting=db.meetings.find(item=>item.id===form.dataset.meetingAmountForm);
    if(meeting)form.closest("td").innerHTML=meetingAmountCell(meeting);
  }
  document.addEventListener("click",event=>{
    const cancel=event.target.closest?.("[data-meeting-amount-cancel]");
    if(cancel){closeEditor(cancel.closest("form"));return}
    const trigger=event.target.closest?.("[data-meeting-amount-edit]");
    if(!trigger||currentRole!=="admin")return;
    const open=document.querySelector("[data-meeting-amount-form]");
    if(open){open.querySelector("input")?.focus();showToast("열린 금액을 먼저 저장하거나 취소해 주세요.");return}
    const meeting=db.meetings.find(item=>item.id===trigger.dataset.meetingAmountEdit);
    if(!meeting){showToast("수정할 미팅 기록을 찾지 못했어요.");return}
    const value=Number(meeting.amount)||0;
    trigger.closest("td").innerHTML=`<form class="meeting-amount-form" data-meeting-amount-form="${esc(meeting.id)}"><label for="meetingAmountInput">투자금액</label><div class="meeting-amount-input"><input id="meetingAmountInput" type="text" autocomplete="off" value="${value?value.toLocaleString("ko-KR"):""}" placeholder="예: 5억 / 50,000,000" aria-describedby="meetingAmountHint meetingAmountError" required /></div><p id="meetingAmountHint" class="meeting-amount-hint" aria-live="polite">${value?value.toLocaleString("ko-KR")+"원":"5억, 5천만원 또는 숫자로 입력"}</p><p id="meetingAmountError" class="meeting-amount-error" role="alert" hidden></p><div class="meeting-amount-actions"><button type="submit">저장</button><button type="button" data-meeting-amount-cancel>취소</button></div></form>`;
    const input=document.getElementById("meetingAmountInput");
    input.focus();input.select();
  });
  document.addEventListener("input",event=>{
    const form=event.target.closest?.("[data-meeting-amount-form]");
    if(!form)return;
    event.target.removeAttribute("aria-invalid");
    form.querySelector(".meeting-amount-error").hidden=true;
    const hint=form.querySelector(".meeting-amount-hint");
    try{hint.textContent=parseMeetingAmount(event.target.value).toLocaleString("ko-KR")+"원"}catch{hint.textContent="5억, 5천만원 또는 숫자로 입력"}
  });
  document.addEventListener("keydown",event=>{
    const form=event.target.closest?.("[data-meeting-amount-form]");
    if(!form)return;
    if(event.key==="Enter"&&event.isComposing){event.preventDefault();return}
    if(event.key==="Escape"){event.preventDefault();if(form.getAttribute("aria-busy")!=="true")closeEditor(form)}
  });
  document.addEventListener("submit",async event=>{
    const form=event.target.closest?.("[data-meeting-amount-form]");
    if(!form||currentRole!=="admin")return;
    event.preventDefault();
    if(form.getAttribute("aria-busy")==="true")return;
    const input=form.querySelector("input");
    const error=form.querySelector(".meeting-amount-error");
    try{parseMeetingAmount(input.value)}catch(problem){input.setAttribute("aria-invalid","true");error.textContent=problem.message;error.hidden=false;input.focus();return}
    form.setAttribute("aria-busy","true");
    form.querySelectorAll("button").forEach(button=>button.disabled=true);
    try{
      await updateMeetingAmount(form.dataset.meetingAmountForm,input.value);
      render();
      showToast("투자금액을 저장하고 메인보드에 반영했습니다.");
    }catch(problem){
      error.textContent=problem.message||"저장하지 못했어요. 다시 저장해 주세요.";
      error.hidden=false;
      form.removeAttribute("aria-busy");
      form.querySelectorAll("button").forEach(button=>button.disabled=false);
    }
  });
})();

