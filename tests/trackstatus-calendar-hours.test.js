globalThis.runCalendarHoursTests = async function(source, calendarSource) {
 const root={};new Function('globalThis',calendarSource)(root);
 let count=0;const assert=(v,m)=>{if(!v)throw Error(m);count++;};
 for(const lang of ['de','en','es'])for(const display of [false,true]) {
  let now=0,observer;const events={},intervals=[];
  const badge={dataset:{status:'green'}},hours={hidden:true,textContent:''};
  const doc={hidden:false,documentElement:{lang,className:display?'track-display-mode':''},getElementById:id=>id==='track-badge'?badge:hours,addEventListener:(k,f)=>events[k]=f};
  let data={fresh:true,known:true,status:'OUTSIDE_SESSION',server_time:'2026-09-10T12:00:00Z',last_successful_fetch:'2026-09-10T12:00:00Z',data_age_seconds:0,max_age_seconds:3600,days:[{periods:[{start:'2026-09-10T08:00:00+02:00',end:'2026-09-10T12:00:00+02:00'},{start:'2026-09-10T17:30:00+02:00',end:'2026-09-10T19:30:00+02:00'}]}]};
  let fail=false;
  class Observer{constructor(f){observer=f;}observe(){}}
  new Function('window','document','performance','fetch','MutationObserver','AbortController','setTimeout','clearTimeout','setInterval','clearInterval',source)({...root,addEventListener:(k,f)=>events[k]=f},doc,{now:()=>now},async()=>{if(fail)throw Error('network');return {ok:true,json:async()=>data};},Observer,class{abort(){}},()=>1,()=>{},f=>{intervals.push(f);return 1;},()=>{});
  const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};await flush();
  const outside='· '+{de:'außerhalb der Öffnungszeiten',en:'outside opening hours',es:'fuera del horario de apertura'}[lang];
  const check=(expected,message)=>assert(hours.textContent===expected&&hours.hidden===!expected,lang+' '+message);
  check(outside,'gap between windows');
  assert(badge.dataset.status==='green','technical status remains green');
  for(const [time,expected] of [
   ['07:59:59','outside'],['08:00:00','inside'],['11:59:59','inside'],['12:00:00','outside'],
   ['17:30:00','inside'],['19:29:59','inside'],['19:30:00','outside'],['21:00:00','outside']
  ]) {
   data={...data,server_time:'2026-09-10T'+time+'+02:00',last_successful_fetch:'2026-09-10T'+time+'+02:00'};
   events.visibilitychange();await flush();
   check(expected==='inside'?'08:00–12:00 · 17:30–19:30':outside,time);
  }
  now=3600000;intervals.at(-1)();check('','expired calendar');now=0;
  data={...data,server_time:'2026-09-10T19:29:59+02:00',last_successful_fetch:'2026-09-10T19:29:59+02:00'};
  events.visibilitychange();await flush();now=1000;intervals.at(-1)();check(outside,'timer crosses closing boundary');
  now=0;
  badge.dataset.status='red';observer();assert(hours.hidden&&hours.textContent==='','red hidden');
  badge.dataset.status='unknown';observer();assert(hours.hidden,'status unknown');badge.dataset.status='green';
  data={...data,days:[]};events.visibilitychange();await flush();assert(hours.hidden,'no TF');
  data={...data,known:false};events.visibilitychange();await flush();assert(hours.hidden,'calendar unknown');
  fail=true;events.visibilitychange();await flush();assert(hours.hidden,'fetch error');
  events.pagehide();assert(hours.hidden,'cleanup');
 }
 return `${count} calendar panel assertions passed`;
};
