(function () {
    'use strict';
    const badge = document.getElementById('track-badge');
    const hours = document.getElementById('track-calendar-hours');
    if (!badge || !hours) return;
    const policy = window.TrackTickerCalendar;
    const day = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'});
    const time = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
    let calendar = null, request = null, refreshTimer = null, tick = null, generation = 0;
    function render() {
        const now = performance.now();
        let text = '';
        if (badge.dataset.status === 'green' && calendar && now >= calendar.receivedAt && now < calendar.validUntil) {
            const today = day.format(calendar.server + now - calendar.receivedAt);
            const periods = calendar.periods.filter(p => day.format(p.start) === today).sort((a, b) => a.start - b.start);
            if (periods.length) text = periods.map(p => time.format(p.start) + '–' + time.format(p.end)).join(' · ');
        }
        if (hours.textContent !== text) hours.textContent = text;
        hours.hidden = !text;
    }
    async function refresh() {
        if (document.hidden) return;
        const run = ++generation;
        request?.abort(); clearTimeout(refreshTimer);
        const controller = new AbortController(); request = controller;
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch('https://api.nuerburgguide.de/api/v1/public/track-calendar', {credentials: 'omit', cache: 'no-store', signal: controller.signal});
            if (!response.ok) throw Error('Calendar unavailable');
            const data = await response.json();
            if (run === generation) calendar = policy.read(data, performance.now());
        } catch { if (run === generation) calendar = null; }
        finally {
            clearTimeout(timeout);
            if (run === generation) { request = null; render(); refreshTimer = setTimeout(refresh, 20 * 60 * 1000); }
        }
    }
    function stop() {
        generation++; request?.abort(); request = null;
        clearTimeout(refreshTimer); clearInterval(tick); calendar = null; render();
    }
    function start() { stop(); if (!document.hidden) { tick = setInterval(render, 1000); refresh(); } }
    new MutationObserver(render).observe(badge, {attributes: true, attributeFilter: ['data-status']});
    document.addEventListener('visibilitychange', start);
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', event => { if (event.persisted) start(); });
    start();
})();
