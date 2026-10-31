jest.mock('../../src/services/slot.service');

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { JSDOM } = require('jsdom');
const slotService = require('../../src/services/slot.service');
const { buildSlotApp, as } = require('../helpers/slot-app');

const CLIENT_JS = fs.readFileSync(path.join(__dirname, '../../public/js/slots.js'), 'utf8');
const app = buildSlotApp();

// Render HTML thật từ server rồi chạy public/js/slots.js trong JSDOM (không tải CDN).
async function loadPage(url, { fetchImpl } = {}) {
  const res = await as('MANAGER')(request(app).get(url));
  const html = res.text.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: `http://localhost${url}` });
  dom.window.fetch = fetchImpl || jest.fn();
  dom.window.eval(CLIENT_JS);
  return dom.window;
}

const visibleCodes = (window) => Array.from(window.document.querySelectorAll('[data-slot-row]:not([hidden])'))
  .map((row) => row.dataset.code);

beforeEach(() => {
  slotService.isModifiable.mockImplementation(jest.requireActual('../../src/services/slot.service').isModifiable);
  slotService.listZones.mockResolvedValue(['B1-A']);
  slotService.listSlots.mockResolvedValue([
    { id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE' },
    { id: 2, slotCode: 'A-02', zone: 'B1-A', status: 'RESERVED', currentVehicleId: 1 },
    { id: 3, slotCode: 'B-01', zone: 'B1-A', status: 'AVAILABLE' }
  ]);
  slotService.getSlotDetail.mockResolvedValue({ id: 1, slotCode: 'A-01', zone: 'B1-A', status: 'AVAILABLE', vehicleId: null });
});

describe('Client JS – danh sách', () => {
  test('tìm theo mã vị trí, không phân biệt hoa thường', async () => {
    const window = await loadPage('/slots');
    const input = window.document.querySelector('[data-slot-search]');
    input.value = 'a-0';
    input.dispatchEvent(new window.Event('input'));
    expect(visibleCodes(window)).toEqual(['A-01', 'A-02']);
  });

  test('lọc theo trạng thái và kết hợp với tìm kiếm', async () => {
    const window = await loadPage('/slots');
    window.document.querySelector('[data-status-filter="AVAILABLE"]').click();
    expect(visibleCodes(window)).toEqual(['A-01', 'B-01']);
    const input = window.document.querySelector('[data-slot-search]');
    input.value = 'B';
    input.dispatchEvent(new window.Event('input'));
    expect(visibleCodes(window)).toEqual(['B-01']);
  });

  test('không có kết quả thì hiện dòng thông báo', async () => {
    const window = await loadPage('/slots');
    const input = window.document.querySelector('[data-slot-search]');
    input.value = 'ZZZ';
    input.dispatchEvent(new window.Event('input'));
    expect(window.document.querySelector('[data-slot-no-match]').hidden).toBe(false);
  });
});

describe('Client JS – form', () => {
  test('mã vị trí tự chuyển in hoa, chặn submit khi thiếu dữ liệu và báo lỗi tại trường', async () => {
    const window = await loadPage('/slots/create');
    const { document } = window;
    const code = document.querySelector('#slotCode');
    code.value = 'a 01';
    code.dispatchEvent(new window.Event('input'));
    expect(code.value).toBe('A01');

    const event = new window.Event('submit', { cancelable: true });
    document.querySelector('[data-slot-form]').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.querySelector('#zone').classList.contains('is-invalid')).toBe(true);
    expect(document.querySelector('#zone').parentElement.querySelector('.invalid-feedback').textContent)
      .toBe('Vui lòng nhập khu vực / tầng');
  });

  test('bộ đếm ký tự ghi chú cập nhật khi gõ', async () => {
    const window = await loadPage('/slots/create');
    const note = window.document.querySelector('#note');
    note.value = 'abc';
    note.dispatchEvent(new window.Event('input'));
    expect(window.document.querySelector('[data-char-count="note"]').textContent).toBe('3/255');
  });
});

describe('Client JS – Quay lại (R4.4)', () => {
  test('không tải được danh sách thì hiện thông báo theo SRS', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    const window = await loadPage('/slots/1', { fetchImpl });
    window.document.querySelector('[data-slot-back]').click();
    await new Promise((resolve) => { setImmediate(resolve); });
    const alert = window.document.querySelector('[data-slot-back-error]');
    expect(alert.hidden).toBe(false);
    expect(alert.textContent).toBe('Có vấn đề, Không thể quay lại trang danh sách vị trí');
  });

  test('server trả lỗi cũng hiện thông báo', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503 });
    const window = await loadPage('/slots/1', { fetchImpl });
    window.document.querySelector('[data-slot-back]').click();
    await new Promise((resolve) => { setImmediate(resolve); });
    expect(fetchImpl).toHaveBeenCalledWith('/slots', expect.objectContaining({ method: 'HEAD' }));
    expect(window.document.querySelector('[data-slot-back-error]').hidden).toBe(false);
  });
});
