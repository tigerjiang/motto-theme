(function () {
  const selectors = {
    root: '[data-sam-app-showcase]',
    screens: '[data-sam-screen-slider]',
    content: '[data-sam-content-slider]',
    previous: '[data-sam-prev]',
    next: '[data-sam-next]',
  };

  const destroySlider = (element) => {
    if (element && element.swiper) element.swiper.destroy(true, true);
  };

  const initializeShowcase = (root) => {
    if (!window.Swiper || root.dataset.samInitialized === 'true') return;

    const screensElement = root.querySelector(selectors.screens);
    const contentElement = root.querySelector(selectors.content);
    const previousElement = root.querySelector(selectors.previous);
    const nextElement = root.querySelector(selectors.next);

    destroySlider(screensElement);
    destroySlider(contentElement);

    const contentSlider = contentElement
      ? new window.Swiper(contentElement, {
          effect: 'fade',
          fadeEffect: { crossFade: true },
          loop: contentElement.querySelectorAll('.swiper-slide').length > 1,
          navigation: {
            prevEl: previousElement,
            nextEl: nextElement,
          },
        })
      : null;

    const screenSlider = screensElement
      ? new window.Swiper(screensElement, {
          effect: 'fade',
          fadeEffect: { crossFade: true },
          loop: screensElement.querySelectorAll('.swiper-slide').length > 1,
          allowTouchMove: false,
          autoplay: {
            delay: 3000,
            disableOnInteraction: false,
          },
        })
      : null;

    if (contentSlider && screenSlider) {
      contentSlider.on('realIndexChange', () => {
        const targetIndex = contentSlider.realIndex % screenSlider.slides.length;
        screenSlider.slideToLoop(targetIndex);
      });
    }

    root.dataset.samInitialized = 'true';
  };

  const initializeAll = (scope = document) => {
    scope.querySelectorAll(selectors.root).forEach(initializeShowcase);
  };

  document.addEventListener('DOMContentLoaded', () => initializeAll());
  document.addEventListener('shopify:section:load', (event) => initializeAll(event.target));
})();
