const getProductMediaSlideKey = (slide) => {
  if (!slide) return null;
  return slide.dataset.mediaId || slide.dataset.mediaModalId || null;
};

const findProductMediaSlideIndex = (swiperContainer, mediaId, sectionId) => {
  if (!swiperContainer?.swiper || !mediaId) return -1;
  const fullKey = sectionId ? `${sectionId}-${mediaId}` : mediaId;
  return swiperContainer.swiper.slides.findIndex((slide) => {
    const slideKey = getProductMediaSlideKey(slide);
    if (slideKey && (slideKey === fullKey || slideKey === mediaId)) {
      return true;
    }
    return slide.querySelector(`[data-media-id="${mediaId}"]`) != null;
  });
};

const syncPopupSliderToMain = () => {
  const mainSlider = document.querySelector(".js-media-list");
  const popupSlider = document.querySelector(".js-popup-slider");
  if (!mainSlider?.swiper || !popupSlider?.swiper) return;

  const mediaKey = getProductMediaSlideKey(
    mainSlider.swiper.slides[mainSlider.swiper.activeIndex]
  );
  if (!mediaKey) return;

  const popupIndex = popupSlider.swiper.slides.findIndex(
    (slide) => getProductMediaSlideKey(slide) === mediaKey
  );
  if (popupIndex >= 0 && popupSlider.swiper.activeIndex !== popupIndex) {
    popupSlider.swiper.slideTo(popupIndex);
  }
};

const syncMainSliderToPopup = () => {
  const mainSlider = document.querySelector(".js-media-list");
  const popupSlider = document.querySelector(".js-popup-slider");
  if (!mainSlider?.swiper || !popupSlider?.swiper) return;

  const mediaKey = getProductMediaSlideKey(
    popupSlider.swiper.slides[popupSlider.swiper.activeIndex]
  );
  if (!mediaKey) return;

  const mainIndex = mainSlider.swiper.slides.findIndex(
    (slide) => getProductMediaSlideKey(slide) === mediaKey
  );
  if (mainIndex >= 0 && mainSlider.swiper.activeIndex !== mainIndex) {
    mainSlider.swiper.slideTo(mainIndex);
  }
};

const syncPopupSliderToOpener = (opener, modalEl) => {
  const popupSlider =
    modalEl?.querySelector(".js-popup-slider") ||
    document.querySelector(".js-popup-slider");
  if (!popupSlider?.swiper || !opener) return;

  const mediaId = opener.getAttribute("data-media-id");
  if (!mediaId) {
    syncPopupSliderToMain();
    return;
  }

  const sectionId =
    modalEl?.id?.replace("ProductModal-", "") ||
    document.querySelector(".js-media-list")?.dataset?.section;

  const popupIndex = findProductMediaSlideIndex(
    popupSlider,
    mediaId,
    sectionId
  );
  if (popupIndex >= 0) {
    popupSlider.swiper.slideTo(popupIndex, 0);
  }
};

window.syncProductMediaPopup = syncPopupSliderToOpener;

const sliderInit = (isUpdate, root) => {
  const scope = root?.querySelectorAll ? root : document;
  if (
    scope.querySelectorAll(".js-media-list") &&
    scope.querySelectorAll(".js-media-list").length > 0
  ) {
    scope.querySelectorAll(".js-media-list").forEach((elem) => {
      if (elem.swiper) {
        elem.swiper.destroy(true, true);
      }

      const mediaListId = elem.dataset?.jsMediaListId;
      const mediaSublist = Array.from(
        scope.querySelectorAll(".js-media-sublist")
      ).find(
        (subElem) =>
          subElem.dataset?.jsMediaListId === mediaListId && subElem.swiper
      );

      const autoplay = elem.dataset.autoplay == "true" ? true : false;
      let autoplaySettings;
      const stopAutoplay = elem.dataset.stopAutoplay == "true" ? true : false;
      const delay = elem.dataset.delay * 1000;
      const speed = elem.dataset.speed * 1000;
      const id = elem.dataset.section;

      if (autoplay) {
        autoplaySettings = {
          autoplay: {
            delay: delay,
            pauseOnMouseEnter: stopAutoplay,
            disableOnInteraction: false,
            waitForTransition: true,
          },
        };
      } else {
        autoplaySettings = {};
      }
      let slider = new Swiper(elem, {
        slidesPerView: 1,
        spaceBetween: 1,
        // Keep height from CSS aspect-ratio boxes; true resizes per slide and can overflow .product__main (thumbs-aside uses height: 100%)
        autoHeight: false,
        speed: speed,
        navigation: {
          nextEl: `#${id}-slider .product__slider-nav .swiper-button-next`,
          prevEl: `#${id}-slider .product__slider-nav .swiper-button-prev`,
        },
        pagination: {
          el: `#${id}-slider .product__pagination`,
          type: "bullets",
          clickable: true,
        },
        thumbs: {
          swiper: mediaListId && mediaSublist ? mediaSublist.swiper : "",
        },
        on: {
          init: function () {
            elem.style.setProperty("--bullet-duration", `${delay}ms`);
            document.body.style.setProperty(
              "--bullet-duration-product-modal",
              `${delay}ms`
            );
            syncPopupSliderToMain();
          },
          slideChangeTransitionStart: function () {
            if (mediaListId && mediaSublist) {
              mediaSublist.swiper.slideTo(this.activeIndex);
            }
          },
          slideChange: function () {
            window.pauseAllMedia();
            this.params.noSwiping = false;
            elem.style.setProperty("--bullet-duration", `${delay + speed}ms`);
            let allBullets = this.el.querySelectorAll(
              ".swiper-pagination-bullet"
            );

            if (allBullets && allBullets.length > 0) {
              allBullets.forEach((item) => {
                item.classList.remove("swiper-pagination-bullet-active");
              });
              allBullets[this.activeIndex].classList.add(
                "swiper-pagination-bullet-active"
              );
            }

            document.body.style.setProperty(
              "--bullet-duration-product-modal",
              `${delay + speed}ms`
            );

            syncPopupSliderToMain();
          },
          slideChangeTransitionEnd: function () {
            if (this.slides[this.activeIndex].querySelector("model-viewer")) {
              this.slides[this.activeIndex]
                .querySelector(".shopify-model-viewer-ui__button--poster")
                .removeAttribute("hidden");
            }
          },
          touchStart: function () {
            if (this.slides[this.activeIndex].querySelector("model-viewer")) {
              if (
                !this.slides[this.activeIndex]
                  .querySelector("model-viewer")
                  .classList.contains("shopify-model-viewer-ui__disabled")
              ) {
                this.params.noSwiping = true;
                this.params.noSwipingClass = "swiper-slide";
              } else {
                this.params.noSwiping = false;
              }
            }
          },
        },
        ...autoplaySettings,
      });

      if (autoplay && stopAutoplay) {
        const sliderWrapper = document.querySelector(".product__main");
        sliderWrapper.addEventListener("mouseenter", () => {
          document
            .querySelector(".product__main .swiper-pagination-bullet-active")
            .classList.remove("animation-start");
          document
            .querySelector(".product__main .swiper-pagination-bullet-active")
            .classList.add("animation-none");
        });
        sliderWrapper.addEventListener("mouseleave", () => {
          document
            .querySelector(".product__main .swiper-pagination-bullet-active")
            .classList.remove("animation-none");
          document
            .querySelector(".product__main .swiper-pagination-bullet-active")
            .classList.add("animation-start");
        });
      }

      if (isUpdate) {
        setTimeout(function () {
          slider.update();
        }, 800);
      }
    });
  }
};

const subSliderInit = (isUpdate, root) => {
  const scope = root?.querySelectorAll ? root : document;
  if (
    scope.querySelectorAll(".js-media-sublist") &&
    scope.querySelectorAll(".js-media-sublist").length > 0
  ) {
    scope.querySelectorAll(".js-media-sublist").forEach((elem) => {
      if (elem.productThumbHeightCleanup) {
        elem.productThumbHeightCleanup();
      }
      if (elem.swiper) {
        elem.swiper.destroy(true, true);
      }

      const box = elem;

      const productRoot = elem.closest(".product");
      if (!productRoot) return;

      const mainImg = productRoot.querySelector(".product__media-list");
      const productInfo = productRoot.querySelector(".product__info-container");
      if (!mainImg) return;

      const mainImgHeight = mainImg.offsetHeight;
      const subitems = productRoot.querySelectorAll(".product__media-subitem");
      if (subitems.length === 0) return;

      const subitemsWidth = subitems[0].offsetWidth;
      const subitemsHeight = subitemsWidth / 0.775 + 16;
      const subitemsCountInView = mainImgHeight / subitemsHeight;

      let perViewDesktopPlus = subitems.length > 6 ? 5.8 : subitems.length;
      let perViewDesktop = subitems.length > 5 ? 5 : subitems.length;
      let perViewTablet = subitems.length > 3 ? 3.9 : subitems.length;
      let perViewLaptop = subitems.length > 4 ? 3.8 : subitems.length;
      let perViewLarge = subitems.length > 8 ? 7.8 : subitems.length;

      const perView =
        box.dataset.sectionLayout == "container" ? perViewTablet : perViewLarge;
      perViewDesktopPlus =
        box.dataset.sectionLayout == "container"
          ? perViewTablet
          : perViewDesktopPlus;

      let subSlider = new Swiper(elem, {
        slidesPerView: 3.5,
        spaceBetween: 8,
        direction: "horizontal",
        freeMode: false,
        watchSlidesProgress: true,
        //autoHeight: true,
        centeredSlides: true,
        centeredSlidesBounds: true,
        slideToClickedSlide: true,
        updateOnWindowResize: true,
        on: {
          touchEnd: function (s, e) {
            let range = 5;
            let diff = (s.touches.diff = s.isHorizontal()
              ? s.touches.currentX - s.touches.startX
              : s.touches.currentY - s.touches.startY);
            if (diff < range || diff > -range) s.allowClick = true;
          },
        },
        breakpoints: {
          990: {
            spaceBetween: 16,
            direction: "vertical",
            slidesPerView: perViewTablet,
            centeredSlides: true,
            centeredSlidesBounds: true,
            slideToClickedSlide: true,
          },
          1200: {
            spaceBetween: 16,
            direction: "vertical",
            slidesPerView: perViewLaptop,
          },
          1400: {
            spaceBetween: 16,
            direction: "vertical",
            slidesPerView: perViewDesktop,
          },
          1600: {
            spaceBetween: 16,
            direction: "vertical",
            slidesPerView:
              box.dataset.sectionLayout == "container"
                ? perViewTablet
                : perViewDesktop,
          },
          1920: {
            spaceBetween: 16,
            direction: "vertical",
            slidesPerView: perViewDesktopPlus,
          },
          2300: {
            spaceBetween: 16,
            direction: "vertical",
            slidesPerView: perView,
          },
        },
      });

      const desktopMediaQuery = window.matchMedia("(min-width: 990px)");
      const getProductInfoContentHeight = () => {
        if (!productInfo) return 0;

        const infoRect = productInfo.getBoundingClientRect();
        const paddingBottom = parseFloat(
          window.getComputedStyle(productInfo).paddingBottom
        ) || 0;
        const contentBottom = Array.from(productInfo.children).reduce(
          (currentBottom, child) => {
            const childRect = child.getBoundingClientRect();
            return childRect.width > 0 && childRect.height > 0
              ? Math.max(currentBottom, childRect.bottom)
              : currentBottom;
          },
          infoRect.top
        );

        return contentBottom - infoRect.top + paddingBottom;
      };
      let resizeFrame;
      const syncSubSliderHeight = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          const matchProductInfoHeight =
            box.dataset.matchProductInfoHeight === "true" &&
            productInfo &&
            desktopMediaQuery.matches;
          const referenceHeight = matchProductInfoHeight
            ? getProductInfoContentHeight()
            : mainImg.getBoundingClientRect().height;
          const nextHeight = `${Math.max(referenceHeight - 1, 0)}px`;
          if (elem.style.height !== nextHeight) {
            elem.style.height = nextHeight;
            subSlider.update();
          }
        });
      };
      const sliderResizeObserve = new ResizeObserver(syncSubSliderHeight);
      sliderResizeObserve.observe(mainImg);
      if (productInfo) {
        sliderResizeObserve.observe(productInfo);
        Array.from(productInfo.children).forEach((child) => {
          sliderResizeObserve.observe(child);
        });
      }
      desktopMediaQuery.addEventListener("change", syncSubSliderHeight);
      elem.productThumbHeightCleanup = () => {
        cancelAnimationFrame(resizeFrame);
        sliderResizeObserve.disconnect();
        desktopMediaQuery.removeEventListener("change", syncSubSliderHeight);
      };
      syncSubSliderHeight();

      if (isUpdate) {
        setTimeout(function () {
          subSlider.update();
        }, 800);
      }
    });
  }
};

const popupSliderInit = (isUpdate) => {
  const popupSliderEl = document.querySelector(".js-popup-slider");
  if (popupSliderEl) {
    if (popupSliderEl.swiper) {
      popupSliderEl.swiper.destroy(true, true);
    }

    let popupSlider = new Swiper(popupSliderEl, {
      slidesPerView: 1,
      navigation: {
        nextEl: ".product-media-modal .product__slider-nav .swiper-button-next",
        prevEl: ".product-media-modal .product__slider-nav .swiper-button-prev",
      },
      pagination: {
        el: ".product-media-modal .product__pagination",
        type: "bullets",
        clickable: true,
      },
      on: {
        afterInit: function () {
          syncPopupSliderToMain();
          if (document.querySelector(".product__outer--slideshow")) {
            const mainSlider = document.querySelector(".js-media-list");
            const sectionId = mainSlider?.dataset?.section;
            document
              .querySelectorAll(".product__media-list .product__media-toggle")
              .forEach((elem) => {
                elem.addEventListener("click", () => {
                  const popupSlider =
                    document.querySelector(".js-popup-slider");
                  const mediaId = elem.getAttribute("data-media-id");
                  if (!popupSlider?.swiper || !mediaId) return;
                  const popupIndex = findProductMediaSlideIndex(
                    popupSlider,
                    mediaId,
                    sectionId
                  );
                  if (popupIndex >= 0) {
                    popupSlider.swiper.slideTo(popupIndex, 0);
                  }
                });
              });
          }
        },
        slideChange: function () {
          window.pauseAllMedia();
          this.params.noSwiping = false;
          document
            .querySelector(".product-media-modal__content")
            .classList.remove("zoom");
          syncMainSliderToPopup();
        },
        touchMove: function () {
          document
            .querySelector(".product-media-modal__content")
            .classList.remove("zoom");
        },
        slideChangeTransitionEnd: function () {
          if (this.slides[this.activeIndex].querySelector("model-viewer")) {
            this.slides[this.activeIndex]
              .querySelector(".shopify-model-viewer-ui__button--poster")
              .removeAttribute("hidden");
          }
        },
      },
    });

    if (isUpdate) {
      setTimeout(function () {
        popupSlider.update();
      }, 800);
    }
  }
};

if (navigator.userAgent.indexOf("iPhone") > -1) {
  document
    .querySelector("[name=viewport]")
    .setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1"
    );
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute("role", "button");
  summary.setAttribute("aria-expanded", "false");

  if (summary.nextElementSibling.getAttribute("id")) {
    summary.setAttribute("aria-controls", summary.nextElementSibling.id);
  }

  summary.addEventListener("click", (event) => {
    event.currentTarget.setAttribute(
      "aria-expanded",
      !event.currentTarget.closest("details").hasAttribute("open")
    );
  });

  if (summary.closest("header-drawer")) return;
  summary.parentElement.addEventListener("keyup", onKeyUpEscape);
});

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== "ESCAPE") return;

  const openDetailsElement = event.target.closest("details[open]");
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector("summary");
  openDetailsElement.removeAttribute("open");
  summaryElement.setAttribute("aria-expanded", false);
  summaryElement.focus();
}

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
      event.target !== container &&
      event.target !== last &&
      event.target !== first
    )
      return;

    document.addEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener("keydown", trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== "TAB") return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
      (event.target === container || event.target === first) &&
      event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener("focusout", trapFocusHandlers.focusout);
  document.addEventListener("focusin", trapFocusHandlers.focusin);

  if (elementToFocus) elementToFocus.focus();
}

