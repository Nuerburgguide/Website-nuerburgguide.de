(function(root) {
    'use strict';
    const local = hostname => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
    function status(view, reliable, tfActive) {
        if (!reliable || !tfActive || !view) return null;
        if (view.status === 'red') return {color: 'red', names: []};
        if (view.sectors.length) return {color: 'yellow', names: view.sectors.map(s => s.name)};
        return view.status === 'green' ? {color: 'green', names: []} : null;
    }
    root.TrackTickerState = Object.freeze({local, status});
})(globalThis);
