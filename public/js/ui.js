(() => {
  const openModals = new Set();
  let previousOverflow = '';

  function show(modal) {
    if (!modal || openModals.has(modal)) return;
    if (!openModals.size) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modal._returnFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    openModals.add(modal);
    modal.dispatchEvent(new Event('ui:shown'));
    (modal.querySelector('[autofocus], input, button') || modal).focus();
  }

  function hide(modal) {
    if (!modal || !openModals.has(modal)) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    modal.removeAttribute('aria-modal');
    openModals.delete(modal);
    if (!openModals.size) document.body.style.overflow = previousOverflow;
    modal.dispatchEvent(new Event('ui:hidden'));
    modal._returnFocus?.focus?.();
  }

  function toggleSidebar(visible) {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;
    sidebar.classList.toggle('is-open', visible);
    backdrop?.classList.toggle('hidden', !visible);
    sidebar.setAttribute('aria-hidden', String(!visible && window.innerWidth < 1024));
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-ui-toggle]');
    if (trigger) {
      const target = document.querySelector(trigger.dataset.uiTarget);
      if (trigger.dataset.uiToggle === 'modal') show(target);
      if (trigger.dataset.uiToggle === 'offcanvas') toggleSidebar(true);
      return;
    }
    const dismiss = event.target.closest('[data-ui-dismiss]');
    if (dismiss?.dataset.uiDismiss === 'modal') hide(dismiss.closest('.ui-modal'));
    if (dismiss?.dataset.uiDismiss === 'offcanvas' || event.target.id === 'sidebarBackdrop') toggleSidebar(false);
    if (event.target.classList?.contains('ui-modal')) hide(event.target);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && openModals.size) {
      const modal = [...openModals].at(-1);
      const focusable = [...modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((element) => element.getClientRects().length);
      if (!focusable.length) { event.preventDefault(); modal.focus(); return; }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if (event.key === 'Escape') {
      if (openModals.size) hide([...openModals].at(-1));
      else toggleSidebar(false);
    }
  });

  window.parkingUI = { modal: (element) => ({ show: () => show(element), hide: () => hide(element) }) };
})();
