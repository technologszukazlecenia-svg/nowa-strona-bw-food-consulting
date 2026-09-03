(() => {
  'use strict';

  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav]');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      nav.dataset.open = String(!expanded);
      document.body.classList.toggle('menu-open', !expanded);
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        navToggle.setAttribute('aria-expanded', 'false');
        nav.dataset.open = 'false';
        document.body.classList.remove('menu-open');
      }
    });
  }

  const header = document.querySelector('[data-header]');
  if (header) {
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 16);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  const search = document.querySelector('[data-city-search]');
  const cityLinks = [...document.querySelectorAll('[data-city-card]')];
  const emptyState = document.querySelector('[data-search-empty]');
  const count = document.querySelector('[data-search-count]');
  if (search && cityLinks.length) {
    const normalize = (value) => value
      .toLocaleLowerCase('pl-PL')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l');

    const filterCities = () => {
      const query = normalize(search.value.trim());
      let visible = 0;
      cityLinks.forEach((card) => {
        const matches = !query || normalize(card.dataset.search || card.textContent).includes(query);
        card.hidden = !matches;
        if (matches) visible += 1;
      });
      document.querySelectorAll('[data-region-section]').forEach((section) => {
        section.hidden = !section.querySelector('[data-city-card]:not([hidden])');
      });
      if (emptyState) emptyState.hidden = visible !== 0;
      if (count) count.textContent = String(visible);
    };
    search.addEventListener('input', filterCities);
    filterCities();
  }

  const form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const city = document.body.dataset.city || 'Polska';
      const name = String(data.get('name') || '').trim();
      const company = String(data.get('company') || '').trim();
      const email = String(data.get('email') || '').trim();
      const phone = String(data.get('phone') || '').trim();
      const category = String(data.get('category') || '').trim();
      const stage = String(data.get('stage') || '').trim();
      const message = String(data.get('message') || '').trim();
      const sender = company || name;

      const subject = `[${city}] Zapytanie o projekt technologiczny — ${sender}`;
      const body = [
        'Dzień dobry,',
        '',
        `kontaktuję się ze strony dotyczącej miasta: ${city}.`,
        '',
        `Imię i nazwisko: ${name}`,
        `Firma: ${company || 'nie podano'}`,
        `E-mail: ${email}`,
        `Telefon: ${phone || 'nie podano'}`,
        `Kategoria produktu: ${category || 'nie wybrano'}`,
        `Etap projektu: ${stage || 'nie wybrano'}`,
        '',
        'Opis projektu:',
        message,
        '',
        'Pozdrawiam',
        name,
      ].join('\n');

      window.dataLayer?.push({ event: 'contact_mailto', city });
      window.location.href = `mailto:technolog.szukazlecenia@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  document.querySelectorAll('[data-track]').forEach((element) => {
    element.addEventListener('click', () => {
      window.dataLayer?.push({
        event: 'landing_interaction',
        action: element.dataset.track,
        city: document.body.dataset.city || 'Polska',
      });
    });
  });

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('has-reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
  }
})();
