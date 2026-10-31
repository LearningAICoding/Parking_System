// Integration test cần MySQL parking_test_db (xem tests/fixtures/README.md); tách khỏi `npm test`.
const base = require('./jest.config');

module.exports = {
  ...base,
  roots: ['<rootDir>/tests/integration'],
  testPathIgnorePatterns: ['/node_modules/', '/storage/'],
  testTimeout: 20000
};
