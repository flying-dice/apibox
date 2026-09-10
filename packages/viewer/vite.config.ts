import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const webview = process.env.APIBOX_TARGET === 'webview';

export default defineConfig({
  base: './',
  define: { __APIBOX_WEBVIEW__: JSON.stringify(webview) },
  plugins: [svelte()],
  build: {
    cssCodeSplit: !webview,
    modulePreload: !webview,
    rollupOptions: webview
      ? {
          output: {
            entryFileNames: 'assets/viewer.js',
            assetFileNames: 'assets/viewer.[ext]',
            chunkFileNames: 'assets/[name].js',
          },
        }
      : undefined,
  },
  resolve: { conditions: ['browser'] },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
