globalThis.runYellowScrollTests=function(source){
 let count=0;const assert=(v,m)=>{if(!v)throw Error(m);count++;};
 let now=0,id=0;const frames=new Map(),handlers={},media={matches:false,addEventListener:(k,f)=>handlers.motion=f};
 const list={scrollTop:0,scrollHeight:800,clientHeight:200,previousElementSibling:{tagName:'H2'},setAttribute(){},addEventListener:(k,f)=>handlers[k]=f};
 const doc={hidden:false,getElementById:()=>list,addEventListener:(k,f)=>handlers[k]=f};
 const win={matchMedia:()=>media,addEventListener:(k,f)=>handlers[k]=f};let mutation,resize,disconnected=0;
 class MO{constructor(f){mutation=f;}observe(){}disconnect(){disconnected++;}}
 class RO{constructor(f){resize=f;}observe(){}disconnect(){disconnected++;}}
 new Function('window','document','performance','requestAnimationFrame','cancelAnimationFrame','MutationObserver','ResizeObserver',source)(win,doc,{now:()=>now},f=>{frames.set(++id,f);return id;},i=>frames.delete(i),MO,RO);
 function step(ms){now+=ms;const tasks=[...frames.values()];frames.clear();tasks.forEach(f=>f(now));}
 assert(list.tabIndex===0,'keyboard scroll access');step(1000);assert(list.scrollTop===0,'initial pause');step(2000);for(let i=0;i<100;i++)step(50);
 assert(list.scrollTop>50&&list.scrollTop<70,'slow twelve pixel speed');
 for(let i=0;i<1100;i++)step(50);assert(list.scrollTop<=600,'no overflow beyond bottom');
 const before=list.scrollTop;for(let i=0;i<150;i++)step(50);assert(list.scrollTop<before,'returns upward smoothly');
 mutation();assert(list.scrollTop===0,'new rows reset cycle');
 media.matches=true;handlers.motion();assert(frames.size===0,'reduced motion stops animation');
 media.matches=false;list.scrollHeight=100;resize();assert(frames.size===0,'short list has no animation');
 list.scrollHeight=800;resize();assert(frames.size===1,'long list restarts');
 handlers.focusin();assert(frames.size===0,'manual interaction pauses');handlers.focusout();assert(frames.size===1,'manual interaction resumes');
 doc.hidden=true;handlers.visibilitychange();assert(frames.size===0,'hidden document stops');doc.hidden=false;handlers.visibilitychange();
 handlers.pagehide();assert(frames.size===0&&disconnected===2,'pagehide cleans up');
 return `${count} yellow scroll assertions passed`;
};
