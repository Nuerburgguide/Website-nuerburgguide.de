globalThis.runTrackDisplayTests = async function (source) {
    let count=0;
    const assert=(value,message)=>{if(!value)throw new Error(message);count++;};
    function harness(mode) {
        const handlers={},classes=new Set(),attributes={};let resolveRequest;
        const button={textContent:'',setAttribute:(k,v)=>attributes[k]=v,focus(){},addEventListener:(k,v)=>handlers['button:'+k]=v};
        const root={classList:{toggle:(k,v)=>v?classes.add(k):classes.delete(k)}};
        const doc={documentElement:root,fullscreenElement:null,getElementById:id=>id==='track-page'?{dataset:{displayEnter:'Display',displayExit:'Exit'}}:button,addEventListener:(k,v)=>handlers[k]=v,async exitFullscreen(){doc.fullscreenElement=null;handlers.fullscreenchange();}};
        if(mode==='success')root.requestFullscreen=async()=>{doc.fullscreenElement=root;handlers.fullscreenchange();};
        if(mode==='reject')root.requestFullscreen=async()=>{throw new Error('not allowed');};
        if(mode==='pending')root.requestFullscreen=()=>new Promise(r=>resolveRequest=()=>{doc.fullscreenElement=root;handlers.fullscreenchange();r();});
        new Function('document',source)(doc);
        return {doc,root,button,handlers,classes,attributes,resolve:()=>resolveRequest(),active:()=>classes.has('track-display-mode')};
    }
    for(const mode of ['success','reject','absent']) {
        const h=harness(mode);await h.handlers['button:click']();
        assert(h.active()&&h.attributes['aria-pressed']==='true'&&h.button.textContent==='Exit',mode+' enters display');
        assert(mode==='success'?h.doc.fullscreenElement===h.root:h.doc.fullscreenElement===null,mode+' fullscreen/fallback');
        await h.handlers['button:click']();assert(!h.active()&&h.attributes['aria-pressed']==='false',mode+' exit button');
        await h.handlers['button:click']();h.handlers.keydown({key:'Escape',preventDefault(){}});await Promise.resolve();
        assert(!h.active(),mode+' Escape restores layout');
    }
    const native=harness('success');await native.handlers['button:click']();await native.doc.exitFullscreen();assert(!native.active(),'Native fullscreen exit restores normal layout');
    const race=harness('pending');const entered=race.handlers['button:click']();race.handlers.keydown({key:'Escape',preventDefault(){}});race.resolve();await entered;
    assert(!race.active()&&!race.doc.fullscreenElement,'Delayed fullscreen result does not trap user after exit');
    return `${count} display assertions passed`;
};
