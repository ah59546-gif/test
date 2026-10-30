(()=>{
  const form=document.getElementById("pocketdayForm");
  if(!form)return;

  form.addEventListener("keydown",event=>{
    if((event.key!=="Enter"&&event.code!=="NumpadEnter")||event.isComposing)return;
    if(event.target?.id==="operationTypeName")return;
    if(event.target instanceof HTMLTextAreaElement&&event.shiftKey)return;
    if(event.ctrlKey||event.metaKey||event.altKey)return;

    event.preventDefault();
    if(!form.reportValidity())return;
    form.requestSubmit();
  },true);
})();


