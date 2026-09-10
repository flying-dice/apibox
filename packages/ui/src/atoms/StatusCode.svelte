<script lang="ts">
  import Badge, { type BadgeVariant } from './Badge.svelte';
  import { statusLabel, statusTone } from './status.js';

  /**
   * An HTTP response status.
   *
   * Colour comes from the class of the code, so a reader can scan a response list and see
   * the shape of it without reading numbers. Handles the wildcard forms (`4XX`) and
   * `default`, which OpenAPI permits alongside concrete codes.
   */
  interface Props {
    status: string;
    variant?: BadgeVariant;
    small?: boolean;
    testId?: string;
  }

  const { status, variant = 'soft', small = false, testId }: Props = $props();

  const tone = $derived(statusTone(status));
  const label = $derived(statusLabel(status));
</script>

<Badge {tone} {variant} {small} testId={testId ?? `status-${status.toLowerCase()}`} title={label}>
  {status}
</Badge>