function pauseAllMedia() {
  document.querySelectorAll(".product__outer .js-youtube").forEach((video) => {
    video.contentWindow.postMessage(
      '{"event":"command","func":"' + "pauseVideo" + '","args":""}',
      "*"
    );
  });
  document.querySelectorAll(".product__outer .js-vimeo").forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', "*");
  });
  document
    .querySelectorAll(".product__outer video")
    .forEach((video) => video.pause());
  document
    .querySelectorAll(".product__outer product-model")
    .forEach((model) => {
      if (model.modelViewerUI) model.modelViewerUI.pause();
    });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener("focusin", trapFocusHandlers.focusin);
  document.removeEventListener("focusout", trapFocusHandlers.focusout);
  document.removeEventListener("keydown", trapFocusHandlers.keydown);

  if (elementToFocus && !elementToFocus.classList.contains("card-focused"))
    elementToFocus.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector("input");
    this.changeEvent = new Event("change", { bubbles: true });
    this.isCartItem = Boolean(
      this.closest(".cart-item") || this.closest("quick-order-list")
    );

    this.querySelectorAll("button").forEach((button) => {
      this.setMinimumDisable();

      button.addEventListener("click", this.onButtonClick.bind(this));
    });

    var eventList = ["paste", "input"];

    for (const event of eventList) {
      this.input.addEventListener(event, (e) => {
        const value = e.currentTarget.value;
        const numberRegex = this.isCartItem ? /^\d*$/ : /^0*?[1-9]\d*$/;

        if (numberRegex.test(value) || value === "") {
        } else {
          e.currentTarget.value = this.getMinValue();
        }

        this.setMinimumDisable();
      });
    }

    this.input.addEventListener("focusout", (e) => {
      if (e.currentTarget.value === "") {
        e.currentTarget.value = this.getMinValue();
      }
    });
  }

  getMinValue() {
    const min = parseInt(
      this.input.getAttribute("data-min") || this.input.min || "1",
      10
    );
    return Number.isFinite(min) && min >= 0 ? min : 1;
  }

  setMinimumDisable() {
    const minusButton = this.querySelector('button[name="minus"]');
    if (!minusButton) return;
    const min = this.getMinValue();
    if (parseInt(this.input.value, 10) <= min) {
      minusButton.classList.add("disabled");
    } else {
      minusButton.classList.remove("disabled");
    }
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    event.target.name === "plus" ||
    event.target.classList.contains("quantity__button_plus")
      ? this.input.stepUp()
      : this.input.stepDown();
    if (previousValue !== this.input.value)
      this.input.dispatchEvent(this.changeEvent);

    this.setMinimumDisable();
  }
}

customElements.define("quantity-input", QuantityInput);

class PricePerItem extends HTMLElement {
  connectedCallback() {
    this.priceBreaks = [];
    this.parsePriceBreaks();
    this.textEl = this.querySelector(".price-per-item__text") || this;

    this.onQuantityEvent = this.onQuantityEvent.bind(this);
    document.addEventListener("change", this.onQuantityEvent);
    document.addEventListener("input", this.onQuantityEvent);
    this.updatePriceDisplay();
  }

  disconnectedCallback() {
    document.removeEventListener("change", this.onQuantityEvent);
    document.removeEventListener("input", this.onQuantityEvent);
  }

  parsePriceBreaks() {
    this.priceBreaks = [];
    const minQuantity = parseInt(this.dataset.minQuantity || "1", 10) || 1;
    if (this.dataset.variantPrice) {
      this.priceBreaks.push({
        quantity: minQuantity,
        price: this.dataset.variantPrice,
      });
    }
    if (this.dataset.priceBreaks) {
      try {
        const breaks = JSON.parse(this.dataset.priceBreaks);
        for (const item of breaks) {
          if (item?.quantity && item?.price) {
            this.priceBreaks.push({
              quantity: parseInt(item.quantity, 10),
              price: item.price,
            });
          }
        }
      } catch (e) {
        // ignore invalid JSON
      }
    }
    this.priceBreaks.sort((a, b) => b.quantity - a.quantity);
  }

  getQuantityInput() {
    const scope =
      this.closest(".product-form__buttons") ||
      this.closest("product-form") ||
      this.closest("form");
    return scope?.querySelector('input[name="quantity"]');
  }

  getCurrentQuantity() {
    const quantityInput = this.getQuantityInput();
    if (!quantityInput) return 1;
    const cartQty =
      parseInt(quantityInput.getAttribute("data-cart-quantity") || "0", 10) ||
      0;
    const inputQty = parseInt(quantityInput.value, 10) || 1;
    return cartQty + inputQty;
  }

  onQuantityEvent(event) {
    const quantityInput = this.getQuantityInput();
    if (!quantityInput || event.target !== quantityInput) return;
    this.updatePriceDisplay();
  }

  updatePriceDisplay() {
    if (!this.priceBreaks.length || !this.textEl) return;
    const quantity = this.getCurrentQuantity();
    const priceBreak =
      this.priceBreaks.find((pb) => quantity >= pb.quantity) ||
      this.priceBreaks[this.priceBreaks.length - 1];
    if (!priceBreak) return;
    const atText = this.dataset.atText || "at";
    const eachText = this.dataset.eachText || "each";
    this.textEl.textContent = `${atText} ${priceBreak.price}/${eachText}`;
  }
}

customElements.define("price-per-item", PricePerItem);

function syncStickyAddBarQuantity(sourceInput) {
  if (!(sourceInput instanceof HTMLInputElement)) return;
  if (sourceInput.name !== "quantity") return;
  if (sourceInput.closest(".product-form--floating")) return;
  if (sourceInput.hasAttribute("data-sticky-quantity")) return;
  if (sourceInput.closest(".cart-item")) return;

  const sectionRoot =
    sourceInput.closest(".product") ||
    sourceInput.closest(".shopify-section") ||
    document;
  const stickyQtyInputs = sectionRoot.querySelectorAll(
    ".product-form--floating input[name='quantity'], [data-sticky-quantity]"
  );
  stickyQtyInputs.forEach((input) => {
    input.value = sourceInput.value || "1";
  });
}

document.addEventListener("change", (event) => {
  syncStickyAddBarQuantity(event.target);
});
document.addEventListener("input", (event) => {
  syncStickyAddBarQuantity(event.target);
});

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll(
      ".product-form__quantity input[name='quantity'], product-form:not(.product-form--floating) input[name='quantity']"
    )
    .forEach((input) => {
      syncStickyAddBarQuantity(input);
    });
});

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

const serializeForm = (form) => {
  const obj = {};
  const formData = new FormData(form);
  for (const key of formData.keys()) {
    obj[key] = formData.get(key);
  }
  return JSON.stringify(obj);
};

function fetchConfig(type = "json") {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: `application/${type}`,
    },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == "undefined") {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent("on" + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options["method"] || "post";
  var params = options["parameters"] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for (var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (
  country_domid,
  province_domid,
  options
) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(
    options["hideElement"] || province_domid
  );

  Shopify.addListener(
    this.countryEl,
    "change",
    Shopify.bind(this.countryHandler, this)
  );

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute("data-default");
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute("data-default");
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute("data-provinces");
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = "none";
    } else {
      for (let i = 0; i < provinces.length; i++) {
        var opt = document.createElement("option");
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement("option");
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

const body = document.body;
let bodyScrollTop = null;
let locked = false;

function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth;
}

function preventScroll(e) {
  e.preventDefault();
}

function lockScroll() {
  bodyScrollTop =
    typeof window.pageYOffset !== "undefined"
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body)
          .scrollTop;

  var scrollBarWidth = getScrollbarWidth();
  body.style.paddingRight = scrollBarWidth + "px";

  body.classList.add("scroll-locked");
  body.style.setProperty("--scroll", `${-bodyScrollTop + "px"}`);
  //body.style.top = -bodyScrollTop + 'px';
  locked = true;

  document.addEventListener("scroll", preventScroll, { passive: false });
}

function unlockScroll() {
  body.classList.remove("scroll-locked");
  //body.style.top = '';
  body.style.setProperty("--scroll", `${-bodyScrollTop + "px"}`);
  body.style.paddingRight = "";
  window.scrollTo(0, bodyScrollTop);

  document.removeEventListener("scroll", preventScroll);
}

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector("details");
    const summaryElements = this.querySelectorAll("summary");
    this.addAccessibilityAttributes(summaryElements);

    this.headerWrapper = document.querySelector(".header-wrapper");
    if (this.headerWrapper) this.headerWrapper.preventHide = false;

    if (navigator.platform === "iPhone")
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${window.innerHeight}px`
      );

    this.addEventListener("keyup", this.onKeyUp.bind(this));
    this.addEventListener("focusout", this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll("summary").forEach((summary) =>
      summary.addEventListener("click", this.onSummaryClick.bind(this))
    );
    this.querySelectorAll("button").forEach((button) => {
      if (this.querySelector(".toggle-scheme-button") === button) return;
      if (this.querySelector(".header__localization-button") === button) return;
      if (this.querySelector(".header__localization-lang-button") === button)
        return;
      button.addEventListener("click", this.onCloseButtonClick.bind(this));
    });
  }

  addAccessibilityAttributes(summaryElements) {
    summaryElements.forEach((element) => {
      element.setAttribute("role", "button");
      element.setAttribute("aria-expanded", false);
      element.setAttribute("aria-controls", element.nextElementSibling.id);
    });
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== "ESCAPE") return;

    const openDetailsElement = event.target.closest("details[open]");
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(this.mainDetailsToggle.querySelector("summary"))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const isOpen = detailsElement.hasAttribute("open");

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen
        ? this.closeMenuDrawer(summaryElement)
        : this.openMenuDrawer(summaryElement);
    } else {
      trapFocus(
        summaryElement.nextElementSibling,
        detailsElement.querySelector("button")
      );

      setTimeout(() => {
        detailsElement.classList.add("menu-opening");
      });
    }
  }

  openMenuDrawer(summaryElement) {
    if (this.headerWrapper) this.headerWrapper.preventHide = true;
    setTimeout(() => {
      this.mainDetailsToggle.classList.add("menu-opening");
    });
    summaryElement.setAttribute("aria-expanded", true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event !== undefined) {
      this.mainDetailsToggle.classList.remove("menu-opening");
      this.mainDetailsToggle.querySelectorAll("details").forEach((details) => {
        details.removeAttribute("open");
        details.classList.remove("menu-opening");
      });
      this.mainDetailsToggle
        .querySelector("summary")
        .setAttribute("aria-expanded", false);
      document.body.classList.remove(
        `overflow-hidden-${this.dataset.breakpoint}`
      );
      removeTrapFocus(elementToFocus);
      this.closeAnimation(this.mainDetailsToggle);
      this.header =
        this.header || document.querySelector(".shopify-section-header");
      const main = document.querySelector("main");
      if (
        main
          ?.querySelectorAll(".shopify-section")[0]
          ?.classList.contains("section--has-overlay") &&
        !this.header.classList.contains("animate")
      ) {
        this.header.classList.remove("color-background-overlay-hidden");
        const colorScheme =
          main
            .querySelectorAll(".shopify-section")[0]
            ?.querySelector("[data-header-transparent]")
            ?.getAttribute("data-header-transparent-color-scheme") || "";
        if (
          main
            .querySelectorAll(".shopify-section")[0]
            ?.querySelector("[data-header-transparent]") &&
          this.header
            .querySelector(".header-wrapper")
            .classList.contains("header-wrapper--full-width")
        ) {
          this.header.classList.add("color-background-overlay");
          this.header.classList.add(colorScheme);
        }
      }

      if (this.headerWrapper) this.headerWrapper.preventHide = false;
    }
  }

  onFocusOut(event) {
    setTimeout(() => {
      if (
        this.mainDetailsToggle.hasAttribute("open") &&
        !this.mainDetailsToggle.contains(document.activeElement)
      )
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest("details");
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    detailsElement.classList.remove("menu-opening");
    removeTrapFocus();
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute("open");
        if (detailsElement.closest("details[open]")) {
          trapFocus(
            detailsElement.closest("details[open]"),
            detailsElement.querySelector("summary")
          );
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define("menu-drawer", MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
    this.headerWrapper = document.querySelector(".header-wrapper");
    if (this.headerWrapper) this.headerWrapper.preventHide = false;

    const overlay = document.querySelector(".header-drawer-overlay");
    if (overlay) {
      overlay.addEventListener("click", (event) => {
        this.closeMenuDrawer(event);
      });
    }
  }

  openMenuDrawer(summaryElement) {
    if (this.headerWrapper) this.headerWrapper.preventHide = true;
    this.header =
      this.header || document.querySelector(".shopify-section-header");
    this.borderOffset =
      this.borderOffset ||
      this.closest(".header-wrapper").classList.contains(
        "header-wrapper--border-bottom"
      )
        ? 1
        : 0;

    const main = document.querySelector("main");
    if (
      main
        ?.querySelectorAll(".shopify-section")[0]
        ?.classList.contains("section--has-overlay")
    ) {
      const colorScheme =
        main
          .querySelectorAll(".shopify-section")[0]
          ?.querySelector("[data-header-transparent]")
          ?.getAttribute("data-header-transparent-color-scheme") || "";
      this.header.classList.remove("color-background-overlay");
      if (colorScheme) this.header.classList.remove(colorScheme);
      const header = document.querySelector(".shopify-section-header");
      const headerTransparent = header
        .querySelector(".header-wrapper")
        .classList.contains("header-wrapper--full-width");
      const sections = main.querySelectorAll(".shopify-section");
      const sectionFirstChildTransparent = sections[0].querySelector(
        "[data-header-transparent]"
      );
      if (sectionFirstChildTransparent && headerTransparent) {
        this.header.classList.add("color-background-overlay-hidden");
      }
    }

    setTimeout(() => {
      this.mainDetailsToggle.classList.add("menu-opening");
      document.querySelector(".header-drawer-overlay").classList.add("active");
    });

    summaryElement.setAttribute("aria-expanded", true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    //document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`)
    this.closest("sticky-header").disableScroll();
    lockScroll();
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event !== undefined) {
      this.mainDetailsToggle.classList.remove("menu-opening");
      document
        .querySelector(".header-drawer-overlay")
        .classList.remove("active");
      this.mainDetailsToggle.querySelectorAll("details").forEach((details) => {
        details.removeAttribute("open");
        details.classList.remove("menu-opening");
        document
          .querySelector(".header-drawer-overlay")
          .classList.remove("active");
      });
      this.mainDetailsToggle
        .querySelector("summary")
        .setAttribute("aria-expanded", false);
      /*document.body.classList.remove(
				`overflow-hidden-${this.dataset.breakpoint}`
			)*/
      unlockScroll();
      this.closest("sticky-header").enableScroll();
      removeTrapFocus(elementToFocus);
      this.closeAnimation(this.mainDetailsToggle);
      this.header =
        this.header || document.querySelector(".shopify-section-header");
      const main = document.querySelector("main");
      if (
        main
          ?.querySelectorAll(".shopify-section")[0]
          ?.classList.contains("section--has-overlay") &&
        !this.header.classList.contains("animate")
      ) {
        this.header.classList.remove("color-background-overlay-hidden");
        const colorScheme =
          main
            .querySelectorAll(".shopify-section")[0]
            ?.querySelector("[data-header-transparent]")
            ?.getAttribute("data-header-transparent-color-scheme") || "";
        if (
          main
            .querySelectorAll(".shopify-section")[0]
            ?.querySelector("[data-header-transparent]") &&
          this.header
            .querySelector(".header-wrapper")
            .classList.contains("header-wrapper--full-width")
        ) {
          this.header.classList.add("color-background-overlay");
          this.header.classList.add(colorScheme);
        }
      }

      if (this.headerWrapper) this.headerWrapper.preventHide = false;
    }
  }
}

