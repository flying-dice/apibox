<script lang="ts">
  import { Button } from '@apibox/ui';
  import { onMount } from 'svelte';

  let theme = $state<'dark' | 'light'>('dark');

  onMount(() => {
    theme = document.documentElement.dataset.apiboxTheme === 'light' ? 'light' : 'dark';
  });

  function toggleTheme(): void {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.apiboxTheme = theme;
  }
</script>

<div class="theme-control" data-testid="viewer-theme-control">
  <Button size="small" label="Switch colour theme" testId="viewer-theme-toggle" onclick={toggleTheme}>
    {theme === 'dark' ? 'Light theme' : 'Dark theme'}
  </Button>
</div>

<style>
  .theme-control {
    position: fixed;
    top: var(--apibox-space-3);
    right: var(--apibox-space-3);
    z-index: 1;
  }
</style>
