globalThis.runHomeTickerTests = function(stateSource, tickerSource, coreSource) {
    const root={};new Function('globalThis',stateSource)(root);
    const p=root.TrackTickerState;let count=0;
    const assert=(v,m)=>{if(!v)throw Error(m);count++;};
    for(const host of ['localhost','127.0.0.1','[::1]'])assert(p.local(host),'local host');
    for(const host of ['nuerburgguide.de','www.nuerburgguide.de','localhost.example.com','preview.example.com'])assert(!p.local(host),'production gate');
    const green={status:'green',sectors:[]},yellow={status:'yellow',sectors:[{name:'API sector <name>'}]},red={status:'red',sectors:yellow.sectors};
    assert(p.status(green,true,true).color==='green','green');
    assert(p.status(yellow,true,true).names[0]==='API sector <name>','API names unchanged');
    assert(p.status(red,true,true).color==='red','red priority');
    for(const view of [green,yellow,red]){
        assert(p.status(view,false,true)===null,'unreliable hidden');
        assert(p.status(view,true,false)===null,'outside TF hidden');
    }
    assert(p.status(null,true,true)===null,'missing hidden');
    assert(p.status({status:'yellow',sectors:[]},true,true)===null,'unexplained yellow not open');
    let requests=0;const slot={hidden:true};
    new Function('window','document','location','fetch','EventSource','URLSearchParams',tickerSource)(
        {TrackTickerState:p}, {getElementById:()=>slot},
        {hostname:'nuerburgguide.de',search:'?tfTest=active&tickerTest=green'},
        ()=>requests++, function(){requests++;}, class {get(){return 'active';}});
    assert(slot.hidden&&requests===0,'production ignores dev switch and makes no requests');
    new Function('globalThis',coreSource)(root);
    const rendered={hidden:true,dataset:{},setAttribute(k,v){this[k]=v;},replaceChildren(...children){this.children=children;}};
    const doc={hidden:false,documentElement:{lang:'en'},getElementById:()=>rendered,createElement:()=>({setAttribute(){},append(){}}),addEventListener(){}};
    root.addEventListener=()=>{};
    new Function('window','document','location','URLSearchParams','performance','setInterval','clearInterval',tickerSource)(root,doc,{hostname:'localhost',search:''},class{get(k){return k==='tfTest'?'active':'yellow';}},{now:()=>100},()=>1,()=>{});
    assert(!rendered.hidden&&rendered.dataset.status==='yellow'&&rendered['aria-label'].includes('Döttinger Höhe'),'local yellow rendered');
    root.NGTrackTickerDev.set('active','red');assert(rendered.dataset.status==='red','live local transition red');
    root.NGTrackTickerDev.set('active','green');assert(rendered.dataset.status==='green','live local transition green');
    root.NGTrackTickerDev.set('inactive');assert(rendered.hidden,'local session ended hidden');
    return `${count} ticker assertions passed`;
};
