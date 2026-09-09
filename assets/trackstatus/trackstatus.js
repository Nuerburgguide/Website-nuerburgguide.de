(function () {
    'use strict';
    const core = window.TrackStatusCore;
    const config = window.TRACK_STATUS_CONFIG;
    const page = document.getElementById('track-page');
    const labels = page.dataset;
    const element = name => document.getElementById(`track-${name}`);
    let current = null, source = null, request = null, frozen = null;
    let retryTimer = null, tick = null, generation = 0, failures = 0;
    let rendered = '', running = false, initialized = false, awaitingSnapshot = false;
    let lastActivity = 0, disconnectedAt = null, connection = 'loading';
    const lines = [];
    const staleAfter = 90000;
    let api = null;
    // The public API never receives app identity, Maps keys or credentials.
    if (config.publicApiOrigin) {
        try {
            const origin = new URL(config.publicApiOrigin);
            if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid origin');
            api = origin.origin + '/api/v1/public/track-status';
        } catch { connection = 'unavailable'; }
    }
    function write(node, value) { if (node.textContent !== value) node.textContent = value; }
    function viewNow() {
        const now = performance.now();
        if (!frozen) return core.project(current, now);
        // Keep the last known flags during outages, even when a local timer
        // reaches zero. Only a fresh snapshot can clear an offline flag.
        const serverNow = current.serverTime + Math.max(0, now - current.receivedAt);
        const remaining = item => ({...item, remaining: Math.max(0, Math.ceil((item.expiresAt - serverNow) / 1000))});
        return {...frozen, sectors: frozen.sectors.map(remaining), red: frozen.red ? remaining(frozen.red) : null};
    }
    function render() {
        const view = viewNow();
        const available = !!current;
        const status = available ? view.status : 'unknown';
        if (api || connection === 'unavailable') {
            write(element('label'), available ? labels[status] : connection === 'loading' ? labels.loading : labels.unavailable);
            element('badge').dataset.status = status;
            element('dot').className = `track-dot ${status}`;
            write(element('connection'), available ? labels[connection] || '' : '');
        }
        page.dataset.connection = connection;
        element('red').hidden = !available || view.status !== 'red';
        element('red-time').hidden = !view.red;
        element('red-remaining').hidden = !view.red;
        if (view.red) write(element('red-time'), core.format(view.red.remaining));
        const visible = available ? view.sectors : [];
        const signature = JSON.stringify(visible.map(item => [item.id, item.name]));
        if (signature !== rendered) {
            rendered = signature;
            element('yellows').replaceChildren(...visible.map(item => {
                const row = document.createElement('li');
                const name = document.createElement('span');
                const number = document.createElement('small');
                number.textContent = String(item.id).padStart(2, '0');
                name.append(number, document.createTextNode(item.name));
                const time = document.createElement('output');
                time.id = `sector-time-${item.id}`;
                time.setAttribute('aria-label', labels.remaining);
                row.append(name, time);
                return row;
            }));
        }
        for (const item of visible) write(document.getElementById(`sector-time-${item.id}`), core.format(item.remaining));
        element('empty').hidden = visible.length > 0;
        write(element('empty'), available ? labels.empty : labels.unknown);
        for (const {id, line} of lines) {
            const color = core.color(id, view, available);
            if (line.get('strokeColor') !== color) line.setOptions({strokeColor: color});
        }
    }
    function accept(data) {
        current = core.snapshot(data, performance.now());
        // Full replacement, including on reconnect. server_time is not a revision.
        frozen = null;
        awaitingSnapshot = false;
        disconnectedAt = null;
        connection = 'connected';
        failures = 0;
        lastActivity = performance.now();
        render();
    }
    function interrupted() {
        if (current && !frozen) frozen = core.project(current, performance.now());
        awaitingSnapshot = true;
        if (disconnectedAt === null) disconnectedAt = performance.now();
        connection = current ? performance.now() - disconnectedAt >= staleAfter ? 'stale' : 'reconnecting' : 'unavailable';
        render();
    }
    function retryClosedStream() {
        clearTimeout(retryTimer);
        if (!running) return;
        retryTimer = setTimeout(openStream, Math.min(60000, 5000 * 2 ** Math.min(failures++, 4)));
    }
    function openStream() {
        if (!running || !api) return;
        clearTimeout(retryTimer);
        source?.close();
        lastActivity = performance.now();
        awaitingSnapshot = true;
        const stream = new EventSource(api + '/stream', {withCredentials: false});
        source = stream;
        stream.addEventListener('snapshot', event => {
            if (!running || source !== stream) return;
            try { accept(JSON.parse(event.data)); }
            catch { interrupted(); stream.close(); retryClosedStream(); }
        });
        stream.addEventListener('heartbeat', event => {
            if (!running || source !== stream) return;
            try {
                const serverTime = core.timestamp(JSON.parse(event.data).server_time);
                const now = performance.now();
                lastActivity = now;
                if (current) current = {...current, serverTime, receivedAt: now};
                // A heartbeat proves transport liveness, but cannot replace a
                // snapshot lost during reconnect. Do not clear stale flags here.
                if (!awaitingSnapshot) connection = 'connected';
            } catch { interrupted(); }
        });
        stream.onerror = () => {
            if (!running || source !== stream) return;
            interrupted();
            // Native EventSource handles ordinary network reconnection itself.
            // A terminal close (e.g. HTTP 204) needs a new stream, never a GET.
            if (stream.readyState === EventSource.CLOSED) retryClosedStream();
        };
    }
    async function initialGet() {
        const attempt = generation;
        const controller = new AbortController();
        request = controller;
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(api, {method: 'GET', credentials: 'omit', cache: 'no-store', headers: {Accept: 'application/json'}, signal: controller.signal});
            if (!response.ok) throw new Error('Public status unavailable');
            const data = await response.json();
            if (!running || attempt !== generation) return;
            accept(data);
        } catch {
            if (running && attempt === generation) interrupted();
        } finally {
            clearTimeout(timeout);
            if (attempt === generation) {
                request = null;
                // Even if GET fails, the stream can supply an initial snapshot.
                if (running) openStream();
            }
        }
    }
    function onTick() {
        const now = performance.now();
        if (disconnectedAt !== null && now - disconnectedAt >= staleAfter) connection = current ? 'stale' : 'unavailable';
        if (source && now - lastActivity >= staleAfter) {
            interrupted();
            // Repair a silent/hung connection by reconnecting SSE only.
            openStream();
        }
        render();
    }
    function start() {
        if (running || !api) return;
        running = true;
        tick = setInterval(onTick, 1000);
        if (!initialized) { initialized = true; initialGet(); }
        else { interrupted(); openStream(); }
    }
    function stop() {
        running = false;
        generation++;
        source?.close(); source = null;
        request?.abort(); request = null;
        clearTimeout(retryTimer);
        clearInterval(tick);
    }
    document.addEventListener('visibilitychange', () => { if (running && !document.hidden) onTick(); });
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', start);
    window.addEventListener('offline', () => { if (running) interrupted(); });
    window.addEventListener('online', () => {
        if (running && !request && (!source || source.readyState === EventSource.CLOSED)) openStream();
    });

    async function initializeMap() {
        if (!config.googleMapsBrowserKey || !window.TRACK_GEOMETRY?.length) return;
        const message = element('map-message');
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Map timeout')), 15000);
                window.initTrackStatusMap = () => { clearTimeout(timeout); resolve(); };
                window.gm_authFailure = () => { clearTimeout(timeout); message.hidden = false; reject(new Error('Map authentication')); };
                const url = new URL('https://maps.googleapis.com/maps/api/js');
                url.search = new URLSearchParams({key: config.googleMapsBrowserKey, loading: 'async', callback: 'initTrackStatusMap', v: 'quarterly', language: document.documentElement.lang});
                const script = document.createElement('script');
                script.src = url.href;
                script.async = true;
                script.onerror = () => { clearTimeout(timeout); reject(new Error('Map unavailable')); };
                document.head.append(script);
            });
            // Display only: leave Google's required attribution intact.
            const map = new google.maps.Map(element('map'), {
                center: {lat: 50.365, lng: 6.963}, zoom: 12.5,
                mapTypeId: 'satellite', tilt: 0, disableDefaultUI: true,
                zoomControl: false, fullscreenControl: false,
                streetViewControl: false, mapTypeControl: false,
                rotateControl: false, scaleControl: false, cameraControl: false,
                gestureHandling: 'none', keyboardShortcuts: false,
                scrollwheel: false, disableDoubleClickZoom: true,
                headingInteractionEnabled: false, tiltInteractionEnabled: false,
                clickableIcons: false
            });
            const bounds = new google.maps.LatLngBounds();
            for (const sector of window.TRACK_GEOMETRY) {
                sector.path.forEach(point => bounds.extend(point));
                const options = {map, path: sector.path, geodesic: true, clickable: false, strokeOpacity: 1};
                new google.maps.Polyline({...options, strokeColor: '#000000', strokeWeight: 5, zIndex: 10});
                const line = new google.maps.Polyline({...options, strokeColor: '#858B93', strokeWeight: 4, zIndex: 11});
                lines.push({id: sector.id, line});
            }
            const fit = () => {
                // Use the same proportional breathing room in both modes.
                // Fractional zoom avoids an unnecessarily distant integer step.
                const canvas = element('map');
                const padding = Math.round(Math.min(canvas.clientWidth, canvas.clientHeight) * 0.08);
                map.setOptions({isFractionalZoomEnabled: true});
                if (document.documentElement.classList.contains('track-display-mode')) {
                    // The original left grid cell is the target viewport for the track.
                    // The map itself fills the screen, including behind the overlays.
                    const screen = canvas.getBoundingClientRect();
                    const slot = canvas.closest('.track-map-panel').getBoundingClientRect();
                    const gap = Math.round(Math.min(slot.width, slot.height) * 0.08);
                    map.fitBounds(bounds, {
                        left: Math.max(0, slot.left - screen.left) + gap,
                        right: Math.max(0, screen.right - slot.right) + gap,
                        top: Math.max(0, slot.top - screen.top) + gap,
                        bottom: Math.max(0, screen.bottom - slot.bottom) + gap
                    });
                } else {
                    map.fitBounds(bounds, padding);
                }
            };
            fit();
            const mapResize = new ResizeObserver(fit);
            mapResize.observe(element('map'));
            mapResize.observe(element('map').closest('.track-map-panel'));
            message.hidden = true;
            render();
        } catch { message.hidden = false; }
    }
    render();
    initializeMap();
    start();
})();
