(function () {
    "use strict";

    const WIDGET_SCRIPT_URL = "https://raceticket.de/widget/raceticket-widget.js";
    const WIDGET_STYLE_URL = "https://raceticket.de/widget/raceticket-widget.css";
    const WIDGET_CONTAINER_SELECTOR = "#raceticket-widget";
    const WIDGET_RENDER_CHECK_MS = 500;
    const WIDGET_FAILURE_TIMEOUT_MS = 60000;
    const SUPPORTED_WIDGET_LOCALES = ["de", "en", "es"];

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

        let observer;
        let shadowObserver;
        let renderCheckId;
        let failureTimeoutId;
        let apiCheckId;
        let scriptLoading = false;

        function getWidgetLocale() {
            const pageLanguage = (document.documentElement.lang || "").toLowerCase().split("-")[0];

            if (SUPPORTED_WIDGET_LOCALES.includes(pageLanguage)) {
                return pageLanguage;
            }

            return null;
        }

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

        function hasWidgetContent() {
            const shadowRoot = container.shadowRoot;

            return Boolean(
                container.children.length ||
                container.textContent.trim() ||
                (
                    shadowRoot &&
                    (shadowRoot.children.length || shadowRoot.textContent.trim())
                )
            );
        }

        function markLoaded() {
            stopWatchingWidget();

            shell.dataset.state = "loaded";

            if (status) {
                status.innerHTML = "";
            }
        }

        function stopWatchingWidget() {
            window.clearInterval(renderCheckId);
            renderCheckId = null;

            window.clearTimeout(failureTimeoutId);
            failureTimeoutId = null;

            window.clearInterval(apiCheckId);
            apiCheckId = null;

            if (observer) {
                observer.disconnect();
                observer = null;
            }

            if (shadowObserver) {
                shadowObserver.disconnect();
                shadowObserver = null;
            }
        }

        function markError(keepWatching) {
            window.clearTimeout(failureTimeoutId);
            failureTimeoutId = null;

            if (!keepWatching) {
                stopWatchingWidget();
            }

            if (hasWidgetContent()) {
                markLoaded();
                return;
            }

            scriptLoading = false;
            setStatus(errorText, "error");

            if (keepWatching) {
                watchRenderedWidget();
            }
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
            if (!("MutationObserver" in window) || observer) {
                return;
            }

            observer = new MutationObserver(function () {
                if (hasWidgetContent()) {
                    markLoaded();
                }
            });

            observer.observe(container, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        function observeShadowContent() {
            if (!("MutationObserver" in window) || !container.shadowRoot || shadowObserver) {
                return;
            }

            shadowObserver = new MutationObserver(function () {
                if (hasWidgetContent()) {
                    markLoaded();
                }
            });

            shadowObserver.observe(container.shadowRoot, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        function watchRenderedWidget() {
            observeWidgetContent();

            if (renderCheckId) {
                return;
            }

            renderCheckId = window.setInterval(function () {
                observeShadowContent();

                if (hasWidgetContent()) {
                    markLoaded();
                }
            }, WIDGET_RENDER_CHECK_MS);
        }

        function armFailureTimeout() {
            window.clearTimeout(failureTimeoutId);

            failureTimeoutId = window.setTimeout(function () {
                if (hasWidgetContent()) {
                    markLoaded();
                } else {
                    markError(true);
                }
            }, WIDGET_FAILURE_TIMEOUT_MS);
        }

        function waitForWidgetApi() {
            if (apiCheckId) {
                return;
            }

            watchRenderedWidget();
            armFailureTimeout();

            apiCheckId = window.setInterval(function () {
                if (window.RaceTicketWidget && typeof window.RaceTicketWidget.init === "function") {
                    window.clearInterval(apiCheckId);
                    apiCheckId = null;
                    initializeWidget();
                }
            }, WIDGET_RENDER_CHECK_MS);
        }

        function initializeWidget() {
            if (!window.RaceTicketWidget || typeof window.RaceTicketWidget.init !== "function") {
                waitForWidgetApi();
                return;
            }

            window.clearInterval(apiCheckId);
            apiCheckId = null;

            container.innerHTML = "";
            watchRenderedWidget();
            armFailureTimeout();

            try {
                const widgetConfig = {
                    container: "#raceticket-widget",
                    hostSlug: "under8-gmbh",
                    variant: "3uJXkN0wHwRCElzhjQf8gr5aKRskBsH6"
                };
                const widgetLocale = getWidgetLocale();

                if (widgetLocale) {
                    widgetConfig.locale = widgetLocale;
                }

                window.RaceTicketWidget.init(widgetConfig);
            } catch (error) {
                markError(true);
                return;
            }
        }

        function loadWidget(forceReload) {
            if (scriptLoading) {
                return;
            }

            stopWatchingWidget();

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
            script.onerror = function () {
                markError(false);
            };
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
