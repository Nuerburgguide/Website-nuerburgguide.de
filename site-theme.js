// Stable selection plus a separate, lighter hover preview.
(() => {
 const group=document.querySelector('.language-switcher');
 if(!group)return;
 const links=[...group.querySelectorAll('a')];
 const selected=links.find(a=>a.hasAttribute('aria-current'))||links[0];
 let preview=selected;
 function move(link){
  preview=link||selected;
  group.style.setProperty('--language-x',`${preview.offsetLeft}px`);
  group.style.setProperty('--language-preview',preview===selected?'0':'1');
 }
 function measure(){
  group.style.setProperty('--language-selected-x',`${selected.offsetLeft}px`);
  group.style.setProperty('--language-width',`${selected.offsetWidth}px`);
  move(preview);
 }
 links.forEach(link=>{
  link.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')move(link);});
  link.addEventListener('focus',()=>move(link));
 });
 group.addEventListener('pointerleave',()=>move(group.contains(document.activeElement)?document.activeElement:selected));
 group.addEventListener('focusout',e=>{if(!group.contains(e.relatedTarget))move(selected);});
 new ResizeObserver(measure).observe(group);
 measure();
})();


const header=document.querySelector('.site-header');
if(header)new ResizeObserver(()=>document.documentElement.style.setProperty('--header-height',header.offsetHeight+'px')).observe(header);
