(function () {
  const originalSlidesMap = new WeakMap();

  document.querySelectorAll(".card-list-section").forEach((section) => {
    const slides = section.querySelectorAll(".card-list__list > *");
    if (slides.length) originalSlidesMap.set(section, Array.from(slides));
  });

  const buildSwiperParams = ($box, id) => {
    const autoplay = $box.data("autoplay");
    const stopAutoplay = $box.data("stop-autoplay");
    const delay = 4 * 1000;

    let autoplayParm = {};
    if (autoplay) {
      autoplayParm = {
        autoplay: {
          delay: delay,
          pauseOnMouseEnter: stopAutoplay,
          disableOnInteraction: false,
        },
      };
    }

    return {
      slidesPerView: 1,
      loop: false,
      spaceBetween: 16,
      autoHeight: false,
      calculateHeight: false,
      keyboard: true,
      navigation: {
        nextEl: `#${id} .swiper-button-next`,
        prevEl: `#${id} .swiper-button-prev`,
      },
      pagination: {
        el: `#${id} .swiper-pagination`,
        clickable: true,
        type: "bullets",
      },
      ...autoplayParm,
    };
  };

  const ensureSlideStructure = ($section) => {
    const $lists = $section.find(".card-list__list");
    $lists.each(function () {
      const $list = $(this);
      if ($list.parent().hasClass("swiper-wrapper")) return;

      if (!$list.hasClass("swiper-wrapper")) {
      }
    });
  };

  const destroySwiper = ($box, $section) => {
    const swiper = $box.data("swiper-instance");
    if (!swiper) return;

    try {
      swiper.destroy(true, true);
    } catch (e) {}
    $box.removeData("swiper-instance");
    $box.removeData("swiper-initialized");

    $box
      .find(".swiper-wrapper")
      .css({ transform: "", transition: "", height: "" });
    $box.find(".swiper-slide").css({ width: "", height: "" });

    const originalSlides = originalSlidesMap.get($section[0]);
    if (originalSlides && originalSlides.length) {
      originalSlides.forEach((slide) => {
        if (!slide.classList.contains("swiper-slide")) {
          slide.classList.add("swiper-slide");
        }
      });
    }
  };

  const enableMobileSwiper = ($box, $section, id) => {
    const originalSlides = originalSlidesMap.get($section[0]);
    if (originalSlides && originalSlides.length) {
      originalSlides.forEach((slide) => {
        if (!slide.classList.contains("swiper-slide"))
          slide.classList.add("swiper-slide");
      });
    }

    const params = buildSwiperParams($box, id);
    const swiper = new Swiper(`#${id} .swiper`, params);
    $box.data("swiper-instance", swiper);
    $box.data("swiper-initialized", true);
  };

  const initSwipers = () => {
    $(".card-list-section").each(function () {
      const $section = $(this);
      const id = $section.attr("id");
      const $box = $section.find(".card-list");

      const $texts = $section.find(".card-list__text");
      const $images = $section.find(".card-list__item_img_active");
      const $items = $section.find(".card-list__item_active");

      if ($items.length > 0) {
        const textAlwaysVisible = $items.first().data("text-always-visible");
        const isDesktop = window.matchMedia("(min-width: 990px)").matches;

        if (!textAlwaysVisible) {
          $texts.each(function (index) {
            const $text = $(this);
            const $image = $images.eq(index);
            const textHeight = $text.outerHeight();

            const setImageHeight = (fullHeight) => {
              $image.css(
                "height",
                fullHeight ? "100%" : `calc(100% - ${textHeight}px)`
              );
            };

            if (isDesktop) {
              setImageHeight(true);

              $items
                .eq(index)
                .off("mouseenter mouseleave")
                .on("mouseenter", () => {
                  setImageHeight(false);
                })
                .on("mouseleave", () => {
                  setImageHeight(true);
                });
            } else {
              setImageHeight(false);
            }
          });
        }
      }

      if ($box.find(".swiper").length === 0) return;
      if ($box.data("swiper-initialized")) return;

      if (window.innerWidth <= 576) {
        ensureSlideStructure($section);

        const params = buildSwiperParams($box, id);
        const swiperInstance = new Swiper(`#${id} .swiper`, params);
        $box.data("swiper-initialized", true);
        $box.data("swiper-instance", swiperInstance);
      }
    });
  };

  if (window.innerWidth > 576) {
    const slides = document.querySelectorAll(".card-list__list .swiper-slide");
    slides.forEach((slide) => {
      slide.classList.remove("swiper-slide");
    });
  }

  const handleResize = () => {
    $(".card-list-section").each(function () {
      const $section = $(this);
      const $box = $section.find(".card-list");
      const id = $section.attr("id");

      const isMobile = window.innerWidth <= 576;
      const swiperInstance = $box.data("swiper-instance");

      if (!isMobile && swiperInstance) {
        destroySwiper($box, $section);
      }

      if (isMobile && !swiperInstance && $box.find(".swiper").length > 0) {
        enableMobileSwiper($box, $section, id);
      }

      const $texts = $section.find(".card-list__text");
      const $images = $section.find(".card-list__item_img_active");
      const $items = $section.find(".card-list__item_active");

      if ($items.length === 0) return;

      const textAlwaysVisible = $items.first().data("text-always-visible");
      const isDesktop = window.matchMedia("(min-width: 990px)").matches;

      if (!textAlwaysVisible) {
        $texts.each(function (index) {
          const $text = $(this);
          const $image = $images.eq(index);
          const textHeight = $text.outerHeight();

          const setImageHeight = (fullHeight) => {
            $image.css(
              "height",
              fullHeight ? "100%" : `calc(100% - ${textHeight}px)`
            );
          };

          if (isDesktop) {
            setImageHeight(true);

            $items
              .eq(index)
              .off("mouseenter mouseleave")
              .on("mouseenter", () => {
                setImageHeight(false);
              })
              .on("mouseleave", () => {
                setImageHeight(true);
              });
          } else {
            setImageHeight(false);
          }
        });
      }
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    initSwipers();
    window.addEventListener("resize", handleResize, { passive: true });

    document.addEventListener("shopify:section:load", function () {
      initSwipers();
      window.addEventListener("resize", handleResize, { passive: true });
    });
  });
})();