customElements.define("header-drawer", HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
      "click",
      this.hide.bind(this, false)
    );
    this.addEventListener("keyup", (event) => {
      if (event.code.toUpperCase() === "ESCAPE") this.hide();
    });
    if (this.classList.contains("media-modal")) {
      this.addEventListener("pointerup", (event) => {
        if (
          event.pointerType === "mouse" &&
          !event.target.closest("deferred-media, product-model")
        )
          this.hide();
      });
    } else {
      this.addEventListener("click", (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector(".template-popup");
    document.body.classList.add("overflow-hidden-modal");
    this.setAttribute("open", "");
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    let isOpen = false;

    this.removeAttribute("open");
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();

    document.querySelectorAll("body > quick-add-modal").forEach((el) => {
      if (el.hasAttribute("open")) {
        isOpen = true;
      }
    });

    if (!isOpen) {
      document.body.classList.remove("overflow-hidden-modal");
      document.body.dispatchEvent(new CustomEvent("modalClosed"));
    }

    const images = document.querySelector(".product-media-modal__content");

    if (images) {
      images.classList.remove("zoom");
    }
  }
}

customElements.define("modal-dialog", ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector("button");

    if (!button) return;
    button.addEventListener("click", () => {
      const modal = document.querySelector(this.getAttribute("data-modal"));
      if (modal) modal.show(button);
    });
  }
}

customElements.define("modal-opener", ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="Deferred-Poster-"]')?.addEventListener(
      "click",
      this.loadContent.bind(this)
    );
    if (this.getAttribute("data-autoplay")) {
      this.loadContent();
    }
  }

  loadContent() {
    if (this.getAttribute("loaded")) return;

    const template = this.querySelector("template");
    if (!template) return;

    const content = document.createElement("div");
    content.appendChild(template.content.firstElementChild.cloneNode(true));

    const deferredElement = content.querySelector(
      "video, model-viewer, iframe"
    );

    if (!deferredElement) return;

    this.setAttribute("loaded", true);
    window.pauseAllMedia();

    this.appendChild(deferredElement);

    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (this.getAttribute("data-autoplay") && entry.target.play) {
            const playPromise = entry.target.play();
            playPromise?.catch(() => {});
          }
        } else {
          entry.target.pause?.();
        }
      });
    });

    if (
      deferredElement.nodeName === "VIDEO" ||
      deferredElement.nodeName === "IFRAME"
    ) {
      if (this.classList.contains("video-section__media")) {
        const playPromise = deferredElement.play?.();
        playPromise?.catch(() => {});

        videoObserver.observe(deferredElement);
      } else {
        deferredElement.play?.();
      }
    }

    const swiper = this.closest(".swiper")?.swiper;
    if (swiper) {
      const activeSlide =
        swiper.slides[swiper.activeIndex]?.querySelector("model-viewer");

      if (
        activeSlide &&
        !activeSlide.classList.contains("shopify-model-viewer-ui__disabled")
      ) {
        swiper.params.noSwiping = true;
        swiper.params.noSwipingClass = "swiper-slide";
      }
    }
  }
}

