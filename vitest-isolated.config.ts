import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/lib/framework/clusterManager.auto.test.ts',
    ],
    setupFiles: ['./vitest-setup-client.ts'],
  },
});


