const service = require('../services/slot.service');
const auditLog = require('../utils/audit-log');

exports.list = async (req, res) => res.render('slots/list', {
  title: 'Danh sách vị trí',
  slots: await service.list()
});

exports.createPage = (req, res) => res.render('slots/form', {
  title: 'Thêm vị trí',
  slot: null,
  error: null
});

exports.create = async (req, res) => {
  const input = {
    slotCode: req.body.slotCode,
    zone: req.body.zone,
    status: req.body.status,
    note: req.body.note
  };
  try {
    await service.create(input);
    auditLog('slot_created', { actorUserId: req.session.user.id, slotCode: input.slotCode });
    res.redirect('/slots?notice=created');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).render('slots/form', { title: 'Thêm vị trí', slot: input, error: error.message });
    throw error;
  }
};

exports.detail = async (req, res) => res.render('slots/detail', {
  title: 'Chi tiết vị trí',
  slot: await service.get(req.params.id)
});

exports.editPage = async (req, res) => res.render('slots/form', {
  title: 'Sửa vị trí',
  slot: await service.get(req.params.id),
  error: null
});

exports.update = async (req, res) => {
  const input = { zone: req.body.zone, status: req.body.status, note: req.body.note };
  try {
    await service.update(req.params.id, input);
    auditLog('slot_updated', { actorUserId: req.session.user.id, slotId: Number(req.params.id) });
    res.redirect('/slots?notice=updated');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      const slot = await service.get(req.params.id);
      return res.status(error.statusCode).render('slots/form', { title: 'Sửa vị trí', slot: { ...slot, ...input }, error: error.message });
    }
    throw error;
  }
};

exports.remove = async (req, res) => {
  await service.remove(req.params.id);
  auditLog('slot_deleted', { actorUserId: req.session.user.id, slotId: Number(req.params.id) });
  res.json({ success: true, message: 'Đã xóa vị trí.', data: { id: Number(req.params.id) }, errors: [] });
};
