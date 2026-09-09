// Run after assets/trackstatus/core.js in any modern JavaScript runtime.
(function () {
    const c = globalThis.TrackStatusCore;
    let count = 0;
    const assert = (value, message) => { if (!value) throw new Error(message); count++; };
    const base = {overall_status: 'GREEN', server_time: '2026-09-09T12:00:00Z', sectors: [], track_red: null};
    const yellow = (sector, seconds = 30, extra = {}) => ({sector, name: c.names[sector - 1] || 'Unknown', type: 'yellow_flag', state: 'active', expires_at: `2026-09-09T12:00:${String(seconds).padStart(2, '0')}Z`, ...extra});
    assert(c.project(null, 0).status === 'unknown', 'Missing data must not be green');
    assert(c.project(c.snapshot(base, 100), 100).status === 'green', 'Authoritative empty snapshot');
    const data = {...base, sectors: [yellow(24), yellow(2), yellow(3, 30, {state:'pending'}), yellow(4, 30, {type:'red_flag'}), yellow(33), yellow(5, 0), yellow('6')]};
    const snap = c.snapshot(data, 1000);
    assert(snap.sectors.map(x=>x.id).join(',') === '2,24', 'Filter, sort, ignore unknown IDs, pending and sector red');
    assert(c.project(snap, 11000).sectors[0].remaining === 20, 'Monotonic server countdown');
    assert(c.project(snap, 31000).status === 'green', 'Expiry removes state locally');
    const red = {state:'active', expires_at:'2026-09-09T12:00:40Z'};
    const both = c.project(c.snapshot({...data, track_red:red}, 0), 0);
    assert(both.status === 'red' && both.sectors.length === 2, 'RED and yellow coexist');
    assert(c.color(24, both, true) === '#FCE91C', 'Yellow takes priority on map');
    assert(c.color(1, both, true) === '#E50000', 'Other sectors red');
    assert(c.color(1, both, false) === '#858B93', 'Unavailable never green');
    const driver = c.snapshot({...base,sectors:[yellow(1,30,{confirmations:1})]},0);
    assert(driver.sectors.length === 1, 'Backend active driver yellow needs no confirmation threshold');
    const refresh = c.snapshot({...base, server_time:'2026-09-09T12:00:20Z', sectors:[yellow(1,50)]},20000);
    assert(c.project(refresh,25000).sectors[0].remaining === 25, 'Refresh replaces end time');
    assert(c.project(c.snapshot({...base, track_red:{state:'pending'}},0),0).status === 'green', 'Pending red ignored');
    assert(c.project(c.snapshot({...base,sectors:[yellow(2,50)],track_red:red},0),45000).status === 'yellow', 'Yellow survives RED expiry');
    assert(c.format(65) === '01:05' && c.format(3600) === '60:00', 'Countdown formatting');
    for (const invalid of [{}, {...base,server_time:'2026-09-09T12:00:00'}, {...base,sectors:[yellow(1,30,{expires_at:null})]}]) {
        let threw = false; try { c.snapshot(invalid,0); } catch { threw = true; }
        assert(threw, 'Malformed status must fail closed');
    }
    assert(c.names.length === 32 && c.names[23] === 'Brünnchen', 'Names unchanged');
    assert(c.snapshot({...base,sectors:[yellow(1,30,{name:'Exact API name'})]},0).sectors[0].name === 'Exact API name', 'Use API names verbatim');
    assert(c.project(c.snapshot({...base,overall_status:'RED'},0),0).status === 'red', 'Global RED without timer remains RED');
    globalThis.trackStatusTestResult = `${count} status assertions passed`;
})();
