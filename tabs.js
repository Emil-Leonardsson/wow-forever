// Flikar på samma sida. Adressen (#grupper, #spelare, #skriv-upp-dig, #din-grupp) styr vilken flik som visas.

(() => {
  const NAMES = ['grupper', 'spelare', 'skriv-upp-dig', 'din-grupp'];
  const DEFAULT = 'grupper';
  const btns = () => [...document.querySelectorAll('[data-tab-btn]')];
  const panels = () => [...document.querySelectorAll('.tabpanel')];
  let current = null;

  function fromHash() {
    const name = decodeURIComponent(location.hash.replace(/^#/, ''));
    const alias = { anmalan: 'skriv-upp-dig', roster: 'spelare', groups: 'grupper', groupForm: 'din-grupp' };
    const n = alias[name] || name;
    return NAMES.includes(n) ? n : null;
  }

  function apply(name) {
    current = name;
    panels().forEach((p) => p.classList.toggle('active', p.dataset.tab === name));
    btns().forEach((b) => {
      const on = b.dataset.tabBtn === name;
      b.setAttribute('aria-selected', String(on));
      b.classList.toggle('active', on);
    });
    document.dispatchEvent(new CustomEvent('wf:tab', { detail: name }));
  }

  function show(name, { scroll = true } = {}) {
    if (!NAMES.includes(name)) return;
    if (location.hash !== `#${name}`) {
      // Skapar en historikpost så att bakåtknappen fungerar.
      try { history.pushState(null, '', `${location.pathname}${location.search}#${name}`); } catch { location.hash = name; }
    }
    apply(name);
    if (scroll) {
      const bar = document.getElementById('tabs');
      if (bar) window.scrollTo({ top: Math.max(0, bar.getBoundingClientRect().top + window.scrollY - 4), behavior: 'smooth' });
    }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab-btn]');
    if (b) show(b.dataset.tabBtn);
  });

  window.addEventListener('hashchange', () => { const n = fromHash(); if (n && n !== current) apply(n); });
  window.addEventListener('popstate', () => apply(fromHash() || DEFAULT));

  window.WF_TABS = { show, current: () => current };
  apply(fromHash() || DEFAULT);
})();
