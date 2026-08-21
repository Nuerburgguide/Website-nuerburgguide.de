(function () {
    "use strict";

    const WIDGET_SCRIPT_URL = "https://raceticket.de/widget/raceticket-widget.js";
    const WIDGET_STYLE_URL = "https://raceticket.de/widget/raceticket-widget.css";
    const WIDGET_CONTAINER_SELECTOR = "#raceticket-widget";
    const WIDGET_TIMEOUT_MS = 15000;

    function initGetSpeedBooking() {
        const shell = document.querySelector("[data-raceticket-shell]");
        const container = document.querySelector(WIDGET_CONTAINER_SELECTOR);

        if (!shell || !container) {
            return;
        }

        const status = shell.querySelector("[data-raceticket-status]");
        const loadingText = shell.dataset.loadingText || "Loading booking system ...";
        const errorText = shell.dataset.errorText || "The booking system could not be loaded right now.";
        const retryText = shell.dataset.retryText || "Try again";

        let timeoutId;
        let observer;
        let scriptLoading = false;

        function setStatus(message, state) {
            shell.dataset.state = state;

            if (!status) {
                return;
            }

            status.innerHTML = "";

            const messageElement = document.createElement("p");
            messageElement.textContent = message;
            status.appendChild(messageElement);

            if (state === "error") {
                const retryButton = document.createElement("button");
                retryButton.type = "button";
                retryButton.className = "raceticket-retry-button";
                retryButton.textContent = retryText;
                retryButton.addEventListener("click", function () {
                    loadWidget(true);
                }, { once: true });
                status.appendChild(retryButton);
            }
        }

        function markLoaded() {
            window.clearTimeout(timeoutId);

            if (observer) {
                observer.disconnect();
                observer = null;
            }

            shell.dataset.state = "loaded";
        }

        function markError() {
            window.clearTimeout(timeoutId);

            if (observer) {
                observer.disconnect();
                observer = null;
            }

            scriptLoading = false;
            setStatus(errorText, "error");
        }

        function ensureWidgetStyles() {
            if (document.querySelector('link[href="' + WIDGET_STYLE_URL + '"]')) {
                return;
            }

            const stylesheet = document.createElement("link");
            stylesheet.rel = "stylesheet";
            stylesheet.href = WIDGET_STYLE_URL;
            document.head.appendChild(stylesheet);
        }

        function observeWidgetContent() {
            if (!("MutationObserver" in window)) {
                return;
            }

            observer = new MutationObserver(function () {
                if (container.children.length || container.textContent.trim()) {
                    markLoaded();
                }
            });

            observer.observe(container, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        function initializeWidget() {
            if (!window.RaceTicketWidget || typeof window.RaceTicketWidget.init !== "function") {
                markError();
                return;
            }

            container.innerHTML = "";
            observeWidgetContent();

            try {
                window.RaceTicketWidget.init({
                    container: "#raceticket-widget",
                    hostSlug: "under8-gmbh",
                    variant: "3uJXkN0wHwRCElzhjQf8gr5aKRskBsH6"
                });
            } catch (error) {
                markError();
                return;
            }

            timeoutId = window.setTimeout(function () {
                if (container.children.length || container.textContent.trim()) {
                    markLoaded();
                } else {
                    markError();
                }
            }, WIDGET_TIMEOUT_MS);
        }

        function loadWidget(forceReload) {
            if (scriptLoading) {
                return;
            }

            window.clearTimeout(timeoutId);

            if (observer) {
                observer.disconnect();
                observer = null;
            }

            setStatus(loadingText, "loading");
            ensureWidgetStyles();

            if (forceReload) {
                container.innerHTML = "";
                document.querySelectorAll('script[src="' + WIDGET_SCRIPT_URL + '"]').forEach(function (script) {
                    script.remove();
                });
                delete window.RaceTicketWidget;
            }

            if (window.RaceTicketWidget && typeof window.RaceTicketWidget.init === "function") {
                initializeWidget();
                return;
            }

            scriptLoading = true;

            const script = document.createElement("script");
            script.src = WIDGET_SCRIPT_URL;
            script.async = true;
            script.onload = function () {
                scriptLoading = false;
                initializeWidget();
            };
            script.onerror = markError;
            document.body.appendChild(script);
        }

        loadWidget(false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGetSpeedBooking, { once: true });
    } else {
        initGetSpeedBooking();
    }
})();
