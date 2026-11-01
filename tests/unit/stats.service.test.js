jest.mock('../../src/models/stats.model', () => ({ querySeries: jest.fn() }));
const model = require('../../src/models/stats.model');
const { getReport } = require('../../src/services/stats.service');

test('Task 13 validates date range and fills missing periods', async () => {
  await expect(getReport({ mode: 'day', from: '2026-11-03', to: '2026-11-02' })).rejects.toMatchObject({ statusCode: 400 });
  model.querySeries.mockResolvedValue({ entries: [], exits: [], ticketRevenue: [], casualParkingRevenue: [], slots: {} });
  const report = await getReport({ mode: 'day', from: '2026-11-01', to: '2026-11-02' });
  expect(report.series.map((item) => item.period)).toEqual(['2026-11-01', '2026-11-02']);
  expect(report.summary.ticketRevenue).toBe('0.00');
});
