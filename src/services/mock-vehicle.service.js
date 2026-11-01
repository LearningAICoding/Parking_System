const { vehicles } = require('../mocks/data');
const { normalizePlate } = require('../utils/normalize-plate');

// Return vehicles for a given customerId (null = all vãng lai)
exports.getVehiclesByCustomer = async customerId => {
  return new Promise(resolve => {
    setTimeout(() => {
      const list = vehicles.filter(v => v.customerId === customerId);
      resolve(list);
    }, 50);
  });
};

exports.getMyVehicles = async customerId => {
  return exports.getVehiclesByCustomer(customerId);
};

exports.addVehicle = async (data, ownerCustomerId) => {
  return new Promise((resolve, reject) => {
    const { licensePlate, vehicleName, brand, vehicleType } = data;
    if (!licensePlate || !vehicleName || !brand || !vehicleType) {
      return reject(new Error('Missing required fields'));
    }
    const normalized = normalizePlate(licensePlate);
    // Check duplicate
    if (vehicles.some(v => v.licensePlate === normalized)) {
      return reject(new Error('Duplicate license plate'));
    }
    const newVehicle = {
      id: vehicles.length + 1,
      licensePlate: normalized,
      vehicleName,
      brand,
      vehicleType,
      customerId: ownerCustomerId || null,
    };
    vehicles.push(newVehicle);
    resolve(newVehicle);
  });
};
