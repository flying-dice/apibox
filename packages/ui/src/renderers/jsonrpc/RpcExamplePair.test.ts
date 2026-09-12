import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import RpcExamplePair from './RpcExamplePair.svelte';

describe('RpcExamplePair', () => {
  it('renders a request/response pair for an inline example', () => {
    render(RpcExamplePair, {
      example: { name: 'Basic', params: { address: '0x1' }, result: { balance: 10 } },
      methodName: 'getBalance',
      testId: 'example',
    });

    expect(screen.getByTestId('example-request-content')).toHaveTextContent('getBalance');
    expect(screen.getByTestId('example-response-content')).toHaveTextContent('10');
    expect(screen.queryByTestId('example-response-external-value')).not.toBeInTheDocument();
  });

  it("renders the result's externalValue as a link instead of an inline response body", () => {
    render(RpcExamplePair, {
      example: {
        name: 'Remote result',
        params: {},
        result: undefined,
        resultExternalValue: 'https://example.com/examples/balance.json',
      },
      methodName: 'getBalance',
      testId: 'example',
    });

    expect(screen.getByTestId('example-response-external-value-link')).toHaveAttribute(
      'href',
      'https://example.com/examples/balance.json',
    );
    expect(screen.queryByTestId('example-response')).not.toBeInTheDocument();
  });

  it('renders summary and description on the same row, and an x-* extension as a chip', () => {
    render(RpcExamplePair, {
      example: {
        name: 'Funded account',
        summary: 'A quick smoke test',
        description: 'Calls with a known-good address.',
        params: {},
        result: {},
        extensions: [{ key: 'x-example-source', value: 'vendor' }],
      },
      methodName: 'getBalance',
      testId: 'example',
    });

    const description = screen.getByTestId('example-description');
    expect(description).toHaveTextContent('A quick smoke test');
    expect(description).toHaveTextContent('Calls with a known-good address.');
    expect(screen.getByTestId('example-extension-x-example-source')).toBeInTheDocument();
  });
});
