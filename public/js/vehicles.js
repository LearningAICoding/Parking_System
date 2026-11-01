document.querySelectorAll('[data-vehicle-create]').forEach((form) => {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const errorBox = form.querySelector('[data-vehicle-error]');
    errorBox.classList.add('hidden');
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          Accept: 'application/json'
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        errorBox.textContent = result.message || 'Không thể thêm xe.';
        errorBox.classList.remove('hidden');
        return;
      }
      document.dispatchEvent(new CustomEvent('vehicle:created', { detail: result.data }));
      form.reset();
      window.parkingUI.modal(form.closest('.ui-modal')).hide();
      if (window.location.pathname !== '/parking/checkin-checkout') window.location.reload();
    } catch (error) {
      errorBox.textContent = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      errorBox.classList.remove('hidden');
    }
  });
});
