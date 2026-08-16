(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {

        /*
         * Instagram iOS Hinweis
         */
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


        /*
         * Nürburg Guide Nutzerstatistik
         *
         * Die Counter befinden sich bereits direkt in der index.html.
         * JavaScript übernimmt hier ausschließlich die Animation.
         *
         * Zielwerte:
         * 2600 = Nutzer in den letzten 9 Tagen
         * 4300 = Nutzer insgesamt
         * 40   = Länder
         */

        const counters = document.querySelectorAll(".counter");

        if (!counters.length) {
            return;
        }


        /*
         * Counter-Animation
         */
        function animateCounter(counter, delay) {

            const target = Number(counter.dataset.target);

            if (!Number.isFinite(target)) {
                return;
            }


            const statNumber = counter.closest(".stat-number");
            const plus = statNumber
                ? statNumber.querySelector(".stat-plus")
                : null;


            /*
             * Plus zunächst ausblenden.
             * Es soll erst erscheinen, wenn die Zahl fertig hochgezählt wurde.
             */
            if (plus) {
                plus.style.opacity = "0";
                plus.style.visibility = "hidden";
                plus.style.transform = "translateY(4px) scale(0.85)";
                plus.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            }


            /*
             * Startwert sicher auf 0 setzen.
             */
            counter.textContent = "0";


            /*
             * Bei reduzierter Bewegung:
             * Zielwert direkt anzeigen.
             */
            const reducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;


            if (reducedMotion) {

                setTimeout(function () {

                    counter.textContent = target.toLocaleString("de-DE");

                    if (plus) {
                        plus.style.opacity = "1";
                        plus.style.visibility = "visible";
                        plus.style.transform = "translateY(0) scale(1)";
                    }

                }, delay);

                return;
            }


            /*
             * Normale Animation
             */
            setTimeout(function () {

                const duration = target >= 4000 ? 2100 : 1800;
                const startTime = performance.now();


                function updateCounter(currentTime) {

                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);


                    /*
                     * Ease-Out-Cubic:
                     * Anfang schnell, gegen Ende immer langsamer.
                     */
                    const easedProgress =
                        1 - Math.pow(1 - progress, 3);


                    const currentValue = Math.floor(
                        target * easedProgress
                    );


                    counter.textContent =
                        currentValue.toLocaleString("de-DE");


                    if (progress < 1) {

                        requestAnimationFrame(updateCounter);

                    } else {

                        /*
                         * Absolut sicherstellen,
                         * dass am Ende exakt der Zielwert steht.
                         */
                        counter.textContent =
                            target.toLocaleString("de-DE");


                        /*
                         * Das Plus kommt mit einer kleinen Verzögerung.
                         */
                        if (plus) {

                            setTimeout(function () {

                                plus.style.visibility = "visible";

                                requestAnimationFrame(function () {

                                    plus.style.opacity = "1";
                                    plus.style.transform =
                                        "translateY(0) scale(1)";

                                });

                            }, 220);
                        }
                    }
                }


                requestAnimationFrame(updateCounter);

            }, delay);
        }


        /*
         * Alle Counter starten.
         *
         * Der kleine zeitliche Versatz sorgt dafür,
         * dass die drei Zahlen nacheinander anlaufen.
         */
        counters.forEach(function (counter, index) {

            animateCounter(
                counter,
                index * 220
            );

        });

    });

})();
