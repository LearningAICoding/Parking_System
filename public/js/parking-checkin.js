(function () {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
  const alertBox = document.getElementById('parking-alert');
  const showAlert = (message, kind) => {
    alertBox.textContent = message;
    alertBox.className = `ui-alert ui-alert-${kind}`;
  };
  const readError = async (response) => {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || 'Không thể hoàn thành thao tác');
  };
  const setText = (id, value) => { document.getElementById(id).textContent = value || 'Chưa có'; };
  const result = document.getElementById('scan-result');
  const scanEmpty = document.getElementById('scan-empty');
  const upload = document.getElementById('plateImage');
  upload?.addEventListener('change', () => {
    const file = upload.files?.[0];
    const preview = document.getElementById('plate-preview');
    if (!file) { preview.classList.add('hidden'); return; }
    preview.src = URL.createObjectURL(file);
    preview.classList.remove('hidden');
  });

  async function loadSlots(reservedSlotCode) {
    const response = await fetch('/api/slots');
    if (!response.ok) return;
    const body = await response.json();
    const select = document.getElementById('slotId');
    select.replaceChildren(new Option('Chọn ô AVAILABLE hoặc ô RESERVED đúng xe', ''));
    body.data.filter((slot) => slot.status === 'AVAILABLE' || (reservedSlotCode && slot.status === 'RESERVED' && slot.slotCode === reservedSlotCode)).forEach((slot) => {
      const option = document.createElement('option');
      option.value = slot.id;
      option.textContent = `${slot.slotCode} · ${slot.zone}`;
      select.append(option);
    });
  }

  document.getElementById('scan-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const loading = document.getElementById('scan-loading');
    loading.classList.remove('hidden');
    try {
      const response = await fetch('/api/parking/scan-plate', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: new FormData(event.currentTarget) });
      if (!response.ok) await readError(response);
      const body = await response.json();
      const data = body.data;
      ['licensePlate', 'vehicleName', 'brand', 'customerName', 'phone', 'slotCode'].forEach((field) => setText(`result-${field}`, data[field]));
      document.getElementById('selected-vehicle-id').value = data.vehicleId || '';
      document.getElementById('scan-token').value = data.scanToken || '';
      document.getElementById('new-license-plate').value = data.licensePlate || '';
      await loadSlots(data.slotCode);
      document.getElementById('open-vehicle-modal').classList.toggle('hidden', data.exists);
      result.classList.remove('hidden');
      scanEmpty.classList.add('hidden');
      showAlert(data.exists ? 'Đã tìm thấy thông tin xe trong hệ thống.' : 'Chưa có xe. Bạn có thể thêm xe vãng lai.', data.exists ? 'success' : 'warning');
    } catch (error) { showAlert(error.message, 'danger'); } finally { loading.classList.add('hidden'); }
  });

  document.getElementById('vehicle-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    delete payload._csrf;
    try {
      const response = await fetch('/api/vehicles', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) });
      if (!response.ok) await readError(response);
      const body = await response.json();
      document.getElementById('selected-vehicle-id').value = body.data.id;
      window.parkingUI.modal(document.getElementById('vehicle-modal')).hide();
      showAlert('Đã thêm xe vãng lai. Có thể tiếp tục cho xe vào.', 'success');
    } catch (error) { showAlert(error.message, 'danger'); }
  });

  document.getElementById('check-in-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const vehicleId = document.getElementById('selected-vehicle-id').value;
    if (!vehicleId) return showAlert('Vui lòng scan biển số trước.', 'warning');
    const payload = { vehicleId: Number(vehicleId), slotId: Number(document.getElementById('slotId').value), ticketId: document.getElementById('ticketId').value || undefined, scanToken: document.getElementById('scan-token').value || undefined };
    try {
      const response = await fetch('/api/parking/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(payload) });
      if (!response.ok) await readError(response);
      const body = await response.json();
      showAlert(`Cho xe vào thành công tại ${body.data.slotCode}. Mã lượt: ${body.data.sessionId}`, 'success');
      await loadSlots();
    } catch (error) { showAlert(error.message, 'danger'); }
  });

  document.getElementById('check-out-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('/api/parking/check-out', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ sessionId: Number(document.getElementById('sessionId').value) }) });
      if (!response.ok) await readError(response);
      const body = await response.json();
      document.getElementById('checkout-result').textContent = `Đã cho xe ra. Phí: ${body.data.fee} VND.`;
      showAlert('Cho xe ra thành công.', 'success');
      await loadSlots();
    } catch (error) { showAlert(error.message, 'danger'); }
  });

  loadSlots().catch(() => {});
}());
