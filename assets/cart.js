class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener("click", (event) => {
      event.preventDefault();
      const cartItems =
        this.closest("cart-items") || this.closest("cart-drawer-items");
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById("shopping-cart-line-item-status") ||
      document.getElementById("CartDrawer-LineItemStatus");

    if (document.querySelector(".cart-shipping")) {
      this.minSpend = document.querySelector(".cart-shipping").dataset.minSpend;
      this.minTotal = Math.round(this.minSpend * (Shopify.currency.rate || 1));
      this.cartShipping();
    }

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener("change", debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  cartShipping() {
    let progressPrev = getComputedStyle(
      document.querySelector(".cart-shipping__progress-current")
    ).getPropertyValue("width");
    document.documentElement.style.setProperty("--progress-prev", progressPrev);

    this.total = document.querySelector(".cart-shipping").dataset.total;
    this.progress = (this.total / this.minTotal) * 100;
    if (this.progress > 100) this.progress = 100;

    if (this.minTotal > this.total) {
      let amount = this.minTotal - this.total;
      let message = document
        .querySelector(".cart-shipping")
        .dataset.message.replace("||amount||", formatMoney(amount));
      document.querySelector(".cart-shipping__message_default").innerText =
        message;
      document
        .querySelector(".cart-shipping__message_success")
        .classList.remove("active");
      document
        .querySelector(".cart-shipping__message_default")
        .classList.add("active");
    } else {
      document
        .querySelector(".cart-shipping__message_default")
        .classList.remove("active");
      document
        .querySelector(".cart-shipping__message_success")
        .classList.add("active");
    }

    document.querySelector(".cart-shipping__progress-current").style.width =
      this.progress + "%";
  }

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(
      PUB_SUB_EVENTS.cartUpdate,
      (event) => {
        if (event.source === "cart-items") {
          return;
        }
        this.onCartUpdate();
      }
    );
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index,
      event.target.value,
      document.activeElement.getAttribute("name")
    );
  }

  onCartUpdate() {
    fetch(`${routes.cart_url}?section_id=main-cart-items`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, "text/html");
        const sourceQty = html.querySelector("cart-items");
        this.innerHTML = sourceQty.innerHTML;
      })
      .catch((e) => {
        console.error(e);
      });
  }

  getSectionsToRender() {
    const sections = [
      {
        id: "main-cart-items",
        section: document.getElementById("main-cart-items").dataset.id,
        selector: ".js-contents",
      },
      {
        id: "cart-icon-bubble",
        section: "cart-icon-bubble",
        selector: ".shopify-section",
      },
      {
        id: "cart-live-region-text",
        section: "cart-live-region-text",
        selector: ".shopify-section",
      },
      {
        id: "main-cart-footer",
        section: document.getElementById("main-cart-footer").dataset.id,
        selector: ".js-contents-totals",
      },
    ];

    const shippingSection = document.getElementById("main-cart-shipping");

    return shippingSection
      ? [
          ...sections,
          {
            id: "main-cart-shipping",
            section: shippingSection.dataset.id || null,
            selector: ".js-contents-shipping",
          },
        ]
      : sections;
  }

  updateQuantity(line, quantity, name) {
    this.enableLoading(line);
    this.querySelectorAll(".quantity__button").forEach((button) =>
      button.classList.add("disabled")
    );

    if (
      document.querySelectorAll(
        '.card--product card__add-to-cart button[name="add"]'
      )
    ) {
      document
        .querySelectorAll(
          '.card--product .card__add-to-cart button[name="add"]'
        )
        .forEach((button) => {
          button.setAttribute("aria-disabled", false);
          if (button.querySelector("span")) {
            button.querySelector("span").classList.remove("hidden");
            button.querySelector(".sold-out-message").classList.add("hidden");
          }
        });
    }

    if (document.querySelector(".cart-shipping")) {
      let progressPrev = getComputedStyle(
        document.querySelector(".cart-shipping__progress-current")
      ).getPropertyValue("width");
      document.documentElement.style.setProperty(
        "--progress-prev",
        progressPrev
      );
    }

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
          document.getElementById(`Quantity-${line}`) ||
          document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll(".cart-item");
        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute("value");
          this.updateLiveRegions(line, parsedState.errors);

          // dispatch cart:error
          document.dispatchEvent(
            new CustomEvent("cart:error", {
              detail: {
                source: this.dataset.source,
                productVariantId: items[line - 1].dataset.variantId || line,
                errors: parsedState.errors,
                message: parsedState.errors,
              },
            })
          );

          return;
        }

        // dispatch line-item:change for the modified element
        document.dispatchEvent(
          new CustomEvent("line-item:change", {
            detail: {
              lineItem: parsedState.items[line - 1] || null,
              cart: parsedState,
              sectionId: this.dataset.source,
            },
          })
        );

        this.classList.toggle("is-empty", parsedState.item_count === 0);

        // dispatch cart:change for the entire basket
        document.dispatchEvent(
          new CustomEvent("cart:change", {
            detail: {
              cart: parsedState,
              sectionId: this.dataset.source,
            },
          })
        );

        const cartDrawerWrapper = document.querySelector("cart-drawer");
        const cartFooter = document.getElementById("main-cart-footer");

        if (cartFooter)
          cartFooter.classList.toggle("is-empty", parsedState.item_count === 0);
        if (cartDrawerWrapper)
          cartDrawerWrapper.classList.toggle(
            "is-empty",
            parsedState.item_count === 0
          );

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace =
            document
              .getElementById(section.id)
              .querySelector(section.selector) ||
            document.getElementById(section.id);
          elementToReplace.innerHTML = this.getSectionInnerHTML(
            parsedState.sections[section.section],
            section.selector
          );
        });
        const updatedValue = parsedState.items[line - 1]
          ? parsedState.items[line - 1].quantity
          : undefined;
        let message = "";
        if (
          items.length === parsedState.items.length &&
          updatedValue !== parseInt(quantityElement.value)
        ) {
          if (typeof updatedValue === "undefined") {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace(
              "[quantity]",
              updatedValue
            );
          }
        }
        this.updateLiveRegions(line, message);

        const lineItem =
          document.getElementById(`CartItem-${line}`) ||
          document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
            ? trapFocus(
                cartDrawerWrapper,
                lineItem.querySelector(`[name="${name}"]`)
              )
            : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper.querySelector(".drawer__inner-empty"),
            cartDrawerWrapper.querySelector("a")
          );
        } else if (document.querySelector(".cart-item") && cartDrawerWrapper) {
          trapFocus(
            cartDrawerWrapper,
            document.querySelector(".cart-item__name")
          );
        }
        publish(PUB_SUB_EVENTS.cartUpdate, { source: "cart-items" });
      })
      .catch(() => {
        this.querySelectorAll(".loading-overlay").forEach((overlay) =>
          overlay.classList.add("hidden")
        );
        this.querySelectorAll(".quantity__button").forEach((button) =>
          button.classList.remove("disabled")
        );
        const errors =
          document.getElementById("cart-errors") ||
          document.getElementById("CartDrawer-CartErrors");
        if (errors) errors.textContent = window.cartStrings.error;
        const items = document.querySelectorAll(".cart-item");

        // dispatch cart:error when fetch fail
        document.dispatchEvent(
          new CustomEvent("cart:error", {
            detail: {
              source: this.dataset.source,
              productVariantId: items[line - 1].dataset.variantId || line,
              errors: window.cartStrings.error,
              message: window.cartStrings.error,
            },
          })
        );
      })
      .finally(() => {
        this.querySelectorAll(".quantity__button").forEach((button) =>
          button.classList.remove("disabled")
        );
        if (document.querySelector(".cart-shipping")) {
          this.cartShipping();
        }
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) ||
      document.getElementById(`CartDrawer-LineItemError-${line}`);

    if (lineItemError) {
      if (message) {
        lineItemError.style.display = "flex";
        lineItemError.querySelector(".cart-item__error-text").innerHTML =
          message;
      } else {
        lineItemError.style.display = "none";
        lineItemError.querySelector(".cart-item__error-text").innerHTML = "";
      }
    }

    this.lineItemStatusElement.setAttribute("aria-hidden", true);

    const cartStatus =
      document.getElementById("cart-live-region-text") ||
      document.getElementById("CartDrawer-LiveRegionText");
    cartStatus.setAttribute("aria-hidden", false);

    setTimeout(() => {
      cartStatus.setAttribute("aria-hidden", true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems =
      document.getElementById("main-cart-items") ||
      document.getElementById("CartDrawer-CartItems");
    if (mainCartItems) mainCartItems.classList.add("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading-overlay`
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    );

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) =>
      overlay.classList.remove("hidden")
    );

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute("aria-hidden", false);
  }

  disableLoading(line) {
    const mainCartItems =
      document.getElementById("main-cart-items") ||
      document.getElementById("CartDrawer-CartItems");
    if (mainCartItems) mainCartItems.classList.remove("cart__items--disabled");

    const cartItemElements = this.querySelectorAll(
      `#CartItem-${line} .loading-overlay`
    );
    const cartDrawerItemElements = this.querySelectorAll(
      `#CartDrawer-Item-${line} .loading-overlay`
    );

    cartItemElements.forEach((overlay) => overlay.classList.add("hidden"));
    cartDrawerItemElements.forEach((overlay) =>
      overlay.classList.add("hidden")
    );
  }
}

