import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Tokens from './Tokens.svelte';
import {
  ALL_COLOUR_TOKENS,
  RADIUS_TOKENS,
  SPACING_TOKENS,
  TOKEN_GROUPS,
} from './token-manifest.js';

/**
 * The showcase is exercised here mainly so that a token added to `tokens.css` but forgotten
 * in the showcase is caught. A token nobody can see is a token nobody checks in every theme.
 */
describe('Tokens showcase', () => {
  it('renders a swatch for every token in the manifest', () => {
    // Derived from the manifest rather than a hand-picked list, so a token added to
    // tokens.css — which the manifest test forces into the manifest — must also appear here.
    render(Tokens);
    for (const token of ALL_COLOUR_TOKENS) {
      expect(screen.getByTestId(`token-${token}`)).toBeInTheDocument();
    }
    expect(ALL_COLOUR_TOKENS.length).toBeGreaterThan(30);
  });

  it('renders a section for every group', () => {
    render(Tokens);
    for (const group of TOKEN_GROUPS) {
      expect(screen.getByTestId(`token-group-${group.id}`)).toBeInTheDocument();
    }
  });

  it('marks which tokens are held to a contrast requirement', () => {
    // The `text` marker is what tells a reader why some swatches are darker in the light
    // theme than VS Code's own palette.
    render(Tokens);
    const textTokens = TOKEN_GROUPS.flatMap((group) =>
      group.tokens.filter((token) => token.usage === 'text'),
    );
    for (const token of textTokens) {
      expect(screen.getByTestId(`token-${token.name}-usage`)).toHaveTextContent('text');
    }
  });

  it('shows the type ramp, spacing scale and radii', () => {
    render(Tokens);
    expect(screen.getByTestId('token-group-type')).toBeInTheDocument();
    expect(screen.getByTestId('token-group-spacing')).toBeInTheDocument();
    expect(screen.getByTestId('token-group-radius')).toBeInTheDocument();
    for (const token of [...SPACING_TOKENS, ...RADIUS_TOKENS]) {
      expect(screen.getByTestId(`token-${token}`)).toBeInTheDocument();
    }
  });
});
