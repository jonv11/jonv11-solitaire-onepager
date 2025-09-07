/** @type {import('jest').Config} */
export default {
  testMatch: ['<rootDir>/tests/**/*.js'],
  // Default to jsdom since several suites need DOM. Node built-ins stay available.
  testEnvironment: 'jsdom',
  // Native ESM. No Babel.
  transform: {},
  // Treat .js as ESM without flipping package.json to type:module
  extensionsToTreatAsEsm: ['.js'],
  moduleFileExtensions: ['js', 'json'],

  // Coverage
  collectCoverage: true,
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.module.*',        // keep if module files are only glue
  ],
  coverageDirectory: 'coverage',
};
