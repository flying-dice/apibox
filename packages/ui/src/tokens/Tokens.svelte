<script lang="ts">
  import {
    RADIUS_TOKENS,
    SPACING_TOKENS,
    TOKEN_GROUPS,
  } from './token-manifest.js';

  /**
   * A live rendering of the whole token layer.
   *
   * This exists to be looked at: flip the Storybook theme toggle and every swatch, type
   * ramp and spacing step should change coherently. A token that does not move is one that
   * escaped the theme, which is far easier to see here than in a real component.
   *
   * The groups come from `token-manifest.ts`, which the tests also read — so a token added
   * to `tokens.css` cannot quietly go undocumented here.
   */
</script>

<div class="tokens" data-testid="tokens">
  {#each TOKEN_GROUPS as group (group.id)}
    <section data-testid="token-group-{group.id}">
      <h2>{group.title}</h2>
      {#if group.note}<p class="note">{group.note}</p>{/if}
      <div class="swatches">
        {#each group.tokens as token (token.name)}
          <div class="swatch" data-testid="token-{token.name}">
            <div class="chip" style="background: var({token.name})"></div>
            <div class="label">
              <code>{token.name}</code>
              {#if token.usage === 'text'}
                <span
                  class="usage"
                  title="Checked against WCAG AA in every standalone theme"
                  data-testid="token-{token.name}-usage">text</span
                >
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/each}

  <section data-testid="token-group-type">
    <h2>Type</h2>
    <p class="note">
      Sizes come from VS Code, so documentation matches the editor a reader is already
      looking at.
    </p>
    <div class="type">
      <p style="font-size: var(--apibox-font-size-xl); font-weight: var(--apibox-font-weight-bold)">
        Extra large — section headings
      </p>
      <p style="font-size: var(--apibox-font-size-lg); font-weight: var(--apibox-font-weight-bold)">
        Large — operation summaries
      </p>
      <p style="font-size: var(--apibox-font-size)">Body — descriptions and tables</p>
      <p style="font-size: var(--apibox-font-size-sm); color: var(--apibox-fg-muted)">
        Small — constraint chips and metadata
      </p>
      <pre style="font-family: var(--apibox-font-code); font-size: var(--apibox-font-size-code)">
Code — schemas, examples, paths</pre>
    </div>
  </section>

  <section data-testid="token-group-spacing">
    <h2>Spacing</h2>
    <p class="note">
      A 4px scale. Tighter than a typical web document, because documentation embedded in an
      editor should not feel like a website.
    </p>
    <div class="spacing">
      {#each SPACING_TOKENS as token (token)}
        <div class="space-row" data-testid="token-{token}">
          <div class="bar" style="width: var({token})"></div>
          <code>{token}</code>
        </div>
      {/each}
    </div>
  </section>

  <section data-testid="token-group-radius">
    <h2>Radius</h2>
    <div class="swatches">
      {#each RADIUS_TOKENS as token (token)}
        <div class="swatch" data-testid="token-{token}">
          <div class="chip radius-demo" style="border-radius: var({token})"></div>
          <code>{token}</code>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .tokens {
    padding: var(--apibox-space-5);
    background: var(--apibox-bg);
    color: var(--apibox-fg);
    font-family: var(--apibox-font);
    font-size: var(--apibox-font-size);
  }

  section + section {
    margin-top: var(--apibox-space-7);
  }

  h2 {
    margin-bottom: var(--apibox-space-3);
    font-size: var(--apibox-font-size-lg);
  }

  .note {
    max-width: 60ch;
    margin-bottom: var(--apibox-space-4);
    color: var(--apibox-fg-muted);
  }

  .swatches {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--apibox-space-4);
  }

  .swatch {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
    min-width: 0;
  }

  .chip {
    flex: none;
    width: 32px;
    height: 32px;
    border: 1px solid var(--apibox-border-strong);
    border-radius: var(--apibox-radius);
  }

  .radius-demo {
    background: var(--apibox-accent);
  }

  .label {
    display: flex;
    gap: var(--apibox-space-2);
    align-items: baseline;
    min-width: 0;
  }

  .usage {
    flex: none;
    padding: 0 var(--apibox-space-2);
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
    border: 1px solid var(--apibox-border);
    border-radius: var(--apibox-radius-pill);
  }

  code {
    overflow: hidden;
    font-family: var(--apibox-font-code);
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .type p,
  .type pre {
    margin-bottom: var(--apibox-space-3);
  }

  .spacing {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
  }

  .space-row {
    display: flex;
    gap: var(--apibox-space-3);
    align-items: center;
  }

  .bar {
    height: 16px;
    background: var(--apibox-accent);
    border-radius: var(--apibox-radius);
  }
</style>
