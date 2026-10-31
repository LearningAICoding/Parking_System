module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testPathIgnorePatterns: ['/node_modules/', '/storage/', '/tests/integration/'],
  collectCoverageFrom: [
    'src/services/**/*.js',
    'src/utils/**/*.js',
    '!src/**/*.stub.js'
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  clearMocks: true,
  testTimeout: 10000
};
