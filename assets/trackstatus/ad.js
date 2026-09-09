(function () {
    'use strict';
    const slot = document.getElementById('track-ad');
    if (!slot) return;
    let generation = 0;
    function publicUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            const url = new URL(value, window.location.href);
            if (url.username || url.password) return null;
            if (url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === window.location.origin)) return url.href;
        } catch { /* Invalid artwork or destination is not displayed. */ }
        return null;
    }
    /**
     * Presentation-only adapter; NOT an assumed backend campaign schema.
     * A future campaign integration maps its verified fields to these arguments.
     * Call with null to remove an inactive campaign. This function fetches no API.
     */
    window.renderTrackStatusAd = function (imageUrl, targetUrl = null, altText = '') {
        const attempt = ++generation;
        slot.hidden = true;
        slot.replaceChildren();
        const imageSource = publicUrl(imageUrl);
        const destination = targetUrl == null || targetUrl === '' ? null : publicUrl(targetUrl);
        if (!imageSource || (targetUrl && !destination)) return;
        const image = document.createElement('img');
        image.alt = typeof altText === 'string' ? altText : '';
        image.decoding = 'async';
        image.onload = () => {
            if (attempt !== generation || !image.naturalWidth) return;
            let content = image;
            if (destination) {
                const link = document.createElement('a');
                link.href = destination;
                link.target = '_blank';
                link.rel = 'noopener noreferrer sponsored';
                if (!image.alt.trim()) link.setAttribute('aria-label', slot.getAttribute('aria-label'));
                link.append(image);
                content = link;
            }
            slot.replaceChildren(content);
            slot.hidden = false;
        };
        image.onerror = () => {
            if (attempt !== generation) return;
            slot.hidden = true;
            slot.replaceChildren();
        };
        image.src = imageSource;
    };
})();
