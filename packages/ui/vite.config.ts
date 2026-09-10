import { svelte } from '@sveltejs/vite-plugin-svelte';
// `vitest/config` rather than `vite`: Vite 8's own `UserConfig` has no `test` field.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    // Without this, Vitest resolves Svelte's server build and every `mount` throws
    // `lifecycle_function_unavailable`. Component tests need the browser entry points.
    conditions: ['browser'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
