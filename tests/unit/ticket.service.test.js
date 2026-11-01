jest.mock('../../src/models/ticket.model', () => ({
  pool: { getConnection: jest.fn() },
  expireActiveTickets: jest.fn(),
  countTickets: jest.fn(),
  listTickets: jest.fn(),
  findTicketForEdit: jest.fn(),
  findTicketSlotReference: jest.fn(),
  findTicketForUpdate: jest.fn(),
  lockTicketSlot: jest.fn(),
  hasTicketSessions: jest.fn(),
  updateTicketDates: jest.fn(),
  softDeleteTicket: jest.fn()
}));

const ticketModel = require('../../src/models/ticket.model');
const ticketService = require('../../src/services/ticket.service');

function connection() {
  return { beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
}

describe('ticket.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('expires lazily and returns paginated ticket data', async () => {
    ticketModel.countTickets.mockResolvedValue(21);
    ticketModel.listTickets.mockResolvedValue([{ id: 1, ticketCode: 'T-1' }]);
    await expect(ticketService.listTickets({ page: 2, limit: 10 })).resolves.toEqual({
      items: [{ id: 1, ticketCode: 'T-1' }],
      pagination: { page: 2, limit: 10, total: 21, totalPages: 3 }
    });
    expect(ticketModel.expireActiveTickets).toHaveBeenCalled();
    expect(ticketModel.listTickets).toHaveBeenCalledWith(10, 10);
  });

  test('locks slot before ticket and soft deletes an eligible ticket', async () => {
    const conn = connection();
    ticketModel.pool.getConnection.mockResolvedValue(conn);
    ticketModel.findTicketSlotReference.mockResolvedValue({ id: 1, slot_id: 3 });
    ticketModel.lockTicketSlot.mockResolvedValue({ id: 3, status: 'AVAILABLE', current_vehicle_id: null });
    ticketModel.findTicketForUpdate.mockResolvedValue({ id: 1, slot_id: 3, vehicle_id: 10, deleted_at: null });
    await expect(ticketService.deleteTicket(1)).resolves.toBeUndefined();
    expect(ticketModel.lockTicketSlot.mock.invocationCallOrder[0]).toBeLessThan(ticketModel.findTicketForUpdate.mock.invocationCallOrder[0]);
    expect(ticketModel.softDeleteTicket).toHaveBeenCalledWith(conn, 1);
    expect(conn.commit).toHaveBeenCalled();
  });

  test('keeps an occupied ticket and rolls back on delete', async () => {
    const conn = connection();
    ticketModel.pool.getConnection.mockResolvedValue(conn);
    ticketModel.findTicketSlotReference.mockResolvedValue({ id: 1, slot_id: 3 });
    ticketModel.lockTicketSlot.mockResolvedValue({ id: 3, status: 'OCCUPIED', current_vehicle_id: 10 });
    ticketModel.findTicketForUpdate.mockResolvedValue({ id: 1, slot_id: 3, vehicle_id: 10, deleted_at: null });
    await expect(ticketService.deleteTicket(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(ticketModel.softDeleteTicket).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
  });

  test('rejects an inverted date range before opening a transaction', async () => {
    await expect(ticketService.updateTicketDates(1, { startDate: '2026-10-25', endDate: '2026-10-24' })).rejects.toMatchObject({ statusCode: 400 });
    expect(ticketModel.pool.getConnection).not.toHaveBeenCalled();
  });

  test('recalculates the server price when editing an unused DAILY ticket', async () => {
    const conn = connection();
    ticketModel.pool.getConnection.mockResolvedValue(conn);
    ticketModel.findTicketSlotReference.mockResolvedValue({ id: 1, slot_id: 3 });
    ticketModel.lockTicketSlot.mockResolvedValue({ id: 3, status: 'RESERVED', current_vehicle_id: 10 });
    ticketModel.findTicketForUpdate.mockResolvedValue({ id: 1, slot_id: 3, vehicle_id: 10, vehicle_type: 'CAR', deleted_at: null });
    ticketModel.hasTicketSessions.mockResolvedValue(false);

    await expect(ticketService.updateTicketDates(1, { startDate: '2026-10-24', endDate: '2026-10-25' })).resolves.toBeUndefined();
    expect(ticketModel.updateTicketDates).toHaveBeenCalledWith(conn, 1, '2026-10-24', '2026-10-25', 50000);
    expect(conn.commit).toHaveBeenCalled();
  });

  test('blocks editing a ticket already used by a parking session', async () => {
    const conn = connection();
    ticketModel.pool.getConnection.mockResolvedValue(conn);
    ticketModel.findTicketSlotReference.mockResolvedValue({ id: 1, slot_id: 3 });
    ticketModel.lockTicketSlot.mockResolvedValue({ id: 3, status: 'OCCUPIED', current_vehicle_id: 10 });
    ticketModel.findTicketForUpdate.mockResolvedValue({ id: 1, slot_id: 3, vehicle_id: 10, vehicle_type: 'CAR', deleted_at: null });
    ticketModel.hasTicketSessions.mockResolvedValue(true);

    await expect(ticketService.updateTicketDates(1, { startDate: '2026-10-24', endDate: '2026-10-25' })).rejects.toMatchObject({ statusCode: 409 });
    expect(ticketModel.updateTicketDates).not.toHaveBeenCalled();
    expect(conn.rollback).toHaveBeenCalled();
  });
});
