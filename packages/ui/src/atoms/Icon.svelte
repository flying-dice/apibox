<script lang="ts">
  /**
   * The icon set, as inline SVG.
   *
   * Inline rather than an icon font or sprite sheet because the static site must work from
   * a single directory with no extra requests, and `currentColor` makes every icon inherit
   * whatever token its context sets — no per-icon colour to keep in step with the themes.
   *
   * Paths are from VS Code's Codicons, redrawn on a 16-unit grid so they sit correctly
   * beside 13px text.
   */
  export type IconName =
    | 'chevron-right'
    | 'chevron-down'
    | 'search'
    | 'copy'
    | 'check'
    | 'close'
    | 'link-external'
    | 'lock'
    | 'warning'
    | 'info'
    | 'circle-slash';

  interface Props {
    name: IconName;
    /** Matches the surrounding text size by default. */
    size?: number;
    label?: string;
    testId?: string;
  }

  const { name, size = 16, label, testId }: Props = $props();

  const PATHS: Record<IconName, string> = {
    'chevron-right': 'M5.7 13.7 4.3 12.3 8.6 8 4.3 3.7 5.7 2.3 11.4 8z',
    'chevron-down': 'M13.7 5.7 12.3 4.3 8 8.6 3.7 4.3 2.3 5.7 8 11.4z',
    search:
      'M11.3 10.3a5.5 5.5 0 1 0-1 1l3.2 3.2 1-1zM3 6.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z',
    copy: 'M4 2h7l3 3v7h-2V6h-3V4H6v8H4zm-2 3h6v2H4v6h5v-6h1v8H2z',
    check: 'M6.2 12.5 2 8.3l1.4-1.4 2.8 2.8L12.6 3l1.4 1.4z',
    close: 'M8 6.6 12.3 2.3l1.4 1.4L9.4 8l4.3 4.3-1.4 1.4L8 9.4l-4.3 4.3-1.4-1.4L6.6 8 2.3 3.7l1.4-1.4z',
    'link-external': 'M9 2h5v5h-2V4.9L7.5 9.4 6.1 8l4.5-4.5H9zM3 4h4v2H4v6h6V9h2v5H3z',
    lock: 'M8 1a3 3 0 0 0-3 3v2H4v8h8V6h-1V4a3 3 0 0 0-3-3m0 2a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1',
    warning: 'M8 1.5 15 14H1zm-1 4v4h2V5.5zm0 5.5v2h2v-2z',
    info: 'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1M7 4h2v2H7zm0 3h2v5H7z',
    'circle-slash':
      'M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1M3 8a5 5 0 0 1 7.9-4.1L3.9 10.9A5 5 0 0 1 3 8m5 5a5 5 0 0 1-2.9-.9l7-7A5 5 0 0 1 8 13',
  };
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="currentColor"
  aria-hidden={label ? undefined : 'true'}
  aria-label={label}
  role={label ? 'img' : undefined}
  data-testid={testId ?? `icon-${name}`}
>
  <path d={PATHS[name]} />
</svg>

<style>
  .icon {
    flex: none;
    vertical-align: text-bottom;
  }
</style>
