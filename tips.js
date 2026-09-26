// Tryck-för-att-visa (toggletip) på pekskärmar. På dator används vanliga tooltips (title).
// Används på element med data-tip="text".

(() => {
  const touch = window.matchMedia('(hover: none)');
  let bubble = null;
  let timer = null;
  let currentText = null;

  function hide() {
    if (bubble) { bubble.remove(); bubble = null; }
    clearTimeout(timer);
    currentText = null;
  }

  function show(el) {
    hide();
    currentText = el.dataset.tip;
    const rect = el.getBoundingClientRect();
    bubble = document.createElement('div');
    bubble.className = 'tip';
    bubble.setAttribute('role', 'status');
    bubble.textContent = currentText;
    document.body.appendChild(bubble);
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - bw / 2, 8), window.innerWidth - bw - 8);
    const above = rect.top - bh - 10;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${above >= 8 ? above : rect.bottom + 10}px`;
    timer = setTimeout(hide, 5000);
  }

  // Fångstfasen körs före sidans egna klickhanterare, som kan bygga om elementet.
  document.addEventListener('click', (e) => {
    if (!touch.matches) return;
    const el = e.target.closest('[data-tip]');
    if (!el) { hide(); return; }
    if (bubble && currentText === el.dataset.tip) { hide(); return; }
    show(el);
  }, true);

  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);
  window.addEventListener('hashchange', hide);
})();
