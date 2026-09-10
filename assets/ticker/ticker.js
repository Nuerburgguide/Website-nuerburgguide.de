(function() {
    'use strict';
    const slot = document.getElementById('home-track-ticker');
    const policy = window.TrackTickerState, core = window.TrackStatusCore;
    const params = new URLSearchParams(location.search);
    if (!slot) return;
    const dev = ['localhost', '127.0.0.1'].includes(location.hostname) && ['active', 'inactive'].includes(params.get('tfTest'));
    // Homepage production ticker intentionally disabled; preserve local DEV tools.
    if (!dev) return;
    const calendarPolicy = window.TrackTickerCalendar;
    let calendar=null, calendarTimer=null, boundaryTimer=null, calendarRequest=null, calendarRun=0;
    const calendarInterval=20*60*1000;
    const lang = document.documentElement.lang;
    const words = {de: {red:'STRECKE GESCHLOSSEN',green:'STRECKE OFFEN',yellow:'AKTUELL GELB'},en:{red:'TRACK CLOSED',green:'TRACK OPEN',yellow:'CURRENTLY YELLOW'},es:{red:'PISTA CERRADA',green:'PISTA ABIERTA',yellow:'ACTUALMENTE AMARILLO'}}[lang] || {red:'TRACK CLOSED',green:'TRACK OPEN',yellow:'CURRENTLY YELLOW'};
    let active = dev ? params.get('tfTest') === 'active' : true, mode = dev ? params.get('tickerTest') || 'green' : 'live';
    let snapshot = null, fresh = 0, connected = false, source = null, controller = null, tick = null, generation = 0, previous = '';
    function render() {
        const view = snapshot && core.project(snapshot, performance.now());
        const state = policy.status(view, connected && performance.now() - fresh < 90000, dev ? active : calendarPolicy.active(calendar, performance.now()));
        slot.hidden = !state;
        if (!state) { previous = ''; return; }
        const text = (dev ? 'DEV / TEST · ' : '') + words[state.color] + (state.names.length ? ': ' + state.names.join(' · ') : '');
        if (previous === text) return;
        previous = text; slot.dataset.status = state.color;
        slot.setAttribute('aria-label', text);
        const rail = document.createElement('span'); rail.className = 'track-ticker-rail'; rail.setAttribute('aria-hidden','true');
        for (let i=0; i<2; i++) { const group=document.createElement('span');group.className='track-ticker-group';group.textContent=(text+' · ').repeat(4);rail.append(group); }
        slot.replaceChildren(rail);
    }
    function stop() { generation++;source?.close();source=null;controller?.abort();controller=null;clearInterval(tick);connected=false;snapshot=null;render(); }
    function accept(data) { snapshot=core.snapshot(data,performance.now());fresh=performance.now();connected=true;render(); }
    async function start() {
        stop(); if (!active || document.hidden) return;
        const run=generation;
        tick=setInterval(render,1000);
        if (mode !== 'live') {
            if (!['green','yellow','red'].includes(mode)) return;
            const now=Date.now();accept({overall_status:mode.toUpperCase(),server_time:new Date(now).toISOString(),track_red:mode==='red'?{state:'active',expires_at:new Date(now+3600000).toISOString()}:null,sectors:mode==='yellow'?[{sector:32,name:'Döttinger Höhe',type:'yellow_flag',state:'active',expires_at:new Date(now+3600000).toISOString()}]:[]});
            // Synthetic data exists only behind the explicitly local DEV switch.
            clearInterval(tick);tick=setInterval(()=>{fresh=performance.now();render();},1000);return;
        }
        const api='https://api.nuerburgguide.de/api/v1/public/track-status';
        controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),10000);
        try {const response=await fetch(api,{credentials:'omit',cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('HTTP');const data=await response.json();if(run!==generation)return;accept(data);} catch {if(run===generation){connected=false;render();}} finally {clearTimeout(timeout);}
        if(run!==generation)return;
        source=new EventSource(api+'/stream',{withCredentials:false});
        source.addEventListener('snapshot',event=>{if(run!==generation)return;try{accept(JSON.parse(event.data));}catch{connected=false;render();}});
        source.addEventListener('heartbeat',event=>{if(run!==generation)return;try{const time=core.timestamp(JSON.parse(event.data).server_time);fresh=performance.now();if(snapshot)snapshot={...snapshot,serverTime:time,receivedAt:fresh};render();}catch{connected=false;render();}});
        source.onerror=()=>{if(run===generation){connected=false;render();}};
    }
    function stopCalendar() {
        calendarRun++; calendarRequest?.abort(); calendarRequest=null;
        clearTimeout(calendarTimer); clearTimeout(boundaryTimer); calendar=null; render();
    }
    function armBoundary() {
        clearTimeout(boundaryTimer);
        const delay=calendarPolicy.next(calendar,performance.now());
        if(delay!==null)boundaryTimer=setTimeout(()=>{render();armBoundary();},Math.max(1,Math.min(delay,2147483647)));
    }
    async function refreshCalendar() {
        if(dev||document.hidden)return;
        const run=++calendarRun;
        calendarRequest?.abort();clearTimeout(calendarTimer);
        const controller=new AbortController();calendarRequest=controller;
        const timeout=setTimeout(()=>controller.abort(),10000);
        try {
            const response=await fetch('https://api.nuerburgguide.de/api/v1/public/track-calendar',{credentials:'omit',cache:'no-store',signal:controller.signal});
            if(!response.ok)throw Error('Calendar HTTP');const data=await response.json();
            if(run!==calendarRun)return;
            calendar=calendarPolicy.read(data,performance.now());
        } catch {if(run===calendarRun)calendar=null;}
        finally {
            clearTimeout(timeout);
            if(run===calendarRun){calendarRequest=null;render();armBoundary();calendarTimer=setTimeout(refreshCalendar,calendarInterval);}
        }
    }
    // Local console control allows state transitions without reloading the page.
    if(dev) window.NGTrackTickerDev = Object.freeze({set(tf,status=mode){active=tf==='active';mode=status;start();}});
    window.addEventListener('pagehide',()=>{stop();if(!dev)stopCalendar();});
    window.addEventListener('pageshow',event=>{if(event.persisted){start();refreshCalendar();}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();if(!dev)stopCalendar();}else{start();refreshCalendar();}});
    window.addEventListener('focus',()=>{if(!dev&&!document.hidden&&!calendarRequest){calendar=null;render();refreshCalendar();}});
    start();
    refreshCalendar();
})();
