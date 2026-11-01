(function () {
  const grid = document.getElementById('parking-grid');
  const alertBox = document.getElementById('map-alert');
  const receipt = document.getElementById('receipt');
  const vehicleSelect = document.getElementById('register-vehicle');
  const registerButton = document.getElementById('register-slot');
  const selectedSlot = document.getElementById('selected-slot');
  let selected;
  const showAlert = (message, kind) => { alertBox.textContent = message; alertBox.className = `ui-alert ui-alert-${kind}`; };
  async function loadVehicles() {
    const response = await fetch('/api/my-vehicles');
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Không thể tải danh sách xe');
    vehicleSelect.replaceChildren(new Option('Chọn xe', ''));
    body.data.items.forEach((vehicle) => vehicleSelect.append(new Option(`${vehicle.licensePlate} · ${vehicle.vehicleName}`, vehicle.id)));
  }
  async function loadMap() {
    const response = await fetch('/api/slots');
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Không thể tải bản đồ');
    grid.replaceChildren();
    body.data.forEach((slot) => {
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = `parking-cell status-${slot.status.toLowerCase()}`; cell.disabled = slot.status !== 'AVAILABLE';
      cell.innerHTML = `<strong>${slot.slotCode}</strong><span>${slot.zone}</span><small>${slot.status === 'AVAILABLE' ? 'TRỐNG' : slot.status}</small>`;
      cell.addEventListener('click', () => { selected = slot; selectedSlot.textContent = `${slot.slotCode} · ${slot.zone}`; registerButton.disabled = !vehicleSelect.value; });
      grid.append(cell);
    });
  }
  vehicleSelect.addEventListener('change', () => { registerButton.disabled = !selected || !vehicleSelect.value; });
  registerButton.addEventListener('click', async () => {
    try {
      const response = await fetch(`/api/slots/${selected.id}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content }, body: JSON.stringify({ vehicleId: Number(vehicleSelect.value) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Không thể đăng ký ô');
      receipt.textContent = `Đã đăng ký ${body.data.slotCode}. Vé ${body.data.ticketCode}, từ ${body.data.startDate} đến ${body.data.endDate}, giá ${body.data.price} VND.`;
      receipt.classList.remove('hidden'); showAlert(body.message, 'success'); registerButton.disabled = true; selected = null;
      await Promise.all([loadMap(), loadVehicles()]);
    } catch (error) { showAlert(error.message, 'danger'); }
  });
  Promise.all([loadMap(), loadVehicles()]).catch((error) => showAlert(error.message, 'danger'));
}());
