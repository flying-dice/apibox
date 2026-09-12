import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ServerList from './ServerList.svelte';

describe('ServerList', () => {
  it('renders a summary and description on the same row rather than as two rows', () => {
    render(ServerList, {
      servers: [
        {
          name: 'mainnet',
          url: 'https://rpc.example.com',
          summary: 'Production node',
          description: 'Primary mainnet RPC endpoint.',
        },
      ],
      testId: 'servers',
    });

    const description = screen.getByTestId('servers-0-description');
    expect(description).toHaveTextContent('Production node');
    expect(description).toHaveTextContent('Primary mainnet RPC endpoint.');
  });

  it('falls back to description alone when a server has no summary, as AsyncAPI servers never do', () => {
    render(ServerList, {
      servers: [
        { name: 'mosquitto', url: 'mqtt://test.mosquitto.org', description: 'Public test broker.' },
      ],
      testId: 'servers',
    });

    expect(screen.getByTestId('servers-0-description')).toHaveTextContent('Public test broker.');
  });
});
