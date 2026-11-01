(function () {
  const grid = document.getElementById('parking-grid');
  const alertBox = document.getElementById('map-alert');
  const showAlert = (message, kind) => { alertBox.textContent = message; alertBox.className = `ui-alert ui-alert-${kind}`; };
  const label = { AVAILABLE: 'TRỐNG', OCCUPIED: 'ĐÃ ĐỖ', RESERVED: 'ĐẶT TRƯỚC', MAINTENANCE: 'BẢO TRÌ' };
  async function load() {
    const response = await fetch('/api/slots');
    if (!response.ok) throw new Error('Không thể tải bản đồ');
    const body = await response.json();
    grid.replaceChildren();
    body.data.forEach((slot) => {
      const cell = document.createElement('button');
      cell.type = 'button'; cell.className = `parking-cell status-${slot.status.toLowerCase()}`;
      cell.dataset.slotId = slot.id;
      cell.innerHTML = `<strong>${slot.slotCode}</strong><span>${slot.zone}</span><small>${label[slot.status] || slot.status}</small>`;
      cell.addEventListener('click', async () => {
        if (slot.status === 'AVAILABLE' || slot.status === 'MAINTENANCE') return;
        const info = await fetch(`/api/slots/${slot.id}/vehicle`, { headers: { Accept: 'application/json' } });
        const result = await info.json();
        if (!info.ok) return showAlert(result.message || 'Không thể xem thông tin xe', 'danger');
        showAlert(result.data ? `${result.data.slotCode}: ${result.data.licensePlate} · ${result.data.vehicleName}` : 'Ô chưa có xe.', 'info');
      });
      grid.append(cell);
    });
  }
  load().catch((error) => showAlert(error.message, 'danger'));
}());