customElements.define("cart-items", CartItems);

if (!customElements.get("cart-note")) {
  customElements.define(
    "cart-note",
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          "change",
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, {
              ...fetchConfig(),
              ...{ body },
            });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}

class CartDiscountCode extends HTMLElement {
  constructor() {
    super();

    this.activeFetch = null;
  }

  connectedCallback() {
    this.#initRefs();
    this.form = this.querySelector("form");
    this.input = this.querySelector('input[name="discount"]');
    this.submitBtn = this.querySelector('button[type="submit"]');

    this.form?.addEventListener("submit", this.applyDiscount);
    this.addEventListener("click", this.removeDiscount);
  }

  disconnectedCallback() {
    this.form?.removeEventListener("submit", this.applyDiscount);
    this.removeEventListener("click", this.removeDiscount);

    if (this.activeFetch) {
      this.activeFetch.abort();
      this.activeFetch = null;
    }
  }

  #initRefs() {
    this.refs = {};
    for (const el of this.querySelectorAll("[ref]")) {
      const name = el.getAttribute("ref");
      if (name && el instanceof HTMLElement) this.refs[name] = el;
    }
  }

  #createAbortController() {
    if (this.activeFetch) {
      this.activeFetch.abort();
    }

    const abortController = new AbortController();
    this.activeFetch = abortController;
    return abortController;
  }

  #normalizeDiscountCode(code) {
    return code.trim().toLowerCase();
  }

  #isSameDiscountCode(codeA, codeB) {
    return (
      this.#normalizeDiscountCode(codeA) === this.#normalizeDiscountCode(codeB)
    );
  }

  applyDiscount = async (event) => {
    const {
      cartDiscountError,
      cartDiscountErrorDiscountCode,
      cartDiscountErrorShipping,
    } = this.refs;

    event.preventDefault();
    event.stopPropagation();

    const form = event.target;

    if (
      !(form instanceof HTMLFormElement) ||
      !(this.input instanceof HTMLInputElement) ||
      typeof this.dataset.sectionId !== "string"
    ) {
      return;
    }

    const discountCodeValue = this.input.value.trim();
    if (!discountCodeValue) return;

    const abortController = this.#createAbortController();

    if (this.submitBtn) this.submitBtn.classList.add("loading");

    try {
      const existingDiscounts = this.#existingDiscounts();
      if (
        existingDiscounts.some((code) =>
          this.#isSameDiscountCode(code, discountCodeValue)
        )
      ) {
        return;
      }

      cartDiscountError.classList.add("hidden");
      cartDiscountErrorDiscountCode.classList.add("hidden");
      cartDiscountErrorShipping.classList.add("hidden");

      const body = JSON.stringify({
        discount: [...existingDiscounts, discountCodeValue].join(","),
        sections: [this.dataset.sectionId],
        sections_url: this.#getSectionsUrl(),
      });

      const response = await fetch(routes.cart_update_url, {
        ...fetchConfig(),
        ...{ body },
        signal: abortController.signal,
      });

      const data = await response.json();

      if (!this.#checkApplicableCode(data.discount_codes, discountCodeValue)) {
        return;
      }

      const sourceSection = this.#getNewSectionHtml(data.sections);

      if (sourceSection) {
        if (
          !this.#checkShippingDiscountCode(
            data.discount_codes,
            discountCodeValue,
            sourceSection
          )
        ) {
          return;
        }

        this.#updateSectionHtml(sourceSection);
      }
    } catch (error) {
      console.error("Failed to apply discount:", error);
    } finally {
      this.activeFetch = null;
      if (this.submitBtn) this.submitBtn.classList.remove("loading");
    }
  };

  removeDiscount = async (event) => {
    if (!(event.target instanceof Element)) return;
    if (typeof this.dataset.sectionId !== "string") return;

    const pill = event.target.closest(".cart-discount-code__pill");
    if (!(pill instanceof HTMLLIElement)) return;

    event.preventDefault();
    event.stopPropagation();

    const discountCode = pill.dataset.discountCode;
    if (!discountCode) return;

    const existingDiscounts = this.#existingDiscounts();
    const index = existingDiscounts.findIndex((code) =>
      this.#isSameDiscountCode(code, discountCode)
    );
    if (index === -1) return;

    existingDiscounts.splice(index, 1);

    const abortController = this.#createAbortController();

    if (this.submitBtn) this.submitBtn.classList.add("loading");

    try {
      const body = JSON.stringify({
        discount: existingDiscounts.join(","),
        sections: [this.dataset.sectionId],
        sections_url: this.#getSectionsUrl(),
      });

      const response = await fetch(routes.cart_update_url, {
        ...fetchConfig(),
        ...{ body },
        signal: abortController.signal,
      });

      const data = await response.json();

      const sourceSection = this.#getNewSectionHtml(data.sections);
      this.#updateSectionHtml(sourceSection);
    } catch (error) {
      console.error("Failed to remove discount:", error);
    } finally {
      this.activeFetch = null;
      if (this.submitBtn) this.submitBtn.classList.remove("loading");
    }
  };

  #handleDiscountError(type) {
    const {
      cartDiscountError,
      cartDiscountErrorDiscountCode,
      cartDiscountErrorShipping,
    } = this.refs;

    const target =
      type === "discount_code"
        ? cartDiscountErrorDiscountCode
        : cartDiscountErrorShipping;
    cartDiscountError.classList.remove("hidden");
    target.classList.remove("hidden");
  }

  #existingDiscounts() {
    const discountCodes = [];
    const discountPills = this.querySelectorAll(".cart-discount-code__pill");
    for (const pill of discountPills) {
      if (
        pill instanceof HTMLLIElement &&
        typeof pill.dataset.discountCode === "string"
      ) {
        discountCodes.push(pill.dataset.discountCode);
      }
    }

    return discountCodes;
  }

  #checkApplicableCode(cartDiscountCodes, discountCodeValue) {
    if (
      cartDiscountCodes.find((discount) => {
        return (
          this.#isSameDiscountCode(discount.code, discountCodeValue) &&
          discount.applicable === false
        );
      })
    ) {
      this.input.value = "";
      this.#handleDiscountError("discount_code");
      return false;
    }
    return true;
  }

  #checkShippingDiscountCode(
    cartDiscountCodes,
    discountCodeValue,
    sourceSection
  ) {
    const discountCodes =
      sourceSection?.querySelectorAll(".cart-discount-code__pill") || [];
    const existingDiscounts = this.#existingDiscounts();

    const codes = Array.from(discountCodes)
      .map((element) =>
        element instanceof HTMLLIElement ? element.dataset.discountCode : null
      )
      .filter(Boolean);
    const normalizedExistingDiscounts = existingDiscounts.map((code) =>
      this.#normalizeDiscountCode(code)
    );

    if (
      codes.length === existingDiscounts.length &&
      codes.every((code) =>
        normalizedExistingDiscounts.includes(this.#normalizeDiscountCode(code))
      ) &&
      cartDiscountCodes.find((discount) => {
        return (
          this.#isSameDiscountCode(discount.code, discountCodeValue) &&
          discount.applicable === true
        );
      })
    ) {
      this.#handleDiscountError("shipping");
      this.input.value = "";
      return false;
    }
    return true;
  }

  #getSectionsUrl() {
    if (this.dataset.sectionId === "cart-drawer") {
      return routes.cart_url;
    }

    return window.location.pathname;
  }

  #getNewSectionHtml(cartSections) {
    const newHtml = cartSections[this.dataset.sectionId];
    const parsedHtml = new DOMParser().parseFromString(newHtml, "text/html");

    const sectionId =
      this.dataset.sectionId === "cart-drawer"
        ? "CartDrawer"
        : `shopify-section-${this.dataset.sectionId}`;
    const sourceSection = parsedHtml.getElementById(sectionId);

    return sourceSection;
  }

  #updateSectionHtml(sourceSection) {
    if (!sourceSection) return;

    const targetSection =
      this.dataset.sectionId === "cart-drawer"
        ? document.getElementById("CartDrawer")
        : document.getElementById(`shopify-section-${this.dataset.sectionId}`);

    if (!targetSection) return;

    targetSection.innerHTML = sourceSection.innerHTML;

    if (this.dataset.sectionId === "cart-drawer") {
      document.querySelector("cart-drawer")?.addCloseButtonHandlers?.();
    }
  }
}

if (!customElements.get("cart-discount-code")) {
  customElements.define("cart-discount-code", CartDiscountCode);
}
