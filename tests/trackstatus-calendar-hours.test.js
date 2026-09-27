globalThis.runCalendarHoursTests = async function(source, calendarSource) {
 const root={};new Function('globalThis',calendarSource)(root);
 let count=0;const assert=(v,m)=>{if(!v)throw Error(m);count++;};
 for(const lang of ['de','en','es'])for(const display of [false,true]) {
  let now=0,observer;const events={},intervals=[];
  const words={de:['Geöffnet','Außerhalb der Öffnungszeiten','Heute geschlossen','Geschlossen'],en:['Open','Outside opening hours','Closed today','Closed'],es:['Abierta','Fuera del horario de apertura','Cerrada hoy','Cerrada']}[lang];
  const badge={dataset:{status:'green'}},hours={hidden:true,textContent:''},label={textContent:words[0]},page={dataset:{green:words[0]}};
  const nodes={'track-badge':badge,'track-calendar-hours':hours,'track-label':label,'track-page':page};
  const doc={hidden:false,documentElement:{lang,className:display?'track-display-mode':''},getElementById:id=>nodes[id],addEventListener:(k,f)=>events[k]=f};
  const periods=[{start:'2026-09-10T08:00:00+02:00',end:'2026-09-10T12:00:00+02:00'},{start:'2026-09-10T17:30:00+02:00',end:'2026-09-10T19:30:00+02:00'}];
  let data={fresh:true,known:true,status:'OUTSIDE_SESSION',server_time:'2026-09-10T12:00:00Z',last_successful_fetch:'2026-09-10T12:00:00Z',data_age_seconds:0,max_age_seconds:3600,days:[{date:'2026-09-10',periods}]};
  let fail=false;
  class Observer{constructor(f){observer=f;}observe(){}}
  const win={...root,addEventListener:(k,f)=>events[k]=f};
  new Function('window','document','performance','fetch','MutationObserver','AbortController','setTimeout','clearTimeout','setInterval','clearInterval',source)(win,doc,{now:()=>now},async()=>{if(fail)throw Error('network');return {ok:true,json:async()=>data};},Observer,class{abort(){}},()=>1,()=>{},f=>{intervals.push(f);return 1;},()=>{});
  const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};await flush();
  const times='08:00–12:00 · 17:30–19:30';
  const check=(status,text,message)=>{
   assert(label.textContent===status,lang+' label: '+message);
   assert(hours.textContent===text&&hours.hidden===!text,lang+' hours: '+message);
  };
  check(words[1],times,'gap between windows');
  assert(badge.dataset.status==='green','technical status remains green');
  for(const [time,active] of [
   ['07:59:59',false],['08:00:00',true],['11:59:59',true],['12:00:00',false],
   ['17:30:00',true],['19:29:59',true],['19:30:00',false],['21:00:00',false]
  ]) {
   data={...data,server_time:'2026-09-10T'+time+'+02:00',last_successful_fetch:'2026-09-10T'+time+'+02:00'};
   events.visibilitychange();await flush();check(words[active?0:1],times,time);
   label.textContent=words[0];win.TrackCalendarHours.render();check(words[active?0:1],times,'track renderer refresh');
   badge.dataset.status='red';label.textContent=words[3];win.TrackCalendarHours.render();check(words[3],'','RED always wins');
   badge.dataset.status='green';observer();check(words[active?0:1],times,'RED cleared');
  }
  now=3600000;intervals.at(-1)();check(words[0],'','expired calendar');now=0;
  data={...data,server_time:'2026-09-10T19:29:59+02:00',last_successful_fetch:'2026-09-10T19:29:59+02:00'};
  events.visibilitychange();await flush();now=1000;intervals.at(-1)();check(words[1],times,'timer crosses closing boundary');
  now=0;
  data={...data,days:[{date:'2026-09-10',periods:[]}]};events.visibilitychange();await flush();check(words[2],'','explicit closed day');
  assert(badge.dataset.status==='green','closed calendar day leaves technical status green');
  badge.dataset.status='red';label.textContent=words[3];observer();check(words[3],'','RED on closed day');
  badge.dataset.status='unknown';label.textContent='Unavailable';observer();check('Unavailable','','unknown track status');badge.dataset.status='green';
  data={...data,days:[]};events.visibilitychange();await flush();check(words[0],'','missing day');
  data={...data,days:[{date:'2026-09-11',periods:[]}]};events.visibilitychange();await flush();check(words[0],'','another closed day is not today');
  data={...data,days:[{date:'2026-09-10',periods:[]}],known:false};events.visibilitychange();await flush();check(words[0],'','calendar unknown');
  data={...data,known:true,status:'UNKNOWN'};events.visibilitychange();await flush();check(words[0],'','UNKNOWN status');
  data={...data,status:'OUTSIDE_SESSION',fresh:false};events.visibilitychange();await flush();check(words[0],'','stale calendar');
  fail=true;events.visibilitychange();await flush();check(words[0],'','fetch error');
  events.pagehide();check(words[0],'','cleanup');
 }
 return `${count} calendar panel assertions passed`;
};
