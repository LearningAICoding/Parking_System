(() => {
  const BACK_ERROR = 'Có vấn đề, Không thể quay lại trang danh sách vị trí';
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

  const ui = {
    show(el, visible) { if (el) el.hidden = !visible; },
    modal(el) { return window.parkingUI.modal(el); },
    onModalShown(el, handler) { el.addEventListener('ui:shown', handler); },
    onModalHidden(el, handler) { el.addEventListener('ui:hidden', handler); },
    tooltip(el) { if (el) el.setAttribute('aria-label', el.title); },
    spinner(label) {
      const fragment = document.createDocumentFragment();
      const spin = document.createElement('span');
      spin.className = 'mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-r-transparent';
      spin.setAttribute('aria-hidden', 'true');
      fragment.append(spin, label);
      return fragment;
    }
  };

  // Thông báo flash tự ẩn sau 5 giây
  document.querySelectorAll('[data-autodismiss]').forEach((alert) => {
    setTimeout(() => ui.show(alert, false), 5000);
  });

  // ---------- Task 14: danh sách ----------
  const zoneSelect = document.querySelector('select[data-autosubmit]');
  if (zoneSelect) zoneSelect.addEventListener('change', () => zoneSelect.form.submit());

  const rows = Array.from(document.querySelectorAll('[data-slot-row]'));
  const searchInput = document.querySelector('[data-slot-search]');
  const statusButtons = Array.from(document.querySelectorAll('[data-status-filter]'));
  const noMatchRow = document.querySelector('[data-slot-no-match]');
  let statusFilter = '';

  function applyFilters() {
    const keyword = (searchInput?.value || '').trim().toUpperCase();
    let visible = 0;
    rows.forEach((row) => {
      const match = (!statusFilter || row.dataset.status === statusFilter)
        && (!keyword || row.dataset.code.toUpperCase().includes(keyword));
      ui.show(row, match);
      if (match) visible += 1;
    });
    ui.show(noMatchRow, visible === 0 && rows.length > 0);
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  statusButtons.forEach((button) => {
    button.addEventListener('click', () => {
      statusFilter = button.dataset.statusFilter;
      statusButtons.forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      applyFilters();
    });
  });

  const highlighted = document.querySelector('[data-slot-row][data-highlight]');
  if (highlighted) {
    highlighted.scrollIntoView?.({ block: 'center' });
    setTimeout(() => highlighted.removeAttribute('data-highlight'), 4000);
  }

  // Tooltip giải thích vì sao không sửa/xóa được
  document.querySelectorAll('[data-locked-hint]').forEach((hint) => ui.tooltip(hint));

  // ---------- Task 15: form thêm/sửa ----------
  const form = document.querySelector('[data-slot-form]');
  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const slotCodeInput = form.querySelector('input[name="slotCode"]');
    const note = form.querySelector('textarea[name="note"]');
    const counter = form.querySelector('[data-char-count="note"]');
    const initial = new FormData(form);
    let submitting = false;

    const focusTarget = form.querySelector(`[name="${form.dataset.focus}"]`);
    if (focusTarget && !focusTarget.disabled) focusTarget.focus();

    if (slotCodeInput) {
      slotCodeInput.addEventListener('input', () => {
        const caret = slotCodeInput.selectionStart;
        slotCodeInput.value = slotCodeInput.value.toUpperCase().replace(/\s+/g, '');
        slotCodeInput.setSelectionRange(caret, caret);
      });
    }
    if (note && counter) {
      note.addEventListener('input', () => { counter.textContent = `${note.value.length}/255`; });
    }

    function fieldMessage(input) {
      if (input.validity.valueMissing || !input.value.trim()) return input.dataset.errorRequired || 'Trường này là bắt buộc';
      if (input.validity.patternMismatch) return input.dataset.errorPattern || 'Giá trị không hợp lệ';
      return '';
    }

    function validateField(input) {
      const message = input.required ? fieldMessage(input) : '';
      input.classList.toggle('ui-invalid', Boolean(message));
      input.setAttribute('aria-invalid', String(Boolean(message)));
      const feedback = input.parentElement.querySelector('.ui-invalid-feedback');
      if (feedback && message) feedback.textContent = message;
      return !message;
    }

    form.querySelectorAll('input[required]').forEach((input) => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => { if (input.classList.contains('ui-invalid')) validateField(input); });
    });

    function isDirty() {
      const current = new FormData(form);
      return Array.from(current.keys()).some((key) => current.get(key) !== initial.get(key));
    }

    form.addEventListener('submit', (event) => {
      const invalid = Array.from(form.querySelectorAll('input[required]')).filter((input) => !validateField(input));
      if (invalid.length) {
        event.preventDefault();
        invalid[0].focus();
        return;
      }
      if (submitting) { event.preventDefault(); return; }
      submitting = true;
      submitBtn.disabled = true;
      submitBtn.replaceChildren(ui.spinner(submitBtn.dataset.submitLabel || 'Đang gửi…'));
    });

    const cancel = form.querySelector('[data-form-cancel]');
    if (cancel) {
      cancel.addEventListener('click', (event) => {
        if (isDirty() && !window.confirm('Bạn có thay đổi chưa lưu. Hủy và quay lại danh sách?')) event.preventDefault();
        else submitting = true;
      });
    }
    window.addEventListener('beforeunload', (event) => {
      if (!submitting && isDirty()) event.preventDefault();
    });
  }

  // ---------- Task 16: chi tiết – Quay lại (R4.4) ----------
  const backLink = document.querySelector('[data-slot-back]');
  const backError = document.querySelector('[data-slot-back-error]');
  if (backLink && backError) {
    backLink.addEventListener('click', async (event) => {
      event.preventDefault();
      // Giữ bộ lọc khu vực nếu người dùng đến từ danh sách
      let target = '/slots';
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin && ref.pathname === '/slots') target = ref.pathname + ref.search;
      } catch { /* không có referrer */ }
      try {
        const response = await fetch(target, { method: 'HEAD', credentials: 'same-origin' });
        if (!response.ok) throw new Error(String(response.status));
        window.location.assign(target);
      } catch {
        backError.textContent = BACK_ERROR;
        ui.show(backError, true);
      }
    });
  }

  // ---------- Task 16: xóa ----------
  const modalEl = document.getElementById('slotDeleteModal');
  if (!modalEl) return;

  const modal = ui.modal(modalEl);
  const codeEl = modalEl.querySelector('[data-slot-delete-code]');
  const errorEl = modalEl.querySelector('[data-slot-delete-error]');
  const confirmBtn = modalEl.querySelector('[data-slot-delete-confirm]');
  const cancelBtn = modalEl.querySelector('[data-ui-dismiss="modal"]');
  const confirmLabel = confirmBtn.textContent;
  let slotId = null;
  let reloadOnClose = false;

  function setBusy(busy) {
    confirmBtn.disabled = busy;
    confirmBtn.replaceChildren(busy ? ui.spinner('Đang xóa…') : confirmLabel);
  }

  function showError(message) {
    errorEl.textContent = message;
    ui.show(errorEl, true);
  }

  document.querySelectorAll('[data-slot-delete]').forEach((button) => {
    button.addEventListener('click', () => {
      slotId = button.dataset.slotId;
      codeEl.textContent = button.dataset.slotCode;
      ui.show(errorEl, false);
      setBusy(false);
      modal.show();
    });
  });

  // Mặc định focus nút Hủy để tránh xóa nhầm khi nhấn Enter
  ui.onModalShown(modalEl, () => cancelBtn?.focus());
  ui.onModalHidden(modalEl, () => { if (reloadOnClose) window.location.reload(); });

  confirmBtn.addEventListener('click', async () => {
    if (!slotId) return;
    setBusy(true);
    try {
      const response = await fetch(`/slots/${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrfToken, Accept: 'application/json' },
        credentials: 'same-origin'
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.success) {
        // Ở danh sách: tải lại giữ bộ lọc; ở chi tiết: về danh sách
        if (rows.length) window.location.reload();
        else window.location.assign('/slots');
        return;
      }
      // 409/404/403: giữ modal mở và hiển thị nguyên message server
      showError(body.message || 'Không thể xóa vị trí đỗ');
      if (response.status === 404) {
        reloadOnClose = true;
        ui.show(confirmBtn, false);
      }
    } catch {
      showError('Không kết nối được máy chủ, vui lòng thử lại');
    }
    setBusy(false);
  });
})();
