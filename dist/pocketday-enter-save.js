(()=>{
  const form=document.getElementById("pocketdayForm");
  if(!form)return;

  form.addEventListener("keydown",event=>{
    if(event.key!=="Enter"||event.isComposing)return;
    if(event.target instanceof HTMLTextAreaElement)return;
    if(event.target?.id==="operationTypeName")return;
    if(event.shiftKey||event.ctrlKey||event.metaKey||event.altKey)return;

    event.preventDefault();
    if(!form.reportValidity())return;
    form.requestSubmit();
  });
})();

