import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RpcLinkCatalog from './RpcLinkCatalog.svelte';

describe('RpcLinkCatalog', () => {
  it('renders nothing when there are no components.links entries', () => {
    render(RpcLinkCatalog, { links: [] });
    expect(screen.queryByTestId('link-catalog')).not.toBeInTheDocument();
  });

  it('lists a link independent of any method, its own `method` field says where it goes', () => {
    render(RpcLinkCatalog, {
      links: [
        {
          name: 'RetryGetBalance',
          method: 'getBalance',
          params: [{ name: 'address', value: '$params.address' }],
        },
      ],
    });

    expect(screen.getByTestId('link-catalog-0-name')).toHaveTextContent(
      'RetryGetBalance → getBalance',
    );
    expect(screen.getByTestId('link-catalog-0-param-address')).toBeInTheDocument();
  });
});
