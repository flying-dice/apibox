<script lang="ts">
  import type { JsonSchemaDocument as JsonSchemaDocumentModel } from '@apibox/core';
  import DocumentHeader from '../../organisms/DocumentHeader.svelte';
  import KeyValueRow from '../../molecules/KeyValueRow.svelte';
  import SchemaCatalog from '../../organisms/SchemaCatalog.svelte';
  import SchemaViewer from '../../organisms/SchemaViewer.svelte';

  interface Props {
    document: JsonSchemaDocumentModel;
    testId?: string;
  }

  const { document, testId = 'jsonschema-document' }: Props = $props();
  const schemasNavigation = $derived(document.nav.find((node) => node.id === 'schemas'));
</script>

<article class="document" data-testid={testId}>
  <!--
    `specVersion` is deliberately withheld here: for JSON Schema it is the same dialect
    string as `document.version`, and DocumentHeader already renders that in the metadata
    row below. Passing it too would print the dialect twice.
  -->
  <DocumentHeader {document} versionLabel="Dialect" testId="{testId}-header" />

  {#if document.schemaId}
    <dl class="metadata" data-testid="{testId}-metadata">
      <KeyValueRow label="Schema ID" testId="{testId}-schema-id">{document.schemaId}</KeyValueRow>
    </dl>
  {/if}

  {#if document.root}
    <section
      id="root"
      class="root"
      aria-labelledby="{testId}-root-title"
      data-testid="{testId}-root"
    >
      <h2 id="{testId}-root-title">Schema</h2>
      <SchemaViewer schema={document.root} testId="{testId}-root-viewer" />
    </section>
  {/if}

  <SchemaCatalog
    schemas={document.schemas}
    navigation={schemasNavigation}
    title="Definitions"
    testId="{testId}-schemas"
  />
</article>

<style>
  .document,
  .root {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
  }

  .document {
    max-width: 76rem;
    margin: 0 auto;
  }

  .root {
    padding-top: var(--apibox-space-5);
    border-top: 1px solid var(--apibox-border);
  }

  .metadata {
    max-width: 44rem;
    margin: 0;
  }

  h2 {
    margin: 0;
  }
</style>
