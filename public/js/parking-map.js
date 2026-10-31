(() => {
  const root = document.querySelector('[data-parking-map]');
  if (!root) return;

  const isCustomer = root.dataset.mode === 'customer';
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const $ = (selector, scope = root) => scope.querySelector(selector);
  const $$ = (selector, scope = root) => Array.from(scope.querySelectorAll(selector));
  const REFRESH_MS = 30000;

  // Lớp giao diện duy nhất phụ thuộc thư viện UI (Bootstrap 5). Đổi thư viện thì chỉ sửa object này.
  const ui = {
    show(el, visible) { if (el) el.hidden = !visible; },
    modal(id) {
      const el = document.getElementById(id);
      const instance = el && window.bootstrap ? window.bootstrap.Modal.getOrCreateInstance(el) : null;
      return { el, show: () => instance?.show() };
    },
    onModalShown(el, handler) { el?.addEventListener('shown.bs.modal', handler); },
    isAnyModalOpen: () => Boolean(document.querySelector('.modal.show'))
  };

  // Nhãn hiển thị do server render trong parking/_assets.ejs (một nguồn duy nhất: src/constants)
  const labels = $$('[data-ui-labels] [data-group]', document).reduce((acc, node) => {
    acc[node.dataset.group] = { ...(acc[node.dataset.group] || {}), [node.dataset.key]: node.textContent };
    return acc;
  }, {});
  const label = (group, key) => labels[group]?.[key] || key;

  // Nhân bản <template data-tpl="name"> và điền textContent cho các [data-field]; field rỗng thì ẩn
  function render(name, fields = {}) {
    const node = document.querySelector(`template[data-tpl="${name}"]`).content.firstElementChild.cloneNode(true);
    const targets = node.matches('[data-field]') ? [node] : [];
    targets.concat(Array.from(node.querySelectorAll('[data-field]'))).forEach((field) => {
      const value = fields[field.dataset.field];
      field.textContent = value ?? '';
      if (value == null || value === '') ui.show(field, false);
    });
    return node;
  }

  const NOT_REGISTRABLE = {
    RESERVED: 'Vị trí đã được đăng ký.',
    OCCUPIED: 'Vị trí đang có xe đỗ.',
    MAINTENANCE: 'Vị trí đang bảo trì.'
  };

  const state = { slots: [], zone: '', status: '', selected: null, myVehicles: [] };

  // ---------- tiện ích ----------
  const formatDate = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
  const formatDateTime = (iso) => (iso ? `${formatDate(iso)} ${iso.slice(11, 16)}` : '—');
  const formatVnd = (value) => `${Number(value).toLocaleString('vi-VN')} đ`;

  async function api(url, options = {}) {
    const response = await fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: { Accept: 'application/json', ...(options.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) {
      const error = new Error(body.message || `Yêu cầu thất bại (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  const networkMessage = (error) => (error.status ? error.message : 'Không kết nối được máy chủ, vui lòng thử lại');

  // ---------- bản đồ ----------
  const board = $('[data-map-board]');
  const loading = $('[data-map-loading]');
  const mapAlert = $('[data-map-alert]');
  const zoneSelect = $('[data-map-zone]');

  function renderZones() {
    const zones = [...new Set(state.slots.map((slot) => slot.zone))];
    if (state.zone && !zones.includes(state.zone)) state.zone = '';
    const allOption = zoneSelect.options[0];
    zoneSelect.replaceChildren(allOption);
    zones.forEach((zone) => zoneSelect.add(new Option(zone, zone, false, zone === state.zone)));
  }

  function renderCounts(slots) {
    $('[data-count="ALL"]').textContent = slots.length;
    $$('[data-count]').forEach((counter) => {
      if (counter.dataset.count !== 'ALL') counter.textContent = slots.filter((slot) => slot.status === counter.dataset.count).length;
    });
  }

  function renderBoard() {
    const inZone = state.slots.filter((slot) => !state.zone || slot.zone === state.zone);
    renderCounts(inZone);
    const visible = inZone.filter((slot) => !state.status || slot.status === state.status);
    board.replaceChildren();

    if (!visible.length) {
      board.append(render('board-message', {
        message: state.slots.length ? 'Không có vị trí phù hợp với bộ lọc.' : 'Bãi xe chưa có vị trí đỗ nào.'
      }));
      return;
    }

    const byZone = visible.reduce((acc, slot) => acc.set(slot.zone, [...(acc.get(slot.zone) || []), slot]), new Map());
    byZone.forEach((slots, zone) => {
      const allInZone = state.slots.filter((slot) => slot.zone === zone);
      const free = allInZone.filter((slot) => slot.status === 'AVAILABLE').length;
      const section = render('zone-section', { title: `Khu vực ${zone}`, summary: `${free}/${allInZone.length} trống` });
      const grid = $('[data-slot-grid]', section);
      slots.forEach((slot) => {
        const statusLabel = label('slotStatus', slot.status);
        const tile = render('slot-tile', { slotCode: slot.slotCode, statusLabel });
        tile.dataset.slotTile = slot.id;
        tile.dataset.status = slot.status;
        tile.setAttribute('aria-label', `Vị trí ${slot.slotCode}, ${statusLabel}`);
        grid.append(tile);
      });
      board.append(section);
    });
  }

  async function loadSlots({ quiet = false } = {}) {
    if (!quiet) ui.show(loading, !state.slots.length);
    try {
      const body = await api('/api/slots');
      state.slots = body.data.items;
      ui.show(mapAlert, false);
      renderZones();
      renderBoard();
      $('[data-map-updated]').textContent = `Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')}`;
    } catch (error) {
      mapAlert.textContent = `Không tải được bản đồ: ${networkMessage(error)}`;
      ui.show(mapAlert, true);
    } finally {
      ui.show(loading, false);
    }
  }

  zoneSelect.addEventListener('change', () => { state.zone = zoneSelect.value; renderBoard(); });
  $$('[data-status-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.status = button.dataset.statusFilter;
      $$('[data-status-filter]').forEach((other) => other.setAttribute('aria-pressed', String(other === button)));
      renderBoard();
    });
  });
  $('[data-map-refresh]').addEventListener('click', () => loadSlots());

  // ---------- menu khi bấm vào vị trí ----------
  const menu = $('[data-slot-menu]');
  const menuNote = $('[data-slot-menu-note]');
  const registerItem = $('[data-menu-action="register"]', menu);
  let menuTile = null;

  function closeMenu() {
    menu.classList.remove('show');
    menu.style.display = '';
    menuTile?.setAttribute('aria-expanded', 'false');
    menuTile = null;
  }

  function openMenu(tile, slot) {
    closeMenu();
    state.selected = slot;
    menuTile = tile;
    tile.setAttribute('aria-expanded', 'true');
    $('[data-slot-menu-title]').textContent = `Vị trí ${slot.slotCode} – ${label('slotStatus', slot.status)}`;
    const reason = NOT_REGISTRABLE[slot.status];
    registerItem.disabled = Boolean(reason);
    registerItem.setAttribute('aria-disabled', String(Boolean(reason)));
    menuNote.textContent = reason ? `${reason} Không thể đăng ký.` : '';
    ui.show(menuNote, Boolean(reason));

    const rect = tile.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.display = 'block';
    menu.classList.add('show');
    const left = Math.min(rect.left, window.innerWidth - menu.offsetWidth - 8);
    const below = rect.bottom + 4;
    const top = below + menu.offsetHeight > window.innerHeight ? rect.top - menu.offsetHeight - 4 : below;
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
    menu.querySelector('.dropdown-item:not(:disabled)')?.focus();
  }

  board.addEventListener('click', (event) => {
    const tile = event.target.closest('[data-slot-tile]');
    if (!tile) return;
    event.stopPropagation();
    const slot = state.slots.find((item) => String(item.id) === tile.dataset.slotTile);
    if (slot) openMenu(tile, slot);
  });
  document.addEventListener('click', (event) => { if (!menu.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
  window.addEventListener('scroll', closeMenu, { passive: true });

  menu.addEventListener('click', (event) => {
    const item = event.target.closest('[data-menu-action]');
    if (!item || item.disabled || !state.selected) return;
    closeMenu();
    if (item.dataset.menuAction === 'vehicle') openVehicleModal(state.selected);
    else openRegisterModal(state.selected);
  });

  // ---------- Xem thông tin xe (MANAGER/STAFF) ----------
  async function openVehicleModal(slot) {
    const vehicleModal = ui.modal('vehicleModal');
    const modalEl = vehicleModal.el;
    if (!modalEl) return;
    $('[data-vehicle-slot]', modalEl).textContent = slot.slotCode;
    ['[data-vehicle-empty]', '[data-vehicle-error]', '[data-vehicle-info]'].forEach((sel) => ui.show($(sel, modalEl), false));
    ui.show($('[data-vehicle-loading]', modalEl), true);
    vehicleModal.show();
    try {
      const { data, message } = await api(`/api/slots/${encodeURIComponent(slot.id)}/vehicle`);
      if (!data) {
        $('[data-vehicle-empty]', modalEl).textContent = slot.status === 'RESERVED'
          ? 'Vị trí đã được đăng ký nhưng xe chưa vào bãi.'
          : message || 'Vị trí chưa có xe đang đỗ.';
        ui.show($('[data-vehicle-empty]', modalEl), true);
      } else {
        const values = {
          ...data,
          brand: data.brand || '—',
          vehicleType: label('vehicleType', data.vehicleType),
          customerName: data.customerName || 'Xe vãng lai',
          phone: data.phone || '—',
          checkInTime: formatDateTime(data.checkInTime)
        };
        $$('[data-vehicle-field]', modalEl).forEach((field) => { field.textContent = values[field.dataset.vehicleField]; });
        ui.show($('[data-vehicle-info]', modalEl), true);
      }
    } catch (error) {
      $('[data-vehicle-error]', modalEl).textContent = networkMessage(error);
      ui.show($('[data-vehicle-error]', modalEl), true);
    } finally {
      ui.show($('[data-vehicle-loading]', modalEl), false);
    }
  }

  // ---------- Đăng ký đỗ xe ----------
  const registerModal = ui.modal('registerModal');
  const registerEl = registerModal.el;
  const options = $('[data-vehicle-options]', registerEl);
  const submitBtn = $('[data-register-submit]', registerEl);
  const cancelBtn = $('[data-register-cancel]', registerEl);
  const registerError = $('[data-register-error]', registerEl);
  const keywordInput = $('[data-vehicle-keyword]', registerEl);
  let selectedVehicleId = null;
  let registering = false;

  function setRegisterError(message) {
    registerError.textContent = message || '';
    ui.show(registerError, Boolean(message));
  }

  function renderVehicleOptions(vehicles, emptyText) {
    options.replaceChildren();
    selectedVehicleId = null;
    submitBtn.disabled = true;
    if (!vehicles.length) {
      options.append(render('option-message', { message: emptyText }));
      return;
    }
    vehicles.forEach((vehicle) => {
      const item = render('vehicle-option', vehicle);
      const radio = $('input[name="vehicleId"]', item);
      radio.value = vehicle.id;
      radio.disabled = Boolean(vehicle.disabledReason);
      options.append(item);
    });
  }

  const showOptionMessage = (message) => options.replaceChildren(render('option-message', { message }));

  options.addEventListener('change', (event) => {
    if (event.target.name !== 'vehicleId') return;
    selectedVehicleId = Number(event.target.value);
    submitBtn.disabled = false;
    setRegisterError('');
  });

  function customerVehicleOptions() {
    return state.myVehicles.map((vehicle) => {
      let disabledReason = '';
      if (vehicle.derivedStatus === 'RESERVED') disabledReason = `Đang giữ chỗ tại ${vehicle.slotCode || 'vị trí khác'}`;
      if (vehicle.derivedStatus === 'PARKED') disabledReason = `Đang đỗ tại ${vehicle.slotCode || 'bãi'}`;
      return {
        id: vehicle.id, licensePlate: vehicle.licensePlate, disabledReason,
        subtitle: [vehicle.vehicleName, vehicle.brand, label('vehicleType', vehicle.vehicleType)].filter(Boolean).join(' • ')
      };
    });
  }

  let searchTimer = null;
  let searchSeq = 0;
  async function searchVehicles() {
    const keyword = keywordInput.value.trim();
    const seq = ++searchSeq;
    if (!keyword) { renderVehicleOptions([], 'Nhập từ khóa để tìm xe.'); return; }
    showOptionMessage('Đang tìm…');
    try {
      const { data } = await api(`/api/vehicles/search?keyword=${encodeURIComponent(keyword)}`);
      if (seq !== searchSeq) return;
      renderVehicleOptions(data.items.map((vehicle) => ({
        id: vehicle.id, licensePlate: vehicle.licensePlate,
        subtitle: [vehicle.vehicleName, vehicle.brand, vehicle.customerName || 'Xe vãng lai', vehicle.phone].filter(Boolean).join(' • ')
      })), 'Không tìm thấy xe phù hợp.');
    } catch (error) {
      if (seq !== searchSeq) return;
      renderVehicleOptions([], networkMessage(error));
    }
  }
  if (keywordInput) {
    keywordInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(searchVehicles, 300);
    });
  }

  function setStep(step) {
    $$('[data-register-step]', registerEl).forEach((node) => ui.show(node, node.dataset.registerStep === step));
    ui.show(submitBtn, step === 'form');
    cancelBtn.textContent = step === 'form' ? 'Hủy' : 'Đóng';
  }

  async function openRegisterModal(slot) {
    state.registerSlot = slot;
    $('[data-register-slot]', registerEl).textContent = slot.slotCode;
    setStep('form');
    setRegisterError('');
    submitBtn.textContent = 'Xác nhận đăng ký';
    if (isCustomer) {
      renderVehicleOptions([], 'Đang tải danh sách xe…');
      registerModal.show();
      await loadMyVehicles();
      renderVehicleOptions(customerVehicleOptions(), 'Bạn chưa có xe nào. Liên hệ nhân viên để thêm xe.');
    } else {
      keywordInput.value = '';
      renderVehicleOptions([], 'Nhập từ khóa để tìm xe.');
      registerModal.show();
    }
  }

  ui.onModalShown(registerEl, () => (keywordInput || options.querySelector('input:not(:disabled)'))?.focus());

  submitBtn.addEventListener('click', async () => {
    if (!selectedVehicleId || registering || !state.registerSlot) return;
    registering = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng ký…';
    setRegisterError('');
    try {
      const { data } = await api(`/api/slots/${encodeURIComponent(state.registerSlot.id)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify({ vehicleId: selectedVehicleId })
      });
      const receipt = {
        slotCode: data.slotCode, ticketCode: data.ticketCode,
        startDate: formatDate(data.startDate), endDate: formatDate(data.endDate), price: formatVnd(data.price)
      };
      $$('[data-receipt-field]', registerEl).forEach((field) => { field.textContent = receipt[field.dataset.receiptField]; });
      setStep('receipt');
      await Promise.all([loadSlots({ quiet: true }), isCustomer ? loadMyVehicles() : null]);
    } catch (error) {
      // 409/403: giữ modal và hiển thị nguyên message server
      setRegisterError(networkMessage(error));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Xác nhận đăng ký';
      if (error.status === 409) loadSlots({ quiet: true });
    } finally {
      registering = false;
    }
  });

  // ---------- Xe của tôi (CUSTOMER) ----------
  const myVehiclesList = $('[data-my-vehicles]');

  function renderMyVehicles(errorText) {
    if (!myVehiclesList) return;
    myVehiclesList.replaceChildren();
    $('[data-my-vehicles-count]').textContent = state.myVehicles.length || '';
    if (errorText || !state.myVehicles.length) {
      myVehiclesList.append(render('my-vehicle-message', { message: errorText || 'Bạn chưa có xe nào.' }));
      return;
    }
    state.myVehicles.forEach((vehicle) => {
      const item = render('my-vehicle', {
        licensePlate: vehicle.licensePlate,
        subtitle: [vehicle.vehicleName, label('vehicleType', vehicle.vehicleType)].filter(Boolean).join(' • '),
        slotInfo: vehicle.slotCode ? `Vị trí: ${vehicle.slotCode}` : '',
        statusLabel: label('derivedStatus', vehicle.derivedStatus)
      });
      $('[data-field="statusLabel"]', item).dataset.derivedStatus = vehicle.derivedStatus;
      myVehiclesList.append(item);
    });
  }

  async function loadMyVehicles() {
    if (!isCustomer) return;
    try {
      const { data } = await api('/api/my-vehicles');
      state.myVehicles = data.items;
      renderMyVehicles();
    } catch (error) {
      state.myVehicles = [];
      renderMyVehicles(`Không tải được danh sách xe: ${networkMessage(error)}`);
    }
  }

  // ---------- khởi động ----------
  loadSlots();
  loadMyVehicles();
  setInterval(() => {
    if (!document.hidden && !ui.isAnyModalOpen() && !menu.classList.contains('show')) loadSlots({ quiet: true });
  }, REFRESH_MS);
})();
