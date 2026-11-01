jest.mock('../../src/models/slot.model', () => ({ list: jest.fn(), findById: jest.fn(), listZones: jest.fn() }));
const model = require('../../src/models/slot.model');
const service = require('../../src/services/slot.service');

test('Task 14 lists slots with zone filter', async () => {
  model.list.mockResolvedValue([{ id: 1, slotCode: 'A-01' }]);
  await expect(service.listSlots({ zone: ' A ' })).resolves.toEqual([{ id: 1, slotCode: 'A-01' }]);
  expect(model.list).toHaveBeenCalledWith({ zone: 'A', status: undefined });
});

test('Task 15 rejects invalid create and edit status', async () => {
  await expect(service.createSlot({ slotCode: 'A-01', zone: 'A', status: 'OCCUPIED' }))
    .rejects.toMatchObject({ statusCode: 400 });
  await expect(service.editSlot(1, { zone: 'A', status: 'RESERVED' }))
    .rejects.toMatchObject({ statusCode: 400 });
});

test('Task 16 prevents modifying occupied or reserved slots', () => {
  expect(service.isModifiable({ status: 'OCCUPIED', currentVehicleId: 9 })).toBe(false);
  expect(service.isModifiable({ status: 'RESERVED', currentVehicleId: 9 })).toBe(false);
  expect(service.isModifiable({ status: 'AVAILABLE', currentVehicleId: null })).toBe(true);
});
