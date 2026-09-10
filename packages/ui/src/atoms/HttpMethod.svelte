<script lang="ts">
  import Badge, { type BadgeVariant } from './Badge.svelte';
  import { methodTone } from './tone.js';

  /**
   * An HTTP method label.
   *
   * A thin specialisation of {@link Badge} rather than a bare badge at every call site, so
   * that method colour is decided once. Methods appear in the sidebar, in operation headers
   * and in search results; if each picked its own tone they would drift.
   */
  interface Props {
    method: string;
    variant?: BadgeVariant;
    small?: boolean;
    deprecated?: boolean;
    testId?: string;
  }

  const { method, variant = 'soft', small = false, deprecated = false, testId }: Props = $props();

  const normalised = $derived(method.trim().toLowerCase());
  const tone = $derived(methodTone(method));
</script>

<Badge
  {tone}
  {variant}
  {small}
  {deprecated}
  testId={testId ?? `http-method-${normalised}`}
  title={deprecated ? `${method.toUpperCase()} (deprecated)` : method.toUpperCase()}
>
  {method.toUpperCase()}
</Badge>
