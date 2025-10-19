import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Changed to jsdom for better DOM testing support
    include: [
      'electron/**/*.test.ts',
      'src/**/*.test.ts',
      'src/**/*.spec.ts'
    ],
    setupFiles: ['./vitest-setup-client.ts'],
  },
});
