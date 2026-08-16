(function () {
    "use strict";

    /*
     * ============================================================
     * Nürburg Guide - Script
     * ============================================================
     */

    function init() {

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

            /*
             * Verhindert, dass der Hinweis doppelt erscheint.
             */
            if (!document.querySelector(".instagram-warning-banner")) {

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
        }


        /*
         * ============================================================
         * Nutzerstatistik
         * ============================================================
         *
         * Die Counter befinden sich bereits in der index.html:
         *
         * .counter[data-target="2600"]
         * .counter[data-target="4300"]
         * .counter[data-target="40"]
         *
         * Die Animation startet bewusst OHNE IntersectionObserver.
         *
         * Dadurch funktioniert sie zuverlässig auf:
         * - Desktop
         * - Windows
         * - macOS
         * - iPhone
         * - Android
         * - Safari
         * - Chrome
         * - Edge
         * - Firefox
         */

        const counters = document.querySelectorAll(".counter");

        if (!counters.length) {
            return;
        }


        /*
         * ============================================================
         * Pluszeichen sicherstellen
         * ============================================================
         *
         * Das Plus wird von JavaScript selbst erzeugt.
         *
         * Dadurch ist es egal, ob das Plus in der HTML vorhanden ist
         * oder nicht.
         */

        counters.forEach(function (counter) {

            const statNumber = counter.closest(".stat-number");

            if (!statNumber) {
                return;
            }

            let plus = statNumber.querySelector(".stat-plus");

            if (!plus) {
                plus = document.createElement("span");
                plus.className = "stat-plus";
                plus.textContent = "+";

                statNumber.appendChild(plus);
            }

            /*
             * Plus direkt sichtbar machen.
             */
            plus.style.display = "inline";
            plus.style.visibility = "visible";
            plus.style.opacity = "1";
        });


        /*
         * ============================================================
         * Counter Animation
         * ============================================================
         */

        function animateCounter(counter, delay) {

            if (!counter) {
                return;
            }

            /*
             * Verhindert eine doppelte Animation.
             */
            if (counter.dataset.animated === "true") {
                return;
            }

            const target = Number(counter.dataset.target);

            /*
             * Falls kein gültiger Zielwert vorhanden ist,
             * wird dieser Counter übersprungen.
             */
            if (!Number.isFinite(target)) {
                return;
            }

            counter.dataset.animated = "true";

            const duration = 1600;
            const startTime = performance.now();


            function updateCounter(currentTime) {

                const elapsed = currentTime - startTime;

                const progress = Math.min(
                    elapsed / duration,
                    1
                );

                /*
                 * Ease-Out-Animation.
                 *
                 * Die Zahl startet schnell und wird zum Ende
                 * hin sanfter.
                 */
                const easedProgress =
                    1 - Math.pow(1 - progress, 3);

                const currentValue =
                    Math.floor(target * easedProgress);

                counter.textContent =
                    currentValue.toLocaleString("de-DE");


                if (progress < 1) {

                    window.requestAnimationFrame(
                        updateCounter
                    );

                } else {

                    /*
                     * Am Ende exakt den Zielwert setzen.
                     */
                    counter.textContent =
                        target.toLocaleString("de-DE");

                    /*
                     * Pluszeichen nochmals sicherstellen.
                     */
                    const statNumber =
                        counter.closest(".stat-number");

                    if (statNumber) {

                        let plus =
                            statNumber.querySelector(".stat-plus");

                        if (!plus) {

                            plus =
                                document.createElement("span");

                            plus.className =
                                "stat-plus";

                            plus.textContent = "+";

                            statNumber.appendChild(plus);
                        }

                        plus.style.display = "inline";
                        plus.style.visibility = "visible";
                        plus.style.opacity = "1";
                    }
                }
            }


            /*
             * Kleiner zeitlicher Versatz zwischen den Zahlen.
             */
            window.setTimeout(function () {

                window.requestAnimationFrame(
                    updateCounter
                );

            }, delay);
        }


        /*
         * ============================================================
         * Animation starten
         * ============================================================
         *
         * KEIN IntersectionObserver.
         *
         * Die Statistik ist auf der Startseite direkt sichtbar.
         * Deshalb starten wir die Counter einfach zuverlässig
         * nach dem Laden der Seite.
         */

        counters.forEach(function (counter, index) {

            animateCounter(
                counter,
                index * 150
            );

        });
    }


    /*
     * ============================================================
     * Sicherstellen, dass das Script sowohl bei normalem Laden
     * als auch bei verzögertem Laden funktioniert.
     * ============================================================
     */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();

    }

})();
