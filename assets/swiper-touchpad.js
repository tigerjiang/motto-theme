/**
 * Two-finger trackpad swipe for all Swiper instances.
 * Uses a custom wheel handler (Swiper's built-in mousewheel module is disabled).
 */
(function () {
  const WHEEL_THRESHOLD = 36;
  const WHEEL_COOLDOWN_MS = 280;

  const resolveElement = (selector) => {
    if (!selector) return null;
    if (typeof selector === "string") {
      return document.querySelector(selector);
    }
    if (selector.nodeType === 1) return selector;
    if (selector.el?.nodeType === 1) return selector.el;
    return null;
  };

  const shouldEnableTouchpad = (element, params = {}) => {
    if (params.mousewheel === false) return false;
    if (params.touchpad === false) return false;
    if (element?.dataset?.touchpad === "false") return false;
    if (element?.closest?.('[data-touchpad="false"]')) return false;
    if (element?.classList?.contains("swiper--no-touchpad")) return false;
    // Continuous autoplay marquees should not be controlled via trackpad.
    if (params.autoplay?.delay === 0) return false;
    return true;
  };

  const disableNativeMousewheel = (params = {}) => {
    if (params.mousewheel === false) return params;

    const userMousewheel = params.mousewheel;
    const mousewheel =
      typeof userMousewheel === "object"
        ? { ...userMousewheel, enabled: false }
        : { enabled: false };

    return { ...params, mousewheel };
  };

  const chainInit = (params, onInit) => {
    const on = params.on || {};
    const prevInit = on.init;

    return {
      ...params,
      on: {
        ...on,
        init(...args) {
          onInit(this);
          if (typeof prevInit === "function") {
            prevInit.apply(this, args);
          }
        },
      },
    };
  };

  const bindTouchpadWheel = (swiper) => {
    const el = swiper?.el;
    if (!el || el.dataset.mottoTouchpadWheel === "1") return;

    el.dataset.mottoTouchpadWheel = "1";

    let pointerInside = false;
    let accumulatedDelta = 0;
    let lastSlideAt = 0;
    let disabled = false;

    const isReady = () => {
      if (disabled || !swiper || swiper.destroyed || swiper.enabled === false) {
        return false;
      }

      if (!(el instanceof Element) || !el.isConnected) return false;

      const wrapper = swiper.wrapperEl;
      if (!(wrapper instanceof Element) || !wrapper.isConnected) return false;

      if (!Array.isArray(swiper.slides) || swiper.slides.length === 0) {
        return false;
      }

      if (swiper.params.loop && swiper.slides.length < 2) return false;

      return true;
    };

    const navigate = (forward) => {
      if (!isReady()) return;

      try {
        if (swiper.params.loop && typeof swiper.slideToLoop === "function") {
          const nextIndex = forward
            ? swiper.realIndex + 1
            : swiper.realIndex - 1;
          swiper.slideToLoop(nextIndex);
          return;
        }

        if (forward) {
          if (swiper.isEnd) return;
          swiper.slideTo(swiper.activeIndex + 1);
          return;
        }

        if (swiper.isBeginning) return;
        swiper.slideTo(swiper.activeIndex - 1);
      } catch (_error) {
        // Ignore Swiper internal errors during destroy/re-init.
      }
    };

    const onPointerEnter = () => {
      pointerInside = true;
    };
    const onPointerLeave = () => {
      pointerInside = false;
      accumulatedDelta = 0;
    };

    const onWheel = (event) => {
      if (!isReady()) return;

      const isHorizontal = swiper.isHorizontal();
      const deltaX = event.deltaX;
      const deltaY = event.deltaY;
      const axisDelta = isHorizontal ? deltaX : deltaY;
      const crossDelta = isHorizontal ? deltaY : deltaX;

      const hasAxisIntent =
        Math.abs(axisDelta) > Math.abs(crossDelta) * 0.55 ||
        Math.abs(axisDelta) >= 8;

      if (!hasAxisIntent) return;

      if (!pointerInside && !el.contains(event.target)) return;

      const atStart = swiper.isBeginning && !swiper.params.loop;
      const atEnd = swiper.isEnd && !swiper.params.loop;

      if (axisDelta > 0 && atEnd) return;
      if (axisDelta < 0 && atStart) return;

      accumulatedDelta += axisDelta;

      const now = Date.now();
      if (
        Math.abs(accumulatedDelta) < WHEEL_THRESHOLD ||
        now - lastSlideAt < WHEEL_COOLDOWN_MS
      ) {
        return;
      }

      const forward = accumulatedDelta > 0;
      accumulatedDelta = 0;
      lastSlideAt = now;

      event.preventDefault();
      event.stopPropagation();

      navigate(forward);
    };

    const onDestroy = () => {
      disabled = true;
      el.removeEventListener("pointerenter", onPointerEnter);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("wheel", onWheel);
      delete el.dataset.mottoTouchpadWheel;
    };

    el.addEventListener("pointerenter", onPointerEnter);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("wheel", onWheel, { passive: false });

    swiper.on("destroy", onDestroy);
  };

  const prepareParams = (element, params = {}) => {
    if (!shouldEnableTouchpad(element, params)) {
      return params;
    }

    const paramsWithoutNative = disableNativeMousewheel(params);

    return chainInit(paramsWithoutNative, (swiper) => {
      bindTouchpadWheel(swiper);
    });
  };

  const patchSwiper = () => {
    const SwiperCtor = window.Swiper;
    if (!SwiperCtor || SwiperCtor.__mottoTouchpadPatched) return;

    function MottoSwiper(selector, params = {}) {
      const element = resolveElement(selector);
      const finalParams = prepareParams(element, params);
      return new SwiperCtor(selector, finalParams);
    }

    Object.assign(MottoSwiper, SwiperCtor);
    MottoSwiper.prototype = SwiperCtor.prototype;
    MottoSwiper.__mottoTouchpadPatched = true;

    window.Swiper = MottoSwiper;
    window.getSwiperTouchpadParams = () => ({ mousewheel: { enabled: false } });
  };

  patchSwiper();
  document.addEventListener("DOMContentLoaded", patchSwiper);
})();
