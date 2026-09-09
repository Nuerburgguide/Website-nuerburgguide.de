(function () {
    'use strict';
    const page = document.getElementById('track-page');
    const button = document.getElementById('track-display');
    const root = document.documentElement;
    let active = false, ownedFullscreen = false, transition = 0;
    function setDisplay(value) {
        active = value;
        root.classList.toggle('track-display-mode', value);
        button.setAttribute('aria-pressed', String(value));
        button.textContent = value ? page.dataset.displayExit : page.dataset.displayEnter;
    }
    async function leave() {
        transition++;
        setDisplay(false);
        if (ownedFullscreen && document.fullscreenElement === root) {
            try { await document.exitFullscreen(); } catch { /* CSS layout already restored. */ }
        }
        ownedFullscreen = false;
        button.focus({preventScroll: true});
    }
    button.addEventListener('click', async () => {
        if (active) { await leave(); return; }
        const attempt = ++transition;
        setDisplay(true);
        // CSS mode is immediately usable, even without fullscreen permission.
        if (!root.requestFullscreen || document.fullscreenElement) return;
        try {
            ownedFullscreen = true;
            await root.requestFullscreen();
            if (attempt !== transition && document.fullscreenElement === root) await document.exitFullscreen();
        } catch { ownedFullscreen = false; }
    });
    document.addEventListener('fullscreenchange', () => {
        if (ownedFullscreen && !document.fullscreenElement) {
            ownedFullscreen = false;
            transition++;
            setDisplay(false);
            button.focus({preventScroll: true});
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && active) { event.preventDefault(); leave(); }
    });
})();
