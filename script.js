(function () {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

    const isInstagramBrowser = /Instagram/i.test(userAgent);

    if (isIOS && isInstagramBrowser) {
        const banner = document.createElement("div");
        banner.className = "instagram-warning-banner";

        banner.innerHTML = `
            <div class="instagram-warning-content">
                <strong>⚠️ iPhone erkannt: Instagram blockiert den App Store-Link</strong>
                <span>
                    Bitte oben rechts auf „…“ tippen und im Browser öffnen, um die App herunterzuladen.
                </span>
            </div>
        `;

        document.body.prepend(banner);
    }
})();
