const searchInput = document.getElementById('vehicle-search-keyword');
const searchResults = document.getElementById('vehicle-search-results');
let searchTimer;

function renderSearchMessage(message, className = 'text-secondary') {
  searchResults.replaceChildren();
  const item = document.createElement('div');
  item.className = `small ${className}`;
  item.textContent = message;
  searchResults.append(item);
}

searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  const keyword = searchInput.value.trim();
  if (!keyword) {
    searchResults.replaceChildren();
    return;
  }
  if (keyword.length > 50) {
    renderSearchMessage('Từ khóa tìm kiếm tối đa 50 ký tự.', 'text-danger');
    return;
  }
  searchTimer = setTimeout(async () => {
    renderSearchMessage('Đang tìm...');
    try {
      const response = await fetch(`/api/vehicles/search?keyword=${encodeURIComponent(keyword)}`, {
        headers: { Accept: 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) {
        renderSearchMessage(result.message || 'Không thể tìm xe.', 'text-danger');
        return;
      }
      searchResults.replaceChildren();
      if (!result.data.items.length) {
        renderSearchMessage('Không tìm thấy xe phù hợp.');
        return;
      }
      result.data.items.forEach((vehicle) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'list-group-item list-group-item-action text-start';
        const name = document.createElement('div');
        name.className = 'fw-semibold';
        name.textContent = `${vehicle.licensePlate} · ${vehicle.vehicleName}`;
        const owner = document.createElement('div');
        owner.className = 'small text-secondary';
        owner.textContent = vehicle.customerName
          ? `${vehicle.customerName} · ${vehicle.phone || ''}`
          : 'Xe vãng lai';
        item.append(name, owner);
        item.addEventListener('click', () => {
          const vehicleInput = document.getElementById('register-vehicle-id');
          if (!vehicleInput) return;
          vehicleInput.value = vehicle.id;
          bootstrap.Modal.getOrCreateInstance(document.getElementById('vehicle-search-modal')).hide();
        });
        searchResults.append(item);
      });
    } catch (error) {
      renderSearchMessage('Không thể kết nối máy chủ. Vui lòng thử lại.', 'text-danger');
    }
  }, 250);
});

document.getElementById('vehicle-search-modal').addEventListener('shown.bs.modal', () => searchInput.focus());
document.getElementById('vehicle-search-modal').addEventListener('hidden.bs.modal', () => {
  searchInput.value = '';
  searchResults.replaceChildren();
});
