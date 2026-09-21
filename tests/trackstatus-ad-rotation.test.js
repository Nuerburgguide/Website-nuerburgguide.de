// Deterministic integration: actual renderer + backend, virtual time and local-only fetch.
globalThis.runAdRotationTests = async function (backend, renderer) {
    let assertions = 0;
    const assert = (value, message) => { if (!value) throw Error(message); assertions++; };
    const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
    function harness(ids) {
        let now = 1800000000000, serial = 0, behavior = 'ok', pending;
        const timers = new Map(), handlers = {}, calls = [], images = [], observers = [];
        const slot = {hidden: true, children: [], getAttribute: () => 'Advertisement', replaceChildren(...items) {
            for (const image of images) image.isConnected = false;
            this.children = items;
            for (const item of items) (item.tagName === 'A' ? item.children[0] : item).isConnected = true;
        }};
        const document = {visibilityState: 'visible', documentElement: {lang: 'de'}, hasFocus: () => true,
            getElementById: () => slot, addEventListener: (key, fn) => handlers[key] = fn,
            createElement(tag) {
                const item = {tagName: tag.toUpperCase(), children: [], naturalWidth: 600, isConnected: false,
                    append(child) { this.children.push(child); }, setAttribute() {}, addEventListener() {}};
                if (tag === 'img') images.push(item);
                return item;
            }};
        const window = {location: {href: 'http://localhost/', origin: 'http://localhost'},
            crypto: {randomUUID: () => String(++serial)}, addEventListener: (key, fn) => handlers[key] = fn};
        class Clock extends Date { static now() { return now; } }
        class Observer {
            constructor(fn) { this.fn = fn; observers.push(this); }
            observe(image) { this.image = image; }
            disconnect() {}
            emit() { this.fn([{target: this.image, isIntersecting: true, intersectionRatio: 1}]); }
        }
        const fetch = async (url, options) => {
            calls.push({url, options});
            if (options.method === 'POST') return {ok: true};
            if (behavior === 'network') throw Error('offline');
            if (behavior === 'timeout') return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('aborted'))));
            if (behavior === 'deferred') return new Promise(resolve => { pending = resolve; });
            const previous = new URL(url).searchParams.get('previous_campaign_id');
            const id = ids[(ids.indexOf(previous) + 1) % ids.length];
            const campaign = id == null ? null : {campaign_id: id, image_url: 'http://localhost/' + encodeURIComponent(id) + '.svg',
                target_url: 'http://localhost/partner', alt_text: id, cache_valid_until: new Date(now + 3600000).toISOString()};
            if (behavior === 'invalid') campaign.cache_valid_until = 'invalid';
            return {ok: behavior !== 'http', json: async () => ({campaign})};
        };
        new Function('window', 'document', 'URL', renderer)(window, document, URL);
        new Function('window', 'document', 'fetch', 'Date', 'IntersectionObserver', 'AbortController', 'setTimeout', 'clearTimeout', backend)(
            window, document, fetch, Clock, Observer, AbortController,
            (fn, delay) => { const id = ++serial; timers.set(id, {fn, at: now + delay}); return id; }, id => timers.delete(id));
        return {calls, images, slot, timers, handlers, document,
            setIds(value) { ids = value; }, fail(value) { behavior = value; },
            async tick(ms) {
                const until = now + ms;
                for (;;) {
                    const next = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
                    if (!next) break;
                    now = next[1].at; timers.delete(next[0]); next[1].fn(); await flush();
                }
                now = until; await flush();
            },
            load() { images.at(-1).onload(); observers.at(-1)?.emit(); },
            hide() { document.visibilityState = 'hidden'; handlers.visibilitychange(); },
            show() { document.visibilityState = 'visible'; handlers.visibilitychange(); },
            resolve(campaign) { pending({ok: true, json: async () => ({campaign})}); },
            gets: () => calls.filter(c => c.options.method !== 'POST'),
            events: () => calls.filter(c => c.options.method === 'POST'),
            visible: () => slot.hidden ? null : slot.children[0]?.children[0]?.alt,
            previous() { return new URL(this.gets().at(-1).url).searchParams.get('previous_campaign_id'); }
        };
    }
    for (const ids of [['GetSpeed', 'Rent4Ring'], ['GetSpeed', 'Rent4Ring', 'Partner 3/&?']]) {
        const h = harness(ids); await flush();
        assert(h.previous() === null, 'initial request has no cursor'); h.load();
        for (let i = 1; i <= ids.length * 2; i++) {
            const before = h.gets().length, old = ids[(i - 1) % ids.length];
            await h.tick(299999); assert(h.gets().length === before, 'no early rotation');
            await h.tick(1); assert(h.gets().length === before + 1 && h.previous() === old, 'one five-minute request with displayed ID');
            assert(h.visible() === old, 'old image retained during successor load');
            h.load(); assert(h.visible() === ids[i % ids.length], 'backend cyclic order including wrap');
            h.handlers.focus(); assert(h.events().length === i + 1, 'exactly one impression per display');
            assert(h.timers.size === 2, 'only rotation and expiry timers after commit');
        }
    }
    const single = harness(['only']); await flush(); single.load();
    await single.tick(900000);
    assert(single.gets().length === 4 && single.images.length === 1 && single.events().length === 1 && single.visible() === 'only', 'one campaign retained without reload or duplicate impression');
    const empty = harness([]); await flush(); await empty.tick(300000);
    assert(empty.slot.hidden && empty.images.length === 0 && empty.events().length === 0 && empty.previous() === null, 'no campaigns remain hidden, no cursor');
    single.setIds([]); await single.tick(300000);
    assert(single.slot.hidden, 'null removes current campaign'); await single.tick(300000);
    assert(single.previous() === null, 'removed campaign is not sent');
    for (const failure of ['network', 'http', 'invalid', 'timeout', 'image']) {
        const h = harness(['A', 'B']); await flush(); h.load(); h.fail(failure);
        await h.tick(300000);
        if (failure === 'image') h.images.at(-1).onerror();
        if (failure === 'timeout') await h.tick(10000);
        assert(h.visible() === 'A' && h.events().length === 1, failure + ' preserves valid current image');
        h.fail('ok'); await h.tick(failure === 'image' ? 300000 : 60000);
        assert(h.previous() === 'A', failure + ' retries from actual display');
        h.load(); assert(h.visible() === 'B' && h.events().length === 2, failure + ' recovers');
    }
    const tab = harness(['A', 'B']); await flush(); tab.load(); await tab.tick(120000); tab.hide();
    await tab.tick(60000); tab.show(); await flush();
    assert(tab.gets().length === 1, 'early return preserves deadline'); await tab.tick(120000);
    assert(tab.gets().length === 2, 'remaining interval fires once');
    const stale = tab.images.at(-1); tab.hide(); stale.onload();
    assert(tab.visible() === 'A' && tab.events().length === 1, 'hidden pending image cannot commit');
    await tab.tick(600000); assert(tab.gets().length === 2, 'hidden tab does not poll');
    tab.show(); await flush(); assert(tab.gets().length === 3 && tab.previous() === 'A', 'overdue return refreshes once using visible campaign');
    tab.load(); assert(tab.visible() === 'B', 'return commits successor');
    tab.hide(); await tab.tick(3600000); assert(tab.slot.hidden, 'expiry removes image even while hidden');
    tab.show(); await flush(); assert(tab.previous() === null, 'expired campaign not sent');
    tab.handlers.pagehide(); const calls = tab.calls.length; await tab.tick(3600000);
    assert(tab.timers.size === 0 && tab.calls.length === calls, 'pagehide cancels all work');
    tab.handlers.pageshow({persisted: true}); await flush(); assert(tab.previous() === null, 'bfcache restoration starts cleanly');
    const late = harness(['A', 'B']); await flush(); late.load(); late.fail('deferred'); await late.tick(300000);
    late.hide(); late.resolve({campaign_id: 'stale', cache_valid_until: new Date(1900000000000).toISOString()}); await flush();
    assert(late.images.length === 1 && late.visible() === 'A', 'late response after hide ignored');
    const expiry = harness(['A', 'B']); await flush(); expiry.load(); expiry.fail('network'); await expiry.tick(3600000);
    assert(expiry.slot.hidden && expiry.events().length === 1, 'network errors never retain expired image');
    return `${assertions} rotation assertions passed`;
};
