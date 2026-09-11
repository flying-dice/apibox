import type { Parameter } from '@apibox/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ParameterTable from './ParameterTable.svelte';

function parameter(overrides: Partial<Parameter>): Parameter {
  return {
    name: 'p',
    in: 'query',
    required: false,
    style: { value: 'form', declared: false },
    explode: { value: true, declared: false },
    ...overrides,
  };
}

describe('ParameterTable', () => {
  it('renders nothing when there are no parameters', () => {
    render(ParameterTable, { parameters: [] });
    expect(screen.queryByTestId('parameters')).not.toBeInTheDocument();
  });

  it('groups a 3.2 querystring parameter under its own location', () => {
    render(ParameterTable, {
      parameters: [parameter({ name: 'raw', in: 'querystring', schema: { types: ['string'] } })],
    });
    expect(screen.getByTestId('parameters-querystring-0-name')).toHaveTextContent('raw');
  });

  it('omits the serialisation chips for an undeclared scalar parameter', () => {
    // style/explode never change a scalar's wire shape, and the document said nothing —
    // showing them would be noise, not information.
    render(ParameterTable, {
      parameters: [parameter({ name: 'tag', schema: { types: ['string'] } })],
    });
    expect(screen.queryByTestId('parameters-query-0-style')).not.toBeInTheDocument();
  });

  it('shows the effective style and explode for an array-valued parameter', () => {
    render(ParameterTable, {
      parameters: [
        parameter({
          name: 'tags',
          schema: { types: ['array'], items: { types: ['string'] } },
        }),
      ],
    });
    expect(screen.getByTestId('parameters-query-0-style')).toHaveTextContent('form');
    expect(screen.getByTestId('parameters-query-0-explode')).toHaveTextContent('true');
  });

  it('shows a declared style/explode even for a scalar, since declaring it is itself information', () => {
    render(ParameterTable, {
      parameters: [
        parameter({
          name: 'p',
          schema: { types: ['string'] },
          style: { value: 'simple', declared: true },
        }),
      ],
    });
    expect(screen.getByTestId('parameters-query-0-style')).toHaveTextContent('simple');
  });

  it('shows allowReserved and allowEmptyValue only when declared true', () => {
    render(ParameterTable, {
      parameters: [
        parameter({
          name: 'q',
          schema: { types: ['array'], items: { types: ['string'] } },
          allowReserved: true,
          allowEmptyValue: true,
        }),
      ],
    });
    expect(screen.getByTestId('parameters-query-0-allow-reserved')).toBeInTheDocument();
    expect(screen.getByTestId('parameters-query-0-allow-empty-value')).toBeInTheDocument();
  });

  it('groups parameters by location, path first', () => {
    render(ParameterTable, {
      parameters: [
        parameter({ name: 'id', in: 'path', required: true }),
        parameter({ name: 'limit', in: 'query' }),
      ],
    });
    expect(screen.getByTestId('parameters-path')).toBeInTheDocument();
    expect(screen.getByTestId('parameters-query')).toBeInTheDocument();
  });
});
