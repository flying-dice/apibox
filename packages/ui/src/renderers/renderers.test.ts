import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseApiDocument, parseDocument } from '@apibox/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AsyncApiDocument from './asyncapi/AsyncApiDocument.svelte';
import JsonRpcDocument from './jsonrpc/JsonRpcDocument.svelte';
import JsonSchemaDocument from './jsonschema/JsonSchemaDocument.svelte';

async function example(filename: string) {
  const path = resolve(import.meta.dirname, '../../../../examples', filename);
  return parseApiDocument(parseDocument(await readFile(path, 'utf8')), { location: path });
}

describe('remaining format renderers', () => {
  it('groups AsyncAPI channels by action and renders message payload schemas', async () => {
    const document = await example('streetlights.asyncapi.yaml');
    if (document.kind !== 'asyncapi') throw new Error('Expected an AsyncAPI fixture.');
    render(AsyncApiDocument, { document });

    expect(screen.getByTestId('asyncapi-document-action-receive')).toHaveTextContent('Receive');
    expect(screen.getByTestId('asyncapi-document-action-send')).toHaveTextContent('Send');
    expect(
      screen.getByTestId('asyncapi-document-operation-receivelightmeasurement-message-0-payload'),
    ).toBeInTheDocument();
  });

  it('renders AsyncAPI protocol bindings at server, channel, operation and message level', async () => {
    const document = await example('streetlights.asyncapi.yaml');
    if (document.kind !== 'asyncapi') throw new Error('Expected an AsyncAPI fixture.');
    render(AsyncApiDocument, { document });

    // Server-level: protocol badge, bindingVersion and the binding's own fields.
    expect(
      screen.getByTestId('asyncapi-document-servers-0-bindings-mqtt-protocol'),
    ).toHaveTextContent('mqtt');
    expect(
      screen.getByTestId('asyncapi-document-servers-0-bindings-mqtt-version'),
    ).toHaveTextContent('v0.2.0');
    expect(
      screen.getByTestId('asyncapi-document-servers-0-bindings-mqtt-clientId'),
    ).toHaveTextContent('streetlights-server');

    // Channel-level, surfaced through the operation card that carries the channel inline.
    const operationTestId = 'asyncapi-document-operation-receivelightmeasurement';
    expect(screen.getByTestId(`${operationTestId}-channel-bindings-mqtt-qos`)).toHaveTextContent(
      '1',
    );
    expect(screen.getByTestId(`${operationTestId}-channel-bindings-mqtt-retain`)).toHaveTextContent(
      'false',
    );

    // Operation-level.
    expect(screen.getByTestId(`${operationTestId}-bindings-mqtt-qos`)).toHaveTextContent('1');

    // Message-level.
    expect(
      screen.getByTestId(`${operationTestId}-message-0-bindings-mqtt-payloadFormatIndicator`),
    ).toHaveTextContent('1');
  });

  it('renders AsyncAPI orphan channel bindings', async () => {
    const document = await example('streetlights.asyncapi.yaml');
    if (document.kind !== 'asyncapi') throw new Error('Expected an AsyncAPI fixture.');
    const orphan = document.orphanChannels.find((c) => c.address.includes('fault'));
    if (!orphan) throw new Error('Expected an orphan channel fixture.');
    orphan.bindings = [
      { protocol: 'amqp', version: '0.3.0', fields: [{ key: 'is', value: 'routingKey' }] },
    ];
    render(AsyncApiDocument, { document });

    const index = document.orphanChannels.indexOf(orphan);
    expect(
      screen.getByTestId(`asyncapi-document-channel-${index}-bindings-amqp-is`),
    ).toHaveTextContent('routingKey');
  });

  it('renders JSON-RPC parameters, results, errors and examples', async () => {
    const document = await example('wallet.openrpc.json');
    if (document.kind !== 'jsonrpc') throw new Error('Expected a JSON-RPC fixture.');
    render(JsonRpcDocument, { document });

    expect(screen.getByTestId('jsonrpc-document-method-getbalance')).toHaveTextContent(
      'getBalance',
    );
    expect(
      screen.getByTestId('jsonrpc-document-method-getbalance-param-address-0'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('jsonrpc-document-method-getbalance-result')).toBeInTheDocument();
    expect(
      screen.getByTestId('jsonrpc-document-method-getbalance-error--32001-0'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('jsonrpc-document-method-getbalance-example-0-request'),
    ).toHaveTextContent('getBalance');
  });

  it('renders OpenRPC links, per-method server overrides, external docs and deprecation badges', async () => {
    const document = await example('wallet.openrpc.json');
    if (document.kind !== 'jsonrpc') throw new Error('Expected a JSON-RPC fixture.');
    render(JsonRpcDocument, { document });

    // Root-level metadata: info.summary, externalDocs and an x-* extension.
    expect(screen.getByTestId('jsonrpc-document-header-summary')).toHaveTextContent(
      'Query balances and send transfers over JSON-RPC.',
    );
    expect(screen.getByTestId('jsonrpc-document-header-external-docs-link')).toBeInTheDocument();
    expect(screen.getByTestId('jsonrpc-document-extension-x-internal-id')).toHaveTextContent(
      'wallet-rpc',
    );

    // Server variables, rendered by the existing ServerList organism once populated.
    expect(screen.getByTestId('jsonrpc-document-servers-0-variables')).toHaveTextContent(
      'environment',
    );

    // Deprecated param and deprecated result, both parsed but previously unrendered.
    expect(
      screen.getByTestId('jsonrpc-document-method-getbalance-param-legacyFormat-2-deprecated'),
    ).toHaveTextContent('deprecated');
    expect(
      screen.getByTestId('jsonrpc-document-method-sendtransfer-result-deprecated'),
    ).toHaveTextContent('deprecated');

    // method.links: name, target method and the runtime-expression param value.
    expect(screen.getByTestId('jsonrpc-document-method-getbalance-link-0-title')).toHaveTextContent(
      'SendTransferFromAccount → sendTransfer',
    );
    expect(
      screen.getByTestId('jsonrpc-document-method-getbalance-link-0-param-transaction'),
    ).toHaveTextContent('$params.address');

    // method.servers (override) and method.externalDocs.
    expect(screen.getByTestId('jsonrpc-document-method-sendtransfer-servers')).toHaveTextContent(
      'relay.example.com',
    );
    expect(
      screen.getByTestId('jsonrpc-document-method-sendtransfer-external-docs-link'),
    ).toBeInTheDocument();
  });

  it("renders a JSON Schema document's root schema, named definitions and badge/labels", async () => {
    const document = await example('user-profile.schema.json');
    if (document.kind !== 'jsonschema') throw new Error('Expected a JSON Schema fixture.');
    render(JsonSchemaDocument, { document });

    expect(screen.getByTestId('jsonschema-document-header-kind')).toHaveTextContent('JSON Schema');
    expect(screen.getByTestId('jsonschema-document-header-version')).toHaveTextContent('Dialect');
    expect(screen.getByTestId('jsonschema-document-header-version')).toHaveTextContent('2020-12');
    expect(screen.getByTestId('jsonschema-document-root')).toBeInTheDocument();
    expect(screen.getByTestId('jsonschema-document-schemas-title')).toHaveTextContent(
      'Definitions',
    );
    expect(screen.getByTestId('jsonschema-document-schemas-0')).toHaveTextContent('Address');
  });

  it('keeps hooks unique when JSON-RPC parameters and errors repeat identifiers', async () => {
    const document = await example('wallet.openrpc.json');
    if (document.kind !== 'jsonrpc') throw new Error('Expected a JSON-RPC fixture.');
    const method = document.methods[0];
    const parameter = method?.params[0];
    const rpcError = method?.errors[0];
    if (!method || !parameter || !rpcError) throw new Error('Expected a complete RPC method.');
    const duplicateParameterIndex = method.params.length;
    const duplicateErrorIndex = method.errors.length;
    method.params.push({ ...parameter });
    method.errors.push({ ...rpcError });

    render(JsonRpcDocument, { document });

    expect(
      screen.getByTestId(
        `jsonrpc-document-method-getbalance-param-address-${duplicateParameterIndex}`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`jsonrpc-document-method-getbalance-error--32001-${duplicateErrorIndex}`),
    ).toBeInTheDocument();
  });
});
