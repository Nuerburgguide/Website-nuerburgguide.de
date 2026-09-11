// Run in a rendered, offline copy of the trackstatus page at each test viewport.
// The fixture includes the production CSS and mobile-layout.js, but no live APIs.
globalThis.runMobileLayoutTests = async function () {
    const $ = selector => document.querySelector(selector);
    const rect = element => {
        const r = element.getBoundingClientRect();
        return {x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom, r: r.right};
    };
    const settle = () => new Promise(resolve => setTimeout(resolve, 80));
    $('#track-map-message').hidden = true;
    $('#track-connection').textContent = 'Verbunden';
    $('#track-calendar-hours').textContent = '08:00–12:00 · 17:30–19:30';
    $('#track-ad').hidden = false;
    // A visible 2:1 campaign substitute, not a live impression or click.
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#202629"/><path d="M350 0H600V300H200Z" fill="#454f45"/><text x="24" y="76" fill="white" font-family="Arial" font-size="36" font-weight="bold">RACE TAXI</text><text x="24" y="126" fill="white" font-family="Arial" font-size="28">BANNER · TEST FIXTURE</text><rect x="24" y="196" width="225" height="68" rx="10" fill="#ed2000"/><text x="43" y="239" fill="white" font-family="Arial" font-size="28">BOOK NOW ›</text></svg>';
    $('#track-ad').innerHTML = `<a><img width="600" height="300" src="data:image/svg+xml,${encodeURIComponent(svg)}"></a>`;
    await $('#track-ad img').decode();
    const results = [];
    for (const mode of ['open', 'hours', 'red']) for (const count of [0, 2, 12]) {
        const red = mode === 'red';
        $('#track-red').hidden = !red;
        $('#track-red-time').textContent = '12:34';
        $('#track-label').textContent = red ? 'Closed' : 'Open';
        $('#track-badge').dataset.status = red ? 'red' : 'green';
        $('#track-calendar-hours').hidden = mode !== 'hours';
        $('#track-yellows').innerHTML = Array.from({length: count}, (_, i) => `<li><span>Sektor ${i + 1}</span><output>02:34</output></li>`).join('');
        $('#track-empty').hidden = count > 0;
        await settle();
        const panel = $('.track-panel'), list = $('.track-yellows');
        const p = rect(panel), ad = rect($('.track-ad')), img = rect($('.track-ad img'));
        const exit = rect($('#track-display')), track = rect($('.track-map-panel'));
        const mobile = matchMedia('(max-width: 850px), (orientation: landscape) and (max-width: 1100px) and (max-height: 600px)').matches;
        const checks = {
            noOverflow: panel.scrollHeight <= panel.clientHeight + 1,
            bannerInside: ad.b <= p.b - 3,
            bannerVisible: img.h >= 32,
            panelInside: p.b <= innerHeight - 27,
            attributionReserve: !mobile || p.b <= rect($('.track-map-wrap')).b - 27,
            exitInside: exit.x >= 0 && exit.b <= innerHeight && exit.r <= innerWidth,
            listReadable: !count || list.clientHeight >= 22,
            emptyCollapsed: !mobile || count > 0 || (list.clientHeight === 0 && rect($('#track-empty')).y - rect($('.track-panel h2')).b <= 14),
            bannerAdjacent: !mobile || count > 0 || ad.y - rect($('#track-empty')).b <= 14
        };
        results.push({mode, red, count, panel: p, ad, list: rect(list), track, exit,
            bannerWidth: Math.min(img.w, img.h * 2), bannerFraction: Math.min(img.w, img.h * 2) / ad.w,
            checks, pass: Object.values(checks).every(Boolean)});
    }
    return {viewport: [innerWidth, innerHeight], visibleHeight: rect($('.track-page')).h, results};
};
