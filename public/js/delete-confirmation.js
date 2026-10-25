const deleteModalElement = document.getElementById('delete-confirmation-modal');
if (deleteModalElement) {
  const deleteModal = bootstrap.Modal.getOrCreateInstance(deleteModalElement);
  const deleteMessage = document.getElementById('delete-confirmation-message');
  const deleteError = document.getElementById('delete-confirmation-error');
  const deleteButton = document.getElementById('delete-confirmation-submit');
  let pendingForm = null;

  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-confirm-delete]');
    if (!form) return;
    event.preventDefault();
    pendingForm = form;
    deleteMessage.textContent = form.dataset.confirmMessage || 'Bạn có chắc chắn muốn xóa mục này?';
    deleteError.textContent = '';
    deleteError.classList.add('d-none');
    deleteModal.show();
  });

  deleteButton.addEventListener('click', async () => {
    if (!pendingForm) return;
    deleteButton.disabled = true;
    try {
      const response = await window.apiFetch(pendingForm.action, {
        method: 'DELETE',
        headers: { Accept: 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) {
        deleteError.textContent = result.message || 'Không thể xóa mục này.';
        deleteError.classList.remove('d-none');
        return;
      }

      const row = pendingForm.closest('[data-employee-row], [data-customer-row], [data-ticket-row], [data-slot-row]');
      row?.remove();
      updateVisibleCount();
      const feedback = document.querySelector('#employee-feedback, #customer-feedback, #ticket-feedback, #slot-feedback');
      if (feedback) {
        feedback.replaceChildren();
        const alert = document.createElement('div');
        alert.className = 'alert alert-success';
        alert.setAttribute('role', 'status');
        alert.textContent = result.message || 'Đã xóa mục.';
        feedback.append(alert);
      }
      pendingForm = null;
      deleteModal.hide();
    } catch {
      deleteError.textContent = 'Không thể kết nối máy chủ. Vui lòng thử lại.';
      deleteError.classList.remove('d-none');
    } finally {
      deleteButton.disabled = false;
    }
  });

  function updateVisibleCount() {
    const employeeCount = document.getElementById('employee-count');
    if (employeeCount) {
      const count = Math.max(0, Number(employeeCount.dataset.count) - 1);
      employeeCount.dataset.count = String(count);
      employeeCount.textContent = `Tổng cộng: ${count} nhân viên hiển thị`;
    }
    const customerCount = document.getElementById('customer-count');
    if (customerCount) {
      const current = Number(customerCount.textContent.match(/\d+/)?.[0] || 0);
      customerCount.textContent = `Tổng cộng: ${Math.max(0, current - 1)} khách hàng hiển thị`;
    }
  }
}
