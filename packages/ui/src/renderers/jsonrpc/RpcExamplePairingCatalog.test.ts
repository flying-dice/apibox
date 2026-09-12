import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RpcExamplePairingCatalog from './RpcExamplePairingCatalog.svelte';

describe('RpcExamplePairingCatalog', () => {
  it('renders nothing when there are no components.examplePairings entries', () => {
    render(RpcExamplePairingCatalog, { examplePairings: [] });
    expect(screen.queryByTestId('example-pairing-catalog')).not.toBeInTheDocument();
  });

  it('lists a params/result pairing independent of any method', () => {
    render(RpcExamplePairingCatalog, {
      examplePairings: [
        {
          name: 'GetBalanceForNewAccount',
          params: [{ name: 'address', value: '0x0' }],
          result: '0',
        },
      ],
    });

    expect(screen.getByTestId('example-pairing-catalog-0-name')).toHaveTextContent(
      'GetBalanceForNewAccount',
    );
    expect(screen.getByTestId('example-pairing-catalog-0-pair-response')).toHaveTextContent('0');
  });
});
