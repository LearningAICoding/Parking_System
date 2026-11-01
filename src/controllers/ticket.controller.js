const ticketService = require('../services/ticket.service');

async function renderTickets(req, res) {
  const data = await ticketService.listTickets({ page: req.query.page, limit: req.query.limit });
  return res.render('tickets/list', { title: 'Danh sách vé', ...data });
}

async function deleteTicket(req, res, next) {
  try {
    await ticketService.deleteTicket(Number(req.params.id));
    return res.status(200).json({ success: true, message: 'Xóa vé thành công', data: {}, errors: [] });
  } catch (error) {
    return next(error);
  }
}

async function renderEditTicket(req, res, next) {
  try {
    const ticket = await ticketService.getTicketForEdit(Number(req.params.id));
    return res.render('tickets/edit', { title: 'Chỉnh sửa vé', ticket, formError: null });
  } catch (error) {
    return next(error);
  }
}

async function editTicket(req, res, next) {
  try {
    if (req.validationErrors?.length) {
      const ticket = await ticketService.getTicketForEdit(Number(req.params.id));
      return res.status(400).render('tickets/edit', { title: 'Chỉnh sửa vé', ticket, formError: req.validationErrors[0].message, values: req.body });
    }
    await ticketService.updateTicketDates(Number(req.params.id), {
      startDate: req.body.startDate,
      endDate: req.body.endDate
    });
    return res.redirect('/tickets');
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) {
      const ticket = await ticketService.getTicketForEdit(Number(req.params.id)).catch(() => null);
      return res.status(error.statusCode).render('tickets/edit', { title: 'Chỉnh sửa vé', ticket, formError: error.message, values: req.body });
    }
    return next(error);
  }
}

module.exports = { renderTickets, deleteTicket, renderEditTicket, editTicket };
