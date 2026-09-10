globalThis.runAdBackendTests = async function(source) {
    let count=0;const assert=(v,m)=>{if(!v)throw Error(m);count++;};
    const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
    function harness(campaign,lang='de') {
        const calls=[],handlers={},timers=new Map(),observers=[];let id=0,ready;
        const slot={hidden:true,replaceChildren(){}},doc={visibilityState:'visible',documentElement:{lang},hasFocus:()=>true,getElementById:()=>slot,addEventListener:(k,f)=>handlers[k]=f};
        const win={crypto:{randomUUID:()=> '12345678-1234-4234-8234-123456789abc'},addEventListener:(k,f)=>handlers[k]=f,renderTrackStatusAd(image,target,alt,callback,options={}){if(!options.preserve||!image)slot.hidden=true;ready=callback;}};
        const fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({campaign})};};
        class IO {constructor(callback){this.callback=callback;observers.push(this);}observe(image){this.image=image;}disconnect(){}emit(visible){this.callback([{target:this.image,isIntersecting:visible,intersectionRatio:visible?1:0}]);}}
        class Abort {constructor(){this.signal={};}abort(){}}
        new Function('window','document','fetch','IntersectionObserver','AbortController','setTimeout','clearTimeout',source)(win,doc,fetch,IO,Abort,(f,delay)=>{timers.set(++id,{f,delay});return id;},i=>timers.delete(i));
        return {setCampaign(value){campaign=value;},calls,doc,handlers,slot,observers,timers,load(){const image={isConnected:true,naturalWidth:1200};const link={tagName:'A',addEventListener:(k,f)=>handlers['link:'+k]=f};slot.hidden=false;ready(image,link);return image;},events:()=>calls.filter(c=>c.options.method==='POST')};
    }
    const campaign={campaign_id:'test-campaign',image_url:'https://example.com/banner.png',target_url:'https://example.com',alt_text:'Test',cache_valid_until:new Date(Date.now()+600000).toISOString()};
    for(const lang of ['de','en','es']) {const h=harness(null,lang);await flush();assert(h.calls[0].url.endsWith('locale='+lang),'locale');assert(h.slot.hidden&&!h.events().length,'null fully hidden');}
    const h=harness(campaign);await flush();assert(h.slot.hidden&&!h.events().length,'no impression before load');h.load();assert(!h.events().length,'no impression before intersection');
    h.doc.visibilityState='hidden';h.observers[0].emit(true);assert(!h.events().length,'hidden document no impression');
    h.doc.visibilityState='visible';h.handlers.visibilitychange();assert(h.events().length===1,'visible impression');
    h.observers[0].emit(false);h.observers[0].emit(true);h.handlers.focus();assert(h.events().length===1,'no repeat on scroll or focus');
    const impression=JSON.parse(h.events()[0].options.body);assert(impression.kind==='impression'&&impression.campaign_id==='test-campaign'&&impression.platform==='web'&&impression.app_version===null&&impression.placement==='website_trackstatus','event payload');
    h.handlers['link:click']();assert(h.events().length===2&&JSON.parse(h.events()[1].options.body).kind==='click'&&h.events()[1].options.keepalive,'click best effort');
    assert([...h.timers.values()].some(t=>t.delay>590000&&t.delay<=600000),'campaign expiry scheduled');
    const rotation=[...h.timers.values()].find(t=>t.delay===300000);
    assert(!!rotation,'five minute rotation scheduled');
    const observerCount=h.observers.length;
    rotation.f();await flush();assert(!h.slot.hidden&&h.observers.length===observerCount,'same campaign retains presentation');
    h.observers[0].emit(true);assert(h.events().length===2,'same campaign has no extra impression');
    h.setCampaign({...campaign,campaign_id:'partner-2',image_url:'https://example.com/second.png'});
    [...h.timers.values()].find(t=>t.delay===300000).f();await flush();assert(!h.slot.hidden,'old valid banner retained while successor loads');
    h.load();h.observers.at(-1).emit(true);assert(h.events().length===3&&JSON.parse(h.events()[2].options.body).campaign_id==='partner-2','new display gets impression');
    h.doc.visibilityState='hidden';h.handlers.visibilitychange();assert(![...h.timers.values()].some(t=>t.delay===300000),'hidden cancels rotation');
    h.doc.visibilityState='visible';h.handlers.visibilitychange();assert([...h.timers.values()].some(t=>t.delay>290000&&t.delay<=300000),'return resumes remaining rotation');
    const old=h.observers[0];h.handlers.pagehide();old.emit(true);assert(h.slot.hidden&&h.events().length===3,'pagehide clears stale observer');
    const invalid=harness({...campaign,cache_valid_until:'bad'});await flush();assert(invalid.slot.hidden&&!invalid.events().length,'invalid expiry hidden');
    const empty=harness(campaign);await flush();empty.load();empty.setCampaign(null);[...empty.timers.values()].find(t=>t.delay===300000).f();await flush();assert(empty.slot.hidden,'rotation null removes banner');
    assert(h.timers.size===0,'pagehide clears timers');
    return `${count} ad backend assertions passed`;
};
