if (!customElements.get('expandable-image-cards')) {
  customElements.define(
    'expandable-image-cards',
    class ExpandableImageCards extends HTMLElement {
      connectedCallback() {
        this.cards = Array.from(this.querySelectorAll('[data-card]'));
        this.list = this.querySelector('.expandable-image-cards__list');
        this.defaultIndex = Number(this.dataset.defaultIndex || 0);
        this.mobileQuery = window.matchMedia('(max-width: 749px)');

        this.cards.forEach((card, index) => {
          card.addEventListener('mouseenter', () => {
            if (!this.mobileQuery.matches) this.activate(index);
          });
          card.addEventListener('focus', () => this.activate(index));
          card.addEventListener('click', () => {
            this.activate(index);
            if (this.mobileQuery.matches) {
              card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
            }
          });
          card.addEventListener('keydown', (event) => this.onKeydown(event, index));
        });

        this.addEventListener('mouseleave', () => {
          if (!this.mobileQuery.matches) this.reset();
        });

        this.list?.addEventListener('scroll', () => this.onScroll(), { passive: true });
      }

      onScroll() {
        if (!this.mobileQuery.matches || this.scrollFrame) return;

        this.scrollFrame = requestAnimationFrame(() => {
          const listRect = this.list.getBoundingClientRect();
          const listCenter = listRect.left + listRect.width / 2;
          let closestIndex = 0;
          let closestDistance = Infinity;

          this.cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            const distance = Math.abs(rect.left + rect.width / 2 - listCenter);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
            }
          });

          this.activate(closestIndex);
          this.scrollFrame = null;
        });
      }

      activate(index) {
        this.cards.forEach((card, cardIndex) => {
          const isActive = cardIndex === index;
          card.classList.toggle('is-active', isActive);
          card.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });
      }

      reset() {
        if (!this.matches(':focus-within')) this.activate(this.defaultIndex);
      }

      onKeydown(event, index) {
        let nextIndex;

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = (index + 1) % this.cards.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          nextIndex = (index - 1 + this.cards.length) % this.cards.length;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = this.cards.length - 1;
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.activate(index);
          return;
        } else {
          return;
        }

        event.preventDefault();
        this.cards[nextIndex].focus();
      }
    }
  );
}

document.addEventListener('shopify:block:select', (event) => {
  const card = event.target.closest('[data-card]');
  const section = card?.closest('expandable-image-cards');
  if (card && section) section.activate(Number(card.dataset.index));
});
