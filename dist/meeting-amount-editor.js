function parseMeetingAmount(value){
  const digits=String(value).trim().replace(/[,\s]/g,"");
  if(!/^\d+$/.test(digits))throw new Error("금액을 원 단위 숫자로 입력해 주세요.");
  const amount=Number(digits);
  if(!Number.isSafeInteger(amount)||amount<0)throw new Error("0원 이상의 유효한 금액을 입력해 주세요.");
  return amount;
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
  return `<button type="button" class="meeting-amount-trigger" data-meeting-amount-edit="${esc(meeting.id)}" aria-label="${esc(label)} 투자금액 수정" title="투자금액 수정"><span>${fmtMoney(Number(meeting.amount)||0)}</span><small>수정</small></button>`;
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
    trigger.closest("td").innerHTML=`<form class="meeting-amount-form" data-meeting-amount-form="${esc(meeting.id)}"><label for="meetingAmountInput">투자금액 (원)</label><div class="meeting-amount-input"><input id="meetingAmountInput" type="text" inputmode="numeric" autocomplete="off" value="${value?value.toLocaleString("ko-KR"):""}" placeholder="예: 100,000,000" aria-describedby="meetingAmountError" required /><span>원</span></div><p id="meetingAmountError" class="meeting-amount-error" role="alert" hidden></p><div class="meeting-amount-actions"><button type="submit">저장</button><button type="button" data-meeting-amount-cancel>취소</button></div></form>`;
    const input=document.getElementById("meetingAmountInput");
    input.focus();input.select();
  });
  document.addEventListener("input",event=>{
    const form=event.target.closest?.("[data-meeting-amount-form]");
    if(!form)return;
    event.target.removeAttribute("aria-invalid");
    form.querySelector(".meeting-amount-error").hidden=true;
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

