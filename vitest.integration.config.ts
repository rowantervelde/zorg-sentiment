import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts', 'tests/integration/**/*.integration.test.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/integration/setup.ts'],
  }
})
