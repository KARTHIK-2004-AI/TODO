import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 20000,
    setupFiles: './services/__tests__/setup.ts',
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
})
