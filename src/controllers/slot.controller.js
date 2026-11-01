const slotService = require('../services/slot.service');
const AppError = require('../utils/app-error');
const { ROLES } = require('../constants/roles');
const { SLOT_STATUS } = require('../constants/slot-status');

const FORM_FIELDS = { create: ['slotCode', 'zone', 'status', 'note'], edit: ['zone', 'status', 'note'] };

function pick(body, fields) {
  return Object.fromEntries(fields.map((field) => [field, typeof body?.[field] === 'string' ? body[field] : '']));
}

function takeFlash(req) {
  const flash = req.session?.flash || null;
  if (req.session) delete req.session.flash;
  return flash;
}

function listUrl(zone) {
  return zone ? `/slots?zone=${encodeURIComponent(zone)}` : '/slots';
}

async function renderForm(res, { mode, slot, values, error, status = 200 }) {
  const fieldErrors = Object.fromEntries((error?.errors || []).map((item) => [item.field, item.message]));
  // Gợi ý khu vực chỉ để tiện nhập; lỗi kết nối không được chặn việc hiển thị form
  const zones = await slotService.listZones().catch(() => []);
  return res.status(status).render('slots/form', {
    title: mode === 'create' ? 'Thêm mới vị trí đỗ' : 'Sửa thông tin vị trí đỗ',
    mode, slot, values, zones, fieldErrors, errorMessage: error?.message || null, SLOT_STATUS,
    locked: Boolean(slot) && !slotService.isModifiable(slot)
  });
}

async function list(req, res) {
  const zones = await slotService.listZones();
  const selectedZone = typeof req.query.zone === 'string' ? req.query.zone : '';
  const slots = await slotService.listSlots({ zone: selectedZone });
  res.render('slots/list', {
    title: 'Danh sách vị trí đỗ', slots, zones, selectedZone,
    canManage: req.session.user.role === ROLES.MANAGER, flash: takeFlash(req),
    isModifiable: slotService.isModifiable
  });
}

async function detail(req, res) {
  const slot = await slotService.getSlotDetail(Number(req.params.id));
  res.render('slots/detail', {
    title: 'Thông tin chi tiết vị trí đỗ', slot, canManage: req.session.user.role === ROLES.MANAGER,
    modifiable: slotService.isModifiable(slot)
  });
}

async function createForm(req, res) {
  const zone = typeof req.query.zone === 'string' ? req.query.zone.slice(0, 20) : '';
  await renderForm(res, { mode: 'create', slot: null, values: { status: SLOT_STATUS.AVAILABLE, zone } });
}

async function create(req, res) {
  const values = pick(req.body, FORM_FIELDS.create);
  try {
    const slot = await slotService.createSlot(values);
    req.session.flash = { type: 'success', message: `Đã thêm vị trí ${slot.slotCode}`, slotId: slot.id };
    res.redirect(listUrl(slot.zone));
  } catch (error) {
    if (!(error instanceof AppError) || error.statusCode === 404) throw error;
    await renderForm(res, { mode: 'create', slot: null, values, error, status: error.statusCode });
  }
}

async function editForm(req, res) {
  const slot = await slotService.getSlot(Number(req.params.id));
  await renderForm(res, { mode: 'edit', slot, values: slot });
}

async function edit(req, res) {
  const id = Number(req.params.id);
  const values = pick(req.body, FORM_FIELDS.edit);
  try {
    const slot = await slotService.editSlot(id, values);
    req.session.flash = { type: 'success', message: `Đã cập nhật vị trí ${slot.slotCode}`, slotId: slot.id };
    res.redirect(listUrl(slot.zone));
  } catch (error) {
    if (!(error instanceof AppError) || error.statusCode === 404) throw error;
    const slot = await slotService.getSlot(id).catch(() => null);
    await renderForm(res, { mode: 'edit', slot, values: { ...slot, ...values }, error, status: error.statusCode });
  }
}

async function remove(req, res) {
  const { id, slotCode } = await slotService.deleteSlot(Number(req.params.id));
  const message = `Đã xóa vị trí ${slotCode}`;
  req.session.flash = { type: 'success', message };
  res.json({ success: true, message, data: { id }, errors: [] });
}

module.exports = { list, detail, createForm, create, editForm, edit, remove };