customElements.define("deferred-media", DeferredMedia);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("change", this.onVariantChange);

    this.isHighVariantNeedUpdate = false;
    this.isCombinedListingsNeedUpdate = false;
    this.needsProductMediaRefresh = false;
    this.pendingCombinedProductURL = "";
    this.productInfoRequestId = 0;
    this.productInfoLoading = false;
    this.pickerUpdateMode = "none";
    this.productInfoPriceUpdated = false;
    this.variantUserInteracted = false;
  }

  connectedCallback() {
    if (this.querySelector("[data-all-variants-no-high]")) {
      this.getVariantData();
      this.updateOptions();
      if (!this.isHighVariantProduct()) {
        this.updateVariantStatuses();
      }
    }

    this.syncAddToCartState();

    if (this.hasCombinedListingOptions()) {
      this.restoreProductInfoVisibility();
    }
  }

  hasCombinedListingOptions() {
    const currentProductUrl = this.normalizeProductUrl(this.dataset.url);
    if (!currentProductUrl) return false;

    return [
      ...this.querySelectorAll(".product-form__controls [data-product-url]"),
    ].some((input) => {
      const productUrl = this.normalizeProductUrl(input.dataset.productUrl);
      return !!productUrl && productUrl !== currentProductUrl;
    });
  }

  normalizeProductUrl(url) {
    if (!url) return "";

    try {
      const pathname = new URL(url, window.location.origin).pathname;
      const productMatch = pathname.match(/\/products\/([^/?#]+)/);
      if (productMatch?.[1]) {
        return `/products/${productMatch[1]}`;
      }
      return pathname;
    } catch {
      return "";
    }
  }

  shouldTrustSelectedVariantFromScript() {
    return (
      !this.variantUserInteracted &&
      (this.isHighVariantProduct() || this.hasCombinedListingOptions())
    );
  }

  isHighVariantProduct() {
    return this.dataset.isHighVariantProduct === "true";
  }

  isQuickAddModalContext() {
    return !!this.closest("quick-add-modal");
  }

  needsSectionIdRewrite() {
    return (
      !!this.dataset.originalSection &&
      this.dataset.section !== this.dataset.originalSection
    );
  }

  rewriteFetchedMarkupForSection(markup, sourceSectionId, currentSectionId) {
    if (!markup || sourceSectionId === currentSectionId) return markup;
    return markup.replaceAll(sourceSectionId, currentSectionId);
  }

  syncPickerDatasetFromHtml(html) {
    const sourceSectionId =
      this.dataset.originalSection || this.dataset.section;
    const sourcePicker = html.getElementById(
      `variant-picker-${sourceSectionId}`
    );
    if (!sourcePicker) return;

    if (sourcePicker.dataset.url) {
      this.dataset.url = sourcePicker.dataset.url;
    }
    if (sourcePicker.dataset.isHighVariantProduct !== undefined) {
      this.dataset.isHighVariantProduct =
        sourcePicker.dataset.isHighVariantProduct;
    }
    if (sourcePicker.dataset.variantMediaDisplay) {
      this.dataset.variantMediaDisplay =
        sourcePicker.dataset.variantMediaDisplay;
    }
  }

  getSelectedOptionValueId(control) {
    const selectedInput = this.getSelectedOptionInput(control);
    if (selectedInput?.dataset?.optionValueId) {
      return selectedInput.dataset.optionValueId;
    }

    const hidden = control.querySelector(
      "variant-dropdown-select input[type='hidden']"
    );
    return hidden?.dataset?.optionValueId || null;
  }

  buildServerVariantRequestUrl(
    combinedProductURL = "",
    { preferOptionValues = false } = {}
  ) {
    const productURL =
      combinedProductURL || this.pendingCombinedProductURL || this.dataset.url;
    const selectedValuesIds = this.getSelectedValuesIds();

    if (preferOptionValues && selectedValuesIds.length) {
      return this.createRequestUrl({
        selectedValuesIds,
        combinedProductURL: productURL,
        preferOptionValues: true,
      });
    }

    if (this.currentVariant?.id) {
      return this.createRequestUrl({
        currentVariantId: this.currentVariant.id,
        combinedProductURL: productURL,
      });
    }

    if (selectedValuesIds.length) {
      return this.createRequestUrl({
        selectedValuesIds,
        combinedProductURL: productURL,
        preferOptionValues: true,
      });
    }

    return this.createRequestUrl({ combinedProductURL: productURL });
  }

  getChangedOptionIndex(event) {
    const controls = [...this.querySelectorAll(".product-form__controls")];
    const changedControl = event.target.closest(".product-form__controls");
    if (!changedControl) return -1;
    return controls.indexOf(changedControl);
  }

  getMediaHtmlRoot(html, sourceSectionId) {
    return (
      html.getElementById?.(`shopify-section-${sourceSectionId}`) ||
      html.getElementById?.(`MainProduct-${sourceSectionId}`) ||
      html
    );
  }

  hasRealProductGalleryInHtml(html, sourceSectionId) {
    const mediaHtmlRoot = this.getMediaHtmlRoot(html, sourceSectionId);
    const mediaSource = mediaHtmlRoot.querySelector(
      `[data-section="product-media-${sourceSectionId}"]`
    );
    return Boolean(mediaSource?.querySelector(".js-media-list"));
  }

  countMediaSlidesInHtml(html, sourceSectionId) {
    const mediaHtmlRoot = this.getMediaHtmlRoot(html, sourceSectionId);
    const mediaSource = mediaHtmlRoot.querySelector(
      `[data-section="product-media-${sourceSectionId}"]`
    );
    if (!mediaSource) return 0;
    if (mediaSource.querySelector(".js-media-list")) {
      return mediaSource.querySelectorAll(
        ".js-media-list .swiper-slide, .product__media-list-inner .product__media-item, .product__media-sublist .swiper-slide"
      ).length;
    }
    return 0;
  }

  getSelectedOptionInput(control) {
    const selectedValue = this.getSelectedOptionValue(control);
    if (!selectedValue) return null;

    const radios = control.querySelectorAll('input[type="radio"]');
    for (const radio of radios) {
      if (radio.value === selectedValue) return radio;
    }

    return control.querySelector('input[type="radio"]:checked');
  }

  getCombinedProductURL(event) {
    if (event?.productUrl) {
      return event.productUrl;
    }

    if (event.target?.type === "hidden" && event.target?.dataset?.productUrl) {
      return event.target.dataset.productUrl;
    }

    if (event.target?.dataset?.productUrl) {
      return event.target.dataset.productUrl;
    }

    const control = event.target.closest(".product-form__controls");
    if (control) {
      const selectedInput = this.getSelectedOptionInput(control);
      if (selectedInput?.dataset?.productUrl) {
        return selectedInput.dataset.productUrl;
      }
    }

    for (const wrapper of this.querySelectorAll(".product-form__controls")) {
      const selectedInput = this.getSelectedOptionInput(wrapper);
      if (selectedInput?.dataset?.productUrl) {
        return selectedInput.dataset.productUrl;
      }
    }

    return "";
  }

  onVariantChange(event) {
    if (!this.contains(event.target)) return;

    this.variantUserInteracted = true;
    this.updateOptions();

    const combinedProductURL = this.getCombinedProductURL(event);
    const normalizedCombinedProductURL =
      this.normalizeProductUrl(combinedProductURL);
    const normalizedCurrentProductURL = this.normalizeProductUrl(
      this.dataset.url
    );
    const isCombinedProductSwitch =
      !!normalizedCombinedProductURL &&
      normalizedCombinedProductURL !== normalizedCurrentProductURL;
    const controls = [...this.querySelectorAll(".product-form__controls")];
    const changedOptionIndex = this.getChangedOptionIndex(event);
    const isLastOptionChange =
      controls.length <= 1 ||
      changedOptionIndex === -1 ||
      changedOptionIndex === controls.length - 1;

    if (isCombinedProductSwitch) {
      this.currentVariant = null;
      this.pendingCombinedProductURL = combinedProductURL;
      this.dataset.url = combinedProductURL;
      this.variantData = null;
      this.needsProductMediaRefresh = true;
      this.updateURL(combinedProductURL);
    } else {
      this.updateMasterId();
      if (!combinedProductURL) {
        this.pendingCombinedProductURL = "";
      }
    }

    this.isHighVariantNeedUpdate = false;
    this.isCombinedListingsNeedUpdate = false;
    this.pickerUpdateMode = "none";

    const hasStaleVariantSelection = this.hasStaleVariantSelection();

    const needsVariantResolve =
      (isCombinedProductSwitch || this.isHighVariantProduct()) &&
      (!this.currentVariant || hasStaleVariantSelection);
    const needsPickerAvailabilityUpdate =
      this.isHighVariantProduct() &&
      !isCombinedProductSwitch &&
      !isLastOptionChange &&
      changedOptionIndex >= 0;
    const needsPickerFullUpdate =
      isCombinedProductSwitch || needsVariantResolve;

    const canUseFastVariantUpdate =
      !isCombinedProductSwitch &&
      !!this.currentVariant &&
      (!this.isHighVariantProduct() ||
        (isLastOptionChange &&
          this.variantMatchesSelectedOptions(this.currentVariant)));

    if (needsPickerFullUpdate || needsPickerAvailabilityUpdate) {
      if (isCombinedProductSwitch || hasStaleVariantSelection) {
        this.currentVariant = null;
      }

      this.pickerUpdateMode = needsPickerFullUpdate ? "full" : "availability";
      this.highVariantRequestUrl = this.buildServerVariantRequestUrl(
        combinedProductURL,
        {
          preferOptionValues:
            needsPickerAvailabilityUpdate && !isCombinedProductSwitch,
        }
      );

      if (needsPickerFullUpdate || needsPickerAvailabilityUpdate) {
        this.isHighVariantNeedUpdate = true;
        if (combinedProductURL || isCombinedProductSwitch) {
          this.isCombinedListingsNeedUpdate = true;
        }
      }
    }

    if (!this.isHighVariantNeedUpdate) {
      this.updatePickupAvailability();
      this.updateVariantStatuses();
      this.syncAddToCartState();
    }
    this.resetErrorMessage();

    if (this.isHighVariantNeedUpdate) {
      this.classList.add("high-variant-loading");
      if (
        this.currentVariant &&
        canUseFastVariantUpdate &&
        !needsPickerAvailabilityUpdate
      ) {
        this.syncAddToCartState();
      } else {
        this.setAddToCartPending(true);
      }
      this.renderProductInfo(this.highVariantRequestUrl, {
        expectedProductUrl:
          this.pendingCombinedProductURL ||
          combinedProductURL ||
          this.dataset.url,
        forceMediaUpdate: this.needsProductMediaRefresh,
        updateBuyButtons:
          this.pickerUpdateMode === "full" || this.isCombinedListingsNeedUpdate,
        isHighVariantFetch: true,
        pickerUpdateMode: this.pickerUpdateMode,
        isCombinedFetch: this.isCombinedListingsNeedUpdate,
      });
      return;
    }

    if (!this.currentVariant) {
      this.syncAddToCartState();
      return;
    }

    if (canUseFastVariantUpdate) {
      this.updateMediaForCurrentVariant();
      this.updateURL();
      this.syncAddToCartState();
      this.updatePickupAvailability();
      this.renderProductInfo(
        this.createRequestUrl({
          currentVariantId: this.currentVariant.id,
        }),
        {
          pickerUpdateMode: "none",
          forceMediaUpdate: this.dataset?.variantMediaDisplay !== "show_all",
          updateBuyButtons: false,
          isHighVariantFetch: false,
          isCombinedFetch: false,
        }
      );
      return;
    }

    this.updateMediaForCurrentVariant();
    this.updateURL();
    this.syncAddToCartState();
    this.renderProductInfo(
      this.createRequestUrl({
        currentVariantId: this.currentVariant.id,
      }),
      {
        forceMediaUpdate: this.dataset?.variantMediaDisplay !== "show_all",
        updateBuyButtons: false,
        isHighVariantFetch: false,
        isCombinedFetch: false,
      }
    );
  }

  shouldForceMediaUpdateFromFetch(options = {}) {
    if (options.forceMediaUpdate === true || this.needsProductMediaRefresh) {
      return true;
    }

    return this.dataset?.variantMediaDisplay !== "show_all";
  }

  getSelectedOptionValue(control) {
    const dropdown = control.querySelector("variant-dropdown-select");
    if (dropdown) {
      const hidden = dropdown.querySelector("input[type='hidden']");
      if (hidden?.value) return hidden.value;
    }

    const checked = control.querySelector('input[type="radio"]:checked');
    if (checked) return checked.value;

    const select = control.querySelector("select");
    if (select) return select.value;

    return null;
  }

  getSortedOptionControls() {
    return [...this.querySelectorAll(".product-form__controls")].sort(
      (a, b) =>
        Number(a.dataset.optionPosition) - Number(b.dataset.optionPosition)
    );
  }

  updateOptions() {
    this.options = this.getSortedOptionControls().map((control) =>
      this.getSelectedOptionValue(control)
    );
  }

  getSelectedVariantFromScript() {
    const el = this.querySelector("[data-selected-variant]");
    if (!el?.textContent?.trim()) return null;

    try {
      const variant = JSON.parse(el.textContent);
      return variant?.id ? variant : null;
    } catch {
      return null;
    }
  }

  variantMatchesSelectedOptions(variant) {
    if (!variant?.options?.length || !this.options?.length) return false;

    return variant.options.every(
      (option, index) => this.options[index] === option
    );
  }

  hasResolvedVariantForSelectedOptions(variant = this.currentVariant) {
    if (!variant?.id) return false;
    if (this.variantMatchesSelectedOptions(variant)) return true;

    const fromScript = this.getSelectedVariantFromScript();
    return !!fromScript?.id && String(fromScript.id) === String(variant.id);
  }

  hasStaleVariantSelection() {
    if (this.hasCombinedListingOptions()) return false;
    if (!this.variantUserInteracted || !this.isHighVariantProduct())
      return false;

    this.updateOptions();
    const variant = this.currentVariant || this.getSelectedVariantFromScript();
    return !!variant?.id && !this.variantMatchesSelectedOptions(variant);
  }

  findVariantBySelectedOptions() {
    if (!this.querySelector("[data-all-variants-no-high]")) return null;
    // High-variant and combined listings must resolve from server/script, not the
    // embedded (possibly stale or truncated) variant list in Liquid.
    if (this.isHighVariantProduct() || this.hasCombinedListingOptions()) {
      return null;
    }

    const variantData = this.getVariantData();
    if (!variantData?.length) return null;

    return (
      variantData.find((variant) =>
        variant.options?.every(
          (option, index) => this.options[index] === option
        )
      ) || null
    );
  }

  updateMasterId() {
    const matched = this.findVariantBySelectedOptions();
    if (matched) {
      this.currentVariant = matched;
      return;
    }

    const fromScript = this.getSelectedVariantFromScript();
    if (fromScript?.id) {
      if (
        this.variantMatchesSelectedOptions(fromScript) ||
        this.shouldTrustSelectedVariantFromScript()
      ) {
        this.currentVariant = fromScript;
        return;
      }
    }

    if (!this.isHighVariantProduct()) {
      this.currentVariant = undefined;
      return;
    }

    if (
      this.currentVariant?.id &&
      !this.variantMatchesSelectedOptions(this.currentVariant)
    ) {
      this.currentVariant = undefined;
    }
  }

  getVariantFeaturedMediaId(variant = this.currentVariant) {
    if (!variant?.featured_media?.id) return null;
    return String(variant.featured_media.id);
  }

  findSlideIndexByVariantFeaturedImage(sliderEl, variant, sectionId) {
    if (!sliderEl?.swiper || !variant) return -1;

    const mediaId = this.getVariantFeaturedMediaId(variant);
    if (mediaId) {
      const byMediaId = findProductMediaSlideIndex(
        sliderEl,
        mediaId,
        sectionId
      );
      if (byMediaId >= 0) return byMediaId;
    }

    const imageSrc =
      variant.featured_image?.src ||
      variant.featured_media?.preview_image?.src ||
      variant.featured_media?.preview?.src;
    if (!imageSrc) return -1;

    const normalizedSrc = imageSrc.split("?")[0];
    const fileName = normalizedSrc.split("/").pop();

    return sliderEl.swiper.slides.findIndex((slide) => {
      const img = slide.querySelector("img[src]");
      if (!img?.src) return false;
      const slideSrc = img.src.split("?")[0];
      return (
        slideSrc === normalizedSrc || (fileName && slideSrc.includes(fileName))
      );
    });
  }

  shouldUpdateMediaBySliding() {
    return this.dataset?.variantMediaDisplay === "show_all";
  }

  updateMediaForCurrentVariant() {
    if (!this.shouldUpdateMediaBySliding()) return;
    this.updateMedia(this.getVariantFeaturedMediaId(), this.currentVariant);
  }

  updateMedia(mediaId, variant = this.currentVariant) {
    const sectionId = this.dataset.section;
    const mediaEl = this.getProductMediaContainer();
    if (!mediaEl) return;

    const sliderEl = mediaEl.querySelector(".js-media-list");
    if (!sliderEl) return;

    const navigate = () => {
      if (!sliderEl.swiper) return false;

      let slideIndex = -1;

      if (mediaId) {
        const rawMediaId = String(mediaId).includes("-")
          ? String(mediaId).split("-").pop()
          : String(mediaId);
        slideIndex = findProductMediaSlideIndex(
          sliderEl,
          rawMediaId,
          sectionId
        );
        if (slideIndex < 0) {
          slideIndex = findProductMediaSlideIndex(sliderEl, mediaId, null);
        }
      }

      if (slideIndex < 0 && variant) {
        slideIndex = this.findSlideIndexByVariantFeaturedImage(
          sliderEl,
          variant,
          sectionId
        );
      }

      if (slideIndex < 0) return false;

      sliderEl.swiper.slideTo(slideIndex, 800);
      syncPopupSliderToMain();
      return true;
    };

    if (navigate()) return;
    requestAnimationFrame(() => navigate());
  }

  updateURL(productUrl = "") {
    if (this.dataset.updateUrl === "false") return;
    const baseUrl =
      productUrl || this.pendingCombinedProductURL || this.dataset.url;
    const newUrl = this.currentVariant?.id
      ? `${baseUrl}?variant=${this.currentVariant.id}`
      : baseUrl;

    window.history.replaceState({}, "", newUrl);
  }

  getResolvedVariantId() {
    if (this.currentVariant?.id) return String(this.currentVariant.id);
    const form = this.getProductFormElements()[0];
    return form?.querySelector('input[name="id"]')?.value?.trim() || "";
  }

  isVariantValidForCart() {
    if (this.productInfoLoading) return false;

    this.updateOptions();

    const matched = this.findVariantBySelectedOptions();
    if (matched?.id) {
      this.currentVariant = matched;
      return matched.available !== false;
    }

    if (this.isHighVariantProduct() || this.hasCombinedListingOptions()) {
      const variant =
        this.currentVariant || this.getSelectedVariantFromScript();
      if (!variant?.id) return false;
      this.currentVariant = variant;
      return variant.available !== false;
    }

    if (this.querySelector("[data-all-variants-no-high]")) {
      return false;
    }

    const fromScript = this.getSelectedVariantFromScript();
    if (fromScript?.id && this.variantMatchesSelectedOptions(fromScript)) {
      this.currentVariant = fromScript;
      return fromScript.available !== false;
    }

    const variantId = this.getResolvedVariantId();
    if (!variantId) return false;

    if (this.currentVariant?.id) {
      return this.currentVariant.available !== false;
    }

    const form = this.getProductFormElements()[0];
    const input = form?.querySelector('input[name="id"]');
    return !!(input?.value?.trim() && !input.disabled);
  }

  syncQuantityInputsForVariant(variant = this.currentVariant) {
    if (!variant?.available) return;

    this.getProductFormElements().forEach((form) => {
      const quantityInput =
        form.querySelector('input[name="quantity"]') ||
        document.querySelector(
          `input[name="quantity"][form="${CSS.escape(form.id)}"]`
        );
      if (!quantityInput) return;

      const quantityEl = quantityInput.closest("quantity-input");
      const min = Math.max(
        1,
        Number(
          quantityInput.getAttribute("min") || quantityInput.dataset?.min || 1
        )
      );
      const step = Math.max(1, Number(quantityInput.getAttribute("step") || 1));
      const maxAttr = quantityInput.getAttribute("max");
      const max =
        maxAttr != null && maxAttr !== "" ? Number(maxAttr) : null;
      let currentQty = Number(quantityInput.value);

      if (!currentQty || currentQty < min) {
        currentQty = min;
      } else {
        const offset = currentQty - min;
        if (offset % step !== 0) {
          currentQty = min + Math.floor(offset / step) * step;
        }
      }

      if (max != null && Number.isFinite(max) && currentQty > max) {
        currentQty = min + Math.floor((max - min) / step) * step;
      }

      quantityInput.value = String(Math.max(min, currentQty));
      if (form.id) quantityInput.setAttribute("form", form.id);

      quantityInput.removeAttribute("disabled");
      quantityEl?.classList.remove("disabled");

      if (quantityEl && typeof quantityEl.setMinimumDisable === "function") {
        quantityEl.setMinimumDisable();
      }
    });
  }

  getProductFormElements() {
    const forms = new Set();
    const sectionId = this.dataset.section;
    const quickAddModal = this.closest("quick-add-modal");
    const searchRoot = quickAddModal || document;

    searchRoot
      .querySelectorAll(
        `#product-form-${sectionId}, #product-form-floating-${sectionId}, #product-form-installment-${sectionId}`
      )
      .forEach((form) => forms.add(form));

    const sectionEl = this.getProductSectionElement(sectionId);

    sectionEl
      ?.querySelectorAll('form[data-type="add-to-cart-form"]')
      .forEach((form) => forms.add(form));

    return [...forms];
  }

  setVariantFormInputs({ disabled = false, variantId = "" } = {}) {
    this.getProductFormElements().forEach((form) => {
      const input = form.querySelector('input[name="id"]');
      if (!input) return;
      input.disabled = disabled;
      input.value = variantId;
    });
  }

  restoreProductInfoVisibility() {
    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`
    );

    if (price) price.classList.remove("visibility-hidden");
    if (inventory) inventory.classList.remove("visibility-hidden");
  }

  setAddToCartPending(isPending) {
    this.getProductFormElements().forEach((form) => {
      const addButton = form.querySelector('[name="add"]');
      if (!addButton) return;

      if (isPending) {
        addButton.setAttribute("disabled", true);
        addButton.setAttribute("aria-disabled", true);
        addButton.dataset.status = "loading";
        return;
      }

      if (addButton.dataset.status === "loading") {
        addButton.dataset.status = "available";
      }
      addButton.removeAttribute("disabled");
      addButton.removeAttribute("aria-disabled");
      addButton.classList.remove("loading");
    });
  }

  clearProductFormSubmitLoading() {
    const sectionId = this.dataset.section;
    document
      .querySelectorAll(
        `product-form[data-source="${sectionId}"], product-form[data-source="${sectionId}-floating"]`
      )
      .forEach((productForm) => {
        if (typeof productForm.setSubmitLoading === "function") {
          productForm.setSubmitLoading(false);
        }
      });
  }

  syncAddToCartState() {
    this.updateOptions();

    const fromScript = this.getSelectedVariantFromScript();

    if (this.hasCombinedListingOptions() || this.isHighVariantProduct()) {
      if (fromScript?.id) {
        this.currentVariant = fromScript;
      } else {
        this.updateMasterId();
      }
    } else {
      const matched = this.findVariantBySelectedOptions();
      if (matched) {
        this.currentVariant = matched;
      } else {
        this.updateMasterId();
      }

      if (!this.currentVariant && fromScript?.id) {
        const useFromScript =
          this.variantMatchesSelectedOptions(fromScript) ||
          this.shouldTrustSelectedVariantFromScript();
        if (useFromScript) {
          this.currentVariant = fromScript;
        }
      }
    }

    if (!this.currentVariant) {
      if (this.productInfoLoading) {
        this.setAddToCartPending(true);
      } else {
        this.setUnavailable();
      }
      return;
    }

    if (
      !this.hasResolvedVariantForSelectedOptions(this.currentVariant) &&
      this.variantUserInteracted
    ) {
      if (this.productInfoLoading) {
        this.setAddToCartPending(true);
      } else {
        this.setUnavailable();
      }
      return;
    }

    this.restoreProductInfoVisibility();
    this.clearProductFormSubmitLoading();

    if (this.currentVariant.available === false) {
      this.setVariantFormInputs({
        disabled: true,
        variantId: String(this.currentVariant.id),
      });
      this.updateSkuDisplay(this.currentVariant);
      this.toggleAddButton(true, window.variantStrings.soldOut);
      return;
    }

    this.setVariantFormInputs({
      disabled: false,
      variantId: String(this.currentVariant.id),
    });
    this.syncQuantityInputsForVariant(this.currentVariant);
    this.toggleAddButton(false);
    this.updateSkuDisplay(this.currentVariant);

    publish(PUB_SUB_EVENTS.variantChange, {
      data: {
        sectionId: this.dataset.section,
        variant: this.currentVariant,
      },
    });
  }

  updateVariantInput() {
    this.syncAddToCartState();
  }

  updateVariantStatuses() {
    if (this.isHighVariantProduct()) return;

    const variantData = this.getVariantData();
    if (!variantData?.length) return;

    const inputWrappers = this.getSortedOptionControls();
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [
        ...option.querySelectorAll('input[type="radio"], option'),
      ];
      const availableOptionInputsValue = variantData
        .filter((variant) => {
          return inputWrappers
            .slice(0, index)
            .every(
              (wrapper, optionIndex) =>
                this.getSelectedOptionValue(wrapper) ===
                variant.options[optionIndex]
            );
        })
        .filter((variant) => variant.available)
        .map((variantOption) => variantOption.options[index]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setOptionInputVisualState(input, isAvailable, optionValue) {
    const listItem = input.closest("li");

    if (input.tagName === "OPTION") {
      input.innerText = isAvailable
        ? optionValue
        : window.variantStrings.unavailable_with_option.replace(
            "[value]",
            optionValue
          );
      input.disabled = !isAvailable;
      return;
    }

    if (input.tagName === "INPUT") {
      input.classList.toggle("disabled", !isAvailable);
      input.removeAttribute("disabled");

      if (!isAvailable) {
        input.setAttribute("aria-disabled", "true");
        listItem?.classList.add("disabled");
        listItem?.setAttribute("aria-disabled", "true");
      } else {
        input.removeAttribute("aria-disabled");
        listItem?.classList.remove("disabled");
        listItem?.removeAttribute("aria-disabled");
      }
    }
  }

  setInputAvailability(listOfOptions, listOfAvailableOptions) {
    listOfOptions.forEach((input) => {
      const optionValue = input.getAttribute("value");
      const isAvailable = listOfAvailableOptions.includes(optionValue);
      this.setOptionInputVisualState(input, isAvailable, optionValue);
    });
  }

  setCheckedInputsBySelectedValues(selectedValues) {
    const inputWrappers = [...this.querySelectorAll(".product-form__controls")];

    inputWrappers.forEach((groupEl, index) => {
      const selectedValue = selectedValues[index];
      if (!selectedValue) return;

      const inputs = [...groupEl.querySelectorAll('input[type="radio"]')];

      inputs.forEach((input) => {
        const shouldBeChecked = input.value === selectedValue;
        input.checked = shouldBeChecked;
        if (shouldBeChecked) {
          input.setAttribute("checked", "");
        } else {
          input.removeAttribute("checked");
        }
      });
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector("pickup-availability");
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute("available");
      pickUpAvailability.innerHTML = "";
    }
  }

  isStaleProductInfoRequest(requestId) {
    return requestId !== this.productInfoRequestId;
  }

  renderProductInfo(requestUrl, options = {}) {
    if (!requestUrl) {
      this.productInfoLoading = false;
      this.classList.remove("high-variant-loading");
      this.syncAddToCartState();
      return;
    }

    this.productInfoPriceUpdated = false;

    const fetchOptions = {
      pickerUpdateMode:
        options.pickerUpdateMode || this.pickerUpdateMode || "none",
      isHighVariantFetch: options.isHighVariantFetch === true,
      isCombinedFetch: options.isCombinedFetch === true,
      forceMediaUpdate: options.forceMediaUpdate,
      updateBuyButtons: options.updateBuyButtons,
      expectedProductUrl:
        options.expectedProductUrl ||
        this.pendingCombinedProductURL ||
        this.dataset.url,
    };

    this.abortController?.abort();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const requestId = ++this.productInfoRequestId;
    this.productInfoLoading = true;
    if (!this.currentVariant?.id) {
      this.setAddToCartPending(true);
    }

    fetch(requestUrl, { signal })
      .then((response) => response.text())
      .then(async (responseText) => {
        if (this.isStaleProductInfoRequest(requestId)) return;

        if (fetchOptions.expectedProductUrl) {
          this.dataset.url = fetchOptions.expectedProductUrl;
        }

        const html = new DOMParser().parseFromString(responseText, "text/html");

        this.syncPickerDatasetFromHtml(html);

        if (this.isStaleProductInfoRequest(requestId)) return;

        // -----
        // for high-variant products
        // and if variant not found in liquid <script data-all-variants-no-high>
        // but it was found after a request with the option_values parameter
        const pickerUpdateMode = fetchOptions.pickerUpdateMode;

        if (fetchOptions.isHighVariantFetch) {
          try {
            this.variantData = null;
            this.updateURL();
            this.updatePickupAvailability();
            if (pickerUpdateMode === "full") {
              this.updatePickerInnerHtml(html);
              this.setCurrentVariantAfterFetch(html);
            } else {
              this.updatePickerAvailabilityFromHtml(html);
              try {
                this.setCurrentVariantAfterFetch(html);
              } catch (err) {}
            }
            if (this.currentVariant) {
              this.syncAddToCartState();
              if (!fetchOptions.isCombinedFetch) {
                this.updateMediaForCurrentVariant();
              }
            }
          } catch (err) {}
        } else if (this.querySelector("[data-all-variants-no-high]")) {
          this.updateVariantStatuses();
        }
        // -----

        let mediaHtml = html;
        const sourceSectionId = this.dataset.originalSection
          ? this.dataset.originalSection
          : this.dataset.section;
        const forceMediaUpdate =
          this.shouldForceMediaUpdateFromFetch(fetchOptions);
        const mediaSlideCount = this.countMediaSlidesInHtml(
          html,
          sourceSectionId
        );
        const needsSecondMediaFetch =
          forceMediaUpdate &&
          this.currentVariant?.id &&
          mediaSlideCount === 1 &&
          this.hasRealProductGalleryInHtml(html, sourceSectionId);

        if (needsSecondMediaFetch) {
          const variantMediaUrl = this.createRequestUrl({
            currentVariantId: this.currentVariant.id,
            combinedProductURL: fetchOptions.expectedProductUrl,
          });
          if (variantMediaUrl) {
            try {
              const variantResponse = await fetch(variantMediaUrl, { signal });
              if (this.isStaleProductInfoRequest(requestId)) return;
              if (variantResponse.ok) {
                mediaHtml = new DOMParser().parseFromString(
                  await variantResponse.text(),
                  "text/html"
                );
              }
            } catch (err) {
              if (err.name !== "AbortError") {
                console.error(err);
              }
            }
          }
        }

        if (this.isStaleProductInfoRequest(requestId)) return;

        const shouldUpdateBuyButtons =
          fetchOptions.updateBuyButtons === true ||
          (fetchOptions.updateBuyButtons !== false &&
            (pickerUpdateMode === "full" || fetchOptions.isCombinedFetch));

        this.updateElementsAfterFetch(html, mediaHtml, {
          forceMediaUpdate,
          updateBuyButtons: shouldUpdateBuyButtons,
          isCombinedFetch: fetchOptions.isCombinedFetch,
        });

        if (forceMediaUpdate) {
          this.needsProductMediaRefresh = false;
        }

        try {
          this.setCurrentVariantAfterFetch(html);
        } catch (err) {}

        this.updateURL();
        this.reinitDropdownSelects();
        this.updateMediaForCurrentVariant();
        this.syncAddToCartState();
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          console.info("Fetch aborted by user");
        } else {
          console.error(error);
        }
      })
      .finally(() => {
        if (!this.isStaleProductInfoRequest(requestId)) {
          this.productInfoLoading = false;
          this.classList.remove("high-variant-loading");
          this.pendingCombinedProductURL = "";
          this.setAddToCartPending(false);
          this.syncAddToCartState();
          if (this.productInfoPriceUpdated) {
            this.restoreProductInfoVisibility();
          }
          this.productInfoPriceUpdated = false;
        }
      });
  }

  toggleAddButton(disable = true, text) {
    this.getProductFormElements().forEach((form) => {
      const addButton = form.querySelector('[name="add"]');
      if (!addButton) return;

      const addButtonText =
        addButton.querySelector(".button__label") ||
        addButton.querySelector("span");

      if (disable) {
        addButton.setAttribute("disabled", true);
        addButton.setAttribute("aria-disabled", true);
        if (text && addButtonText) {
          addButtonText.textContent = text;

          if (text === window.variantStrings.unavailable) {
            addButton.dataset.status = "unavailable";
          } else if (text === window.variantStrings.soldOut) {
            addButton.dataset.status = "sold-out";
          }
        }
      } else {
        addButton.removeAttribute("disabled");
        addButton.removeAttribute("aria-disabled");
        addButton.classList.remove("loading");
        if (addButtonText) {
          addButtonText.textContent = window.variantStrings.addToCart;
        }
        addButton.dataset.status = "available";
      }
    });
  }

  resetErrorMessage() {
    this.getProductFormElements().forEach((form) => {
      const parentEl = form.closest("product-form");
      if (parentEl) {
        const errorWrapperEl = parentEl.querySelector(
          ".product-form__error-message-wrapper"
        );
        const errorTextEl = errorWrapperEl?.querySelector(
          ".product-form__error-message"
        );
        if (!errorWrapperEl || !errorTextEl) return;
        errorWrapperEl.setAttribute("hidden", true);
        errorTextEl.textContent = "";
      }
    });
  }

  shouldHideProductInfoWhenUnavailable() {
    if (!this.variantUserInteracted) return false;
    if (this.productInfoLoading) return false;
    if (this.pendingCombinedProductURL) return false;
    if (this.hasStaleVariantSelection()) return false;
    if (this.productInfoPriceUpdated) return false;
    if (this.hasCombinedListingOptions()) return false;
    return true;
  }

  setUnavailable(options = {}) {
    const hideProductInfo =
      options.hideProductInfo ?? this.shouldHideProductInfoWhenUnavailable();

    const price = document.getElementById(`price-${this.dataset.section}`);
    const inventory = document.getElementById(
      `Inventory-${this.dataset.section}`
    );

    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const colorNameDestinations = document.querySelectorAll(
      `[id^="ColorName-${this.dataset.section}"]`
    );

    this.toggleAddButton(true, window.variantStrings.unavailable);
    this.setVariantFormInputs({ disabled: true, variantId: "" });

    if (hideProductInfo) {
      if (price) price.classList.add("visibility-hidden");
      if (inventory) inventory.classList.add("visibility-hidden");
    } else {
      this.restoreProductInfoVisibility();
    }

    if (sku) this.clearSkuElement(sku);
    colorNameDestinations.forEach((colorNameDestination) => {
      colorNameDestination.classList.add("visibility-hidden");
    });
  }

  getVariantData() {
    const el = this.querySelector("[data-all-variants-no-high]");
    if (!el) {
      this.variantData = null;
      return [];
    }

    try {
      this.variantData = JSON.parse(el.textContent);
    } catch {
      this.variantData = null;
    }

    return this.variantData || [];
  }

  getProductSectionElement(sectionId) {
    const section =
      document.getElementById(`shopify-section-${sectionId}`) ||
      document.getElementById(`MainProduct-${sectionId}`);

    if (section) return section;

    const quickAddModal =
      document.querySelector("quick-add-modal[open]") ||
      document.querySelector("quick-add-modal");

    if (!quickAddModal) return null;

    return (
      quickAddModal
        .querySelector(`#ProductInfo-${sectionId}`)
        ?.closest(".product") ||
      quickAddModal
        .querySelector(
          `variant-selects[data-section="${sectionId}"], variant-radios[data-section="${sectionId}"]`
        )
        ?.closest(".product") ||
      quickAddModal.querySelector(".quick-add-modal__content-info")
    );
  }

  getProductMediaContainer(sectionId = this.dataset.section) {
    const sectionEl = this.getProductSectionElement(sectionId);
    return (
      sectionEl?.querySelector(`[data-section="product-media-${sectionId}"]`) ||
      document.querySelector(`[data-section="product-media-${sectionId}"]`)
    );
  }

  destroyProductMediaSwipers(root) {
    if (!root) return;
    root.querySelectorAll(".swiper").forEach((el) => {
      if (el.swiper) {
        el.swiper.destroy(true, true);
      }
    });
  }

  reinitProductMediaGalleries(sectionEl) {
    if (!sectionEl) return;
    if (typeof subSliderInit === "function") subSliderInit(true, sectionEl);
    if (typeof sliderInit === "function") sliderInit(true, sectionEl);
    if (typeof popupSliderInit === "function") popupSliderInit(true);
    if (typeof syncPopupSliderToMain === "function") syncPopupSliderToMain();
  }

  updateProductModalFromHtml(mediaHtml, sourceSectionId, currentSectionId) {
    const modalSource = mediaHtml.getElementById(
      `ProductModal-${sourceSectionId}`
    );
    const modalDestination = document.getElementById(
      `ProductModal-${currentSectionId}`
    );
    if (!modalDestination) return;

    const popupDestination = modalDestination.querySelector(".js-popup-slider");
    if (!modalSource) {
      if (popupDestination) {
        if (popupDestination.swiper) {
          popupDestination.swiper.destroy(true, true);
        }
        popupDestination.querySelector(".swiper-wrapper")?.replaceChildren();
      }
      modalDestination.querySelector(".product__pagination-wrapper")?.remove();
      modalDestination.querySelector(".product__slider-nav")?.remove();
      return;
    }

    const popupSource = modalSource.querySelector(".js-popup-slider");
    if (popupSource && popupDestination) {
      if (popupDestination.swiper) {
        popupDestination.swiper.destroy(true, true);
      }
      popupDestination.innerHTML = popupSource.innerHTML;
    } else if (popupDestination) {
      if (popupDestination.swiper) {
        popupDestination.swiper.destroy(true, true);
      }
      popupDestination.querySelector(".swiper-wrapper")?.replaceChildren();
    }

    const paginationSource = modalSource.querySelector(
      ".product__pagination-wrapper"
    );
    const paginationDestination = modalDestination.querySelector(
      ".product__pagination-wrapper"
    );
    if (paginationSource && paginationDestination) {
      paginationDestination.innerHTML = paginationSource.innerHTML;
    } else if (paginationSource && !paginationDestination) {
      modalDestination.appendChild(paginationSource.cloneNode(true));
    } else if (!paginationSource && paginationDestination) {
      paginationDestination.remove();
    }

    const navSource = modalSource.querySelector(".product__slider-nav");
    const navDestination = modalDestination.querySelector(
      ".product__slider-nav"
    );
    if (navSource && navDestination) {
      navDestination.innerHTML = navSource.innerHTML;
    } else if (navSource && !navDestination) {
      modalDestination.appendChild(navSource.cloneNode(true));
    } else if (!navSource && navDestination) {
      navDestination.remove();
    }
  }

  syncProductMediaLayoutClass(sectionEl, mediaHtml) {
    const sourceProduct = mediaHtml.querySelector(".product");
    const destProduct = sectionEl?.querySelector(".product");
    if (!sourceProduct || !destProduct) return;

    destProduct.classList.toggle(
      "product--no-media",
      sourceProduct.classList.contains("product--no-media")
    );
    destProduct.classList.toggle(
      "row",
      sourceProduct.classList.contains("row")
    );
  }

  getGiftCardRecipientWrapper(root, sectionId) {
    if (!root) return null;

    return (
      root.getElementById?.(`GiftCardRecipient-${sectionId}`) ||
      root.querySelector?.(`#GiftCardRecipient-${sectionId}`)
    );
  }

  getLegacyGiftCardRecipientContainer(formEl) {
    const recipientForm = formEl?.querySelector("recipient-form");
    if (!recipientForm) return null;
    return recipientForm.closest(".customer") || recipientForm;
  }

  getFloatingProductBar(root, sectionId) {
    if (!root) return null;

    return (
      root.getElementById?.(`FloatingProductBar-${sectionId}`) ||
      root.querySelector?.(`#FloatingProductBar-${sectionId}`) ||
      root.querySelector?.(".product__media_navigation")
    );
  }

  replaceSectionIdsInMarkup(markup, sourceSectionId, currentSectionId) {
    if (!markup || sourceSectionId === currentSectionId) return markup;
    return markup.replaceAll(sourceSectionId, currentSectionId);
  }

  rewriteFetchedNodeMarkup(markup, sourceSectionId, currentSectionId) {
    if (!markup) return markup;

    if (this.needsSectionIdRewrite()) {
      return this.rewriteFetchedMarkupForSection(
        markup,
        sourceSectionId,
        currentSectionId
      );
    }

    if (sourceSectionId !== currentSectionId) {
      return this.replaceSectionIdsInMarkup(
        markup,
        sourceSectionId,
        currentSectionId
      );
    }

    return markup;
  }

  updateLinkedProductsFromHtml(html, sourceSectionId, currentSectionId) {
    const productInfoSource = this.getProductInfoFromHtml(
      html,
      sourceSectionId
    );
    const productInfoDestination = document.getElementById(
      `ProductInfo-${currentSectionId}`
    );
    if (!productInfoDestination) return;

    const variantPickerSelector = `#variant-picker-${currentSectionId}`;
    const syncLinkedProductsBlock = (selector, insertAfterVariantPicker) => {
      const source = productInfoSource?.querySelector(selector);
      const destination = productInfoDestination.querySelector(selector);

      if (source && destination) {
        destination.outerHTML = this.rewriteFetchedNodeMarkup(
          source.outerHTML,
          sourceSectionId,
          currentSectionId
        );
        return;
      }

      if (source && !destination) {
        const variantPicker = productInfoDestination.querySelector(
          variantPickerSelector
        );
        const markup = this.rewriteFetchedNodeMarkup(
          source.outerHTML,
          sourceSectionId,
          currentSectionId
        );

        if (variantPicker) {
          variantPicker.insertAdjacentHTML(
            insertAfterVariantPicker ? "afterend" : "beforebegin",
            markup
          );
        } else {
          productInfoDestination.insertAdjacentHTML("beforeend", markup);
        }
        return;
      }

      if (!source && destination) {
        destination.remove();
      }
    };

    // `product-linked-products` renders before the variant picker.
    syncLinkedProductsBlock(".linked-products", false);
    // `linked-products` renders after the variant picker.
    syncLinkedProductsBlock(".product-parameters--linked-products", true);
  }

  updateFloatingProductBarFromHtml(html, sourceSectionId, currentSectionId) {
    const sectionSource =
      html.getElementById(`shopify-section-${sourceSectionId}`) || html;
    const sectionDest = this.getProductSectionElement(currentSectionId);
    const sourceBar = this.getFloatingProductBar(
      sectionSource,
      sourceSectionId
    );
    const destBar = this.getFloatingProductBar(sectionDest, currentSectionId);

    if (!destBar || !sourceBar) return;

    const sourceTitle = sourceBar.querySelector(
      ".product__media_navigation-title"
    );
    const destTitle = destBar.querySelector(".product__media_navigation-title");
    if (sourceTitle && destTitle) {
      destTitle.innerHTML = sourceTitle.innerHTML;
    }

    const sourceBtn = sourceBar.querySelector(".product__media_navigation-btn");
    const destBtn = destBar.querySelector(".product__media_navigation-btn");
    if (sourceBtn && destBtn) {
      destBtn.innerHTML = this.replaceSectionIdsInMarkup(
        sourceBtn.innerHTML,
        sourceSectionId,
        currentSectionId
      );
    }
  }

  updateGiftCardRecipientFromHtml(html, sourceSectionId, currentSectionId) {
    const sourceForm = html.getElementById(`product-form-${sourceSectionId}`);
    const destForm = document.getElementById(
      `product-form-${currentSectionId}`
    );
    const sourceProductForm =
      sourceForm?.closest("product-form") ||
      html.querySelector(`#ProductInfo-${sourceSectionId} product-form`);
    const destProductForm = destForm?.closest("product-form");

    if (sourceProductForm && destProductForm) {
      destProductForm.dataset.hideErrors = sourceProductForm.dataset.hideErrors;
    }

    let sourceWrapper = this.getGiftCardRecipientWrapper(html, sourceSectionId);
    let destWrapper = this.getGiftCardRecipientWrapper(
      document,
      currentSectionId
    );

    if (!sourceWrapper && sourceForm) {
      sourceWrapper = this.getLegacyGiftCardRecipientContainer(sourceForm);
    }

    if (!destWrapper && destForm) {
      destWrapper = this.getLegacyGiftCardRecipientContainer(destForm);
    }

    const insertAnchor = destForm?.querySelector(".product-form__buttons");

    const cloneWrapperHtml = (wrapper) => {
      let markup = wrapper.outerHTML;
      if (sourceSectionId !== currentSectionId) {
        markup = markup.replaceAll(sourceSectionId, currentSectionId);
      }
      const template = document.createElement("template");
      template.innerHTML = markup.trim();
      return template.content.firstElementChild;
    };

    if (sourceWrapper && destWrapper) {
      if (sourceSectionId !== currentSectionId) {
        destWrapper.replaceWith(cloneWrapperHtml(sourceWrapper));
      } else {
        destWrapper.innerHTML = sourceWrapper.innerHTML;
      }
      return;
    }

    if (sourceWrapper && !destWrapper && insertAnchor) {
      const clone = cloneWrapperHtml(sourceWrapper);
      if (clone) insertAnchor.before(clone);
      return;
    }

    if (!sourceWrapper && destWrapper) {
      destWrapper.remove();
    }
  }

  updateProductTitleAndBadgesFromHtml(
    productInfoSource,
    productInfoDestination,
    sourceSectionId,
    currentSectionId
  ) {
    if (!productInfoSource || !productInfoDestination) return;

    const wrapperSources = productInfoSource.querySelectorAll(
      ".product__title__wrapper"
    );
    const wrapperDestinations = productInfoDestination.querySelectorAll(
      ".product__title__wrapper"
    );

    if (
      wrapperSources.length &&
      wrapperDestinations.length &&
      wrapperSources.length === wrapperDestinations.length
    ) {
      wrapperDestinations.forEach((wrapperDestination, index) => {
        let wrapperHtml = wrapperSources[index].innerHTML;
        if (this.needsSectionIdRewrite()) {
          wrapperHtml = this.rewriteFetchedMarkupForSection(
            wrapperHtml,
            sourceSectionId,
            currentSectionId
          );
        }
        wrapperDestination.innerHTML = wrapperHtml;
        wrapperDestination.className = wrapperSources[index].className;
      });
      return;
    }

    const titleSources = productInfoSource.querySelectorAll(".product__title");
    const titleDestinations =
      productInfoDestination.querySelectorAll(".product__title");
    if (
      titleSources.length &&
      titleDestinations.length &&
      titleSources.length === titleDestinations.length
    ) {
      titleDestinations.forEach((titleDestination, index) => {
        titleDestination.innerHTML = titleSources[index].innerHTML;
      });
    }
  }

  getSkuDisplayText(skuEl) {
    if (!skuEl) return "";
    const clone = skuEl.cloneNode(true);
    clone.querySelectorAll(".visually-hidden").forEach((node) => node.remove());
    return clone.textContent.trim();
  }

  clearSkuElement(skuEl) {
    if (!skuEl) return;
    const label = skuEl.querySelector(".visually-hidden");
    skuEl.innerHTML = label ? label.outerHTML : "";
    skuEl.classList.add("visibility-hidden");
  }

  updateSkuDisplay(variant) {
    const skuEl = document.getElementById(`Sku-${this.dataset.section}`);
    if (!skuEl) return;

    const label = skuEl.querySelector(".visually-hidden");
    const skuValue = (variant?.sku || "").trim();

    if (!skuValue) {
      this.clearSkuElement(skuEl);
      return;
    }

    skuEl.innerHTML = (label ? label.outerHTML : "") + skuValue;
    skuEl.classList.remove("visibility-hidden");
  }

  updateProductSkuFromHtml(html, sourceSectionId, currentSectionId) {
    const htmlRoot = this.getMediaHtmlRoot(html, sourceSectionId);
    const skuSource = htmlRoot.querySelector(`#Sku-${sourceSectionId}`);
    const skuDestination = document.getElementById(`Sku-${currentSectionId}`);

    if (!skuDestination) return;

    if (!skuSource) {
      this.clearSkuElement(skuDestination);
      return;
    }

    skuDestination.innerHTML = skuSource.innerHTML;
    skuDestination.className = skuSource.className;

    if (
      skuSource.classList.contains("visibility-hidden") ||
      !this.getSkuDisplayText(skuSource)
    ) {
      this.clearSkuElement(skuDestination);
    }
  }

  updateProductDescriptionFromHtml(html, sourceSectionId, currentSectionId) {
    const descriptionSource = html.getElementById(
      `ProductDescription-${sourceSectionId}`
    );
    let descriptionDestination = document.getElementById(
      `ProductDescription-${currentSectionId}`
    );

    if (!descriptionDestination) {
      descriptionDestination = document
        .getElementById(`ProductInfo-${currentSectionId}`)
        ?.querySelector(".product__description");
    }

    if (descriptionSource && descriptionDestination) {
      descriptionDestination.innerHTML = descriptionSource.innerHTML;
      descriptionDestination.className = descriptionSource.className;
      descriptionDestination.hidden = descriptionSource.hidden;
      if (!descriptionDestination.id) {
        descriptionDestination.id = `ProductDescription-${currentSectionId}`;
      }
      return;
    }

    if (!descriptionSource && descriptionDestination) {
      descriptionDestination.innerHTML = "";
      descriptionDestination.classList.add("hidden");
      descriptionDestination.hidden = true;
      return;
    }

    if (descriptionSource && !descriptionDestination) {
      const productInfoDestination = document.getElementById(
        `ProductInfo-${currentSectionId}`
      );
      const insertAfter = this.findProductInfoBlockAnchor(
        descriptionSource,
        html.getElementById(`ProductInfo-${sourceSectionId}`),
        productInfoDestination,
        sourceSectionId,
        currentSectionId
      );
      const clone = descriptionSource.cloneNode(true);
      clone.id = `ProductDescription-${currentSectionId}`;
      if (insertAfter) {
        insertAfter.after(clone);
      } else {
        productInfoDestination?.prepend(clone);
      }
    }
  }

  findProductInfoBlockAnchor(
    sourceBlock,
    productInfoSource,
    productInfoDestination,
    sourceSectionId,
    currentSectionId
  ) {
    if (!productInfoSource || !productInfoDestination) return null;

    let node = sourceBlock.previousElementSibling;
    while (node) {
      const match = this.matchProductInfoBlock(
        node,
        productInfoDestination,
        sourceSectionId,
        currentSectionId
      );
      if (match) return match;
      node = node.previousElementSibling;
    }

    return productInfoDestination.querySelector(".product__title");
  }

  matchProductInfoBlock(
    sourceNode,
    productInfoDestination,
    sourceSectionId,
    currentSectionId
  ) {
    if (sourceNode.id) {
      const id = sourceNode.id.replace(sourceSectionId, currentSectionId);
      return document.getElementById(id);
    }

    if (sourceNode.classList?.contains("product__title")) {
      return productInfoDestination.querySelector(".product__title");
    }

    if (sourceNode.classList?.contains("product__description")) {
      return productInfoDestination.querySelector(".product__description");
    }

    if (sourceNode.id?.startsWith("price-")) {
      return productInfoDestination.querySelector(`[id^="price-"]`);
    }

    const variantPickerId = sourceNode.id?.startsWith("variant-picker-")
      ? sourceNode.id.replace(sourceSectionId, currentSectionId)
      : sourceNode
          .querySelector?.(`[id^="variant-picker-"]`)
          ?.id?.replace(sourceSectionId, currentSectionId);

    if (variantPickerId) {
      return document.getElementById(variantPickerId);
    }

    return null;
  }

  updateProductMediaFromHtml(mediaHtml, sourceSectionId, currentSectionId) {
    const sectionEl = this.getProductSectionElement(currentSectionId);
    if (!sectionEl) return;

    const mediaHtmlRoot = this.getMediaHtmlRoot(mediaHtml, sourceSectionId);

    const mediaSource = mediaHtmlRoot.querySelector(
      `[data-section="product-media-${sourceSectionId}"]`
    );
    const mediaDestination = this.getProductMediaContainer(currentSectionId);
    const mediaWrapperSource =
      mediaHtmlRoot.querySelector(".product__main .product__media-wrapper") ||
      mediaHtmlRoot.querySelector(".product__media-wrapper");
    const mediaWrapperDestination =
      sectionEl.querySelector(".product__main .product__media-wrapper") ||
      sectionEl.querySelector(".product__media-wrapper");

    if (!mediaWrapperSource && !mediaSource) return;
    if (!mediaWrapperDestination && !mediaDestination) return;

    this.destroyProductMediaSwipers(sectionEl);

    const sourceHasGallery = this.hasRealProductGalleryInHtml(
      mediaHtml,
      sourceSectionId
    );
    const destHasGallery = Boolean(
      mediaDestination?.querySelector(".js-media-list") ||
        mediaWrapperDestination?.querySelector(".js-media-list")
    );

    const rewriteMarkup = (markup) =>
      this.rewriteFetchedMarkupForSection(
        markup,
        sourceSectionId,
        currentSectionId
      );

    if (mediaWrapperSource && mediaWrapperDestination) {
      let wrapperMarkup = mediaWrapperSource.outerHTML;
      if (sourceSectionId !== currentSectionId) {
        wrapperMarkup = rewriteMarkup(wrapperMarkup);
      }
      mediaWrapperDestination.outerHTML = wrapperMarkup;
    } else if (mediaSource && mediaDestination) {
      let mediaMarkup = mediaSource.innerHTML;
      if (sourceSectionId !== currentSectionId) {
        mediaMarkup = rewriteMarkup(mediaMarkup);
      }
      mediaDestination.innerHTML = mediaMarkup;
    } else if (mediaWrapperSource && mediaDestination) {
      let wrapperMarkup = mediaWrapperSource.innerHTML;
      if (sourceSectionId !== currentSectionId) {
        wrapperMarkup = rewriteMarkup(wrapperMarkup);
      }
      mediaDestination.innerHTML = wrapperMarkup;
    } else if (!mediaWrapperSource && !mediaSource && mediaWrapperDestination) {
      mediaWrapperDestination.remove();
    }

    this.syncProductMediaLayoutClass(sectionEl, mediaHtmlRoot);
    this.updateProductModalFromHtml(
      mediaHtml,
      sourceSectionId,
      currentSectionId
    );

    this.reinitProductMediaGalleries(sectionEl);
    queueMicrotask(() => this.updateMediaForCurrentVariant());
  }

  getProductInfoFromHtml(html, sectionId) {
    if (!html || !sectionId) return null;

    return (
      html.getElementById(`ProductInfo-${sectionId}`) ||
      html
        .getElementById(`shopify-section-${sectionId}`)
        ?.querySelector(`#ProductInfo-${sectionId}`) ||
      html.querySelector(`[id^="ProductInfo-"]`)
    );
  }

  getPriceElementFromHtml(html, sectionId, productInfoSource) {
    return (
      html.getElementById(`price-${sectionId}`) ||
      productInfoSource?.querySelector(`#price-${sectionId}`) ||
      productInfoSource?.querySelector(`[id^="price-"]`) ||
      html.querySelector(`#price-${sectionId}`) ||
      html.querySelector(`[id^="price-"]`)
    );
  }

  updateElementsAfterFetch(html, mediaHtml = html, options = {}) {
    // attr data-original-section use for Quick view modal
    const currentSectionId = this.dataset.section;
    const sourceSectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;
    const forceMediaUpdate = options.forceMediaUpdate === true;
    const productInfoSource = this.getProductInfoFromHtml(
      html,
      sourceSectionId
    );
    const productInfoDestination = document.getElementById(
      `ProductInfo-${currentSectionId}`
    );

    // price
    const priceDestination = document.getElementById(
      `price-${currentSectionId}`
    );
    const priceSource = this.getPriceElementFromHtml(
      html,
      sourceSectionId,
      productInfoSource
    );

    if (priceDestination) {
      if (priceSource) {
        priceDestination.innerHTML = priceSource.innerHTML;
        priceDestination.className = priceSource.className;
        if (priceSource.hasAttributes()) {
          [...priceSource.attributes].forEach((attr) => {
            if (attr.name === "id") return;
            priceDestination.setAttribute(attr.name, attr.value);
          });
        }
        this.productInfoPriceUpdated = true;
      }

      if (
        this.productInfoPriceUpdated ||
        options.isCombinedFetch ||
        options.restorePriceVisibility
      ) {
        priceDestination.classList.remove("visibility-hidden");
      }
    }

    this.updateProductTitleAndBadgesFromHtml(
      productInfoSource,
      productInfoDestination,
      sourceSectionId,
      currentSectionId
    );

    // breadcrumbs
    const breadcrumbsSource = productInfoSource?.querySelector("#breadcrumbs");
    const breadcrumbsDestination =
      productInfoDestination?.querySelector("#breadcrumbs");
    if (breadcrumbsSource && breadcrumbsDestination) {
      breadcrumbsDestination.innerHTML = breadcrumbsSource.innerHTML;
    }

    this.updateProductDescriptionFromHtml(
      html,
      sourceSectionId,
      currentSectionId
    );

    this.updateGiftCardRecipientFromHtml(
      html,
      sourceSectionId,
      currentSectionId
    );

    this.updateFloatingProductBarFromHtml(
      html,
      sourceSectionId,
      currentSectionId
    );

    this.updateProductSkuFromHtml(html, sourceSectionId, currentSectionId);

    if (options.updateBuyButtons) {
      this.updateBuyButtonsFromHtml(
        productInfoSource,
        productInfoDestination,
        sourceSectionId,
        currentSectionId
      );
    }

    this.updateQuantityPricingFromHtml(html, sourceSectionId, currentSectionId);

    // inventory
    const inventorySource = html.getElementById(`Inventory-${sourceSectionId}`);
    const inventoryDestination = document.getElementById(
      `Inventory-${currentSectionId}`
    );
    if (inventorySource && inventoryDestination) {
      inventoryDestination.innerHTML = inventorySource.innerHTML;
      inventoryDestination.classList.toggle(
        "visibility-hidden",
        inventorySource.innerText === ""
      );
    }

    // color swatches label
    const colorNameSources = html.querySelectorAll(
      `[id^="ColorName-${sourceSectionId}"]`
    );
    const colorNameDestinations = document.querySelectorAll(
      `[id^="ColorName-${currentSectionId}"]`
    );
    if (colorNameSources?.length === colorNameDestinations?.length) {
      colorNameDestinations.forEach((colorNameDestination, index) => {
        colorNameDestination.classList.remove("visibility-hidden");
        colorNameDestination.innerHTML = colorNameSources[index].innerHTML;
      });
    }

    // variant image swatches
    if (this.isHighVariantNeedUpdate !== true) {
      const variantSwatchesSource = html.querySelector(
        `#variant-picker-${sourceSectionId} [data-is-variant-image-swatch="true"]`
      );
      const variantSwatchesDestination = document.querySelector(
        `#variant-picker-${currentSectionId} [data-is-variant-image-swatch="true"]`
      );
      if (variantSwatchesSource && variantSwatchesDestination) {
        let swatchesHtml = variantSwatchesSource.innerHTML;
        if (this.needsSectionIdRewrite()) {
          swatchesHtml = this.rewriteFetchedMarkupForSection(
            swatchesHtml,
            sourceSectionId,
            currentSectionId
          );
        }
        variantSwatchesDestination.innerHTML = swatchesHtml;
      }
    }

    // product media
    if (forceMediaUpdate) {
      this.updateProductMediaFromHtml(
        mediaHtml,
        sourceSectionId,
        currentSectionId
      );
    }

    if (options.isCombinedFetch || this.isCombinedListingsNeedUpdate) {
      this.updateLinkedProductsFromHtml(
        html,
        sourceSectionId,
        currentSectionId
      );
      this.reinitDropdownSelects();
    }
  }

  updateBuyButtonsFromHtml(
    productInfoSource,
    productInfoDestination,
    sourceSectionId,
    currentSectionId
  ) {
    if (!productInfoSource || !productInfoDestination) return;

    const sourceBuyButtons = productInfoSource.querySelector(
      ".product__buy-buttons"
    );
    const destBuyButtons = productInfoDestination.querySelector(
      ".product__buy-buttons"
    );
    if (!sourceBuyButtons || !destBuyButtons) return;

    const sourceButtonsRow = sourceBuyButtons.querySelector(
      ".product-form__buttons-row"
    );
    const destButtonsRow = destBuyButtons.querySelector(
      ".product-form__buttons-row"
    );
    if (sourceButtonsRow && destButtonsRow) {
      destButtonsRow.innerHTML = sourceButtonsRow.innerHTML;
    }

    const sourceCheckout = sourceBuyButtons.querySelector(
      ".product-form__checkout"
    );
    const destCheckout = destBuyButtons.querySelector(
      ".product-form__checkout"
    );
    if (sourceCheckout && destCheckout) {
      destCheckout.innerHTML = sourceCheckout.innerHTML;
    } else if (!sourceCheckout && destCheckout) {
      destCheckout.remove();
    } else if (sourceCheckout && !destCheckout) {
      const destButtons = destBuyButtons.querySelector(
        ".product-form__buttons"
      );
      destButtons?.appendChild(sourceCheckout.cloneNode(true));
    }

    if (
      window.Shopify?.PaymentButton &&
      destBuyButtons.querySelector(".shopify-payment-button")
    ) {
      Shopify.PaymentButton.init();
    }

    destBuyButtons.closest("product-form")?.refreshSubmitElements?.();

    this.getProductSectionElement(currentSectionId)
      ?.querySelectorAll("product-form")
      .forEach((productForm) => {
        if (typeof productForm.refreshSubmitElements === "function") {
          productForm.refreshSubmitElements();
        }
      });

    const sourceInstallment = productInfoSource.querySelector(
      ".installment-wrapper"
    );
    const destInstallment = productInfoDestination.querySelector(
      ".installment-wrapper"
    );
    if (sourceInstallment && destInstallment) {
      destInstallment.innerHTML = sourceInstallment.innerHTML;
    } else if (!sourceInstallment && destInstallment) {
      destInstallment.innerHTML = "";
      destInstallment.classList.add("visibility-hidden");
    } else if (sourceInstallment && !destInstallment) {
      const priceWrapper =
        productInfoDestination.querySelector(".price-wrapper");
      priceWrapper?.after(sourceInstallment.cloneNode(true));
    }
  }

  updateQuantityPricingFromHtml(html, sourceSectionId, currentSectionId) {
    const sourceProductForm = html.getElementById(
      `product-form-${sourceSectionId}`
    );
    const destinationProductForms = document.querySelectorAll(
      `#product-form-${currentSectionId}`
    );
    if (!sourceProductForm || !destinationProductForms.length) return;

    const sourceButtonsWrapper = sourceProductForm.querySelector(
      ".product-form__buttons"
    );
    const rewriteMarkup = (markup) =>
      this.rewriteFetchedMarkupForSection(
        markup,
        sourceSectionId,
        currentSectionId
      );

    destinationProductForms.forEach((formEl) => {
      const buttonsWrapper = formEl.querySelector(".product-form__buttons");
      if (!sourceButtonsWrapper || !buttonsWrapper) return;

      const sourceHasQuantityPricing =
        sourceButtonsWrapper.dataset.hasQuantityPricing === "true";
      const destHadQuantityPricing =
        buttonsWrapper.dataset.hasQuantityPricing === "true";

      if (!sourceHasQuantityPricing && !destHadQuantityPricing) return;

      if (sourceHasQuantityPricing) {
        buttonsWrapper.dataset.hasQuantityPricing = "true";
      } else {
        buttonsWrapper.removeAttribute("data-has-quantity-pricing");
      }

      const sourceB2bEl = sourceButtonsWrapper.querySelector(
        ".product-b2b-elements"
      );
      const destB2bEl = buttonsWrapper.querySelector(".product-b2b-elements");
      if (sourceB2bEl && destB2bEl) {
        destB2bEl.innerHTML = rewriteMarkup(sourceB2bEl.innerHTML);
      } else if (sourceB2bEl && !destB2bEl) {
        buttonsWrapper.insertAdjacentHTML(
          "afterbegin",
          rewriteMarkup(sourceB2bEl.outerHTML)
        );
      } else if (!sourceB2bEl && destB2bEl) {
        destB2bEl.remove();
      }

      const sourceQuantityWrapper = sourceButtonsWrapper.querySelector(
        ".product-form__quantity"
      );
      const destQuantityWrapper = buttonsWrapper.querySelector(
        ".product-form__quantity"
      );
      if (sourceQuantityWrapper && destQuantityWrapper) {
        destQuantityWrapper.innerHTML = rewriteMarkup(
          sourceQuantityWrapper.innerHTML
        );
        const updatedQtyInput =
          destQuantityWrapper.querySelector('input[name="quantity"]');
        if (updatedQtyInput) {
          // Keep quantity bound to the modal/product form after section-id rewrite
          if (formEl.id) updatedQtyInput.setAttribute("form", formEl.id);
          syncStickyAddBarQuantity(updatedQtyInput);
        }
      }

      const sourceRules = sourceButtonsWrapper.querySelector(".quantity__rules");
      const destRules = buttonsWrapper.querySelector(".quantity__rules");
      if (sourceRules && destRules) {
        destRules.innerHTML = rewriteMarkup(sourceRules.innerHTML);
        destRules.className = sourceRules.className;
      } else if (sourceRules && !destRules) {
        const buttonsRow = buttonsWrapper.querySelector(
          ".product-form__buttons-row"
        );
        const rulesNode = sourceRules.cloneNode(true);
        if (sourceSectionId !== currentSectionId) {
          rulesNode.innerHTML = rewriteMarkup(rulesNode.innerHTML);
        }
        if (buttonsRow) {
          buttonsRow.insertAdjacentElement("afterend", rulesNode);
        } else {
          buttonsWrapper.appendChild(rulesNode);
        }
      } else if (!sourceRules && destRules) {
        destRules.remove();
      }
    });
  }

  // methods for high variant products
  getSelectedValuesIds() {
    const controls = [...this.querySelectorAll(".product-form__controls")];

    controls.sort((a, b) => {
      return (
        Number(a.dataset.optionPosition) - Number(b.dataset.optionPosition)
      );
    });

    return controls
      .map((control) => this.getSelectedOptionValueId(control))
      .filter(Boolean);
  }

  createRequestUrl({
    currentVariantId = "",
    selectedValuesIds = [],
    combinedProductURL = "",
    preferOptionValues = false,
  }) {
    const productUrl =
      combinedProductURL ||
      this.pendingCombinedProductURL ||
      `${this.dataset.url}`;
    const sectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;

    if (preferOptionValues && selectedValuesIds.length) {
      const params = [];
      params.push(`section_id=${sectionId}`);
      params.push(
        `option_values=${selectedValuesIds.filter(Boolean).join(",")}`
      );
      return `${productUrl}?${params.join("&")}`;
    }

    if (currentVariantId) {
      return `${productUrl}?variant=${currentVariantId}&section_id=${sectionId}`;
    }

    // -----
    // for high-variant products
    // and if variant not found in liquid <script data-all-variants-no-high>
    if (selectedValuesIds.length) {
      const params = [];
      params.push(`section_id=${sectionId}`);
      params.push(
        `option_values=${selectedValuesIds.filter(Boolean).join(",")}`
      );
      return `${productUrl}?${params.join("&")}`;
    }

    if (combinedProductURL) {
      return `${productUrl}?section_id=${sectionId}`;
    }

    if (productUrl) {
      return `${productUrl}?section_id=${sectionId}`;
    }
    // -----
  }

  setCurrentVariantAfterFetch(html) {
    // attr data-original-section use for Quick view modal
    const sourceSectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;

    const variantPickerSource = html.getElementById(
      `variant-picker-${sourceSectionId}`
    );
    const variantPickerDestionation = document.getElementById(
      `variant-picker-${this.dataset.section}`
    );
    if (!variantPickerSource) return;

    const newVariantDataEl = variantPickerSource.querySelector(
      "[data-selected-variant]"
    );
    if (!newVariantDataEl) return;

    const newVariantData = newVariantDataEl.innerHTML.trim();
    this.variantData = null;

    let selectedVariant = null;
    if (newVariantData) {
      try {
        selectedVariant = JSON.parse(newVariantData);
      } catch {
        selectedVariant = null;
      }
    }

    this.currentVariant = selectedVariant?.id ? selectedVariant : null;

    const oldEl = variantPickerDestionation?.querySelector(
      "[data-selected-variant]"
    );
    if (oldEl) {
      oldEl.innerHTML = newVariantData;
    }
  }

  updatePickerAvailabilityFromHtml(html) {
    const sourceSectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;
    const variantPickerSource = html.getElementById(
      `variant-picker-${sourceSectionId}`
    );
    if (!variantPickerSource) return;

    const destControls = this.getSortedOptionControls();
    const sourceControls = [
      ...variantPickerSource.querySelectorAll(".product-form__controls"),
    ].sort(
      (a, b) =>
        Number(a.dataset.optionPosition) - Number(b.dataset.optionPosition)
    );

    sourceControls.forEach((sourceControl, index) => {
      const destControl = destControls[index];
      if (!destControl) return;

      const sourceInputs = [
        ...sourceControl.querySelectorAll('input[type="radio"], option'),
      ];
      const destInputs = [
        ...destControl.querySelectorAll('input[type="radio"], option'),
      ];

      sourceInputs.forEach((sourceInput) => {
        const value = sourceInput.getAttribute("value");
        const destInput = destInputs.find(
          (input) => input.getAttribute("value") === value
        );
        if (!destInput) return;

        const isAvailable = !sourceInput.classList.contains("disabled");
        this.setOptionInputVisualState(destInput, isAvailable, value);
      });
    });

    this.variantData = null;
    if (this.querySelector("[data-all-variants-no-high]")) {
      this.getVariantData();
    }
    this.updateOptions();
    this.updateMasterId();
    this.reinitDropdownSelects();
  }

  reinitDropdownSelects() {
    this.querySelectorAll("variant-dropdown-select").forEach((dropdown) => {
      if (typeof dropdown.syncFromSelectedInput === "function") {
        dropdown.syncFromSelectedInput();
      }
    });
  }

  updatePickerInnerHtml(html) {
    // attr data-original-section use for Quick view modal
    const currentSectionId = this.dataset.section;
    const sourceSectionId = this.dataset.originalSection
      ? this.dataset.originalSection
      : this.dataset.section;

    const variantPickerSource = html.getElementById(
      `variant-picker-${sourceSectionId}`
    );
    const variantPickerDestination = document.getElementById(
      `variant-picker-${currentSectionId}`
    );

    if (variantPickerSource && variantPickerDestination) {
      let pickerHtml = variantPickerSource.innerHTML;
      if (this.needsSectionIdRewrite()) {
        pickerHtml = this.rewriteFetchedMarkupForSection(
          pickerHtml,
          sourceSectionId,
          currentSectionId
        );
      }
      variantPickerDestination.innerHTML = pickerHtml;

      this.variantData = null;
      if (
        variantPickerDestination.querySelector("[data-all-variants-no-high]")
      ) {
        this.getVariantData();
      }

      this.updateOptions();
      this.reinitDropdownSelects();
      this.updateMasterId();
      if (
        variantPickerDestination.querySelector("[data-all-variants-no-high]") &&
        !this.isHighVariantProduct()
      ) {
        this.updateVariantStatuses();
      }
      this.syncAddToCartState();
    }
  }
}

if (!customElements.get("variant-selects")) {
  customElements.define("variant-selects", VariantSelects);
}

window.initFeaturedProduct = function (sectionEl) {
  if (!sectionEl) return;
  if (typeof subSliderInit === "function") subSliderInit(true, sectionEl);
  if (typeof sliderInit === "function") sliderInit(true, sectionEl);
};

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    this.options = this.getSortedOptionControls().map((fieldset) =>
      this.getSelectedOptionValue(fieldset)
    );
  }
}

