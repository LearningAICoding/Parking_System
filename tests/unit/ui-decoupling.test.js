// Giữ giao diện tách khỏi logic để thay theo Figma chỉ cần sửa EJS + public/css/parking.css
const fs = require('fs');
const path = require('path');
const { SLOT_STATUS_LABEL } = require('../../src/constants/slot-status');
const { VEHICLE_TYPE_LABEL, VEHICLE_DERIVED_STATUS_LABEL } = require('../../src/constants/vehicle');

const read = (file) => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
const CLIENT_FILES = ['public/js/slots.js', 'public/js/parking-map.js'];
const LABELS = [
  ...Object.values(SLOT_STATUS_LABEL), ...Object.values(VEHICLE_TYPE_LABEL), ...Object.values(VEHICLE_DERIVED_STATUS_LABEL)
];

describe.each(CLIENT_FILES)('%s', (file) => {
  const source = read(file);

  test('không gắn class màu Bootstrap (màu nằm ở parking.css theo data-status)', () => {
    expect(source).not.toMatch(/text-bg-|btn-outline-(success|warning|danger|secondary)|table-success|\bd-none\b/);
  });

  test('không tự định nghĩa nhãn trạng thái/loại xe (lấy từ src/constants qua data-ui-labels)', () => {
    LABELS.forEach((label) => expect(source).not.toContain(`'${label}'`));
  });

  test('chỉ gọi window.bootstrap bên trong object ui', () => {
    const uiStart = source.indexOf('const ui = {');
    const uiEnd = source.indexOf('\n  };', uiStart);
    expect(uiStart).toBeGreaterThan(-1);
    let index = source.indexOf('window.bootstrap');
    while (index !== -1) {
      expect(index > uiStart && index < uiEnd).toBe(true);
      index = source.indexOf('window.bootstrap', index + 1);
    }
  });
});

test('view không viết cứng nhãn trạng thái ô', () => {
  ['src/views/slots/list.ejs', 'src/views/slots/_status-badge.ejs', 'src/views/parking/_map-board.ejs', 'src/views/slots/form.ejs']
    .forEach((file) => Object.values(SLOT_STATUS_LABEL).forEach((label) => expect(read(file)).not.toContain(`>${label}<`)));
});
