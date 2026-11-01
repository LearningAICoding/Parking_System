const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const uiScript = fs.readFileSync(path.join(__dirname, '../../public/js/ui.js'), 'utf8');

function createPage() {
  const dom = new JSDOM(`<!doctype html><html><body>
    <button id="menu-open" data-ui-toggle="offcanvas" data-ui-target="#appSidebar">Menu</button>
    <div id="sidebarBackdrop" class="hidden"></div>
    <aside id="appSidebar"><button data-ui-dismiss="offcanvas">Đóng menu</button></aside>
    <button id="modal-open" data-ui-toggle="modal" data-ui-target="#test-modal">Mở</button>
    <div id="test-modal" class="ui-modal" aria-hidden="true" tabindex="-1">
      <button id="modal-close" data-ui-dismiss="modal">Đóng</button>
    </div>
  </body></html>`, { url: 'http://localhost:3000', runScripts: 'dangerously' });
  dom.window.eval(uiScript);
  return dom;
}

test('modal opens, traps the active state and closes with Escape', () => {
  const dom = createPage();
  const { document, KeyboardEvent } = dom.window;
  const modal = document.getElementById('test-modal');
  document.getElementById('modal-open').click();
  expect(modal.classList.contains('is-open')).toBe(true);
  expect(modal.getAttribute('aria-hidden')).toBe('false');
  expect(modal.getAttribute('aria-modal')).toBe('true');
  expect(document.body.style.overflow).toBe('hidden');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(modal.classList.contains('is-open')).toBe(false);
  expect(modal.getAttribute('aria-hidden')).toBe('true');
  expect(document.body.style.overflow).toBe('');
  dom.window.close();
});

test('mobile menu opens and closes through its backdrop', () => {
  const dom = createPage();
  const { document } = dom.window;
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  document.getElementById('menu-open').click();
  expect(sidebar.classList.contains('is-open')).toBe(true);
  expect(backdrop.classList.contains('hidden')).toBe(false);
  backdrop.click();
  expect(sidebar.classList.contains('is-open')).toBe(false);
  expect(backdrop.classList.contains('hidden')).toBe(true);
  dom.window.close();
});
