const PRICING = Object.freeze({
  DAILY: { MOTORBIKE: 20000, CAR: 50000 },
  HOURLY: { MOTORBIKE: 10000, CAR: 20000 }
});

function priceFor(vehicleType, kind) {
  const value = PRICING[kind]?.[vehicleType];
  if (!value) throw new Error(`Unsupported pricing: ${kind}/${vehicleType}`);
  return value;
}

module.exports = { PRICING, priceFor };
