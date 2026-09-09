globalThis.runTrackAdTests = function (source) {
    let count=0;const assert=(v,m)=>{if(!v)throw new Error(m);count++;};
    const images=[];
    const slot={hidden:true,children:[],replaceChildren(...items){this.children=items;},getAttribute(){return 'Advertisement';}};
    const doc={getElementById(){return slot;},createElement(tag){const item={tag,children:[],naturalWidth:1200,append(x){this.children.push(x);},setAttribute(k,v){this[k]=v;}};if(tag==='img')images.push(item);return item;}};
    // URL decisions are also exercised with the real browser URL parser.
    class TestURL{constructor(value){this.href=value;this.protocol=value.split(':')[0]+':';this.origin='https://images.example';this.username='';this.password='';}}
    const win={location:{href:'https://nuerburgguide.de/trackstatus/',origin:'https://nuerburgguide.de'}};
    new Function('window','document','URL',source)(win,doc,TestURL);
    assert(slot.hidden&&!images.length,'No campaign: no artwork request or box');
    win.renderTrackStatusAd('https://images.example/banner.png',null,'Partner');
    assert(slot.hidden,'Loading campaign remains hidden');images.at(-1).onload();
    assert(!slot.hidden&&slot.children[0].tag==='img'&&slot.children[0].alt==='Partner','Unlinked artwork with alt');
    win.renderTrackStatusAd('https://images.example/banner.png','https://partner.example','');images.at(-1).onload();
    assert(slot.children[0].tag==='a'&&slot.children[0].rel.includes('noopener')&&slot.children[0]['aria-label']==='Advertisement','Accessible safe link');
    win.renderTrackStatusAd(null);assert(slot.hidden&&!slot.children.length,'Remove inactive campaign');
    win.renderTrackStatusAd('javascript:alert(1)');assert(slot.hidden,'Reject script image URL');
    win.renderTrackStatusAd('https://images.example/banner.png','javascript:alert(1)');assert(slot.hidden,'Reject unsafe destination');
    win.renderTrackStatusAd('https://images.example/old.png');const old=images.at(-1);
    win.renderTrackStatusAd('https://images.example/new.png');const current=images.at(-1);old.onload();assert(slot.hidden,'Ignore stale artwork load');
    current.onload();assert(!slot.hidden&&slot.children[0]===current,'Newest campaign wins');
    current.onerror();assert(slot.hidden&&!slot.children.length,'Failed artwork hides entire slot');
    win.renderTrackStatusAd('https://images.example/banner.png');const pending=images.at(-1);win.renderTrackStatusAd(null);pending.onload();assert(slot.hidden,'Removed campaign cannot reappear after load');
    return `${count} ad assertions passed`;
};
