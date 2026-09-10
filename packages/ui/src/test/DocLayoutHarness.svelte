<script lang="ts">
  import DocLayout from '../templates/DocLayout.svelte';
</script>

<div data-testid="doc-layout-harness">
  <DocLayout>
    {#snippet sidebar()}<nav>Primary navigation</nav>{/snippet}
    <p>Document content</p>
    {#snippet rightRail()}<nav>Section navigation</nav>{/snippet}
  </DocLayout>
</div>
