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

    /*
     * Nutzerstatistik
     * Die Statistik wird zwischen App-Vorschau und Download-Bereich eingefügt.
     */
    const appPreviewSection = document.querySelector(".app-preview-section");
    const downloadSection = document.querySelector(".hero-home");

    if (appPreviewSection && downloadSection) {
        const statsSection = document.createElement("section");
        statsSection.className = "app-stats-section";
        statsSection.setAttribute("aria-label", "Nürburg Guide Nutzerstatistik");

        statsSection.innerHTML = `
            <div class="container">
                <div class="app-stats">
                    <div class="app-stat">
                        <span class="app-stat-number" data-target="2600">0</span>
                        <span class="app-stat-label">Nutzer in den letzten 9 Tagen</span>
                    </div>

                    <div class="app-stat app-stat-main">
                        <span class="app-stat-number" data-target="4300" data-suffix="+">0</span>
                        <span class="app-stat-label">aktive Nutzer seit Release</span>
                    </div>

                    <div class="app-stat">
                        <span class="app-stat-number" data-target="40" data-suffix="+">0</span>
                        <span class="app-stat-label">Länder weltweit</span>
                    </div>
                </div>
            </div>
        `;

        downloadSection.parentNode.insertBefore(statsSection, downloadSection);

        const counters = statsSection.querySelectorAll(".app-stat-number");

        const animateCounter = (counter) => {
            const target = Number(counter.dataset.target);
            const suffix = counter.dataset.suffix || "";
            const duration = 1500;
            const startTime = performance.now();

            const updateCounter = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Smoothes Auslaufen der Animation
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                const currentValue = Math.floor(target * easedProgress);

                counter.textContent = currentValue.toLocaleString("de-DE");

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString("de-DE");

                    if (suffix) {
                        const suffixElement = document.createElement("span");
                        suffixElement.className = "app-stat-suffix";
                        suffixElement.textContent = suffix;

                        counter.appendChild(suffixElement);

                        requestAnimationFrame(() => {
                            suffixElement.classList.add("is-visible");
                        });
                    }
                }
            };

            requestAnimationFrame(updateCounter);
        };

        // Animation erst starten, wenn die Statistik tatsächlich sichtbar wird.
        if ("IntersectionObserver" in window) {
            const observer = new IntersectionObserver(
                (entries, observerInstance) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            counters.forEach((counter, index) => {
                                setTimeout(() => {
                                    animateCounter(counter);
                                }, index * 120);
                            });

                            observerInstance.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.35
                }
            );

            observer.observe(statsSection);
        } else {
            counters.forEach((counter) => animateCounter(counter));
        }
    }
})();
