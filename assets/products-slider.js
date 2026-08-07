(function () {
  if (window.__productsSliderModuleLoaded) return;
  window.__productsSliderModuleLoaded = true;

  const ARROW_MIN_WIDTH = 750;
  const RESIZE_DELAY = 200;

  function toBoolean(value) {
    return value === "true";
  }

  function updateNavHorizontalOffset(
    sectionId,
    applyFullWidthLayout,
    containerOuter
  ) {
    const buttonNext = document.querySelector(
      `#${sectionId} .swiper-button-next`
    );
    const buttonPrev = document.querySelector(
      `#${sectionId} .swiper-button-prev`
    );

    if (!buttonNext || !buttonPrev) return;

    if (applyFullWidthLayout) {
      if (window.innerWidth >= 1200) {
        const buttonOffset = +containerOuter - 21;
        buttonNext.style.right = `${buttonOffset}px`;
        buttonPrev.style.left = `${buttonOffset}px`;
      } else {
        buttonNext.style.right = `${containerOuter + 21}px`;
        buttonPrev.style.left = `${containerOuter + 21}px`;
      }
    } else {
      buttonNext.style.right = "";
      buttonPrev.style.left = "";
    }
  }

  function initProductsSlider(slider) {
    const sectionId = slider.dataset.id;
    const swiperEl = slider.querySelector(".products-slider__swiper");

    if (!sectionId || !swiperEl) return;

    if (swiperEl.swiper) {
      swiperEl.swiper.destroy(true, true);
    }

    const isFullWidthLayout = slider.classList.contains(
      "products-slider--full-width"
    );
    const isDesktop = window.innerWidth >= 990;
    const applyFullWidthLayout = isDesktop && isFullWidthLayout;
    const applyContainerLayout = isDesktop && !isFullWidthLayout;
    const perRow = +slider.dataset.perRow;
    const speed = slider.dataset.speed * 1000;
    const delay = slider.dataset.delay * 1000;
    const autoplay = toBoolean(slider.dataset.autoplay);
    const mobileAutoplay = toBoolean(slider.dataset.mobileAutoplay);
    const stopAutoplay = toBoolean(slider.dataset.stopAutoplay);
    const showArrows = toBoolean(slider.dataset.showArrows);
    const mobilePerView = slider.dataset.slidersPerViewMobile;
    const productCount = +(slider.dataset.productCount || 0);
    const productLimit = +(slider.dataset.productLimit || 0);
    const offsetWidth = document.body.offsetWidth;

    let perRowTablet;
    let perRowDesktop;
    let perRowLarge;
    let autoplayParm = {};
    let arrowsParm = {};
    let paginationParm = {};

    if (
      offsetWidth > ARROW_MIN_WIDTH &&
      autoplay &&
      (!productCount || (productCount > perRow && productLimit > perRow))
    ) {
      autoplayParm = {
        autoplay: {
          delay: delay,
          pauseOnMouseEnter: stopAutoplay,
          disableOnInteraction: false,
        },
      };
    } else if (offsetWidth <= ARROW_MIN_WIDTH && mobileAutoplay) {
      autoplayParm = {
        autoplay: {
          delay: delay,
          pauseOnMouseEnter: stopAutoplay,
          disableOnInteraction: false,
        },
      };
    }

    if (showArrows) {
      arrowsParm = {
        navigation: {
          nextEl: `#${sectionId} .swiper-button-next`,
          prevEl: `#${sectionId} .swiper-button-prev`,
        },
      };
    }

    const sectionHeader = document.querySelector(
      `#${sectionId} .popular-product__wrapper`
    );

    if (!sectionHeader) return;

    const containerOuter =
      (document.body.offsetWidth - sectionHeader.offsetWidth) / 2;
    const sliderOffset = applyContainerLayout ? 0 : containerOuter;

    const paginationEl = document.querySelector(
      `#${sectionId} .swiper-pagination`
    );

    if (paginationEl && (!productCount || productCount > 4)) {
      paginationEl.style.padding = `0 ${containerOuter}px 1rem`;
      paginationParm = {
        pagination: {
          el: paginationEl,
          clickable: true,
          type: "bullets",
        },
      };
    }

    updateNavHorizontalOffset(sectionId, applyFullWidthLayout, containerOuter);

    let columnGaps = (perRow - 1) * 16;
    let oneCard = (sectionHeader.offsetWidth - columnGaps) / perRow;
    let perViewRightOffset = +((sliderOffset * 2) / oneCard).toFixed(3);

    perViewRightOffset =
      +((sliderOffset * 2) / oneCard).toFixed(3) -
      +(perViewRightOffset / oneCard) * 16;

    if (!applyContainerLayout) {
      if (perRow == 1) {
        perRowTablet = perRowDesktop = perRowLarge = 1 + perViewRightOffset;
      } else {
        const columnGapsTablet = (2 - 1) * 16;
        const columnGapsDesktop = (3 - 1) * 16;
        const oneCardDesktop =
          (sectionHeader.offsetWidth - columnGapsDesktop) / 3;
        const oneCardTablet =
          (sectionHeader.offsetWidth - columnGapsTablet) / 2;

        const perViewRightOffsetDekstop =
          +((sliderOffset * 2) / oneCardDesktop).toFixed(3) -
          +(perViewRightOffset / oneCardDesktop) * 16;
        const perViewRightOffsetTablet =
          +((sliderOffset * 2) / oneCardTablet).toFixed(3) -
          +(perViewRightOffset / oneCardTablet) * 16;

        perRowTablet = 2 + perViewRightOffsetTablet;
        perRowDesktop = 3 + perViewRightOffsetDekstop;
        perRowLarge = perRow + perViewRightOffset;
      }
      if (perRow == 2) {
        perRowTablet = perRowDesktop = perRowLarge = 2 + perViewRightOffset;
      }
    } else {
      perRowTablet = perRow > 1 ? 2 : 1;
      perRowDesktop = perRow;
      perRowLarge = perRow;
    }

    const swiperParms = {
      speed: speed,
      keyboard: true,
      observer: true,
      observeParents: true,
      slidesPerView: mobilePerView == 1 ? 1.1 : 2.3,
      spaceBetween: 10,
      slidesOffsetBefore: sliderOffset,
      breakpoints: {
        576: {
          slidesPerView: perRowTablet,
        },
        750: {
          spaceBetween: 16,
          slidesPerView: perRowTablet,
        },
        990: {
          spaceBetween: 16,
          slidesPerView: perRowDesktop,
        },
        1200: {
          spaceBetween: 16,
          slidesPerView: perRowLarge,
        },
        1800: {
          spaceBetween: 16,
          slidesPerView: perRowLarge,
        },
        2000: {
          spaceBetween: 16,
          slidesPerView: perRowLarge,
        },
      },
      ...paginationParm,
      ...arrowsParm,
      ...autoplayParm,
    };

    const swiper = new Swiper(swiperEl, swiperParms);

    const refreshNav = () => {
      const isDesktopNow = window.innerWidth >= 990;
      const applyFullWidthNow = isDesktopNow && isFullWidthLayout;
      const containerOuterNow =
        (document.body.offsetWidth - sectionHeader.offsetWidth) / 2;

      updateNavHorizontalOffset(
        sectionId,
        applyFullWidthNow,
        containerOuterNow
      );
    };

    swiper.on("resize", refreshNav);
    swiper.on("breakpoint", refreshNav);

    const syncPagination = (reRender = false) => {
      if (!swiper.pagination) return;

      if (reRender) {
        swiper.pagination.render();
      }
      swiper.pagination.update();
    };

    swiper.on("afterInit", () => syncPagination(true));
    swiper.on("slideChange", () => syncPagination());
    swiper.on("slideChangeTransitionEnd", () => syncPagination());
    swiper.on("breakpoint", () => syncPagination(true));
  }

  function initProductsSliders(root = document) {
    root.querySelectorAll(".products-slider").forEach(initProductsSlider);
  }

  window.initProductsSliders = initProductsSliders;

  let resizeTimer;

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => initProductsSliders(), RESIZE_DELAY);
  }

  const boot = () => initProductsSliders();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  document.addEventListener("shopify:section:load", (event) => {
    initProductsSliders(event.target);
  });

  window.addEventListener("resize", onResize);
})();
