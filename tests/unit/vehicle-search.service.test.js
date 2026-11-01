jest.mock('../../src/models/vehicle.model', () => ({ search: jest.fn() }));
const model = require('../../src/models/vehicle.model');
const { searchVehicles } = require('../../src/services/vehicle-search.service');

test('Task 9 validates input and delegates a valid search', async () => {
  await expect(searchVehicles('')).rejects.toMatchObject({ statusCode: 400 });
  await expect(searchVehicles('x'.repeat(51))).rejects.toMatchObject({ statusCode: 400 });
  model.search.mockResolvedValue([{ id: 1 }]);
  await expect(searchVehicles(' 51F-123.45 ')).resolves.toEqual([{ id: 1 }]);
  expect(model.search).toHaveBeenCalledWith('51F-123.45');
});
