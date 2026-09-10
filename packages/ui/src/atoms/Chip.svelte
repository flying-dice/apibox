<script lang="ts">
  /**
   * A `label: value` constraint chip — `min length: 1`, `format: uuid`, `pattern: ^\d+$`.
   *
   * Schema constraints arrive as an open-ended list, so this is a pair of strings rather
   * than a component per constraint. The label is muted and the value is not: scanning a
   * row of chips, the values are what carry the information.
   */
  interface Props {
    label: string;
    value: string;
    /** Renders the value in the code font, for patterns and formats. */
    code?: boolean;
    testId?: string;
  }

  const { label, value, code = false, testId }: Props = $props();
</script>

<span class="chip" data-testid={testId ?? `chip-${label.replace(/\s+/g, '-')}`}>
  <span class="label">{label}</span>
  <span class="value" class:code>{value}</span>
</span>

<style>
  .chip {
    display: inline-flex;
    gap: var(--apibox-space-2);
    align-items: baseline;
    padding: 0 var(--apibox-space-2);
    font-size: var(--apibox-font-size-sm);
    line-height: 1.6;
    white-space: nowrap;
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius);
  }

  .label {
    color: var(--apibox-fg-muted);
  }

  .value {
    color: var(--apibox-fg);
  }

  .code {
    font-family: var(--apibox-font-code);
    font-size: calc(var(--apibox-font-size-code) - 1px);
  }
</style>
