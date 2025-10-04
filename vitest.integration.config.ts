import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts', 'tests/integration/**/*.integration.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    environment: 'node',
    globals: true
  }
});
