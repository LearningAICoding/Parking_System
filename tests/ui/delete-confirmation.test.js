const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const apiScript = fs.readFileSync(path.join(__dirname, '../../public/js/api.js'), 'utf8');
const confirmationScript = fs.readFileSync(path.join(__dirname, '../../public/js/delete-confirmation.js'), 'utf8');

describe('shared browser helpers', () => {
  test('adds the CSRF header to mutation requests while preserving supplied headers', async () => {
    const dom = new JSDOM('<meta name="csrf-token" content="csrf-value">', { runScripts: 'outside-only' });
    dom.window.Headers = Headers;
    dom.window.fetch = jest.fn().mockResolvedValue({ ok: true });
    dom.window.eval(apiScript);

    await dom.window.apiFetch('/api/vehicles', {
      method: 'POST',
      headers: { Accept: 'application/json' }
    });

    const [, options] = dom.window.fetch.mock.calls[0];
    expect(options.headers.get('X-CSRF-Token')).toBe('csrf-value');
    expect(options.headers.get('Accept')).toBe('application/json');
    dom.window.close();
  });

  test('keeps the confirmation modal open and shows the server 409 message', async () => {
    const dom = new JSDOM(`
      <div id="delete-confirmation-modal">
        <p id="delete-confirmation-message"></p>
        <div id="delete-confirmation-error" class="d-none"></div>
        <button id="delete-confirmation-submit"></button>
      </div>
      <form action="/slots/8" data-confirm-delete data-confirm-message="Delete slot?">
        <input name="_csrf" value="token">
        <button type="submit">Delete</button>
        <div data-slot-row="8"></div>
      </form>
      <div id="slot-feedback"></div>
    `, { runScripts: 'outside-only' });
    const modal = { show: jest.fn(), hide: jest.fn() };
    dom.window.bootstrap = { Modal: { getOrCreateInstance: () => modal } };
    dom.window.apiFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Không thể xóa vị trí đang được sử dụng.' })
    });
    dom.window.eval(confirmationScript);
    const form = dom.window.document.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    dom.window.document.getElementById('delete-confirmation-submit').click();
    await new Promise((resolve) => setImmediate(resolve));

    expect(modal.show).toHaveBeenCalledTimes(1);
    expect(modal.hide).not.toHaveBeenCalled();
    expect(dom.window.document.getElementById('delete-confirmation-error').textContent)
      .toBe('Không thể xóa vị trí đang được sử dụng.');
    expect(dom.window.document.querySelector('[data-slot-row]')).not.toBeNull();
    dom.window.close();
  });

  test('removes the row and closes the modal only after successful deletion', async () => {
    const dom = new JSDOM(`
      <div id="delete-confirmation-modal">
        <p id="delete-confirmation-message"></p>
        <div id="delete-confirmation-error" class="d-none"></div>
        <button id="delete-confirmation-submit"></button>
      </div>
      <tr data-ticket-row="2"><td>
        <form action="/tickets/2" data-confirm-delete><input name="_csrf" value="token"><button type="submit">Delete</button></form>
      </td></tr>
      <div id="ticket-feedback"></div>
    `, { runScripts: 'outside-only' });
    const modal = { show: jest.fn(), hide: jest.fn() };
    dom.window.bootstrap = { Modal: { getOrCreateInstance: () => modal } };
    dom.window.apiFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Đã xóa vé.' })
    });
    dom.window.eval(confirmationScript);
    const form = dom.window.document.querySelector('form');
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
    dom.window.document.getElementById('delete-confirmation-submit').click();
    await new Promise((resolve) => setImmediate(resolve));

    expect(modal.hide).toHaveBeenCalledTimes(1);
    expect(dom.window.document.querySelector('[data-ticket-row]')).toBeNull();
    expect(dom.window.document.getElementById('ticket-feedback').textContent).toBe('Đã xóa vé.');
    dom.window.close();
  });
});
