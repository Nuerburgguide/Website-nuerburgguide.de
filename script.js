(function () {
    "use strict";

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
     * Neuer Hero-Counter
     *
     * Die Counter werden nicht mehr dynamisch zwischen App-Vorschau
     * und Download-Bereich eingefügt.
     *
     * Die HTML-Struktur befindet sich direkt im Hero-Bereich der
     * index.html. Dadurch bleibt der Counter genau dort, wo er
     * gestalterisch hingehört:
     *
     * Überschrift
     *      ↓
     * Counter
     *      ↓
     * App-Store-Buttons
     */

    const counterSection = document.querySelector(".hero-counter");

    if (!counterSection) {
        return;
    }

    const counters = counterSection.querySelectorAll(".hero-counter-item");

    if (!counters.length) {
        return;
    }

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    const formatNumber = (value) => {
        return Number(value).toLocaleString("de-DE");
    };

    const animateCounter = (item, delay) => {
        const valueElement = item.querySelector(".hero-counter-value");
        const suffixElement = item.querySelector(".hero-counter-suffix");

        if (!valueElement) {
            return;
        }

        const target = Number(valueElement.dataset.target);

        if (!Number.isFinite(target)) {
            return;
        }

        const duration = target >= 4000 ? 2300 : target >= 1000 ? 2000 : 1500;

        const startAnimation = () => {
            if (prefersReducedMotion) {
                valueElement.textContent = formatNumber(target);

                if (suffixElement) {
                    suffixElement.classList.add("is-visible");
                }

                item.classList.add("is-complete");
                return;
            }

            const startTime = performance.now();

            const updateCounter = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                /*
                 * Ease-out:
                 * Die Zahl startet schnell und wird zum Ende hin
                 * immer langsamer.
                 */
                const easedProgress = 1 - Math.pow(1 - progress, 3);

                const currentValue = Math.floor(target * easedProgress);

                valueElement.textContent = formatNumber(currentValue);

                if (progress < 1) {
                    window.requestAnimationFrame(updateCounter);
                    return;
                }

                valueElement.textContent = formatNumber(target);
                item.classList.add("is-complete");

                /*
                 * Das Plus kommt bewusst erst nach dem vollständigen
                 * Hochzählen der Zahl.
                 */
                if (suffixElement) {
                    window.setTimeout(() => {
                        suffixElement.classList.add("is-visible");
                    }, 180);
                }
            };

            window.requestAnimationFrame(updateCounter);
        };

        window.setTimeout(startAnimation, delay);
    };

    const startCounters = () => {
        counters.forEach((item, index) => {
            /*
             * Die drei Werte starten leicht versetzt.
             */
            animateCounter(item, index * 220);
        });
    };

    /*
     * Animation erst starten, wenn der Counter im sichtbaren Bereich
     * angekommen ist.
     */
    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries, observerInstance) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        startCounters();
                        observerInstance.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.45
            }
        );

        observer.observe(counterSection);
    } else {
        startCounters();
    }
})();
