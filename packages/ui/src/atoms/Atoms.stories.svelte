<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Badge from './Badge.svelte';
  import Button from './Button.svelte';
  import Chip from './Chip.svelte';
  import Code from './Code.svelte';
  import HttpMethod from './HttpMethod.svelte';
  import Icon from './Icon.svelte';
  import Link from './Link.svelte';
  import Spinner from './Spinner.svelte';
  import StatusCode from './StatusCode.svelte';
  import type { IconName } from './Icon.svelte';
  import type { Snippet } from 'svelte';

  const { Story } = defineMeta({
    title: 'Atoms/Overview',
    parameters: {
      docs: {
        description: {
          component:
            'The leaf components. Flip the Theme toolbar control on each story: every ' +
            'colour here comes from a token, so nothing should stay put.',
        },
      },
    },
  });

  const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
  const STATUSES = ['200', '201', '204', '301', '400', '404', '409', '429', '500', '503', 'default'];
  const ICONS: IconName[] = [
    'chevron-right',
    'chevron-down',
    'search',
    'copy',
    'check',
    'close',
    'link-external',
    'lock',
    'warning',
    'info',
    'circle-slash',
  ];
</script>

{#snippet row(title: string, note: string | undefined, content: Snippet)}
  <section class="row">
    <h3>{title}</h3>
    {#if note}<p class="note">{note}</p>{/if}
    <div class="items">{@render content()}</div>
  </section>
{/snippet}

<Story name="HTTP methods">
  <div class="sheet">
    {#snippet methods()}
      {#each METHODS as method (method)}
        <HttpMethod {method} />
      {/each}
    {/snippet}
    {@render row('Soft', 'The default. Used in the sidebar and operation headers.', methods)}

    {#snippet solid()}
      {#each METHODS as method (method)}
        <HttpMethod {method} variant="solid" />
      {/each}
    {/snippet}
    {@render row('Solid', undefined, solid)}

    {#snippet deprecated()}
      <HttpMethod method="delete" deprecated />
      <HttpMethod method="post" deprecated variant="outline" />
    {/snippet}
    {@render row('Deprecated', 'Struck through, and said so in the tooltip.', deprecated)}
  </div>
</Story>

<Story name="Status codes">
  <div class="sheet">
    {#snippet statuses()}
      {#each STATUSES as status (status)}
        <StatusCode {status} />
      {/each}
    {/snippet}
    {@render row(
      'By class',
      'Colour follows the class of the code, so a response list can be taken in at a glance.',
      statuses,
    )}

    {#snippet wildcards()}
      <StatusCode status="2XX" />
      <StatusCode status="4XX" />
      <StatusCode status="5XX" />
    {/snippet}
    {@render row('Wildcards', 'OpenAPI permits these alongside concrete codes.', wildcards)}
  </div>
</Story>

<Story name="Badges and chips">
  <div class="sheet">
    {#snippet tones()}
      <Badge tone="neutral">neutral</Badge>
      <Badge tone="info">info</Badge>
      <Badge tone="success">success</Badge>
      <Badge tone="warning">warning</Badge>
      <Badge tone="danger">danger</Badge>
      <Badge tone="accent">accent</Badge>
    {/snippet}
    {@render row('Tones', undefined, tones)}

    {#snippet variants()}
      <Badge tone="info" variant="soft">soft</Badge>
      <Badge tone="info" variant="solid">solid</Badge>
      <Badge tone="info" variant="outline">outline</Badge>
    {/snippet}
    {@render row('Variants', undefined, variants)}

    {#snippet chips()}
      <Chip label="format" value="uuid" code />
      <Chip label="min length" value="1" />
      <Chip label="max length" value="64" />
      <Chip label="pattern" value="^[0-9]+$" code />
      <Chip label="default" value='"available"' code />
    {/snippet}
    {@render row('Constraint chips', 'Label muted, value not — the values carry the meaning.', chips)}
  </div>
</Story>

<Story name="Icons, links and controls">
  <div class="sheet">
    {#snippet icons()}
      {#each ICONS as name (name)}
        <span class="icon-cell" title={name}><Icon {name} /></span>
      {/each}
    {/snippet}
    {@render row('Icons', 'Inline SVG on currentColor, so they inherit whatever token applies.', icons)}

    {#snippet links()}
      <Link href="#/pets/listPets">In-document link</Link>
      <Link href="https://spec.openapis.org">External link</Link>
    {/snippet}
    {@render row('Links', 'External links are marked before they are clicked.', links)}

    {#snippet buttons()}
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button>Ghost</Button>
      <Button disabled>Disabled</Button>
      <Button pressed>Pressed</Button>
    {/snippet}
    {@render row('Buttons', 'Ghost by default: documentation is read, not operated.', buttons)}

    {#snippet misc()}
      <Spinner />
      <Code>GET /pets/{'{petId}'}</Code>
      <Code boxed>application/json</Code>
    {/snippet}
    {@render row('Spinner and code', undefined, misc)}
  </div>
</Story>

<style>
  .sheet {
    padding: var(--apibox-space-5);
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size);
    color: var(--apibox-fg);
    background: var(--apibox-bg);
  }

  .row + .row {
    margin-top: var(--apibox-space-6);
  }

  h3 {
    margin-bottom: var(--apibox-space-2);
    font-size: var(--apibox-font-size);
  }

  .note {
    max-width: 60ch;
    margin-bottom: var(--apibox-space-3);
    color: var(--apibox-fg-muted);
  }

  .items {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  .icon-cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius);
  }
</style>
