(function () {
    'use strict';
    const list = document.getElementById('track-yellows');
    if (!list) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = null, last = null, pauseUntil = 0, direction = 1, position = 0, stopped = false, interacting = false;
    const speed = 12; // CSS pixels per second; pause three seconds at each end.
    function cancel() { if (frame !== null) cancelAnimationFrame(frame); frame = null; last = null; }
    function allowed() { return !stopped && !document.hidden && !reduced.matches && !interacting && list.scrollHeight > list.clientHeight + 1; }
    function animate(now) {
        frame = null;
        if (!allowed()) { last = null; return; }
        const elapsed = last === null ? 0 : Math.min(64, now - last);
        last = now;
        if (now >= pauseUntil) {
            const end = Math.max(0, list.scrollHeight - list.clientHeight);
            position = Math.max(0, Math.min(end, position + direction * speed * elapsed / 1000));
            list.scrollTop = position;
            if (position >= end - .5 && direction === 1) { direction = -1; pauseUntil = now + 3000; }
            else if (position <= .5 && direction === -1) { direction = 1; pauseUntil = now + 3000; }
        } else position = list.scrollTop;
        frame = requestAnimationFrame(animate);
    }
    function start(reset = false) {
        cancel();
        if (reset) { list.scrollTop = 0; direction = 1; }
        position = list.scrollTop;
        pauseUntil = performance.now() + 3000;
        if (allowed()) frame = requestAnimationFrame(animate);
    }
    // Timer text updates do not reset the cycle; only added/removed sector rows do.
    const rows = new MutationObserver(() => start(true));
    rows.observe(list, {childList: true});
    const size = new ResizeObserver(() => start());
    size.observe(list);
    list.tabIndex = 0;
    const title = list.previousElementSibling;
    if (title?.tagName === 'H2') { title.id ||= 'track-yellows-heading'; list.setAttribute('aria-labelledby', title.id); }
    list.addEventListener('pointerenter', () => { interacting = true; cancel(); });
    list.addEventListener('pointerleave', () => { interacting = false; start(); });
    list.addEventListener('focusin', () => { interacting = true; cancel(); });
    list.addEventListener('focusout', () => { interacting = false; start(); });
    list.addEventListener('wheel', () => { pauseUntil = performance.now() + 8000; }, {passive: true});
    list.addEventListener('touchstart', () => { interacting = true; cancel(); }, {passive: true});
    list.addEventListener('touchend', () => { interacting = false; start(); }, {passive: true});
    reduced.addEventListener('change', () => start());
    document.addEventListener('visibilitychange', () => start());
    window.addEventListener('pagehide', () => { stopped = true; cancel(); rows.disconnect(); size.disconnect(); });
    window.addEventListener('pageshow', event => {
        if (!event.persisted) return;
        stopped = false; rows.observe(list, {childList: true}); size.observe(list); start();
    });
    start(true);
})();
