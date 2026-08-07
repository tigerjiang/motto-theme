if (!customElements.get("product-form")) {
  customElements.define(
    "product-form",
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector("form");
        this.form.addEventListener("submit", this.onSubmitHandler.bind(this));
        this.cart = document.querySelector("cart-drawer");
        this.hideErrors = this.dataset.hideErrors === "true";
        this.refreshSubmitElements();
      }

      refreshSubmitElements() {
        this.submitButton =
          this.querySelector('[type="submit"][name="add"]') ||
          this.querySelector('button[name="add"]') ||
          this.querySelector('[type="submit"]');
        this.submitSpinner =
          this.submitButton?.querySelector(".loading-overlay__spinner") ||
          this.querySelector(".loading-overlay__spinner");

        if (document.querySelector("cart-drawer") && this.submitButton) {
          this.submitButton.setAttribute("aria-haspopup", "dialog");
        }
      }

      getSubmitButton() {
        return (
          this.querySelector('[type="submit"][name="add"]') ||
          this.querySelector('button[name="add"]') ||
          this.querySelector('[type="submit"]')
        );
      }

      setSubmitLoading(isLoading) {
        const submitButton = this.getSubmitButton();
        const spinner =
          submitButton?.querySelector(".loading-overlay__spinner") ||
          this.querySelector(".loading-overlay__spinner");

        if (!submitButton) return;

        this.submitButton = submitButton;
        this.submitSpinner = spinner;

        if (isLoading) {
          submitButton.setAttribute("aria-disabled", "true");
          submitButton.classList.add("loading");
          spinner?.classList.remove("hidden");
          return;
        }

        submitButton.classList.remove("loading");
        spinner?.classList.add("hidden");
      }

      getVariantPickerSectionId() {
        const source = this.dataset.source;
        if (!source) return null;
        return source.replace(/-floating$/, "");
      }

      getVariantPicker() {
        const sectionId = this.getVariantPickerSectionId();
        if (!sectionId) return null;

        const quickAddModal = this.closest("quick-add-modal");
        const searchRoot = quickAddModal || document;

        return (
          searchRoot.querySelector(`#variant-picker-${sectionId}`) ||
          searchRoot.querySelector(
            `variant-selects[data-section="${sectionId}"], variant-radios[data-section="${sectionId}"]`
          ) ||
          (!quickAddModal &&
            document.querySelector(
              `variant-selects[data-section="${sectionId}"], variant-radios[data-section="${sectionId}"]`
            ))
        );
      }

      canSubmitToCart() {
        if (!this.form) {
          this.form = this.querySelector("form");
        }

        const submitButton = this.getSubmitButton();
        const variantPicker = this.getVariantPicker();

        if (variantPicker?.productInfoLoading) return false;

        const variantInput = this.form?.querySelector('[name="id"]');
        const variantId =
          variantPicker?.getResolvedVariantId?.() ||
          variantInput?.value?.trim() ||
          "";

        if (!variantId || variantInput?.disabled) return false;

        if (!submitButton) return false;

        const buttonStatus = submitButton.dataset?.status;
        if (
          buttonStatus === "unavailable" ||
          buttonStatus === "sold-out" ||
          buttonStatus === "loading"
        ) {
          return false;
        }

        if (
          variantPicker &&
          typeof variantPicker.isVariantValidForCart === "function" &&
          !variantPicker.isVariantValidForCart()
        ) {
          return false;
        }

        if (
          submitButton.hasAttribute("disabled") ||
          submitButton.getAttribute("aria-disabled") === "true"
        ) {
          return false;
        }

        return true;
      }

      syncFormBeforeSubmit() {
        this.form = this.querySelector("form");
        const variantPicker = this.getVariantPicker();

        if (
          variantPicker &&
          typeof variantPicker.syncAddToCartState === "function"
        ) {
          variantPicker.syncAddToCartState();
        }

        const submitButton = this.getSubmitButton();
        if (
          submitButton &&
          submitButton.dataset?.status === "loading" &&
          !variantPicker?.productInfoLoading
        ) {
          submitButton.removeAttribute("disabled");
          submitButton.removeAttribute("aria-disabled");
          submitButton.classList.remove("loading");
          submitButton.dataset.status = "available";
        }

        const variantId = variantPicker?.getResolvedVariantId?.();
        const variantInput = this.form?.querySelector('input[name="id"]');

        if (variantId && variantInput) {
          variantInput.value = variantId;
          variantInput.disabled = false;
        }

        const quantityInput =
          this.form?.querySelector('input[name="quantity"]') ||
          this.querySelector('input[name="quantity"]') ||
          (this.form?.id &&
            document.querySelector(
              `input[name="quantity"][form="${CSS.escape(this.form.id)}"]`
            ));
        if (quantityInput) {
          if (this.form?.id) quantityInput.setAttribute("form", this.form.id);
          const min = Math.max(
            1,
            Number(
              quantityInput.getAttribute("min") ||
                quantityInput.dataset?.min ||
                1
            )
          );
          const step = Math.max(
            1,
            Number(quantityInput.getAttribute("step") || 1)
          );
          let qty = Number(quantityInput.value);
          if (!qty || qty < min) {
            qty = min;
          } else if ((qty - min) % step !== 0) {
            qty = min + Math.floor((qty - min) / step) * step;
          }
          quantityInput.value = String(Math.max(min, qty));
        }
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        this.syncFormBeforeSubmit();
        if (!this.canSubmitToCart()) return;

        this.handleErrorMessage();
        this.error = false;
        this.setSubmitLoading(true);

        const config = fetchConfig("javascript");
        config.headers["X-Requested-With"] = "XMLHttpRequest";
        delete config.headers["Content-Type"];

        const formData = new FormData(this.form);
        const quantity = Number(formData.get("quantity") || 1);
        if (!quantity || quantity < 1) {
          formData.set("quantity", "1");
        }
        if (this.cart) {
          formData.append(
            "sections",
            this.cart.getSectionsToRender().map((section) => section.id)
          );
          formData.append("sections_url", window.location.pathname);
          this.cart.setActiveElement(document.activeElement);
        }
        config.body = formData;

        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              // CART ERROR EVENT
              document.dispatchEvent(
                new CustomEvent("cart:error", {
                  detail: {
                    source: "product-form",
                    productVariantId: formData.get("id"),
                    errors: response.description,
                    message: response.message,
                  },
                })
                // -------------------------------------------
              );

              publish(PUB_SUB_EVENTS.cartError, {
                source: "product-form",
                productVariantId: formData.get("id"),
                errors: response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);
              const submitButton = this.getSubmitButton();
              const soldOutMessage =
                submitButton?.querySelector(".sold-out-message");
              if (!soldOutMessage) return;
              submitButton.setAttribute("aria-disabled", true);
              submitButton.querySelector("span")?.classList.add("hidden");
              soldOutMessage.classList.remove("hidden");
              this.error = true;
              return;
            } else if (!this.cart) {
              window.location = window.routes.cart_url;
              return;
            }

            if (!response.items?.length && !response.id) {
              this.handleErrorMessage(response.description || response.message);
              this.error = true;
              return;
            }

            // VARIANT ADDED EVENT
            document.dispatchEvent(
              new CustomEvent("variant:add", {
                detail: {
                  variant: {
                    id: formData.get("id"),
                  },
                  quantity: Number(formData.get("quantity") || 1),
                  formElement: this.form,
                  sectionId: this.dataset.source,
                },
              })
            );
            // -------------------------------------------

            fetch(`${routes.cart_url}.js`)
              .then((response) => {
                return response.text();
              })
              .then((state) => {
                const parsedState = JSON.parse(state);

                // dispatch cart:change for the entire basket
                document.dispatchEvent(
                  new CustomEvent("cart:change", {
                    detail: {
                      cart: parsedState,
                      sectionId: this.dataset.source,
                    },
                  })
                );
                // dispatch cart:change for the entire basket
              })
              .catch((error) => {
                console.error("Error fetching cart state:", error);
              });

            if (!this.error) {
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: "product-form",
                productVariantId: formData.get("id"),
              });
              this.error = false;
            }

            const quickAddModal = this.closest("quick-add-modal");
            if (quickAddModal) {
              document.body.addEventListener(
                "modalClosed",
                () => {
                  setTimeout(() => {
                    this.cart.renderContents(response);
                  });
                },
                { once: true }
              );
              quickAddModal.hide(true);
            } else {
              this.cart.renderContents(response);
            }
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.setSubmitLoading(false);

            const submitButton = this.getSubmitButton();

            if (this.error) {
              submitButton?.setAttribute("aria-disabled", "true");
              return;
            }

            if (this.cart && this.cart.classList.contains("is-empty")) {
              this.cart.classList.remove("is-empty");
            }

            const variantPicker = this.getVariantPicker();
            if (
              variantPicker &&
              typeof variantPicker.syncAddToCartState === "function"
            ) {
              variantPicker.syncAddToCartState();
              return;
            }

            submitButton?.removeAttribute("disabled");
            submitButton?.removeAttribute("aria-disabled");
            if (submitButton?.dataset) {
              submitButton.dataset.status = "available";
            }
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector(".product-form__error-message-wrapper");
        if (!this.errorMessageWrapper) return;
        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector(
            ".product-form__error-message"
          );

        this.errorMessageWrapper.toggleAttribute("hidden", !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }
    }
  );
}
