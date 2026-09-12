import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RpcTagCatalog from './RpcTagCatalog.svelte';

describe('RpcTagCatalog', () => {
  it('renders nothing when there are no components.tags entries', () => {
    render(RpcTagCatalog, { tags: [] });
    expect(screen.queryByTestId('tag-catalog')).not.toBeInTheDocument();
  });

  it('lists a tag independent of whether any method references it', () => {
    render(RpcTagCatalog, {
      tags: [
        {
          name: 'archived',
          description: 'Methods kept for backward compatibility.',
          extensions: [{ key: 'x-tag-color', value: 'gray' }],
        },
      ],
    });

    expect(screen.getByTestId('tag-catalog-0-name')).toHaveTextContent('archived');
    expect(screen.getByTestId('tag-catalog-0-description')).toHaveTextContent(
      'Methods kept for backward compatibility.',
    );
    expect(screen.getByTestId('tag-catalog-0-extension-x-tag-color')).toBeInTheDocument();
  });
});
