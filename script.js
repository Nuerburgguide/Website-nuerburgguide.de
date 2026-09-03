(function () {
    "use strict";

    /*
     * ============================================================
     * Nürburg Guide - Script
     * ============================================================
     */

    function init() {

        const language = document.documentElement.lang || "de";

        const messages = {
            de: {
                numberLocale: "de-DE",
                previewClose: "Vorschau schließen",
                previewTitle: "App-Vorschau",
                previewZoomIn: "Vergrößern",
                previewZoomOut: "Verkleinern",
                previewZoomReset: "Zoom zurücksetzen"
            },
            en: {
                numberLocale: "en-US",
                statisticLabels: ["Last 30 days", "Users total", "Countries represented"],
                previewClose: "Close preview",
                previewTitle: "App preview",
                previewZoomIn: "Zoom in",
                previewZoomOut: "Zoom out",
                previewZoomReset: "Reset zoom"
            },
            es: {
                numberLocale: "de-DE",
                statisticLabels: ["Últimos 30 días", "Usuarios totales", "Países representados"],
                previewClose: "Cerrar vista previa",
                previewTitle: "Vista previa de la app",
                previewZoomIn: "Ampliar",
                previewZoomOut: "Reducir",
                previewZoomReset: "Restablecer zoom"
            }
        }[language] || {
            numberLocale: "en-US",
            statisticLabels: ["Last 30 days", "Users total", "Countries represented"],
            previewClose: "Close preview",
            previewTitle: "App preview",
            previewZoomIn: "Zoom in",
            previewZoomOut: "Zoom out",
            previewZoomReset: "Reset zoom"
        };

        if (language === "de") {
            messages.statisticLabels = [
                "Letzte 30 Tage",
                "Nutzer insgesamt",
                "Länder vertreten"
            ];
        }

        const previewTrigger = document.querySelector(".app-preview-link");

        if (previewTrigger) {
            const previewImage = previewTrigger.querySelector("img");
            const modal = document.createElement("div");
            const modalContent = document.createElement("div");
            const modalTitle = document.createElement("h2");
            const closeButton = document.createElement("button");
            const zoomControls = document.createElement("div");
            const zoomOutButton = document.createElement("button");
            const zoomResetButton = document.createElement("button");
            const zoomInButton = document.createElement("button");
            const modalImage = document.createElement("img");

            modal.className = "preview-modal";
            modal.setAttribute("role", "dialog");
            modal.setAttribute("aria-modal", "true");
            modal.setAttribute("aria-labelledby", "preview-modal-title");
            modal.setAttribute("aria-hidden", "true");
            modal.tabIndex = -1;

            modalContent.className = "preview-modal-content";
            modalTitle.className = "visually-hidden";
            modalTitle.id = "preview-modal-title";
            modalTitle.textContent = messages.previewTitle;

            closeButton.className = "preview-modal-close";
            closeButton.type = "button";
            closeButton.setAttribute("aria-label", messages.previewClose);
            closeButton.textContent = "×";

            zoomControls.className = "preview-modal-zoom-controls";
            zoomOutButton.className = "preview-modal-zoom-button";
            zoomOutButton.type = "button";
            zoomOutButton.setAttribute("aria-label", messages.previewZoomOut);
            zoomOutButton.textContent = "−";
            zoomResetButton.className = "preview-modal-zoom-button preview-modal-zoom-reset";
            zoomResetButton.type = "button";
            zoomResetButton.setAttribute("aria-label", messages.previewZoomReset);
            zoomResetButton.textContent = "100%";
            zoomInButton.className = "preview-modal-zoom-button";
            zoomInButton.type = "button";
            zoomInButton.setAttribute("aria-label", messages.previewZoomIn);
            zoomInButton.textContent = "+";

            zoomControls.append(zoomOutButton, zoomResetButton, zoomInButton);

            modalImage.className = "preview-modal-image";
            modalImage.src = previewImage.src;
            modalImage.alt = previewImage.alt;

            modalContent.append(modalTitle, closeButton, zoomControls, modalImage);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            let previousFocus;
            let previousBodyOverflow;
            let zoom = 1;
            let panX = 0;
            let panY = 0;
            let dragStartX = 0;
            let dragStartY = 0;
            let dragOriginX = 0;
            let dragOriginY = 0;
            let isDragging = false;

            function updateImageTransform() {
                modalImage.style.transform =
                    "translate(" + panX + "px, " + panY + "px) scale(" + zoom + ")";
            }

            function limitPan() {
                const maxPanX = modalImage.offsetWidth * (zoom - 1) / 2;
                const maxPanY = modalImage.offsetHeight * (zoom - 1) / 2;

                panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
                panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
            }

            function applyZoom(nextZoom) {
                zoom = Math.min(3, Math.max(1, nextZoom));
                limitPan();
                updateImageTransform();
                zoomResetButton.textContent = Math.round(zoom * 100) + "%";
                zoomOutButton.disabled = zoom === 1;
                zoomInButton.disabled = zoom === 3;
            }

            function closePreview() {
                modal.classList.remove("is-open");
                modal.setAttribute("aria-hidden", "true");
                document.body.style.overflow = previousBodyOverflow;

                if (previousFocus) {
                    previousFocus.focus();
                }
            }

            function openPreview(event) {
                event.preventDefault();
                previousFocus = previewTrigger;
                previousBodyOverflow = document.body.style.overflow;
                applyZoom(1);
                modal.classList.add("is-open");
                modal.setAttribute("aria-hidden", "false");
                document.body.style.overflow = "hidden";
                window.setTimeout(function () {
                    closeButton.focus();
                }, 50);
            }

            previewTrigger.setAttribute("aria-controls", "preview-modal");
            modal.id = "preview-modal";
            previewTrigger.addEventListener("mousedown", function (event) {
                event.preventDefault();
            });
            previewTrigger.addEventListener("click", openPreview);
            closeButton.addEventListener("click", closePreview);
            zoomOutButton.addEventListener("click", function () {
                applyZoom(zoom - 0.25);
            });
            zoomResetButton.addEventListener("click", function () {
                applyZoom(1);
            });
            zoomInButton.addEventListener("click", function () {
                applyZoom(zoom + 0.25);
            });
            modalImage.addEventListener("dblclick", function () {
                panX = 0;
                panY = 0;
                applyZoom(zoom === 1 ? 2 : 1);
            });
            modalImage.addEventListener("wheel", function (event) {
                event.preventDefault();
                applyZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
            }, { passive: false });
            modalImage.addEventListener("pointerdown", function (event) {
                if (zoom === 1) {
                    return;
                }

                isDragging = true;
                dragStartX = event.clientX;
                dragStartY = event.clientY;
                dragOriginX = panX;
                dragOriginY = panY;
                modalImage.classList.add("is-dragging");
                modalImage.setPointerCapture(event.pointerId);
                event.preventDefault();
            });
            modalImage.addEventListener("pointermove", function (event) {
                if (!isDragging) {
                    return;
                }

                panX = dragOriginX + event.clientX - dragStartX;
                panY = dragOriginY + event.clientY - dragStartY;
                limitPan();
                updateImageTransform();
                event.preventDefault();
            });
            modalImage.addEventListener("pointerup", function (event) {
                isDragging = false;
                modalImage.classList.remove("is-dragging");
                if (modalImage.hasPointerCapture(event.pointerId)) {
                    modalImage.releasePointerCapture(event.pointerId);
                }
            });
            modalImage.addEventListener("pointercancel", function () {
                isDragging = false;
                modalImage.classList.remove("is-dragging");
            });
            modal.addEventListener("click", function (event) {
                if (event.target === modal) {
                    closePreview();
                }
            });
            document.addEventListener("keydown", function (event) {
                if (!modal.classList.contains("is-open")) {
                    return;
                }

                if (event.key === "Escape") {
                    closePreview();
                }

                if (event.key === "Tab") {
                    event.preventDefault();
                    const focusable = [
                        closeButton,
                        zoomOutButton,
                        zoomResetButton,
                        zoomInButton
                    ];
                    const currentIndex = focusable.indexOf(document.activeElement);
                    const nextIndex = event.shiftKey
                        ? (currentIndex - 1 + focusable.length) % focusable.length
                        : (currentIndex + 1) % focusable.length;
                    focusable[nextIndex].focus();
                }
            });
            document.addEventListener("focusin", function (event) {
                if (modal.classList.contains("is-open") && !modal.contains(event.target)) {
                    closeButton.focus();
                }
            });
        }

        const counters = document.querySelectorAll(".counter");

        if (!counters.length) {
            return;
        }

        document.querySelectorAll(".stat-label").forEach(function (label, index) {
            if (messages.statisticLabels[index]) {
                label.textContent = messages.statisticLabels[index];
            }
        });


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


        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        function setFinalValue(counter) {
            const target = Number(counter.dataset.target);

            if (Number.isFinite(target)) {
                counter.textContent =
                    target.toLocaleString(messages.numberLocale);
            }
        }

        function animateCounter(counter, delay) {
            if (!counter || counter.dataset.animated === "true") {
                return;
            }

            const target = Number(counter.dataset.target);

            if (!Number.isFinite(target)) {
                return;
            }

            counter.dataset.animated = "true";

            if (reducedMotion) {
                setFinalValue(counter);
                return;
            }

            const duration = 1600;
            const startTime = performance.now();

            function updateCounter(currentTime) {
                const progress = Math.min(
                    (currentTime - startTime) / duration,
                    1
                );
                const easedProgress = 1 - Math.pow(1 - progress, 3);

                counter.textContent = Math.floor(
                    target * easedProgress
                ).toLocaleString(messages.numberLocale);

                if (progress < 1) {
                    window.requestAnimationFrame(updateCounter);
                } else {
                    setFinalValue(counter);
                }
            }

            window.setTimeout(function () {
                window.requestAnimationFrame(updateCounter);
            }, delay);
        }

        let countersStarted = false;

        function startCounters() {
            if (countersStarted) {
                return;
            }

            countersStarted = true;

            counters.forEach(function (counter, index) {
                animateCounter(counter, index * 150);
            });
        }

        const statistics = document.querySelector(".hero-stats");

        if (reducedMotion) {
            startCounters();
        } else if (statistics && "IntersectionObserver" in window) {
            const observer = new IntersectionObserver(function (entries) {
                if (entries.some(function (entry) {
                    return entry.isIntersecting;
                })) {
                    startCounters();
                    observer.disconnect();
                }
            }, { threshold: 0.25 });

            observer.observe(statistics);
        } else {
            startCounters();
        }
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
