import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RpcContentDescriptorCatalog from './RpcContentDescriptorCatalog.svelte';

describe('RpcContentDescriptorCatalog', () => {
  it('renders nothing when there are no components.contentDescriptors entries', () => {
    render(RpcContentDescriptorCatalog, { contentDescriptors: [] });
    expect(screen.queryByTestId('content-descriptor-catalog')).not.toBeInTheDocument();
  });

  it('lists a named, reusable ContentDescriptor independent of any method referencing it', () => {
    render(RpcContentDescriptorCatalog, {
      contentDescriptors: [
        {
          name: 'AccountAddress',
          summary: 'A wallet account address',
          description: 'Shared address shape.',
          required: true,
          extensions: [{ key: 'x-shared', value: true }],
        },
      ],
    });

    expect(screen.getByTestId('content-descriptor-catalog-0-name')).toHaveTextContent(
      'AccountAddress',
    );
    const description = screen.getByTestId('content-descriptor-catalog-0-description');
    expect(description).toHaveTextContent('A wallet account address');
    expect(description).toHaveTextContent('Shared address shape.');
    expect(
      screen.getByTestId('content-descriptor-catalog-0-extension-x-shared'),
    ).toBeInTheDocument();
  });
});
