<script lang="ts">
  import type { RequestBodyInfo } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import MediaTypeViewer from './MediaTypeViewer.svelte';

  interface Props {
    body: RequestBodyInfo;
    testId?: string;
  }

  const { body, testId = 'request-body' }: Props = $props();
</script>

<section class="body" aria-labelledby="{testId}-title" data-testid={testId}>
  <div class="heading">
    <h3 id="{testId}-title">Request body</h3>
    {#if body.required}
      <Badge tone="danger" variant="outline" small testId="{testId}-required">
        required
      </Badge>
    {/if}
  </div>
  {#if body.description}<p>{body.description}</p>{/if}
  <MediaTypeViewer content={body.content} testId="{testId}-media" />
</section>

<style>
  .body {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
  }

  .heading {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  h3,
  p {
    margin: 0;
  }

  p {
    color: var(--apibox-fg-muted);
  }
</style>
