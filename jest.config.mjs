/** @type {import('jest').Config} */
export default {
  // Use jsdom for DOM APIs while keeping Node globals available
  testEnvironment: "jsdom",
  // Polyfill missing browser globals (TextEncoder/TextDecoder, etc.)
  setupFiles: ["<rootDir>/test/jest.setup.js"],
  // Only run files explicitly marked as tests
  testMatch: ["**/*.test.js"],
  // No transforms; native ESM tests execute as-is
  transform: {},
  moduleFileExtensions: ["js", "json"],
};
