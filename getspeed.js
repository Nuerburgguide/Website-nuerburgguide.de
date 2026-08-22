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
        let container = document.querySelector(WIDGET_CONTAINER_SELECTOR);

        if (!shell || !container) {
            return;
        }

        const vehicleLinks = document.querySelectorAll("[data-raceticket-car-id]");
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
        let requestedCarFilterId = null;
        let initializedCarFilterId = null;
        let widgetInstance = null;
        let initRequestId = 0;
        let initInFlight = false;

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

        function getMotionPreference() {
            return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
        }

        function scrollToBooking() {
            const bookingSection = document.querySelector("#booking");

            if (!bookingSection) {
                return;
            }

            bookingSection.scrollIntoView({
                behavior: getMotionPreference(),
                block: "start"
            });
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

        function resetWidgetContainer() {
            if (widgetInstance && typeof widgetInstance.unmount === "function") {
                try {
                    widgetInstance.unmount();
                } catch (error) {
                    // The RaceTicket widget owns its Shadow DOM; a failed cleanup should not block a fresh init.
                }
            }

            widgetInstance = null;

            if (container.shadowRoot) {
                const replacement = container.cloneNode(false);
                container.replaceWith(replacement);
                container = replacement;
                return;
            }

            container.innerHTML = "";
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

            if (initInFlight) {
                return;
            }

            window.clearInterval(apiCheckId);
            apiCheckId = null;

            stopWatchingWidget();
            resetWidgetContainer();
            watchRenderedWidget();
            armFailureTimeout();

            try {
                const activeInitRequestId = initRequestId + 1;
                const activeCarFilterId = requestedCarFilterId;
                const widgetConfig = {
                    container: "#raceticket-widget",
                    hostSlug: "under8-gmbh",
                    variant: "3uJXkN0wHwRCElzhjQf8gr5aKRskBsH6"
                };
                const widgetLocale = getWidgetLocale();

                if (widgetLocale) {
                    widgetConfig.locale = widgetLocale;
                }

                if (activeCarFilterId) {
                    widgetConfig.filterCarId = activeCarFilterId;
                    widgetConfig.filterCarMode = "preselect";
                    widgetConfig.filterType = "taxi";
                }

                initRequestId = activeInitRequestId;
                initInFlight = true;

                Promise.resolve(window.RaceTicketWidget.init(widgetConfig))
                    .then(function (instance) {
                        if (activeInitRequestId !== initRequestId) {
                            return;
                        }

                        initInFlight = false;
                        widgetInstance = instance || null;
                        initializedCarFilterId = activeCarFilterId;

                        if (requestedCarFilterId !== initializedCarFilterId) {
                            initializeWidget();
                        }
                    })
                    .catch(function () {
                        if (activeInitRequestId === initRequestId) {
                            initInFlight = false;
                            markError(true);
                        }
                    });
            } catch (error) {
                initInFlight = false;
                markError(true);
                return;
            }
        }

        function requestVehicleFilter(carId) {
            requestedCarFilterId = carId;

            if (
                window.RaceTicketWidget &&
                typeof window.RaceTicketWidget.init === "function" &&
                !initInFlight &&
                initializedCarFilterId !== requestedCarFilterId
            ) {
                initializeWidget();
            }
        }

        function initVehicleLinks() {
            vehicleLinks.forEach(function (link) {
                link.addEventListener("click", function (event) {
                    const carId = Number(link.dataset.raceticketCarId);

                    if (carId) {
                        requestVehicleFilter(carId);
                    }

                    event.preventDefault();
                    scrollToBooking();

                    if (history.pushState) {
                        history.pushState(null, "", "#booking");
                    }
                });
            });
        }

        function loadWidget(forceReload) {
            if (scriptLoading) {
                return;
            }

            stopWatchingWidget();

            setStatus(loadingText, "loading");
            ensureWidgetStyles();

            if (forceReload) {
                initRequestId += 1;
                initInFlight = false;
                initializedCarFilterId = null;
                resetWidgetContainer();
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

        initVehicleLinks();
        loadWidget(false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGetSpeedBooking, { once: true });
    } else {
        initGetSpeedBooking();
    }
})();
