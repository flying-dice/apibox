import type { BindingInfo } from '@apibox/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import BindingList from './BindingList.svelte';

describe('BindingList', () => {
  it('renders nothing when there are no bindings', () => {
    render(BindingList, { bindings: undefined, testId: 'bindings' });
    expect(screen.queryByTestId('bindings')).not.toBeInTheDocument();
  });

  it('renders nothing for an empty bindings array', () => {
    render(BindingList, { bindings: [], testId: 'bindings' });
    expect(screen.queryByTestId('bindings')).not.toBeInTheDocument();
  });

  it('renders the protocol, its bindingVersion and its own fields', () => {
    const bindings: BindingInfo[] = [
      {
        protocol: 'kafka',
        version: '0.5.0',
        fields: [
          { key: 'topic', value: 'readings.v1' },
          { key: 'partitions', value: 6 },
        ],
      },
    ];
    render(BindingList, { bindings, testId: 'bindings' });

    expect(screen.getByTestId('bindings-kafka-protocol')).toHaveTextContent('kafka');
    expect(screen.getByTestId('bindings-kafka-version')).toHaveTextContent('v0.5.0');
    expect(screen.getByTestId('bindings-kafka-topic')).toHaveTextContent('readings.v1');
    expect(screen.getByTestId('bindings-kafka-partitions')).toHaveTextContent('6');
  });

  it('formats a nested object field value as compact JSON rather than dropping it', () => {
    const bindings: BindingInfo[] = [
      {
        protocol: 'kafka',
        version: '0.5.0',
        fields: [{ key: 'groupId', value: { type: 'string' } }],
      },
    ];
    render(BindingList, { bindings, testId: 'bindings' });

    expect(screen.getByTestId('bindings-kafka-groupId')).toHaveTextContent('{"type":"string"}');
  });

  it('renders more than one protocol at the same location independently', () => {
    // Not a documented AsyncAPI pattern, but the model permits several protocol entries at
    // one location and nothing in `toBindings` limits it to one -- proving the render side
    // matches that rather than silently keeping only the first.
    const bindings: BindingInfo[] = [
      { protocol: 'kafka', version: '0.5.0', fields: [{ key: 'topic', value: 'a' }] },
      { protocol: 'amqp', version: '0.3.0', fields: [{ key: 'is', value: 'routingKey' }] },
    ];
    render(BindingList, { bindings, testId: 'bindings' });

    expect(screen.getByTestId('bindings-kafka-protocol')).toBeInTheDocument();
    expect(screen.getByTestId('bindings-amqp-protocol')).toBeInTheDocument();
  });

  it('renders a protocol with no fields, showing only the protocol and version', () => {
    const bindings: BindingInfo[] = [{ protocol: 'http', version: 'latest', fields: [] }];
    render(BindingList, { bindings, testId: 'bindings' });

    expect(screen.getByTestId('bindings-http-protocol')).toHaveTextContent('http');
    expect(screen.getByTestId('bindings-http-version')).toHaveTextContent('vlatest');
  });
});
