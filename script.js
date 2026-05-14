document.addEventListener("DOMContentLoaded", function () {
    const openButton = document.querySelector("[data-lightbox-open]");
    const lightbox = document.querySelector("[data-lightbox]");
    const closeButtons = document.querySelectorAll("[data-lightbox-close]");

    if (!openButton || !lightbox) {
        return;
    }

    function openLightbox() {
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");
    }

    function closeLightbox() {
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("lightbox-open");
    }

    openButton.addEventListener("click", openLightbox);

    closeButtons.forEach(function (button) {
        button.addEventListener("click", closeLightbox);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
            closeLightbox();
        }
    });
});
