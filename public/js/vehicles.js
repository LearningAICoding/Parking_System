document.querySelectorAll('[data-vehicle-create]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorBox = form.querySelector('[data-vehicle-error]');
    errorBox.classList.add('d-none');
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await window.apiFetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        errorBox.textContent = result.message || 'Không thể thêm xe.';
        errorBox.classList.remove('d-none');
        return;
      }
      document.dispatchEvent(new CustomEvent('vehicle:created', { detail: result.data }));
      form.reset();
      bootstrap.Modal.getOrCreateInstance(form.closest('.modal')).hide();
      if (window.location.pathname !== '/parking/checkin-checkout') window.location.reload();
    } catch (error) {
      errorBox.textContent = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      errorBox.classList.remove('d-none');
    }
  });
});
