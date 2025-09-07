module.exports = {
  testEnvironment: 'node',
  // Pick up both Jest specs and converted Node tests
  testMatch: ['<rootDir>/tests/**/*.(spec|test).js'],
  // Provide small polyfills used by engine during tests
  setupFiles: ['<rootDir>/tests/setup-globals.js'],
  // No transforms; tests and sources are plain ESM/JS
  transform: {},
};

