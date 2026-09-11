/**
 * The token manifest: the single list of what the design language offers.
 *
 * Both the Storybook showcase and the token tests read this, so a token added to
 * `tokens.css` but left out of here fails the build rather than quietly going undocumented
 * and unchecked.
 *
 * `usage` drives the contrast tests. Only `text` tokens have to clear WCAG AA against the
 * page surfaces; a token used purely as a fill or a rule does not.
 */

export type TokenUsage = 'text' | 'surface' | 'line' | 'scale';

export interface TokenSpec {
  name: string;
  usage: TokenUsage;
}

export interface TokenGroup {
  id: string;
  title: string;
  note?: string;
  tokens: TokenSpec[];
}

const text = (name: string): TokenSpec => ({ name, usage: 'text' });
const surface = (name: string): TokenSpec => ({ name, usage: 'surface' });
const line = (name: string): TokenSpec => ({ name, usage: 'line' });

export const TOKEN_GROUPS: TokenGroup[] = [
  {
    id: 'surfaces',
    title: 'Surfaces',
    tokens: [
      surface('--apibox-bg'),
      surface('--apibox-bg-sunken'),
      surface('--apibox-bg-raised'),
      surface('--apibox-bg-input'),
      surface('--apibox-bg-hover'),
      surface('--apibox-bg-toolbar-hover'),
      surface('--apibox-bg-active'),
      surface('--apibox-bg-code'),
    ],
  },
  {
    id: 'text',
    title: 'Text',
    tokens: [
      text('--apibox-fg'),
      text('--apibox-fg-muted'),
      text('--apibox-fg-icon'),
      // Rendered on an accent or selection fill, not on the page surface, so it is checked
      // against those instead of against `--apibox-bg`.
      surface('--apibox-fg-on-accent'),
      surface('--apibox-fg-active'),
    ],
  },
  {
    id: 'lines',
    title: 'Lines',
    tokens: [
      line('--apibox-border'),
      line('--apibox-border-strong'),
      line('--apibox-border-input'),
      line('--apibox-border-contrast'),
      line('--apibox-border-active'),
      surface('--apibox-shadow-widget'),
    ],
  },
  {
    id: 'interaction',
    title: 'Interaction',
    tokens: [
      text('--apibox-accent'),
      text('--apibox-accent-hover'),
      line('--apibox-focus'),
      surface('--apibox-button-bg'),
      surface('--apibox-button-bg-hover'),
      surface('--apibox-badge-bg'),
      surface('--apibox-badge-fg'),
    ],
  },
  {
    id: 'status',
    title: 'Status',
    tokens: [
      text('--apibox-success'),
      text('--apibox-warning'),
      text('--apibox-danger'),
      text('--apibox-info'),
      text('--apibox-neutral'),
    ],
  },
  {
    id: 'http-methods',
    title: 'HTTP methods',
    note: 'Mapped onto VS Code’s chart palette, which is built to stay distinguishable in any theme.',
    tokens: [
      text('--apibox-method-get'),
      text('--apibox-method-post'),
      text('--apibox-method-put'),
      text('--apibox-method-patch'),
      text('--apibox-method-delete'),
      text('--apibox-method-head'),
      text('--apibox-method-options'),
      text('--apibox-method-trace'),
    ],
  },
  {
    id: 'actions',
    title: 'Actions',
    note: 'AsyncAPI operation direction, and JSON-RPC methods.',
    tokens: [
      text('--apibox-action-send'),
      text('--apibox-action-receive'),
      text('--apibox-action-rpc'),
    ],
  },
];

/** Surfaces that semantic text can appear against in documentation and workspace chrome. */
export const TEXT_SURFACES = [
  '--apibox-bg',
  '--apibox-bg-sunken',
  '--apibox-bg-raised',
  '--apibox-bg-input',
  '--apibox-bg-hover',
  '--apibox-bg-code',
];

export const SPACING_TOKENS = [
  '--apibox-space-1',
  '--apibox-space-2',
  '--apibox-space-3',
  '--apibox-space-4',
  '--apibox-space-5',
  '--apibox-space-6',
  '--apibox-space-7',
];

export const RADIUS_TOKENS = ['--apibox-radius', '--apibox-radius-lg', '--apibox-radius-pill'];

/** Every colour token the manifest describes, flattened. */
export const ALL_COLOUR_TOKENS = TOKEN_GROUPS.flatMap((group) =>
  group.tokens.map((token) => token.name),
);