if (!customElements.get("variant-radios")) {
  customElements.define("variant-radios", VariantRadios);
}

class VariantDropdownSelect extends HTMLElement {
  constructor() {
    super();
    this.isActive = false;
    this._preventDoubleClick = this.preventDoubleClick.bind(this);
    this._onCurrentClick = this.onCurrentClick.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
    this._onOptionsClick = this.onClickOption.bind(this);
    this._onKeyUpOptions = this.onKeyUpOptions.bind(this);
    this._onOutsideClick = this.onOutsideClick.bind(this);
  }

  initElements() {
    this.currentEl = this.querySelector(".dropdown-select__current");
    this.optionsWrapperEl = this.querySelector(".dropdown-select__options");
    this.hiddenInput = this.querySelector("input[type='hidden']");
    if (!this.currentEl || !this.optionsWrapperEl || !this.hiddenInput) {
      return false;
    }

    this.optionsEls = Array.from(this.optionsWrapperEl.querySelectorAll("li"));
    this.inputs = Array.from(
      this.optionsWrapperEl.querySelectorAll('input[type="radio"]')
    );
    this.hasColorSwatch = this.currentEl.classList.contains(
      "dropdown-select__current--with-color"
    );
    this.optionPosition = this.getOptionPosition();
    return true;
  }

