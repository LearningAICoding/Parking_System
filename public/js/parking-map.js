const grid = document.getElementById('parking-grid');
const feedback = document.getElementById('map-feedback');
const isCustomerMap = window.location.pathname === '/customer/parking-map';
const registerModal = document.getElementById('slot-register-modal');
const registerForm = document.getElementById('slot-register-form');
const slotVehicleModal = document.getElementById('slot-vehicle-modal');
let slots = [];

function showMapMessage(message, success = false) {
  feedback.replaceChildren();
  const alert = document.createElement('div');
  alert.className = `alert ${success ? 'alert-success' : 'alert-danger'}`;
  alert.textContent = message;
  feedback.append(alert);
}

function createSlotCard(slot) {
  const column = document.createElement('div');
  const card = document.createElement('div');
  card.className = 'card border-0 shadow-sm h-100';
  const body = document.createElement('div');
  body.className = 'card-body text-center';
  const code = document.createElement('div');
  code.className = 'fw-bold fs-5';
  code.textContent = slot.slotCode;
  const zone = document.createElement('div');
  zone.className = 'small text-secondary';
  zone.textContent = slot.zone;
  const status = document.createElement('span');
  status.className = `badge mt-2 ${slot.status === 'AVAILABLE' ? 'text-bg-success' : slot.status === 'OCCUPIED' ? 'text-bg-danger' : slot.status === 'RESERVED' ? 'text-bg-warning' : 'text-bg-secondary'}`;
  status.textContent = slot.status;
  body.append(code, zone, status);

  if (slot.status === 'AVAILABLE') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-primary d-block mx-auto mt-3';
    button.textContent = 'Đăng ký';
    button.addEventListener('click', () => openRegisterModal(slot.id));
    body.append(button);
  }
  if (!isCustomerMap && ['OCCUPIED', 'RESERVED'].includes(slot.status)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-sm btn-outline-primary d-block mx-auto mt-3';
    button.textContent = 'Xem xe';
    button.addEventListener('click', () => showVehicle(slot.id));
    body.append(button);
  }
  card.append(body);
  column.append(card);
  return column;
}

async function loadSlots() {
  const params = new URLSearchParams();
  const zone = document.getElementById('map-zone')?.value;
  const status = document.getElementById('map-status')?.value;
  if (zone) params.set('zone', zone);
  if (status) params.set('status', status);
  try {
    const response = await fetch(`/api/slots?${params}`, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) {
      showMapMessage(result.message || 'Không thể tải bản đồ.');
      return;
    }
    slots = result.data.items;
    grid.replaceChildren(...slots.map(createSlotCard));
    const zoneSelect = document.getElementById('map-zone');
    if (zoneSelect && zoneSelect.options.length === 1) {
      [...new Set(slots.map((slot) => slot.zone))].sort().forEach((value) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        zoneSelect.append(option);
      });
    }
  } catch (error) {
    showMapMessage('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
}

async function openRegisterModal(slotId) {
  registerForm.elements.slotId.value = slotId;
  const vehicleInput = registerForm.elements.vehicleId;
  if (vehicleInput.tagName === 'SELECT') {
    vehicleInput.replaceChildren();
    const response = await fetch('/api/my-vehicles', { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) {
      showMapMessage(result.message || 'Không thể tải danh sách xe.');
      return;
    }
    result.data.items.forEach((vehicle) => {
      const option = document.createElement('option');
      option.value = vehicle.id;
      option.textContent = `${vehicle.licensePlate} · ${vehicle.vehicleName}`;
      vehicleInput.append(option);
    });
    if (!result.data.items.length) {
      showMapMessage('Bạn cần thêm xe trong mục Xe của tôi trước khi đăng ký.');
      return;
    }
  }
  bootstrap.Modal.getOrCreateInstance(registerModal).show();
}

async function showVehicle(slotId) {
  try {
    const response = await fetch(`/api/slots/${slotId}/vehicle`, { headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok) {
      showMapMessage(result.message || 'Không thể xem thông tin xe.');
      return;
    }
    const details = document.getElementById('slot-vehicle-details');
    details.replaceChildren();
    const vehicle = result.data;
    if (!vehicle) {
      details.textContent = 'Vị trí chưa có xe.';
    } else {
      [['Biển số', vehicle.licensePlate], ['Tên xe', vehicle.vehicleName], ['Hãng', vehicle.brand || '—'], ['Khách hàng', vehicle.customerName || 'Xe vãng lai'], ['Điện thoại', vehicle.phone || '—']].forEach(([label, value]) => {
        const row = document.createElement('p');
        row.textContent = `${label}: ${value}`;
        details.append(row);
      });
    }
    bootstrap.Modal.getOrCreateInstance(slotVehicleModal).show();
  } catch (error) {
    showMapMessage('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
}

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorBox = document.getElementById('register-error');
  errorBox.classList.add('d-none');
  const slotId = registerForm.elements.slotId.value;
  try {
    const response = await window.apiFetch(`/api/slots/${slotId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ vehicleId: registerForm.elements.vehicleId.value })
    });
    const result = await response.json();
    if (!response.ok) {
      errorBox.textContent = result.message || 'Không thể đăng ký vị trí.';
      errorBox.classList.remove('d-none');
      return;
    }
    bootstrap.Modal.getOrCreateInstance(registerModal).hide();
    if (isCustomerMap) {
      const receipt = document.getElementById('receipt-content');
      receipt.replaceChildren();
      [['Vị trí', result.data.slotCode], ['Mã vé', result.data.ticketCode], ['Ngày bắt đầu', result.data.startDate], ['Ngày kết thúc', result.data.endDate], ['Giá', `${result.data.price} VND`]].forEach(([label, value]) => {
        const row = document.createElement('p');
        row.textContent = `${label}: ${value}`;
        receipt.append(row);
      });
      bootstrap.Modal.getOrCreateInstance(document.getElementById('registration-receipt')).show();
      document.getElementById('registration-receipt').addEventListener('hidden.bs.modal', () => window.location.reload(), { once: true });
    } else {
      showMapMessage(result.message, true);
      await loadSlots();
    }
  } catch (error) {
    errorBox.textContent = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
    errorBox.classList.remove('d-none');
  }
});

document.getElementById('map-zone')?.addEventListener('change', loadSlots);
document.getElementById('map-status')?.addEventListener('change', loadSlots);
loadSlots();
