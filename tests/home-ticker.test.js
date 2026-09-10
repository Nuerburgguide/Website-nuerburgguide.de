globalThis.runHomeTickerTests = async function(stateSource,tickerSource,coreSource,calendarSource) {
 let count=0;const assert=(v,m)=>{if(!v)throw Error(m);count++;};
 const root={};for(const s of [stateSource,coreSource,calendarSource])new Function('globalThis',s)(root);
 const p=root.TrackTickerState,c=root.TrackTickerCalendar,epoch=Date.parse('2026-09-10T15:20:00Z');
 const iso=ms=>new Date(epoch+ms).toISOString();
 const data={fresh:true,known:true,status:'OUTSIDE_SESSION',server_time:iso(0),last_successful_fetch:iso(0),data_age_seconds:0,max_age_seconds:3600,days:[{periods:[{start:iso(10000),end:iso(20000)}]}]};
 const cal=c.read(data,0);
 assert(!c.active(cal,9999),'before start hidden');assert(c.active(cal,10000),'start inclusive');assert(!c.active(cal,20000),'end exclusive');assert(c.next(cal,0)===10000,'next boundary');
 assert(!c.active(cal,3600000),'freshness expiry');
 for(const patch of [{fresh:false},{known:false},{status:'UNKNOWN'},{data_age_seconds:3600}]){let rejected=false;try{c.read({...data,...patch},0);}catch{rejected=true;}assert(rejected,'bad calendar rejected');}
 for(const host of ['localhost','127.0.0.1'])assert(p.local(host),'local');
 const green={status:'green',sectors:[]},yellow={status:'yellow',sectors:[{name:'API sector'}]},red={status:'red',sectors:yellow.sectors};
 assert(p.status(red,true,true).color==='red','red priority');assert(p.status(yellow,true,true).names[0]==='API sector','exact names');assert(p.status(green,true,true).color==='green','green');assert(!p.status(green,false,true)&&!p.status(green,true,false),'unreliable inactive hidden');
 async function harness(host,query) {
  let now=0,id=0;const timers=new Map(),intervals=new Map(),events={},calls=[],streams=[];
  const slot={hidden:true,dataset:{},setAttribute(k,v){this[k]=v;},replaceChildren(){}};
  const doc={hidden:false,documentElement:{lang:'en'},getElementById:()=>slot,createElement:()=>({setAttribute(){},append(){}}),addEventListener:(k,f)=>events[k]=f};
  const win={...root,addEventListener:(k,f)=>events[k]=f};
  class Params{constructor(s){this.params=Object.fromEntries(s.replace(/^\?/,'').split('&').map(v=>v.split('=')));}get(k){return this.params[k]||null;}}
  class Abort{constructor(){this.signal={};}abort(){}}
  class SSE{constructor(){this.handlers={};streams.push(this);}addEventListener(k,f){this.handlers[k]=f;}close(){}emit(d){this.handlers.snapshot({data:JSON.stringify(d)});}}
  const snapshot={overall_status:'GREEN',sectors:[],track_red:null,server_time:iso(0)};
  const fetch=async url=>{calls.push(url);return {ok:true,json:async()=>url.endsWith('track-calendar')?data:snapshot};};
  new Function('window','document','location','URLSearchParams','performance','fetch','EventSource','AbortController','setTimeout','clearTimeout','setInterval','clearInterval',tickerSource)(win,doc,{hostname:host,search:query},Params,{now:()=>now},fetch,SSE,Abort,(f,ms)=>{timers.set(++id,{f,at:now+ms});return id;},i=>timers.delete(i),(f)=>{intervals.set(++id,f);return id;},i=>intervals.delete(i));
  for(let i=0;i<16;i++)await Promise.resolve();
  return {win,slot,calls,streams,events,advance(t){now=t;for(const [i,x] of [...timers])if(x.at<=now){timers.delete(i);x.f();}for(const f of intervals.values())f();},snapshot};
 }
 for(const host of ['nuerburgguide.de','www.nuerburgguide.de']) {const prod=await harness(host,'?tfTest=active&tickerTest=red');assert(prod.slot.hidden&&prod.calls.length===0&&!prod.win.NGTrackTickerDev,'production ticker disabled');}
 for(const status of ['green','yellow','red']){const dev=await harness('localhost','?tfTest=active&tickerTest='+status);assert(!dev.slot.hidden&&dev.calls.length===0&&dev.slot['aria-label'].startsWith('DEV / TEST'),'local synthetic '+status);dev.win.NGTrackTickerDev.set('inactive');assert(dev.slot.hidden,'dev inactive');dev.win.NGTrackTickerDev.set('unknown');assert(dev.slot.hidden,'dev unknown');}
 return `${count} ticker assertions passed`;
};
