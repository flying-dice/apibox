<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  /**
   * A block of code or data with a copy button.
   *
   * Examples in API documentation exist to be copied, so the copy button is not an
   * afterthought: it holds a confirmation state briefly, because a copy that gives no
   * feedback leaves the reader wondering whether it worked.
   *
   * Clipboard access is unavailable in some contexts — an insecure origin, a restrictive
   * webview policy — so failure is surfaced rather than swallowed.
   */
  interface Props {
    /** Pre-formatted text. Objects should be stringified by the caller. */
    code: string;
    language?: string;
    /** Shown above the block, e.g. a media type or an example name. */
    label?: string;
    /** Collapses the block past this many lines until expanded. */
    maxLines?: number;
    testId?: string;
  }

  const { code, language, label, maxLines = 0, testId = 'code-block' }: Props = $props();

  const COPY_LABELS: Record<CopyState, string> = {
    idle: 'Copy to clipboard',
    copied: 'Copied to clipboard',
    failed: 'Copy failed: the clipboard is unavailable',
  };

  type CopyState = 'idle' | 'copied' | 'failed';
  let copyState = $state<CopyState>('idle');
  let timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Expansion belongs to the payload, not to the component instance.
   *
   * A renderer switching media types reuses this instance, so a plain `$state(false)` would
   * leave the next example expanded because the previous one was. Recording which payload
   * the expansion applies to resets it when the payload changes.
   */
  let expandedFor = $state<string | undefined>(undefined);
  const expanded = $derived(expandedFor === code);

  const lineCount = $derived(code.split('\n').length);
  const collapsible = $derived(maxLines > 0 && lineCount > maxLines);
  const shown = $derived(
    collapsible && !expanded ? code.split('\n').slice(0, maxLines).join('\n') : code,
  );

  async function copy() {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(code);
      copyState = 'copied';
    } catch {
      // Clipboard access can be denied outright; say so rather than appear to succeed.
      copyState = 'failed';
    }
    timer = setTimeout(() => {
      copyState = 'idle';
    }, 2000);
  }
</script>

<figure class="block" data-testid={testId}>
  <figcaption class="head">
    <span class="label" data-testid="{testId}-label">{label ?? language ?? ''}</span>
    <Button
      size="small"
      label={COPY_LABELS[copyState]}
      title={copyState === 'failed' ? 'Could not access the clipboard' : 'Copy'}
      testId="{testId}-copy"
      onclick={copy}
    >
      <Icon
        name={copyState === 'copied' ? 'check' : 'copy'}
        size={13}
        testId="{testId}-copy-icon"
      />
      <span data-testid="{testId}-copy-state">
        {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Failed' : 'Copy'}
      </span>
    </Button>

    <!--
      The button's own accessible name changes, but a name change is not announced on its
      own. A polite live region is what actually tells a screen-reader user the copy failed.
    -->
    <span class="visually-hidden" role="status" data-testid="{testId}-copy-announcement">
      {copyState === 'copied' ? 'Copied to clipboard' : ''}
      {copyState === 'failed' ? 'Could not copy: the clipboard is unavailable' : ''}
    </span>
  </figcaption>

  <pre class="code" data-language={language} data-testid="{testId}-content"><code>{shown}</code></pre>

  {#if collapsible}
    <Button
      size="small"
      testId="{testId}-toggle"
      pressed={expanded}
      onclick={() => {
        expandedFor = expanded ? undefined : code;
      }}
    >
      <Icon
        name={expanded ? 'chevron-down' : 'chevron-right'}
        size={13}
        testId="{testId}-toggle-icon"
      />
      {expanded ? 'Show less' : `Show all ${lineCount} lines`}
    </Button>
  {/if}
</figure>

<style>
  .block {
    margin: 0;
    overflow: hidden;
    background: var(--apibox-bg-code);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius);
  }

  .head {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
    justify-content: space-between;
    padding: var(--apibox-space-1) var(--apibox-space-2) var(--apibox-space-1)
      var(--apibox-space-3);
    border-bottom: 1px solid var(--apibox-border);
  }

  .label {
    overflow: hidden;
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .code {
    /* Wide payloads scroll inside the block; the page itself must never scroll sideways. */
    padding: var(--apibox-space-3);
    margin: 0;
    overflow-x: auto;
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-code);
    line-height: 1.5;
    tab-size: 2;
  }
</style>
