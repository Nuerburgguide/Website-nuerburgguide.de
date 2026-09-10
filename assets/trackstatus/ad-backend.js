(function () {
    'use strict';
    const slot = document.getElementById('track-ad');
    if (!slot || typeof window.renderTrackStatusAd !== 'function') return;
    const origin = 'https://api.nuerburgguide.de/api/v1/public/ads';
    const locale = ['de', 'en', 'es'].includes(document.documentElement.lang) ? document.documentElement.lang : 'de';
    const placement = 'website_trackstatus';
    const rotationMs = 300000;
    let due = 0, expiryTimer = null, cancelPending = null;
    let observer = null, current = null, request = null, timer = null, generation = 0, stopped = false;
    function clear() {
        clearTimeout(expiryTimer);
        cancelPending?.(); cancelPending = null;
        retire();
        window.renderTrackStatusAd(null);
    }
    function retire() {
        observer?.disconnect(); observer = null; current = null;
        slot.hidden = true; slot.replaceChildren();
    }
    function expireAt(expires) {
        clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => {
            if (current && Date.now() >= current.expires) retire();
            else if (current) expireAt(current.expires);
        }, Math.max(0, Math.min(expires - Date.now(), 2147483647)));
    }
    function event(kind, campaign) {
        try {
            const eventId = window.crypto.randomUUID();
            // Best effort, never awaited; navigation is the native link action.
            void fetch(origin + '/events', {
                method: 'POST', credentials: 'omit', keepalive: true,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({event_id: eventId, campaign_id: campaign.campaign_id,
                    kind, placement, platform: 'web', app_version: null})
            }).catch(() => {});
        } catch { /* Unsupported tracking must never affect the banner or link. */ }
    }
    function impression() {
        const c = current;
        if (!c || c.sent || !c.intersecting || slot.hidden || !c.image.isConnected ||
            !c.image.naturalWidth || document.visibilityState !== 'visible' ||
            (document.hasFocus && !document.hasFocus()) || Date.now() >= c.expires) return;
        c.sent = true;
        event('impression', c.campaign);
    }
    function schedule(delay) {
        clearTimeout(timer);
        due = Date.now() + Math.max(1000, delay);
        if (document.visibilityState === 'visible') timer = setTimeout(refresh, Math.max(1000, delay));
    }
    async function refresh() {
        if (stopped) return;
        const run = ++generation;
        clearTimeout(timer); request?.abort(); cancelPending?.(); cancelPending = null;
        if (current && current.expires <= Date.now()) retire();
        if (document.visibilityState !== 'visible') return;
        const controller = new AbortController(); request = controller;
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(origin + '/banner?placement=' + placement + '&locale=' + locale,
                {credentials: 'omit', cache: 'no-store', signal: controller.signal});
            if (!response.ok) throw Error('Ad response');
            const data = await response.json();
            if (run !== generation || stopped) return;
            if (data.campaign === null) { clear(); schedule(rotationMs); return; }
            const campaign = data.campaign;
            const expires = Date.parse(campaign?.cache_valid_until);
            if (!campaign || typeof campaign.campaign_id !== 'string' || !campaign.campaign_id.trim() ||
                typeof campaign.image_url !== 'string' || !campaign.image_url.trim() ||
                (campaign.target_url != null && typeof campaign.target_url !== 'string') ||
                !Number.isFinite(expires) || expires <= Date.now()) throw Error('Invalid ad');
            schedule(Math.min(rotationMs, expires - Date.now()));
            if (current && ['campaign_id', 'image_url', 'target_url', 'alt_text'].every(key => current.campaign[key] === campaign[key])) {
                current.expires = expires; current.campaign = campaign; expireAt(expires); return;
            }
            cancelPending = window.renderTrackStatusAd(campaign.image_url, campaign.target_url, campaign.alt_text,
                (image, content) => {
                    observer?.disconnect();
                    const display = {campaign, expires, image, intersecting: false, sent: false};
                    current = display; expireAt(expires);
                    if (content.tagName === 'A') content.addEventListener('click', () => {
                        if (current === display && Date.now() < display.expires) event('click', campaign);
                    });
                    if (typeof IntersectionObserver === 'function') {
                        observer = new IntersectionObserver(entries => {
                            if (current !== display) return;
                            const entry = entries.find(e => e.target === image);
                            if (entry) display.intersecting = entry.isIntersecting && entry.intersectionRatio > 0;
                            impression();
                        }, {threshold: [0, 0.01]});
                        observer.observe(image);
                    }
                }, {preserve: true, canCommit: () => run === generation && !stopped && Date.now() < expires});
        } catch {
            if (run === generation && !stopped) { if (current && current.expires <= Date.now()) retire(); schedule(60000); }
        } finally {
            clearTimeout(timeout);
            if (request === controller) request = null;
        }
    }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') {
            generation++; request?.abort(); cancelPending?.(); cancelPending = null; clearTimeout(timer); return;
        }
        if (!current || current.expires <= Date.now() || Date.now() >= due) refresh();
        else { schedule(due - Date.now()); impression(); }
    });
    window.addEventListener('focus', impression);
    window.addEventListener('pagehide', () => {
        stopped = true; generation++; request?.abort();clearTimeout(timer);clear();
    });
    window.addEventListener('pageshow', e => { if (e.persisted) { stopped = false;refresh(); } });
    refresh();
})();
