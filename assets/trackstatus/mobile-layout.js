(function () {
    'use strict';
    const root = document.documentElement;
    const page = document.getElementById('track-page');
    const panel = page.querySelector('.track-panel');
    const layout = page.querySelector('.track-layout');
    const list = document.getElementById('track-yellows');
    const ad = document.getElementById('track-ad');
    const mobile = window.matchMedia('(max-width: 850px), (orientation: landscape) and (max-width: 1100px) and (max-height: 600px)');
    let frame = null;
    const number = value => parseFloat(value) || 0;
    function fit() {
        frame = null;
        if (!mobile.matches || !root.classList.contains('track-display-mode')) {
            page.removeAttribute('data-mobile-compact');
            page.removeAttribute('data-mobile-tight');
            panel.style.removeProperty('--mobile-ad-height');
            panel.style.removeProperty('--mobile-yellow-height');
            return;
        }
        const landscape = window.matchMedia('(orientation: landscape) and (min-width: 480px)').matches;
        const height = layout.getBoundingClientRect().height;
        page.toggleAttribute('data-mobile-compact', landscape && height <= 270);
        page.toggleAttribute('data-mobile-tight', landscape && height < 190);
        const style = getComputedStyle(panel);
        const bottom = layout.getBoundingClientRect().bottom;
        // The grid reserves the track slot in portrait; the panel may be shorter
        // than its slot. Never use the current panel height as the budget.
        let available = bottom - panel.getBoundingClientRect().top
            - number(style.paddingTop) - number(style.paddingBottom)
            - number(style.borderTopWidth) - number(style.borderBottomWidth);
        for (const child of panel.children) {
            if (child === list || child === ad || getComputedStyle(child).display === 'none') continue;
            const css = getComputedStyle(child);
            available -= child.getBoundingClientRect().height + number(css.marginTop) + number(css.marginBottom);
        }
        const img = ad.querySelector('img');
        let banner = 0;
        if (!ad.hidden && img && img.naturalWidth) {
            const css = getComputedStyle(ad);
            available -= number(css.marginTop) + number(css.marginBottom);
            const row = list.firstElementChild;
            const minimumList = row ? Math.min(list.scrollHeight, row.getBoundingClientRect().height + number(getComputedStyle(row).marginBottom)) : 0;
            const naturalHeight = Math.min(ad.clientWidth * img.naturalHeight / img.naturalWidth,
                number(style.getPropertyValue('--mobile-ad-limit')) || Infinity);
            banner = Math.max(0, Math.min(naturalHeight, available - minimumList));
        }
        panel.style.setProperty('--mobile-ad-height', `${banner}px`);
        panel.style.setProperty('--mobile-yellow-height', `${Math.max(0, available - banner)}px`);
    }
    function schedule() {
        if (frame === null) frame = requestAnimationFrame(fit);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(layout);
    resize.observe(panel);
    const content = new MutationObserver(schedule);
    content.observe(panel, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'src']});
    new MutationObserver(schedule).observe(root, {attributes: true, attributeFilter: ['class']});
    ad.addEventListener('load', schedule, true);
    mobile.addEventListener('change', schedule);
    window.addEventListener('resize', schedule);
    schedule();
})();
