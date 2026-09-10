import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const webview = process.env.APIBOX_TARGET === 'webview';
const pwa = process.env.APIBOX_TARGET === 'pwa';

export default defineConfig({
  base: './',
  define: {
    __APIBOX_WEBVIEW__: JSON.stringify(webview),
    __APIBOX_PWA__: JSON.stringify(pwa),
  },
  publicDir: pwa ? 'public-pwa' : false,
  plugins: [
    svelte(),
    {
      name: 'apibox-pwa-head',
      transformIndexHtml(html) {
        if (!pwa) return html;
        return html.replace(
          '<meta name="color-scheme" content="dark light" />',
          `<meta name="color-scheme" content="dark light" />
    <meta name="theme-color" content="#111111" />
    <meta name="description" content="A private, local-first workspace for OpenAPI, AsyncAPI and OpenRPC documentation." />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="icon" href="./icons/apibox.svg" type="image/svg+xml" />`,
        );
      },
    },
  ],
  build: {
    manifest: pwa,
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