  connectedCallback() {
    if (!this.initElements()) return;

    this.syncFromSelectedInput();
    this.onClose();

    this.currentEl.addEventListener("click", this._onCurrentClick);
    this.currentEl.addEventListener("keyup", this._onKeyUp);
    this.currentEl.addEventListener("dblclick", this._preventDoubleClick);
    this.optionsWrapperEl.addEventListener("click", this._onOptionsClick);
    this.optionsWrapperEl.addEventListener("keyup", this._onKeyUpOptions);
    document.addEventListener("click", this._onOutsideClick);
  }

  disconnectedCallback() {
    if (!this.currentEl || !this.optionsWrapperEl) return;

    this.currentEl.removeEventListener("click", this._onCurrentClick);
    this.currentEl.removeEventListener("keyup", this._onKeyUp);
    this.currentEl.removeEventListener("dblclick", this._preventDoubleClick);
    this.optionsWrapperEl.removeEventListener("click", this._onOptionsClick);
    this.optionsWrapperEl.removeEventListener("keyup", this._onKeyUpOptions);
    document.removeEventListener("click", this._onOutsideClick);
  }

  syncFromSelectedInput() {
    if (!this.initElements()) return;

    const currentValueEl = this.currentEl.querySelector(
      "[data-dropdown-current-value]"
    );
    if (!currentValueEl) return;

    const checkedInput =
      this.optionsWrapperEl.querySelector('input[type="radio"]:checked') ||
      this.inputs.find((input) => input.hasAttribute("checked"));

    const newValue = checkedInput?.value || this.hiddenInput.value;
    if (!newValue) return;

    currentValueEl.textContent = newValue;
    this.hiddenInput.value = newValue;

    if (checkedInput?.dataset?.optionValueId) {
      this.hiddenInput.dataset.optionValueId =
        checkedInput.dataset.optionValueId;
    } else {
      delete this.hiddenInput.dataset.optionValueId;
    }

    this.inputs.forEach((input) => {
      const isSelected = input.value === newValue;
      input.checked = isSelected;
      if (isSelected) {
        input.setAttribute("checked", "");
      } else {
        input.removeAttribute("checked");
      }
    });

    if (this.hasColorSwatch) {
      const selectedLi =
        checkedInput?.closest("li") ||
        this.optionsEls.find((optionEl) => optionEl.dataset.value === newValue);
      const newColor = selectedLi?.dataset?.color;
      if (newColor) {
        this.hiddenInput.dataset.colorSwatch = newColor;
        this.currentEl.style.setProperty("--swatch-color", newColor);
      }
    }
  }

