(function () {
  const initAnnSlider = (section) => {
    if (!section || !section.classList.contains("section-announcement")) return;

    const slider = section.querySelector(".announcement-bar--swiper");

    if (!slider) return;

    if (slider.swiper) {
      slider.swiper.destroy(true, true);
    }

    const slideCount = slider.querySelectorAll(".swiper-slide").length;
    const rowsMobile = Number(slider.dataset.rowsMobile) || 1;
    const rowsDesktop = Number(slider.dataset.rows) || 1;

    const swiperParams = {
      speed: Number(slider.dataset.speed) || 800,
      direction: "vertical",
      spaceBetween: 0,
      slidesPerView: rowsMobile,
      autoHeight: true,
      loop: true,
      autoplay:
        slideCount > rowsMobile
          ? {
              enabled: true,
              delay: Number(slider.dataset.delay) || 2000,
              pauseOnMouseEnter: true,
              disableOnInteraction: false,
            }
          : { enabled: false },
      breakpoints: {
        765: {
          slidesPerView: rowsDesktop,
          autoplay:
            slideCount > rowsDesktop
              ? {
                  enabled: true,
                  delay: Number(slider.dataset.delay) || 2000,
                  pauseOnMouseEnter: true,
                  disableOnInteraction: false,
                }
              : { enabled: false },
        },
      },
    };

    new Swiper(slider, swiperParams);
  };

  initAnnSlider(document.currentScript.parentElement);

  document.addEventListener("shopify:section:load", function (event) {
    initAnnSlider(event.target);
  });
})();
