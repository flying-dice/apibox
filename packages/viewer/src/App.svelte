<script lang="ts">
  import type { DataSource } from './data-source.js';
  import ViewerShell from './ViewerShell.svelte';
  import type { ViewerNavigation } from './navigation.js';

  interface Props {
    dataSource: DataSource;
    navigation: ViewerNavigation;
    webview?: boolean;
  }

  const props: Props = $props();
</script>

<ViewerShell {...props} />
