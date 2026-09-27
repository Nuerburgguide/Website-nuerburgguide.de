(function () {
    'use strict';
    const badge = document.getElementById('track-badge');
    const hours = document.getElementById('track-calendar-hours');
    const label = document.getElementById('track-label');
    const page = document.getElementById('track-page');
    if (!badge || !hours || !label || !page) return;
    const policy = window.TrackTickerCalendar;
    const words = {
        de: {outside: 'Außerhalb der Öffnungszeiten', closed: 'Heute geschlossen'},
        en: {outside: 'Outside opening hours', closed: 'Closed today'},
        es: {outside: 'Fuera del horario de apertura', closed: 'Cerrada hoy'}
    }[document.documentElement.lang] || {outside: 'Outside opening hours', closed: 'Closed today'};
    const day = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit'});
    const time = new Intl.DateTimeFormat('en-GB', {timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
    let calendar = null, request = null, refreshTimer = null, tick = null, generation = 0;
    function render() {
        const now = performance.now();
        let text = '';
        let statusText = page.dataset.green;
        if (badge.dataset.status === 'green' && calendar && now >= calendar.receivedAt && now < calendar.validUntil) {
            const currentTime = calendar.server + now - calendar.receivedAt;
            const today = day.format(currentTime);
            const periods = calendar.periods.filter(p => day.format(p.start) === today).sort((a, b) => a.start - b.start);
            if (periods.length) {
                text = periods.map(p => time.format(p.start) + '–' + time.format(p.end)).join(' · ');
                if (!periods.some(p => p.start <= currentTime && currentTime < p.end)) statusText = words.outside;
            } else if (calendar.closedDates.includes(today)) statusText = words.closed;
        }
        if (badge.dataset.status === 'green' && label.textContent !== statusText) label.textContent = statusText;
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
            if (run === generation) {
                calendar = policy.read(data, performance.now());
                // Only an explicit day with no periods confirms a closed day.
                calendar.closedDates = data.days.filter(day => day.periods.length === 0).map(day => day.date);
            }
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
    window.TrackCalendarHours = Object.freeze({render});
    new MutationObserver(render).observe(badge, {attributes: true, attributeFilter: ['data-status']});
    document.addEventListener('visibilitychange', start);
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', event => { if (event.persisted) start(); });
    start();
})();
