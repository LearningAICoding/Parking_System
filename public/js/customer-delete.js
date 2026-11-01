(() => {
  const modalElement = document.getElementById('customer-delete-modal');
  if (!modalElement) return;
  const modal = window.parkingUI.modal(modalElement);
  const error = document.getElementById('customer-delete-error');
  const submit = document.getElementById('customer-delete-submit');
  let form;
  document.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-confirm-delete]')) return;
    event.preventDefault();
    form = event.target;
    error.classList.add('hidden');
    modal.show();
  });
  submit.addEventListener('click', async () => {
    if (!form) return;
    submit.disabled = true;
    try {
      const response = await fetch(form.action, { method: 'DELETE', headers: { 'X-CSRF-Token': form.elements._csrf.value, Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Không thể xóa nhân viên');
      form.closest('[data-customer-row]').remove();
      document.getElementById('customer-feedback').textContent = result.message;
      modal.hide();
    } catch (exception) {
      error.textContent = exception.message || 'Không thể kết nối máy chủ';
      error.classList.remove('hidden');
    } finally { submit.disabled = false; }
  });
})();
