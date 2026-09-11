<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from '../atoms/Icon.svelte';

  /**
   * A top-level rendered item — an operation, a method, a schema entry — collapsed to a
   * single scannable row until the reader opens it.
   *
   * Independent per instance: there is no accordion coordinating siblings, so opening one
   * item never closes another. Collapsed content stays in the DOM behind
   * `hidden="until-found"` rather than an `{#if}` — removing it would silently shrink what
   * the e2e testid-coverage guard checks, and browser find-in-page would stop reaching it.
   *
   * `id` is the element the rest of the app already navigates to by `getElementById` — the
   * sidebar, the router and `section-tracker.ts` all target it. `section-tracker.ts` reveals
   * a card before scrolling to it by dispatching `apibox-reveal` at that id, which is why
   * this listens for a DOM event on its own root rather than taking an `expanded` prop the
   * viewer app would have to thread down through every renderer.
   *
   * The toggle is a `<button>` wrapped in an `<h3>` rather than the reverse: `<h3>` is
   * heading content and `<button>` only permits phrasing content, so nesting a heading
   * inside the button would be invalid. Wrapping keeps the summary on the document's
   * heading outline while making the whole row a real, keyboard-operable control.
   */
  interface Props {
    id: string;
    testId: string;
    /** The always-visible row: identifying information such as method, path or name. */
    summary: Snippet;
    /** Collapsed by default; expands on click, on navigation, or on a deep link. */
    children: Snippet;
  }

  const { id, testId, summary, children }: Props = $props();

  let expanded = $state(false);
  let root: HTMLElement | undefined = $state();
  let content: HTMLElement | undefined = $state();

  function toggle(): void {
    expanded = !expanded;
  }

  $effect(() => {
    // `hidden="until-found"` has to be set through `setAttribute`, not the `hidden` IDL
    // property: the property is a plain boolean, so assigning the string "until-found" to
    // it coerces to `true` and silently drops the keyword that makes find-in-page work.
    if (!content) return;
    if (expanded) {
      content.removeAttribute('hidden');
    } else {
      content.setAttribute('hidden', 'until-found');
    }
  });

  $effect(() => {
    const element = root;
    if (!element) return;
    const reveal = () => {
      expanded = true;
    };
    // `section-tracker.ts` dispatches this at the target id before it scrolls to it, so a
    // sidebar click or a deep link on first load opens the card rather than scrolling to a
    // still-closed one.
    element.addEventListener('apibox-reveal', reveal);
    return () => {
      element.removeEventListener('apibox-reveal', reveal);
    };
  });

  $effect(() => {
    const element = content;
    if (!element) return;
    const reveal = () => {
      expanded = true;
    };
    // Fires on the hidden element itself when a browser find-in-page match lands inside it.
    element.addEventListener('beforematch', reveal);
    return () => {
      element.removeEventListener('beforematch', reveal);
    };
  });
</script>

<article {id} bind:this={root} class="card" data-testid={testId} data-expanded={expanded}>
  <h3 class="heading">
    <button
      type="button"
      class="toggle"
      aria-expanded={expanded}
      aria-controls="{testId}-content"
      data-testid="{testId}-toggle"
      onclick={toggle}
    >
      <Icon
        name={expanded ? 'chevron-down' : 'chevron-right'}
        size={14}
        testId="{testId}-toggle-icon"
      />
      <span class="summary">{@render summary()}</span>
    </button>
  </h3>

  <div bind:this={content} id="{testId}-content" class="content" data-testid="{testId}-content">
    {@render children()}
  </div>
</article>

<style>
  /*
   * A flat row, not a card. The raised surface this used to draw carried no information —
   * every item had one, open or closed — while costing ~90px of height for a single line of
   * text. Density is the point of this project, so the item is now a row in a list and the
   * separation is carried by a hairline.
   */
  .card {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-3);
    padding: var(--apibox-space-2) 0;
  }

  /*
   * The hairline goes on every row except the first, so nothing is drawn above the list or
   * below it — the group heading and the section border already bound it at both ends.
   *
   * `:first-of-type` rather than the more obvious `.card + .card`: each instance of this
   * component renders exactly one `.card`, so a sibling combinator can never match within
   * one instance's own markup and Svelte prunes the rule as unused. The result is a silent
   * no-op that compiles, lints and tests clean while drawing nothing.
   */
  .card {
    border-top: 1px solid var(--apibox-border);
  }

  .card:first-of-type {
    border-top: 0;
  }

  .heading {
    margin: 0;
    font: inherit;
  }

  .toggle {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
    width: 100%;
    padding: var(--apibox-space-1);
    margin: calc(var(--apibox-space-1) * -1);
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: none;
    border: none;
    border-radius: var(--apibox-radius);
  }

  .toggle:hover {
    background: var(--apibox-bg-hover);
  }

  .toggle:focus-visible {
    outline: 1px dashed var(--apibox-border-active);
    outline-offset: -1px;
  }

  .summary {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
    min-width: 0;
  }

  /*
   * Expanded content nests under its own row rather than opening a panel, reusing the exact
   * indent idiom the schema tree already establishes in SchemaNodeRow's `.children` — one
   * disclosure language across the whole document, not two.
   */
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-4);
    padding-left: var(--apibox-space-4);
    margin-left: var(--apibox-space-4);
    border-left: 1px solid var(--apibox-border);
  }
</style>
