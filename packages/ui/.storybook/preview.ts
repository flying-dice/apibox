import type { Preview } from '@storybook/svelte-vite';
import '../src/tokens/index.css';
import '../src/tokens/theme-dark.css';
import '../src/tokens/theme-light.css';
import '../src/tokens/theme-high-contrast.css';

/**
 * All standalone themes are loaded and selected by the `data-apibox-theme` attribute on the root
 * element — the same mechanism the static site uses, so what Storybook shows is what ships.
 *
 * Making the toggle a toolbar control rather than two separate stories is deliberate: the
 * point is to flip a component between themes in place and see the difference, which is how
 * a missing token gets noticed.
 */
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'VS Code theme',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark Modern', icon: 'moon' },
          { value: 'light', title: 'Light Modern', icon: 'sun' },
          { value: 'high-contrast', title: 'High Contrast', icon: 'contrast' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'dark' },
  decorators: [
    (story, context) => {
      const theme = String(context.globals.theme ?? 'dark');
      document.documentElement.setAttribute('data-apibox-theme', theme);
      document.body.style.background = 'var(--apibox-bg)';
      document.body.style.color = 'var(--apibox-fg)';
      return story();
    },
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    // The canvas must not paint its own background: the theme's `--apibox-bg` is the
    // subject of the test, and a Storybook-supplied backdrop would hide a mismatch.
    backgrounds: { disable: true },
  },
};

export default preview;
