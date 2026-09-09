(function (root) {
    'use strict';
    const names = ['Tiergarten', 'T13', 'Hatzenbach', 'Quiddelbacher Höhe', 'Flugplatz', 'Schwedenkreuz', 'Aremberg', 'Fuchsröhre', 'Adenauer Forst', 'Metzgesfeld', 'Kallenhard', 'Wehrseifen', 'Breidscheid', 'Exmühle', 'Lauda-Links', 'Bergwerk', 'Kesselchen', 'Klostertal', 'Caracciola-Karussell', 'Hohe Acht', 'Hedwigshöhe', 'Wippermann', 'Eschbach', 'Brünnchen', 'Eiskurve', 'Pflanzgarten I', 'Pflanzgarten II', 'Stefan-Bellof-S', 'Schwalbenschwanz', 'Kleines Karussell', 'Galgenkopf', 'Döttinger Höhe'];
    function timestamp(value) {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value)) throw new Error('Invalid UTC timestamp');
        const time = Date.parse(value);
        if (!Number.isFinite(time)) throw new Error('Invalid timestamp');
        return time;
    }
    function snapshot(data, receivedAt) {
        if (!data || !['GREEN', 'YELLOW', 'RED'].includes(data.overall_status) || !Array.isArray(data.sectors) || !Object.hasOwn(data, 'track_red')) throw new Error('Invalid snapshot');
        const serverTime = timestamp(data.server_time);
        const sectors = new Map();
        for (const item of data.sectors) {
            if (!item || item.type !== 'yellow_flag' || item.state !== 'active' || !Number.isInteger(item.sector) || item.sector < 1 || item.sector > 32) continue;
            const expiresAt = timestamp(item.expires_at);
            if (typeof item.name !== 'string' || !item.name.trim()) throw new Error('Missing sector name');
            if (expiresAt > serverTime) sectors.set(item.sector, {id: item.sector, name: item.name, expiresAt});
        }
        let red = null;
        if (data.track_red !== null) {
            if (typeof data.track_red !== 'object') throw new Error('Invalid red state');
            if (data.track_red.state === 'active') {
                const expiresAt = timestamp(data.track_red.expires_at);
                if (expiresAt > serverTime) red = {expiresAt};
            }
        }
        return {overallStatus: data.overall_status.toLowerCase(), serverTime, receivedAt, sectors: [...sectors.values()].sort((a, b) => a.id - b.id), red};
    }
    function project(value, now) {
        if (!value) return {status: 'unknown', sectors: [], red: null};
        const serverNow = value.serverTime + Math.max(0, now - value.receivedAt);
        const remaining = item => ({...item, remaining: Math.max(0, Math.ceil((item.expiresAt - serverNow) / 1000))});
        const sectors = value.sectors.map(remaining).filter(item => item.remaining > 0);
        const red = value.red && remaining(value.red);
        // Honor a global status even when its timer is absent. Known timed states
        // expire locally; the next full snapshot remains authoritative.
        const redActive = red?.remaining > 0 || (value.overallStatus === 'red' && !value.red);
        const yellowActive = sectors.length > 0 || (value.overallStatus === 'yellow' && !value.sectors.length);
        return {sectors, red: red?.remaining > 0 ? red : null, status: redActive ? 'red' : yellowActive ? 'yellow' : 'green'};
    }
    function format(seconds) {
        return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    function color(id, view, available) {
        if (!available) return '#858B93';
        if (view.sectors.some(item => item.id === id)) return '#FCE91C';
        return view.status === 'red' ? '#E50000' : '#0DBF12';
    }
    root.TrackStatusCore = Object.freeze({names, timestamp, snapshot, project, format, color});
})(globalThis);
