document.addEventListener("DOMContentLoaded", function () {
    const openButton = document.querySelector("[data-lightbox-open]");
    const lightbox = document.querySelector("[data-lightbox]");
    const closeButtons = document.querySelectorAll("[data-lightbox-close]");
    const scrollBox = document.querySelector("[data-lightbox-scroll]");
    const image = document.querySelector("[data-lightbox-image]");
    const zoomInButton = document.querySelector("[data-zoom-in]");
    const zoomOutButton = document.querySelector("[data-zoom-out]");
    const zoomResetButton = document.querySelector("[data-zoom-reset]");

    if (!openButton || !lightbox || !scrollBox || !image) {
        return;
    }

    let zoom = 1;
    let baseWidth = 1200;
    let activePointers = new Map();
    let startPinchDistance = 0;
    let startPinchZoom = 1;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let scrollStartLeft = 0;
    let scrollStartTop = 0;

    const minZoom = 1;
    const maxZoom = 4;
    const zoomStep = 0.25;

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getPointerDistance(pointerA, pointerB) {
        const deltaX = pointerA.clientX - pointerB.clientX;
        const deltaY = pointerA.clientY - pointerB.clientY;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    function calculateBaseWidth() {
        const boxWidth = scrollBox.clientWidth;

        if (window.innerWidth <= 480) {
            return Math.max(boxWidth * 2.8, 1050);
        }

        if (window.innerWidth <= 768) {
            return Math.max(boxWidth * 2.1, 1100);
        }

        return Math.max(boxWidth, 1280);
    }

    function applyZoom(nextZoom, centerX, centerY) {
        const oldZoom = zoom;
        const oldWidth = baseWidth * oldZoom;

        zoom = clamp(nextZoom, minZoom, maxZoom);

        const newWidth = baseWidth * zoom;
        const ratio = newWidth / oldWidth;

        if (centerX !== undefined && centerY !== undefined) {
            const boxRect = scrollBox.getBoundingClientRect();
            const offsetX = centerX - boxRect.left;
            const offsetY = centerY - boxRect.top;

            const beforeX = scrollBox.scrollLeft + offsetX;
            const beforeY = scrollBox.scrollTop + offsetY;

            image.style.width = newWidth + "px";

            scrollBox.scrollLeft = beforeX * ratio - offsetX;
            scrollBox.scrollTop = beforeY * ratio - offsetY;
        } else {
            image.style.width = newWidth + "px";
        }

        updateZoomButton();
    }

    function updateZoomButton() {
        if (!zoomResetButton) {
            return;
        }

        zoomResetButton.textContent = Math.round(zoom * 100) + "%";
    }

    function resetZoom() {
        baseWidth = calculateBaseWidth();
        zoom = 1;
        image.style.width = baseWidth + "px";
        scrollBox.scrollLeft = 0;
        scrollBox.scrollTop = 0;
        updateZoomButton();
    }

    function openLightbox() {
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");

        window.setTimeout(function () {
            resetZoom();
        }, 50);
    }

    function closeLightbox() {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("lightbox-open");
        activePointers.clear();
        isDragging = false;
    }

    openButton.addEventListener("click", openLightbox);

    closeButtons.forEach(function (button) {
        button.addEventListener("click", closeLightbox);
    });

    if (zoomInButton) {
        zoomInButton.addEventListener("click", function () {
            const rect = scrollBox.getBoundingClientRect();
            applyZoom(zoom + zoomStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
    }

    if (zoomOutButton) {
        zoomOutButton.addEventListener("click", function () {
            const rect = scrollBox.getBoundingClientRect();
            applyZoom(zoom - zoomStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
    }

    if (zoomResetButton) {
        zoomResetButton.addEventListener("click", resetZoom);
    }

    scrollBox.addEventListener("wheel", function (event) {
        if (!lightbox.classList.contains("is-open")) {
            return;
        }

        event.preventDefault();

        const direction = event.deltaY < 0 ? 1 : -1;
        const nextZoom = zoom + direction * zoomStep;

        applyZoom(nextZoom, event.clientX, event.clientY);
    }, { passive: false });

    scrollBox.addEventListener("pointerdown", function (event) {
        if (!lightbox.classList.contains("is-open")) {
            return;
        }

        activePointers.set(event.pointerId, event);
        scrollBox.setPointerCapture(event.pointerId);

        if (activePointers.size === 1) {
            isDragging = true;
            dragStartX = event.clientX;
            dragStartY = event.clientY;
            scrollStartLeft = scrollBox.scrollLeft;
            scrollStartTop = scrollBox.scrollTop;
        }

        if (activePointers.size === 2) {
            const pointers = Array.from(activePointers.values());
            startPinchDistance = getPointerDistance(pointers[0], pointers[1]);
            startPinchZoom = zoom;
            isDragging = false;
        }
    });

    scrollBox.addEventListener("pointermove", function (event) {
        if (!activePointers.has(event.pointerId)) {
            return;
        }

        activePointers.set(event.pointerId, event);

        if (activePointers.size === 2) {
            event.preventDefault();

            const pointers = Array.from(activePointers.values());
            const currentDistance = getPointerDistance(pointers[0], pointers[1]);

            if (startPinchDistance > 0) {
                const centerX = (pointers[0].clientX + pointers[1].clientX) / 2;
                const centerY = (pointers[0].clientY + pointers[1].clientY) / 2;
                const pinchScale = currentDistance / startPinchDistance;

                applyZoom(startPinchZoom * pinchScale, centerX, centerY);
            }

            return;
        }

        if (activePointers.size === 1 && isDragging) {
            event.preventDefault();

            const deltaX = event.clientX - dragStartX;
            const deltaY = event.clientY - dragStartY;

            scrollBox.scrollLeft = scrollStartLeft - deltaX;
            scrollBox.scrollTop = scrollStartTop - deltaY;
        }
    });

    function stopPointer(event) {
        activePointers.delete(event.pointerId);

        if (activePointers.size < 2) {
            startPinchDistance = 0;
        }

        if (activePointers.size === 0) {
            isDragging = false;
        }
    }

    scrollBox.addEventListener("pointerup", stopPointer);
    scrollBox.addEventListener("pointercancel", stopPointer);
    scrollBox.addEventListener("pointerleave", function (event) {
        if (event.pointerType === "mouse") {
            stopPointer(event);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (!lightbox.classList.contains("is-open")) {
            return;
        }

        if (event.key === "Escape") {
            closeLightbox();
        }

        if (event.key === "+" || event.key === "=") {
            const rect = scrollBox.getBoundingClientRect();
            applyZoom(zoom + zoomStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }

        if (event.key === "-") {
            const rect = scrollBox.getBoundingClientRect();
            applyZoom(zoom - zoomStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }

        if (event.key === "0") {
            resetZoom();
        }
    });

    window.addEventListener("resize", function () {
        if (lightbox.classList.contains("is-open")) {
            resetZoom();
        }
    });
});
