jest.mock('../../src/models/stats.model', () => ({
  querySeries: jest.fn()
}));

const model = require('../../src/models/stats.model');
const service = require('../../src/services/stats.service');

describe('stats service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns zero-filled daily periods with separate revenue totals', async () => {
    model.querySeries.mockResolvedValue({
      entries: [{ period: '2026-10-21', entries: 3 }],
      exits: [{ period: '2026-10-22', exits: 2 }],
      ticketRevenue: [{ period: '2026-10-21', ticketRevenue: '20000.00' }],
      casualParkingRevenue: [{ period: '2026-10-22', casualParkingRevenue: '10000.00' }],
      slots: { availableSlots: 8, occupiedSlots: 2 }
    });

    await expect(service.getReport({
      mode: 'day',
      from: '2026-10-21',
      to: '2026-10-22'
    })).resolves.toEqual({
      summary: {
        entries: 3,
        exits: 2,
        ticketRevenue: '20000.00',
        casualParkingRevenue: '10000.00',
        availableSlots: 8,
        occupiedSlots: 2
      },
      series: [
        { period: '2026-10-21', entries: 3, exits: 0, ticketRevenue: '20000.00', casualParkingRevenue: '0.00' },
        { period: '2026-10-22', entries: 0, exits: 2, ticketRevenue: '0.00', casualParkingRevenue: '10000.00' }
      ]
    });
    expect(model.querySeries).toHaveBeenCalledWith('day', '2026-10-21 00:00:00', '2026-10-23 00:00:00');
  });

  test('groups dates by month and includes each intersecting period once', async () => {
    model.querySeries.mockResolvedValue({
      entries: [],
      exits: [],
      ticketRevenue: [],
      casualParkingRevenue: [],
      slots: { availableSlots: '1', occupiedSlots: '0' }
    });

    const report = await service.getReport({ mode: 'month', from: '2026-01-31', to: '2026-02-01' });

    expect(report.series.map((item) => item.period)).toEqual(['2026-01', '2026-02']);
  });

  test.each([
    [{ mode: 'week', from: '2026-01-01', to: '2026-01-01' }],
    [{ mode: 'day', from: '2026-02-30', to: '2026-03-01' }],
    [{ mode: 'day', from: '2026-02-02', to: '2026-02-01' }],
    [{ mode: 'day', from: '2025-01-01', to: '2026-01-02' }]
  ])('rejects invalid mode or date range %#', async (query) => {
    await expect(service.getReport(query)).rejects.toMatchObject({ statusCode: 400 });
    expect(model.querySeries).not.toHaveBeenCalled();
  });
});