  onCurrentClick(event) {
    event.stopPropagation();
    if (this.isActive) {
      this.onClose();
    } else {
      this.onOpen();
    }
  }

  onKeyUp(event) {
    if (event.code?.toUpperCase() === "ENTER") {
      event.preventDefault();
      event.stopPropagation();
      if (this.isActive) {
        this.onClose();
      } else {
        this.onOpen();
      }
    }
  }

  preventDoubleClick(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  onClickOption(event) {
    const optionEl = event.target.closest("li");
    const currentValueEl = this.currentEl.querySelector(
      "[data-dropdown-current-value]"
    );

    if (
      !optionEl ||
      !currentValueEl ||
      !this.optionsWrapperEl.contains(optionEl)
    ) {
      event.preventDefault();
      return;
    }

    const optionInput = optionEl.querySelector('input[type="radio"]');

    if (
      optionEl.classList.contains("disabled") ||
      optionInput?.classList.contains("disabled") ||
      optionInput?.disabled ||
      optionInput?.getAttribute("aria-disabled") === "true"
    ) {
      event.preventDefault();
      return;
    }

    const newValue = optionEl.dataset.value;

    currentValueEl.textContent = newValue;
    this.hiddenInput.value = newValue;

    if (optionInput?.dataset?.optionValueId) {
      this.hiddenInput.dataset.optionValueId =
        optionInput.dataset.optionValueId;
    } else {
      delete this.hiddenInput.dataset.optionValueId;
    }

    if (this.hasColorSwatch) {
      const newColor = optionEl.dataset.color;
      this.hiddenInput.dataset.colorSwatch = newColor;
      this.currentEl.style.setProperty("--swatch-color", newColor);
    }

    this.inputs.forEach((el) => {
      el.checked = false;
      el.removeAttribute("checked");
    });
    if (optionInput) {
      optionInput.checked = true;
      optionInput.setAttribute("checked", "");
    }

    const changeEvent = new Event("change", { bubbles: true });
    if (optionInput?.dataset?.productUrl) {
      this.hiddenInput.dataset.productUrl = optionInput.dataset.productUrl;
      changeEvent.productUrl = optionInput.dataset.productUrl;
    } else {
      delete this.hiddenInput.dataset.productUrl;
    }
    this.hiddenInput.dispatchEvent(changeEvent);

    this.onClose();
    this.currentEl.focus();
  }

  onKeyUpOptions(event) {
    if (event.code === "Escape" && this.isActive) {
      event.preventDefault();
      this.onClose();
      this.currentEl.focus();
    }
  }

  onOpen() {
    document.querySelectorAll("variant-dropdown-select").forEach((dropdown) => {
      if (dropdown !== this && typeof dropdown.onClose === "function") {
        dropdown.onClose();
      }
    });

    this.optionsWrapperEl.classList.add("active");
    this.currentEl.setAttribute("aria-expanded", "true");
    this.isActive = true;

    const currentIndex = this.inputs.findIndex((inp) =>
      inp.hasAttribute("checked")
    );
    this.inputs[currentIndex >= 0 ? currentIndex : 0]?.focus();
  }

  onClose() {
    this.optionsWrapperEl.classList.remove("active");
    this.currentEl.setAttribute("aria-expanded", "false");
    this.isActive = false;
  }

  onOutsideClick(event) {
    if (!this.isActive || this.contains(event.target)) return;
    this.onClose();
  }

  getOptionPosition() {
    const parentFieldset = this.closest(".product-form__controls");
    return Number(parentFieldset?.dataset?.optionPosition || -1);
  }

  updateCurrentOption(selectedValues = []) {
    // Method is used to synchronize after changes options in sticky bar.
    if (!this.initElements() || this.optionPosition === -1) return;
    if (!selectedValues?.length) return;

    const newValue = selectedValues[this.optionPosition - 1];
    if (!newValue) return;

    const currentValueEl = this.currentEl.querySelector(
      "[data-dropdown-current-value]"
    );
    if (!currentValueEl) return;

    currentValueEl.textContent = newValue;
    this.hiddenInput.value = newValue;

    this.inputs.forEach((input) => {
      const isSelected = input.value === newValue;
      input.checked = isSelected;
      if (isSelected) {
        input.setAttribute("checked", "");
      } else {
        input.removeAttribute("checked");
      }
    });

    if (this.hasColorSwatch) {
      const selectedLi = this.optionsEls.find(
        (optionEl) => optionEl.dataset.value === newValue
      );
      const newColor = selectedLi?.dataset?.color;
      if (newColor) {
        this.hiddenInput.dataset.colorSwatch = newColor;
        this.currentEl.style.setProperty("--swatch-color", newColor);
      }
    }
  }
}

if (!customElements.get("variant-dropdown-select")) {
  customElements.define("variant-dropdown-select", VariantDropdownSelect);
}
class PasswordViewer {
  constructor() {
    const passwordField = document.querySelectorAll(".field--pass");

    passwordField.forEach((el) => {
      const input = el.querySelector("input");
      const btnWrapper = el.querySelector(".button-pass-visibility");
      const btnOpen = el.querySelector(".icon-eye-close");
      const btnClose = el.querySelector(".icon-eye");

      input.addEventListener("input", () => {
        input.value !== ""
          ? (btnWrapper.style.display = "block")
          : (btnWrapper.style.display = "none");
      });

      btnOpen.addEventListener("click", () => {
        input.type = "text";
        btnOpen.style.display = "none";
        btnClose.style.display = "block";
      });

      btnClose.addEventListener("click", () => {
        input.type = "password";
        btnOpen.style.display = "block";
        btnClose.style.display = "none";
      });
    });
  }
}

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();

    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      if (this.querySelector(".product-recommendations__loading")) {
        this.querySelector(".product-recommendations__loading").classList.add(
          "loading"
        );
        this.querySelector(".product-recommendations__loading").style.display =
          "flex";
      }

