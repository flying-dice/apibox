import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseApiDocument, parseDocument } from '@apibox/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import AsyncApiDocument from './asyncapi/AsyncApiDocument.svelte';
import JsonRpcDocument from './jsonrpc/JsonRpcDocument.svelte';
import JsonSchemaDocument from './jsonschema/JsonSchemaDocument.svelte';
import OpenApiDocument from './openapi/OpenApiDocument.svelte';

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

  // Card 39: `SchemaNode.examples` is parsed identically in all four formats, but was
  // never drawn by any of them. One assertion per format proves the shared row actually
  // renders it, rather than trusting that fixing one format fixed the others.
  it('renders a schema-level example on an OpenAPI request body property', async () => {
    const document = await example('petstore.yaml');
    if (document.kind !== 'openapi') throw new Error('Expected an OpenAPI fixture.');
    render(OpenApiDocument, { document });

    const testId = 'openapi-document-operation-createpet-request-media-schema-root-p-name-property';
    expect(screen.getByTestId(`${testId}-examples`)).toHaveTextContent('example');
    expect(screen.getByTestId(`${testId}-example-0`)).toHaveTextContent('"Rex"');

    // The schema-level example sits beside the property; the media type's own worked
    // example is a separate, boxed section below it -- adjacent, not duplicated.
    expect(
      screen.getByTestId('openapi-document-operation-createpet-request-media-examples'),
    ).toBeInTheDocument();
  });

  it('renders a schema-level example on an AsyncAPI message payload property', async () => {
    const document = await example('streetlights.asyncapi.yaml');
    if (document.kind !== 'asyncapi') throw new Error('Expected an AsyncAPI fixture.');
    render(AsyncApiDocument, { document });

    const testId =
      'asyncapi-document-operation-receivelightmeasurement-message-0-payload-p-lumens-property';
    expect(screen.getByTestId(`${testId}-examples`)).toHaveTextContent('example');
    expect(screen.getByTestId(`${testId}-example-0`)).toHaveTextContent('900');
  });

  it('renders a schema-level example on an OpenRPC param schema', async () => {
    const document = await example('wallet.openrpc.json');
    if (document.kind !== 'jsonrpc') throw new Error('Expected a JSON-RPC fixture.');
    render(JsonRpcDocument, { document });

    const base = 'jsonrpc-document-method-getbalance-param-address-0-schema-root-property';
    expect(screen.getByTestId(`${base}-examples`)).toHaveTextContent('example');
    expect(screen.getByTestId(`${base}-example-0`)).toHaveTextContent(
      '0x0000000000000000000000000000000000000001',
    );
  });

  it('renders a schema-level example in a JSON Schema document, including an object value', async () => {
    const document = await example('user-profile.schema.json');
    if (document.kind !== 'jsonschema') throw new Error('Expected a JSON Schema fixture.');
    render(JsonSchemaDocument, { document });

    // The root's own row is shown (and children keyed under `-root-`) because the fixture's
    // root now carries a `$comment` -- one of `showRoot`'s own conditions, alongside
    // `description`, that force the row -- not because of anything this test itself
    // exercises. See the `$comment` test below for that field's own assertion.
    const nameExamples = screen.getByTestId(
      'jsonschema-document-root-viewer-root-p-displayName-property-examples',
    );
    expect(nameExamples).toHaveTextContent('"Ada Lovelace"');

    // An object example must render its shape, not `[object Object]`.
    const addressExample = screen.getByTestId(
      'jsonschema-document-schemas-0-viewer-root-property-example-0',
    );
    expect(addressExample).toHaveTextContent('"street"');
    expect(addressExample).toHaveTextContent('"1 Bridge St"');
  });

  it('renders $comment as an authoring note distinct from description, and $vocabulary as mandatory/optional chips', async () => {
    const document = await example('user-profile.schema.json');
    if (document.kind !== 'jsonschema') throw new Error('Expected a JSON Schema fixture.');
    render(JsonSchemaDocument, { document });

    const comment = screen.getByTestId('jsonschema-document-root-viewer-root-property-comment');
    expect(comment).toHaveTextContent('Authoring note');
    expect(comment).toHaveTextContent('do not add a format keyword here');

    const description = screen.getByTestId('jsonschema-document-header-description');
    expect(description).toHaveTextContent("A user's public profile.");
    expect(description).not.toHaveTextContent('do not add a format keyword here');

    expect(screen.getByTestId('jsonschema-document-vocabulary-0')).toHaveTextContent(
      'https://json-schema.org/draft/2020-12/vocab/core',
    );
    expect(screen.getByTestId('jsonschema-document-vocabulary-0')).toHaveTextContent('mandatory');
    expect(screen.getByTestId('jsonschema-document-vocabulary-2')).toHaveTextContent('optional');
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
