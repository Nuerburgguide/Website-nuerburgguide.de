(function () {
    'use strict';
    const page = document.getElementById('track-page');
    const button = document.getElementById('track-display');
    const root = document.documentElement;
    let active = false, ownedFullscreen = false, transition = 0;
    // VisualViewport also covers older iOS without dvh. Never resize on pinch zoom.
    function syncViewport() {
        if (!active) return;
        const viewport = window.visualViewport;
        if (viewport && viewport.scale !== 1) return;
        root.style.setProperty('--track-visible-height', `${viewport ? viewport.height : window.innerHeight}px`);
        root.style.setProperty('--track-visible-top', `${viewport ? viewport.offsetTop : 0}px`);
    }
    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    function setDisplay(value) {
        active = value;
        if (value) syncViewport();
        else {
            root.style.removeProperty('--track-visible-height');
            root.style.removeProperty('--track-visible-top');
        }
        root.classList.toggle('track-display-mode', value);
        button.setAttribute('aria-pressed', String(value));
        button.textContent = value ? '×' : page.dataset.displayEnter;
        button.setAttribute('aria-label', value ? page.dataset.displayExit : page.dataset.displayEnter);
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
