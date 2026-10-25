const feedbackBox = document.getElementById('parking-feedback');
const scanForm = document.getElementById('plate-scan-form');
const scanResult = document.getElementById('scan-result');
const checkInForm = document.getElementById('check-in-form');
let recognizedVehicle = null;
const createVisitorButton = document.getElementById('create-visitor-button');

function showParkingFeedback(message, success = false) {
  feedbackBox.replaceChildren();
  const alert = document.createElement('div');
  alert.className = `alert ${success ? 'alert-success' : 'alert-danger'}`;
  alert.textContent = message;
  feedbackBox.append(alert);
}

scanForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  scanResult.replaceChildren();
  checkInForm.classList.add('d-none');
  const image = scanForm.elements.plateImage.files[0];
  if (!image) return;
  const body = new FormData();
  body.append('plateImage', image);
  try {
    const response = await window.apiFetch('/api/parking/scan-plate', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body
    });
    const result = await response.json();
    if (!response.ok) {
      showParkingFeedback(result.message || 'Không thể đọc ảnh biển số.');
      return;
    }
    recognizedVehicle = result.data;
    createVisitorButton.classList.toggle('d-none', result.data.exists);
    const card = document.createElement('div');
    card.className = 'alert alert-info';
    const title = document.createElement('div');
    title.className = 'fw-semibold';
    title.textContent = `${result.data.licensePlate} · ${result.data.exists ? result.data.vehicleName : 'Chưa có xe trong hệ thống'}`;
    const owner = document.createElement('div');
    owner.textContent = result.data.customerName || 'Xe vãng lai hoặc chưa xác định khách hàng';
    card.append(title, owner);
    scanResult.append(card);
    if (!result.data.vehicleId) {
      showParkingFeedback('Chưa có thông tin xe. Hãy tạo xe vãng lai từ chức năng Thêm xe rồi quét lại.', false);
      return;
    }
    checkInForm.elements.vehicleId.value = result.data.vehicleId;
    checkInForm.elements.scanToken.value = result.data.scanToken;
    checkInForm.classList.remove('d-none');
  } catch (error) {
    showParkingFeedback('Không thể hoàn tất việc quét ảnh. Vui lòng thử lại.');
  }
});

document.addEventListener('vehicle:created', (event) => {
  if (!recognizedVehicle || event.detail.licensePlate !== recognizedVehicle.licensePlate) {
    showParkingFeedback('Xe đã được tạo. Hãy kiểm tra biển số khớp với ảnh trước khi check-in.');
    return;
  }
  checkInForm.elements.vehicleId.value = event.detail.id;
  checkInForm.elements.scanToken.value = recognizedVehicle.scanToken;
  checkInForm.classList.remove('d-none');
  createVisitorButton.classList.add('d-none');
  showParkingFeedback('Đã tạo xe và liên kết kết quả quét. Chọn vị trí để tiếp tục check-in.', true);
});

checkInForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(checkInForm).entries());
  try {
    const response = await window.apiFetch('/api/parking/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    const result = await response.json();
    if (!response.ok) {
      showParkingFeedback(result.message || 'Không thể check-in xe.');
      return;
    }
    showParkingFeedback(`${result.message} Mã ô ${result.data.slotCode}.`, true);
    window.location.reload();
  } catch (error) {
    showParkingFeedback('Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
});

document.querySelectorAll('[data-checkout-form]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.confirm('Xác nhận xe ra khỏi bãi?')) return;
    const sessionId = form.elements.sessionId.value;
    try {
      const response = await window.apiFetch('/api/parking/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const result = await response.json();
      if (!response.ok) {
        showParkingFeedback(result.message || 'Không thể check-out xe.');
        return;
      }
      showParkingFeedback(`${result.message} Phí: ${result.data.fee} VND.`, true);
      window.location.reload();
    } catch (error) {
      showParkingFeedback('Không thể kết nối máy chủ. Vui lòng thử lại.');
    }
  });
});
