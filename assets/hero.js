(function () {
  const initHeroTextAnimation = (scope = document) => {
    const heroContents = scope.querySelectorAll(
      ".section-hero .hero__content--animation:not([data-animation-initialized])"
    );

    heroContents.forEach((content) => {
      content.dataset.animationInitialized = "true";

      const heading = content.querySelector(".js-split-text");
      if (heading && typeof SplitType !== "undefined") {
        new SplitType(heading);
        heading.classList.add("visible");
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            const lines = entry.target.querySelectorAll(".js-split-text .line");
            lines.forEach((line, index) => {
              line.classList.add("animated");
              Array.from(line.children).forEach((element) => {
                element.style.animationDelay = `${0.8 + index * 0.25}s`;
              });

              window.setTimeout(() => {
                line.style.overflow = "visible";
              }, 1400 + index * 250);
            });

            window.setTimeout(() => {
              entry.target.querySelectorAll(".js-fade").forEach((item) => {
                item.classList.add("visible");
              });
            }, 900 + lines.length * 250);

            observer.unobserve(entry.target);
          });
        },
        { rootMargin: "0px" }
      );

      observer.observe(content);
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    initHeroTextAnimation();
  });

  document.addEventListener("shopify:section:load", (event) => {
    initHeroTextAnimation(event.target);
  });
})();
