const service = require('../services/ticket.service');
const auditLog = require('../utils/audit-log');

exports.list = async (req, res) => res.render('tickets/list', {
  title: 'Danh sách vé',
  tickets: await service.list()
});

exports.editPage = async (req, res) => res.render('tickets/edit', {
  title: 'Sửa vé',
  ticket: await service.get(req.params.id),
  error: null
});

exports.update = async (req, res) => {
  const input = {
    ...(typeof req.body.startDate === 'string' ? { startDate: req.body.startDate } : {}),
    ...(typeof req.body.endDate === 'string' ? { endDate: req.body.endDate } : {})
  };
  try {
    await service.update(req.params.id, input);
    auditLog('ticket_updated', { actorUserId: req.session.user.id, ticketId: Number(req.params.id) });
    res.redirect('/tickets?notice=updated');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      const ticket = await service.get(req.params.id);
      return res.status(error.statusCode).render('tickets/edit', { title: 'Sửa vé', ticket: { ...ticket, ...input }, error: error.message });
    }
    throw error;
  }
};

exports.remove = async (req, res) => {
  await service.remove(req.params.id);
  auditLog('ticket_deleted', { actorUserId: req.session.user.id, ticketId: Number(req.params.id) });
  res.json({ success: true, message: 'Đã xóa vé.', data: { id: Number(req.params.id) }, errors: [] });
};
