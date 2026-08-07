(() => {
  const initSlider = () => {
    const sections = document.querySelectorAll(".brand-list.swiper");

    sections.forEach((el) => {
      if (el.swiper) {
        el.swiper.destroy(true, true);
      }

      const speed1 = Number(el.getAttribute("data-duration")) * 1000;

      new Swiper(el, {
        slidesPerView: 2,
        autoplay: {
          delay: 0,
          disableOnInteraction: false,
        },
        allowTouchMove: false,
        loop: true,
        speed: speed1,
        breakpoints: {
          750: {
            slidesPerView: 3,
          },
          990: {
            slidesPerView: 4,
          },
          1200: {
            slidesPerView: 6,
          },
        },
      });
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    initSlider();

    document.addEventListener("shopify:section:load", function () {
      initSlider();
    });
  });
})();
