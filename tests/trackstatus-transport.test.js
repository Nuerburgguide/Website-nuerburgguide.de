// Pass trackstatus.js source to this runner in a JavaScript runtime after core.js.
globalThis.runTrackTransportTests = async function (sourceCode) {
    let assertions = 0;
    function assert(value, message) { if (!value) throw new Error(message); assertions++; }
    function harness(enabled = true) {
        const nodes = new Map(), listeners = {}, timers = new Map(), calls = [], streams = [], pending = [];
        let serial = 0, now = 0;
        const labels = {green:'Open',yellow:'yellow',red:'Closed',unknown:'unknown',empty:'empty',connected:'connected',reconnecting:'reconnecting',stale:'stale',unavailable:'unavailable',loading:'loading'};
        function node() { return {textContent:'',dataset:{...labels},className:'',hidden:false,children:[],append(...x){this.children.push(...x);},replaceChildren(...x){this.children=x;},setAttribute(){}}; }
        const doc = {hidden:false,documentElement:{lang:'de'},getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node,createTextNode:text=>({textContent:text}),addEventListener:(name,fn)=>{listeners[name]=fn;}};
        const win = {TrackStatusCore:globalThis.TrackStatusCore,TRACK_STATUS_CONFIG:{publicApiOrigin:enabled?'https://api.example.test':'',googleMapsBrowserKey:''},addEventListener:(name,fn)=>{listeners[name]=fn;}};
        class Stream {
            static CLOSED=2;
            constructor(url,options){this.url=url;this.options=options;this.events={};this.closed=false;this.readyState=0;streams.push(this);}
            addEventListener(name,fn){this.events[name]=fn;}
            close(){this.closed=true;this.readyState=2;}
            emit(type,data){this.readyState=1;this.events[type]({data:JSON.stringify(data)});}
        }
        const timeout = (fn,delay)=>{const id=++serial;timers.set(id,{fn,delay});return id;};
        const fetcher = (url,options)=>{calls.push({url,options});return new Promise((resolve,reject)=>pending.push({resolve,reject}));};
        const TestURL=class{constructor(value){this.origin=value;this.protocol='https:';this.pathname='/';this.username='';this.password='';this.search='';this.hash='';}};
        new Function('URL','window','document','performance','EventSource','fetch','AbortController','setTimeout','clearTimeout','setInterval','clearInterval',sourceCode)(TestURL,win,doc,{now:()=>now},Stream,fetcher,class{constructor(){this.signal={};}abort(){this.signal.aborted=true;}},timeout,id=>timers.delete(id),timeout,id=>timers.delete(id));
        return {nodes,listeners,timers,calls,streams,pending,doc,setNow(value){now=value;},tick(){[...timers.values()].find(t=>t.delay===1000)?.fn();}};
    }
    const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
    const base={overall_status:'GREEN',server_time:'2026-09-09T12:00:00Z',sectors:[],track_red:null};
    const yellow={...base,overall_status:'YELLOW',sectors:[{sector:32,name:'Döttinger Höhe',state:'active',type:'yellow_flag',expires_at:'2026-09-09T12:01:00Z'}]};
    const response=data=>({ok:true,json:async()=>data});
    const off=harness(false);
    assert(!off.calls.length&&!off.streams.length&&!off.timers.size,'Disabled means no requests');
    const h=harness();
    assert(h.calls.length===1&&!h.streams.length,'Initial GET before SSE');
    assert(h.calls[0].url==='https://api.example.test/api/v1/public/track-status','Exact public endpoint');
    assert(h.calls[0].options.credentials==='omit'&&Object.keys(h.calls[0].options.headers).join()==='Accept','No credentials or app headers');
    h.pending.shift().resolve(response(base));await flush();
    assert(h.streams.length===1&&h.streams[0].url.endsWith('/track-status/stream')&&!h.streams[0].options.withCredentials,'One credential-free native EventSource');
    assert(h.nodes.get('track-label').textContent==='Open','GET renders GREEN');
    const stream=h.streams[0];stream.emit('snapshot',yellow);
    assert(h.nodes.get('track-label').textContent==='Open','Yellow snapshot keeps the global label Open');
    assert(h.nodes.get('track-yellows').children[0].children[0].children[1].textContent==='Döttinger Höhe','API sector name used');
    stream.emit('heartbeat',{server_time:'2026-09-09T12:00:30Z'});
    assert(h.calls.length===1,'Heartbeat does not GET');
    h.tick();assert(h.nodes.get('sector-time-32').textContent==='00:30','Heartbeat updates time basis');
    stream.readyState=0;stream.onerror();
    assert(!stream.closed&&h.streams.length===1,'Native reconnect is preserved');
    assert(h.nodes.get('track-label').textContent==='Open','Disconnect keeps last flag');
    h.setNow(40000);h.tick();
    assert(h.nodes.get('track-label').textContent==='Open'&&h.nodes.get('sector-time-32').textContent==='00:00','Disconnected yellow timer expires without changing the global label');
    h.setNow(91000);h.tick();
    assert(h.nodes.get('track-page').dataset.connection==='stale','Long outage marked stale');
    assert(h.calls.length===1,'Watchdog reconnect does not poll GET');
    const resumed=h.streams.at(-1);resumed.emit('heartbeat',{server_time:'2026-09-09T12:02:00Z'});h.tick();
    assert(h.nodes.get('track-label').textContent==='Open','Heartbeat alone cannot clear disconnected flags');
    resumed.emit('snapshot',{...base,server_time:'2026-09-09T12:02:00Z'});
    assert(h.nodes.get('track-label').textContent==='Open'&&!h.nodes.get('track-yellows').children.length,'Reconnect snapshot fully replaces state');
    h.doc.hidden=true;h.listeners.visibilitychange();h.doc.hidden=false;h.listeners.visibilitychange();
    assert(!resumed.closed&&h.calls.length===1,'Background/resume preserves connection without GET');
    resumed.emit('snapshot',{...yellow,sectors:[{...yellow.sectors[0],name:'API renamed sector'}]});
    assert(h.nodes.get('track-yellows').children[0].children[0].children[1].textContent==='API renamed sector','Same ID name change replaces row');
    resumed.emit('snapshot',{bad:'payload'});
    assert(h.nodes.get('track-label').textContent==='Open','Invalid snapshot preserves last known state');
    h.listeners.pagehide();assert(h.timers.size===0&&h.streams.every(s=>s.closed),'Teardown closes SSE and timers');
    const fail=harness();fail.pending.shift().reject(new Error('offline'));await flush();
    assert(fail.nodes.get('track-label').textContent==='unavailable','GET error never GREEN');
    assert(fail.streams.length===1,'SSE can recover failed initial GET');
    fail.streams[0].emit('snapshot',base);assert(fail.nodes.get('track-label').textContent==='Open','SSE recovery after GET failure');
    const late=harness(),old=late.pending.shift();late.listeners.pagehide();late.listeners.pageshow();
    late.streams[0].emit('snapshot',yellow);old.resolve(response(base));await flush();
    assert(late.nodes.get('track-label').textContent==='Open'&&late.streams.length===1,'Late GET cannot overwrite restored SSE');
    return `${assertions} transport assertions passed`;
};
