(function () {
  const modalElement = document.getElementById('delete-ticket-modal');
  const modal = modalElement ? window.parkingUI.modal(modalElement) : null;
  const alertBox = document.getElementById('ticket-alert');
  let selectedId;
  const showAlert = (message, kind) => { alertBox.textContent = message; alertBox.className = `ui-alert ui-alert-${kind}`; };
  document.querySelectorAll('.js-delete-ticket').forEach((button) => button.addEventListener('click', () => {
    selectedId = button.dataset.ticketId;
    document.getElementById('delete-ticket-code').textContent = button.dataset.ticketCode;
    modal?.show();
  }));
  document.getElementById('confirm-delete-ticket')?.addEventListener('click', async () => {
    try {
      const response = await fetch(`/tickets/${selectedId}`, { method: 'DELETE', headers: { 'Accept': 'application/json', 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Không thể xóa vé');
      document.getElementById(`ticket-row-${selectedId}`)?.remove();
      modal?.hide();
      showAlert(body.message || 'Xóa vé thành công', 'success');
    } catch (error) { showAlert(error.message, 'danger'); }
  });
}());
