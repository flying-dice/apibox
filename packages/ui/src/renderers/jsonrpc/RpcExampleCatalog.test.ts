import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RpcExampleCatalog from './RpcExampleCatalog.svelte';

describe('RpcExampleCatalog', () => {
  it('renders nothing when there are no components.examples entries', () => {
    render(RpcExampleCatalog, { examples: [] });
    expect(screen.queryByTestId('example-catalog')).not.toBeInTheDocument();
  });

  it('lists a plain Example Object value, distinct from the params/result pairing shape', () => {
    render(RpcExampleCatalog, {
      examples: [{ name: 'ZeroBalance', summary: 'An account with no funds', value: '0' }],
    });

    expect(screen.getByTestId('example-catalog-0-name')).toHaveTextContent('ZeroBalance');
    expect(screen.getByTestId('example-catalog-0-value')).toHaveTextContent('0');
  });

  it('renders externalValue as a link rather than fetching it', () => {
    render(RpcExampleCatalog, {
      examples: [
        {
          name: 'Remote',
          value: undefined,
          externalValue: 'https://example.com/examples/zero.json',
        },
      ],
    });

    expect(screen.getByTestId('example-catalog-0-external-value-link')).toHaveAttribute(
      'href',
      'https://example.com/examples/zero.json',
    );
  });
});
