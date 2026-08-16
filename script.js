(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        /*
         * ============================================================
         * Instagram iOS Hinweis
         * ============================================================
         */

        const userAgent =
            navigator.userAgent ||
            navigator.vendor ||
            window.opera ||
            "";

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


        /*
         * ============================================================
         * Nutzerstatistik
         * ============================================================
         *
         * Die Statistik befindet sich bereits in der index.html.
         *
         * Beispiel:
         *
         * <span class="counter" data-target="2600">0</span>
         *
         * Die JavaScript-Logik greift direkt auf diese Elemente zu
         * und zählt von 0 bis zum jeweiligen Zielwert hoch.
         */

        const counters = document.querySelectorAll(".counter");

        if (!counters.length) {
            return;
        }


        /*
         * ============================================================
         * Counter Animation
         * ============================================================
         */

        function animateCounter(counter) {
            if (!counter || counter.dataset.animated === "true") {
                return;
            }

            const target = Number(counter.dataset.target);

            if (!Number.isFinite(target)) {
                return;
            }

            counter.dataset.animated = "true";

            const duration = 1600;
            const startValue = 0;
            const startTime = performance.now();


            function updateCounter(currentTime) {
                const elapsed = currentTime - startTime;

                const progress = Math.min(
                    elapsed / duration,
                    1
                );

                /*
                 * Ease-Out:
                 * Am Anfang etwas schneller,
                 * zum Ende hin sanft abbremsen.
                 */
                const easedProgress =
                    1 - Math.pow(1 - progress, 3);

                const currentValue = Math.floor(
                    startValue +
                    (target - startValue) * easedProgress
                );

                counter.textContent =
                    currentValue.toLocaleString("de-DE");


                if (progress < 1) {
                    window.requestAnimationFrame(updateCounter);
                } else {
                    /*
                     * Am Ende exakt den Zielwert setzen.
                     */
                    counter.textContent =
                        target.toLocaleString("de-DE");
                }
            }


            window.requestAnimationFrame(updateCounter);
        }


        /*
         * ============================================================
         * Animation starten
         * ============================================================
         *
         * Die Statistik befindet sich beim Laden der Seite bereits
         * relativ weit oben. Deshalb starten wir die Animation,
         * sobald der Statistikbereich sichtbar ist.
         */

        const statsSection =
            document.querySelector(".hero-stats");


        /*
         * Falls der Browser IntersectionObserver unterstützt,
         * starten wir die Animation beim Sichtbarwerden.
         */

        if (
            statsSection &&
            "IntersectionObserver" in window
        ) {
            let hasStarted = false;

            const observer = new IntersectionObserver(
                function (entries, observerInstance) {
                    entries.forEach(function (entry) {
                        if (
                            entry.isIntersecting &&
                            !hasStarted
                        ) {
                            hasStarted = true;

                            counters.forEach(function (counter, index) {
                                setTimeout(function () {
                                    animateCounter(counter);
                                }, index * 150);
                            });

                            observerInstance.disconnect();
                        }
                    });
                },
                {
                    threshold: 0.15
                }
            );

            observer.observe(statsSection);

        } else {
            /*
             * Fallback für ältere Browser.
             */
            counters.forEach(function (counter, index) {
                setTimeout(function () {
                    animateCounter(counter);
                }, index * 150);
            });
        }
    });
})();
