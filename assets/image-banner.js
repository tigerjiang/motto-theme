(function () {
  const initSection = (section) => {
    if (section._initialized) return;
    section._initialized = true;

    const sectionAnimated = section.querySelector(".image-banner__container");
    const heading = section.querySelector(".image-banner__heading");

    if (!sectionAnimated) return;

    const { animation, imageRatio } = section.dataset;
    const isAnimation = animation == "true" && imageRatio == "large";

    function changeSectionSizes() {
      const sectionTop = section.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (sectionTop <= 0 && window.innerWidth >= 750 && isAnimation) {
        const scrollProgress = Math.abs(sectionTop) / windowHeight;
        const clampedProgress = Math.min(Math.max(scrollProgress, 0), 1);
        const newSize = 100 - 55 * clampedProgress;

        if (heading) {
          heading.style.opacity = `${clampedProgress}`;
        }

        if (newSize < 75) {
          sectionAnimated.style.borderRadius = "var(--border-radius-main)";
          sectionAnimated.style.overflow = "hidden";
        } else {
          sectionAnimated.style.borderRadius = "0";
        }
        sectionAnimated.style.width = `${newSize}%`;
        sectionAnimated.style.height = `${newSize}%`;
      } else {
        sectionAnimated.style.borderRadius = "0";
        sectionAnimated.style.width = "100%";
        sectionAnimated.style.height = "100%";
      }
    }

    section._scrollHandler = changeSectionSizes;

    if (window.innerWidth >= 750) {
      window.addEventListener("scroll", changeSectionSizes);
    }
  };

  const initAllSections = () => {
    document.querySelectorAll(".image-banner-container").forEach((section) => {
      initSection(section);
    });
  };

  initAllSections();

  document.addEventListener("shopify:section:load", function (event) {
    const loadedSection = event.target?.querySelector(
      ".image-banner-container"
    );
    if (loadedSection) {
      loadedSection._initialized = false;
      initSection(loadedSection);
    } else {
      initAllSections();
    }
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll(".image-banner-container").forEach((section) => {
      if (section._scrollHandler) {
        window.removeEventListener("scroll", section._scrollHandler);
        section._scrollHandler = null;
      }
      section._initialized = false;
    });
    initAllSections();
  });
})();