      fetch(this.dataset.url)
        .then((response) => response.text())
        .then((text) => {
          const html = document.createElement("div");
          html.innerHTML = text;
          const recommendations = html.querySelector("product-recommendations");
          if (recommendations && recommendations.innerHTML.trim().length) {
            this.innerHTML = recommendations.innerHTML;
            window.MottoYotpo?.scheduleRefresh();
          }

          if (this.querySelector(".product-recommendations__empty")) {
            this.querySelector(
              ".product-recommendations__empty"
            ).style.display = "flex";
          }

          /* Color swatches */
          const generateSrcset = (image, widths = []) => {
            const imageUrl = new URL(image["src"]);
            return widths
              .filter((width) => width <= image["width"])
              .map((width) => {
                imageUrl.searchParams.set("width", width.toString());
                return `${imageUrl.href} ${width}w`;
              })
              .join(", ");
          };

          const createImageElement = (image, classes, sizes, productTitle) => {
            const previewImage = image["preview_image"];
            const newImage = new Image(
              previewImage["width"],
              previewImage["height"]
            );
            newImage.className = classes;
            newImage.alt = image["alt"] || productTitle;
            newImage.sizes = sizes;
            newImage.src = previewImage["src"];
            newImage.srcset = generateSrcset(
              previewImage,
              [165, 360, 533, 720, 940, 1066]
            );
            newImage.loading = "lazy";
            return newImage;
          };

          const checkSwatches = () => {
            document
              .querySelectorAll(".js-color-swatches-wrapper")
              .forEach((wrapper) => {
                wrapper
                  .querySelectorAll(".js-color-swatches input")
                  .forEach((input) => {
                    input.addEventListener("click", (event) => {
                      const primaryImage =
                        wrapper.querySelector(".media--first");
                      const secondaryImage =
                        wrapper.querySelector(".media--second");
                      const handleProduct = wrapper.dataset.product;

                      if (event.currentTarget.checked && primaryImage) {
                        wrapper
                          .querySelector(".js-color-swatches-link")
                          .setAttribute(
                            "href",
                            event.currentTarget.dataset.variantLink
                          );
                        if (
                          wrapper.querySelector(
                            '.card__add-to-cart button[name="add"]'
                          )
                        ) {
                          wrapper
                            .querySelector(
                              '.card__add-to-cart button[name="add"]'
                            )
                            .setAttribute("aria-disabled", false);
                          if (
                            wrapper.querySelector(
                              '.card__add-to-cart button[name="add"] > span'
                            )
                          ) {
                            wrapper
                              .querySelector(
                                '.card__add-to-cart button[name="add"] > span'
                              )
                              .classList.remove("hidden");
                            wrapper
                              .querySelector(
                                '.card__add-to-cart button[name="add"] .sold-out-message'
                              )
                              .classList.add("hidden");
                          }
                          wrapper.querySelector(
                            '.card__add-to-cart input[name="id"]'
                          ).value = event.currentTarget.dataset.variantId;
                        }
                        const currentColor = event.currentTarget.value;

                        jQuery.getJSON(
                          window.Shopify.routes.root +
                            `products/${handleProduct}.js`,
                          function (product) {
                            const variant = product.variants.filter(
                              (item) =>
                                item.featured_media != null &&
                                item.options.includes(currentColor)
                            )[0];

                            if (variant) {
                              const newPrimaryImage = createImageElement(
                                variant["featured_media"],
                                primaryImage.className,
                                primaryImage.sizes,
                                product.title
                              );

                              if (newPrimaryImage.src !== primaryImage.src) {
                                let flag = false;
                                if (secondaryImage) {
                                  const secondaryImagePathname = new URL(
                                    secondaryImage.src
                                  ).pathname;
                                  const newPrimaryImagePathname = new URL(
                                    newPrimaryImage.src
                                  ).pathname;

                                  if (
                                    secondaryImagePathname ==
                                    newPrimaryImagePathname
                                  ) {
                                    primaryImage.remove();
                                    secondaryImage.classList.remove(
                                      "media--second"
                                    );
                                    secondaryImage.classList.add(
                                      "media--first"
                                    );
                                    flag = true;
                                  }
                                }
                                if (flag == false) {
                                  primaryImage.animate(
                                    { opacity: [1, 0] },
                                    {
                                      duration: 200,
                                      easing: "ease-in",
                                      fill: "forwards",
                                    }
                                  ).finished;
                                  setTimeout(function () {
                                    primaryImage.replaceWith(newPrimaryImage);
                                    newPrimaryImage.animate(
                                      { opacity: [0, 1] },
                                      { duration: 200, easing: "ease-in" }
                                    );
                                    if (secondaryImage) {
                                      secondaryImage.remove();
                                    }
                                  }, 200);
                                }
                              }
                            }
                          }
                        );
                      }
                    });
                  });
              });
          };

          checkSwatches();

          const addClasses = (slider) => {
            const sliderWrapper = slider.querySelector(
              ".product-recommendations__wrapper"
            );
            const slides = slider.querySelectorAll(
              ".product-recommendations__item"
            );

            slider.classList.add("swiper");
            if (sliderWrapper) sliderWrapper.classList.add("swiper-wrapper");

            if (slides.length > 1) {
              slides.forEach((slide) => {
                slide.classList.add("swiper-slide");
              });
            }
          };

          if (window.initProductsSliders) {
            window.initProductsSliders(this);
          }
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          if (this.querySelector(".product-recommendations__loading")) {
            this.querySelector(
              ".product-recommendations__loading"
            ).classList.remove("loading");
            this.querySelector(".product-recommendations__loading").remove();
          }
        });
    };

    new IntersectionObserver(handleIntersection.bind(this), {
      rootMargin: "0px 0px 200px 0px",
    }).observe(this);
  }
}

customElements.define("product-recommendations", ProductRecommendations);

class LocalizationForm extends HTMLElement {
  constructor() {
    super();

    this.elements = {
      input: this.querySelector(
        'input[name="locale_code"], input[name="country_code"]'
      ),
      button: this.querySelector("button"),
      panel: this.querySelector("ul"),
    };

    this.isOpen = false;

    this.onButtonClick = this.onButtonClick.bind(this);
    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onContainerKeyUp = this.onContainerKeyUp.bind(this);

    this.elements.button.addEventListener("click", this.onButtonClick);
    document.addEventListener("click", this.onDocumentClick);
    this.addEventListener("keyup", this.onContainerKeyUp);

    this.querySelectorAll("a").forEach((item) =>
      item.addEventListener("click", this.onItemClick.bind(this))
    );
  }

  hidePanel() {
    this.isOpen = false;
    this.elements.panel.setAttribute("hidden", true);
    this.elements.button.setAttribute("aria-expanded", "false");
  }

  showPanel() {
    this.isOpen = true;
    this.elements.panel.removeAttribute("hidden");
    this.elements.button.setAttribute("aria-expanded", "true");
  }

  onButtonClick(event) {
    event.stopPropagation();

    document.querySelectorAll("localization-form").forEach((form) => {
      if (form !== this) {
        form.hidePanel();
      }
    });

    this.isOpen ? this.hidePanel() : this.showPanel();
    this.elements.button.focus();
  }

  onDocumentClick(event) {
    if (!this.isOpen) return;
    if (!this.contains(event.target)) {
      this.hidePanel();
    }
  }

  onContainerKeyUp(event) {
    if (event.key !== "Escape") return;

    this.hidePanel();
    this.elements.button.focus();
  }

  onItemClick(event) {
    event.preventDefault();
    this.elements.input.value = event.currentTarget.dataset.value;
    this.querySelector("form")?.submit();
  }
}

customElements.define("localization-form", LocalizationForm);
(function () {
  const initHeaderOverlay = () => {
    const main = document.getElementById("MainContent");
    const sections = main.querySelectorAll(".shopify-section");

    if (sections.length > 0) {
      const sectionFirstChild = sections[0].querySelector(
        "[data-header-overlay]"
      );
      const sectionFirstChildTransparent = sections[0].querySelector(
        "[data-header-transparent]"
      );
      const headerGroupSections = document.querySelectorAll(
        ".shopify-section-group-header-group"
      );
      const header = document.querySelector(".shopify-section-header");
      const headerTransparent = header
        .querySelector(".header-wrapper")
        .classList.contains("header-wrapper--full-width");
      const colorScheme = sectionFirstChild?.getAttribute(
        "data-header-transparent-color-scheme"
      );

      if (sectionFirstChild) {
        if (headerGroupSections[headerGroupSections.length - 1] === header) {
          sections[0].classList.add("section--has-overlay");
          if (sectionFirstChildTransparent && headerTransparent) {
            header.classList.add("color-background-overlay");
            header.classList.forEach((className) => {
              if (
                className.startsWith("color-background-") &&
                className != "color-background-overlay"
              ) {
                header.classList.remove(className);
              }
            });
            header.classList.add(colorScheme);
          }
        } else {
          sections[0].classList.remove("section--has-overlay");
          if (sectionFirstChildTransparent && headerTransparent) {
            header.classList.remove("color-background-overlay");
            //header.classList.remove(colorScheme)
            header.classList.forEach((className) => {
              if (
                className.startsWith("color-background-") &&
                className != "color-background-overlay"
              ) {
                header.classList.remove(className);
              }
            });
          }
        }
      } else {
        sections[0].classList.remove("section--has-overlay");
        if (sectionFirstChildTransparent && headerTransparent) {
          header.classList.remove("color-background-overlay");
          //header.classList.remove(colorScheme)
          header.classList.forEach((className) => {
            if (
              className.startsWith("color-background-") &&
              className != "color-background-overlay"
            ) {
              header.classList.remove(className);
            }
          });
        }
      }
    }
  };

  initHeaderOverlay();

  document.addEventListener("shopify:section:load", initHeaderOverlay);
  document.addEventListener("shopify:section:unload", initHeaderOverlay);
  document.addEventListener("shopify:section:reorder", initHeaderOverlay);
})();

function formatMoney(cents, format = "") {
  if (typeof cents === "string") {
    cents = cents.replace(".", "");
  }

  cents = parseInt(cents, 10);

  let value = "";
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || theme.moneyFormat;

  function formatWithDelimiters(
    number,
    precision = 2,
    thousands = ",",
    decimal = "."
  ) {
    if (isNaN(number) || number == null) {
      return "0";
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split(".");
    const dollarsAmount = parts[0].replace(
      /(\d)(?=(\d{3})+(?!\d))/g,
      `$1${thousands}`
    );
    const centsAmount = precision > 0 ? decimal + parts[1] : "";

    return dollarsAmount + centsAmount;
  }

  const match = formatString.match(placeholderRegex);
  const formatType = match ? match[1] : "amount";

  switch (formatType) {
    case "amount":
      value = formatWithDelimiters(cents, 2, ",", ".");
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0, ",", ".");
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
    case "amount_with_apostrophe_separator":
      value = formatWithDelimiters(cents, 2, "'", ".");
      break;
    case "amount_no_decimals_with_space_separator":
      value = formatWithDelimiters(cents, 0, " ", ".");
      break;
    case "amount_with_space_separator":
      value = formatWithDelimiters(cents, 2, " ", ",");
      break;
    case "amount_with_period_and_space_separator":
      value = formatWithDelimiters(cents, 2, " ", ".");
      break;
    default:
      value = formatWithDelimiters(cents, 2, ",", ".");
  }

  return formatString.replace(placeholderRegex, value);
}

// cart:refresh

document.documentElement.addEventListener("cart:refresh", () => {
  const sectionsToUpdate = [
    { id: "main-cart-items", selector: ".js-contents" },
    { id: "main-cart-footer", selector: ".js-contents-totals" },
    { id: "cart-icon-bubble", selector: ".shopify-section" },
    { id: "cart-live-region-text", selector: ".shopify-section" },
  ];

  const shipping = document.getElementById("main-cart-shipping");
  if (shipping) {
    sectionsToUpdate.push({
      id: "main-cart-shipping",
      selector: ".js-contents-shipping",
    });
  }

  sectionsToUpdate.forEach((section) => {
    fetch(`${routes.cart_url}?section_id=${section.id}`)
      .then((r) => r.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const src = doc.querySelector(section.selector);
        const dst = document.querySelector(
          `#${section.id} ${section.selector}`
        );

        if (src && dst) dst.innerHTML = src.innerHTML;
      })
      .catch((e) => console.error("[cart:refresh] error:", e));
  });
});

// end cart:refresh
