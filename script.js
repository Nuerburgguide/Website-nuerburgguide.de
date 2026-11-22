(function () {
    "use strict";

    /*
     * ============================================================
     * Nürburg Guide - homepage statistics count-up
     * ============================================================
     *
     * The HTML already contains the final, locale-formatted values and the
     * "+" signs, so the statistics are complete without JavaScript.
     */

    function init() {
        const counters = document.querySelectorAll(".counter");
        const statistics = document.querySelector(".hero-stats");

        if (!counters.length || !statistics) {
            return;
        }

        // Spanish uses dot grouping for four-digit numbers as well (8.800).
        const numberLocale = {
            de: "de-DE",
            en: "en-US",
            es: "de-DE"
        }[document.documentElement.lang] || "en-US";

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        function format(value) {
            return value.toLocaleString(numberLocale);
        }

        function animateCounter(counter, delay) {
            const target = Number(counter.dataset.target);

            if (!Number.isFinite(target)) {
                return;
            }

            const duration = 1600;

            window.setTimeout(function () {
                const startTime = performance.now();

                function update(currentTime) {
                    const progress = Math.min(
                        (currentTime - startTime) / duration,
                        1
                    );
                    const easedProgress = 1 - Math.pow(1 - progress, 3);

                    counter.textContent = format(
                        Math.floor(target * easedProgress)
                    );

                    if (progress < 1) {
                        window.requestAnimationFrame(update);
                    } else {
                        counter.textContent = format(target);
                    }
                }

                window.requestAnimationFrame(update);
            }, delay);
        }

        function startCounters() {
            // Reset every counter at once so staggered counters never show
            // their final value first and then jump back to zero.
            counters.forEach(function (counter) {
                if (Number.isFinite(Number(counter.dataset.target))) {
                    counter.textContent = format(0);
                }
            });

            counters.forEach(function (counter, index) {
                animateCounter(counter, index * 150);
            });
        }

        if (reducedMotion || !("IntersectionObserver" in window)) {
            // Final values are already in the HTML.
            return;
        }

        const observer = new IntersectionObserver(function (entries) {
            if (entries.some(function (entry) {
                return entry.isIntersecting;
            })) {
                observer.disconnect();
                startCounters();
            }
        }, { threshold: 0.25 });

        observer.observe(statistics);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
