(function () {
  const initProductAccordion = () => {
    const aboutToggleItems = $(".about__accordion-toggle");

    aboutToggleItems.each(function () {
      const currentToggle = $(this);
      const siblingToggles = currentToggle.siblings(
        ".about__accordion-description"
      );

      currentToggle.click(function () {
        if (!currentToggle.hasClass("active")) {
          aboutToggleItems.each(function () {
            const siblingToggle = $(this);
            siblingToggle.removeClass("active");
            siblingToggle
              .siblings(".about__accordion-description")
              .stop()
              .slideUp(300);
          });

          currentToggle.addClass("active");

          siblingToggles.stop().slideDown(300);
        } else {
          currentToggle.removeClass("active");
          siblingToggles.stop().slideUp(300);
        }
      });
    });
  };

  const initZoomImage = () => {
    const imagesWrapper = document.querySelector(
      ".product-media-modal__content"
    );
    const images = imagesWrapper?.querySelectorAll(".js-image-zoom") || [];

    images.forEach((el) => {
      el.addEventListener("click", (e) => {
        imagesWrapper.classList.toggle("zoom");
      });
    });
  };

  const formatFreeShippingAmount = (value) => {
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = theme.moneyFormat;

    return formatString.replace(placeholderRegex, value);
  };

  const setTotalFreeShipping = () => {
    if (document.querySelector(".js-free-shipping")) {
      const freeShippingTotal = document.querySelector(".free-shipping-total");
      if (freeShippingTotal) {
        const minSpend = Number(freeShippingTotal.dataset.minSpend);
        if (minSpend && minSpend > 0) {
          freeShippingTotal.innerText = `${formatFreeShippingAmount(
            Math.round(minSpend * (Shopify.currency.rate || 1))
          )}`;
        }
      }
    }
  };
  function changeIconsViewBox() {
    const textWithIcon = document.querySelectorAll(".text_with_icon");
    textWithIcon.forEach((item) => {
      const icons = item.querySelectorAll(".icon-pack");
      icons.forEach((icon) => {
        icon.setAttribute("viewBox", "0 0 20 20");
      });
    });
  }

  //document.addEventListener('scroll', () => {
  //	const navigation = document.querySelector('.product__media_navigation')
  //	if (navigation) {
  //		const footer = document.querySelector('.footer')
  //		const navigationHeight = navigation.offsetHeight
  //		const screen = window.scrollY
  //		const overview = document.querySelector('#overview').scrollTop
  //		const overviewBottom =
  //			document.querySelector('#overview').clientHeight + overview
  //		if (screen >= overview && screen <= overviewBottom) {
  //			document.querySelector('#overview-link').classList.add('active')
  //		} else {
  //			document.querySelector('#overview-link').classList.remove('active')
  //		}
  //		if (window.innerHeight + screen - navigationHeight > footer.offsetTop) {
  //			navigation.style.opacity = '0'
  //			navigation.style.visibility = 'hidden'
  //		} else {
  //			navigation.style.opacity = '1'
  //			navigation.style.visibility = 'visible'
  //		}
  //	}
  //})

  const navigationSections = [
    {
      sectionSelector: "#overview",
      linkSelector: "#overview-link",
    },
    {
      sectionSelector: "#product-specifications",
      linkSelector: "#specifications-link",
    },
  ];

  function navigationInit(sections) {
    const navigation = document.querySelector(".product__media_navigation");
    if (navigation) {
      navigation.style.transform =
        "translateX(-50%) translateY(calc(100% + 16px))";
    }
    document.addEventListener("scroll", () => {
      if (navigation) {
        navigation.classList.add("show-navigation");
      }
      if (navigation) {
        const footer = document.querySelector(".footer");
        const navigationHeight = navigation.offsetHeight;
        const secondSection = document.querySelectorAll(
          "#MainContent .shopify-section"
        )[1];
        const screen = window.scrollY;
        sections.forEach((section, i) => {
          if (section) {
            const em = document.querySelector(`${section.sectionSelector}`);
            if (em) {
              const rect = em.getBoundingClientRect();
              if (rect.top <= 1 && rect.top > rect.height * -1) {
                document
                  .querySelector(`${section.linkSelector}`)
                  .classList.add("active");
              } else {
                document
                  .querySelector(`${section.linkSelector}`)
                  .classList.remove("active");
              }
              document
                .querySelector(`${section.linkSelector}`)
                .addEventListener("click", () => {
                  em.scrollIntoView({ behavior: "smooth" });
                });
            } else {
              document.querySelector(`${section.linkSelector}`).style.display =
                "none";
            }
          }
        });

        const rect = secondSection.getBoundingClientRect();
        const isSecondSectionScrolled = rect.top < 0;
        const isNearFooter =
          window.innerHeight + screen - navigationHeight > footer.offsetTop;

        navigation.style.transform =
          isSecondSectionScrolled && !isNearFooter
            ? "translateX(-50%) translateY(0)"
            : "translateX(-50%) translateY(calc(100% + 16px))";
      }
    });
  }

  document.addEventListener("shopify:section:load", function () {
    initProductAccordion();
    initZoomImage();
    setTotalFreeShipping();
    changeIconsViewBox();
    navigationInit(navigationSections);
  });

  navigationInit(navigationSections);
  initProductAccordion();
  initZoomImage();
  setTotalFreeShipping();
  changeIconsViewBox();
})();
