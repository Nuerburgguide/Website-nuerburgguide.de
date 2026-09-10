(function(root) {
    'use strict';
    function instant(value) {
        if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))throw Error('Invalid calendar time');
        const time=Date.parse(value.replace(/(\.\d{3})\d+/, '$1'));
        if(!Number.isFinite(time))throw Error('Invalid calendar time');return time;
    }
    function read(data,receivedAt) {
        if(!data||data.fresh!==true||data.known!==true||data.status==='UNKNOWN'||!Array.isArray(data.days))throw Error('Unknown calendar');
        const server=instant(data.server_time), fetched=instant(data.last_successful_fetch);
        if(!Number.isFinite(data.data_age_seconds)||data.data_age_seconds<0||!Number.isFinite(data.max_age_seconds)||data.max_age_seconds<=0)throw Error('Invalid freshness');
        const age=Math.max(data.data_age_seconds,(server-fetched)/1000);
        const validUntil=receivedAt+(data.max_age_seconds-age)*1000;
        if(validUntil<=receivedAt)throw Error('Expired calendar');
        const periods=[];
        for(const day of data.days){if(!Array.isArray(day.periods))throw Error('Invalid periods');for(const p of day.periods){const start=instant(p.start),end=instant(p.end);if(end<=start)throw Error('Invalid window');periods.push({start,end});}}
        return {server,receivedAt,validUntil,periods};
    }
    function active(calendar,now) {
        if(!calendar||now<calendar.receivedAt||now>=calendar.validUntil)return false;
        const time=calendar.server+now-calendar.receivedAt;
        return calendar.periods.some(p=>p.start<=time&&time<p.end);
    }
    function next(calendar,now) {
        if(!calendar||now>=calendar.validUntil)return null;
        const time=calendar.server+now-calendar.receivedAt;
        let delay=calendar.validUntil-now;
        for(const p of calendar.periods)for(const edge of [p.start,p.end])if(edge>time)delay=Math.min(delay,edge-time);
        return delay;
    }
    root.TrackTickerCalendar=Object.freeze({read,active,next});
})(globalThis);
