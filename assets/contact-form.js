class ContactForm {
  constructor(form) {
    this.form = form;
    this.init();
  }

  init() {
    this.form.addEventListener('submit', this.onSubmit.bind(this));

    const emailInput = this.form.querySelector('[type="email"]');
    if (emailInput) {
      emailInput.addEventListener('invalid', this.onEmailInvalid.bind(this));
      emailInput.addEventListener('input', this.clearEmailError.bind(this));
    }

    this.form.querySelectorAll('input[type="checkbox"][required]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.clearCheckboxError(checkbox));
    });
  }

  onSubmit(event) {
    let hasError = false;

    this.form.querySelectorAll('input[type="checkbox"][required]').forEach((checkbox) => {
      if (!checkbox.checked) {
        this.showCheckboxError(checkbox);
        hasError = true;
      }
    });

    const emailInput = this.form.querySelector('[type="email"]');
    if (emailInput && !emailInput.validity.valid) {
      this.onEmailInvalid({ target: emailInput });
      hasError = true;
    }

    if (hasError) {
      event.preventDefault();
      const firstInvalid =
        this.form.querySelector('[aria-invalid="true"]') ||
        this.form.querySelector('input[type="checkbox"][required]:not(:checked)');
      firstInvalid?.focus();
    }
  }

  onEmailInvalid(event) {
    const emailInput = event.target;
    const clientError = this.form.querySelector(
      `#${CSS.escape(emailInput.id)}-client-error`
    );

    emailInput.setAttribute('aria-invalid', 'true');
    if (clientError) {
      clientError.hidden = false;
    }
  }

  clearEmailError(event) {
    const emailInput = event.target;
    const clientError = this.form.querySelector(
      `#${CSS.escape(emailInput.id)}-client-error`
    );

    if (emailInput.validity.valid) {
      emailInput.removeAttribute('aria-invalid');
      if (clientError) {
        clientError.hidden = true;
      }
    }
  }

  showCheckboxError(checkbox) {
    checkbox.setAttribute('aria-invalid', 'true');
    const clientError = this.form.querySelector(
      `#${CSS.escape(checkbox.id)}-client-error`
    );
    if (clientError) {
      clientError.hidden = false;
    }
  }

  clearCheckboxError(checkbox) {
    if (checkbox.checked) {
      checkbox.removeAttribute('aria-invalid');
      const clientError = this.form.querySelector(
        `#${CSS.escape(checkbox.id)}-client-error`
      );
      if (clientError) {
        clientError.hidden = true;
      }
    }
  }
}

document.querySelectorAll('.contact-form__form').forEach((form) => {
  new ContactForm(form);
});
