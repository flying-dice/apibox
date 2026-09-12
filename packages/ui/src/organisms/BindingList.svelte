<script lang="ts">
  import type { BindingInfo } from '@apibox/core';
  import Badge from '../atoms/Badge.svelte';
  import Chip from '../atoms/Chip.svelte';

  /**
   * Protocol bindings at one location (server, channel, operation or message): Kafka topic
   * config, MQTT QoS, an AMQP exchange, and so on for whichever protocols the document
   * declared there.
   *
   * Deliberately generic, not one branch per protocol: `BindingInfo` is already a
   * protocol-name-plus-fields bag (see its doc comment in `@apibox/core`), and this renders
   * exactly that shape -- a protocol badge, its `bindingVersion`, and its fields as chips,
   * reusing the same `label: value` idiom `RpcMethodCard` and `SchemaNodeRow` already use
   * for extensions. A field whose value is itself an object (e.g. Kafka's `groupId` schema)
   * is shown as compact JSON rather than walked further -- one more tree to expand here
   * would cost more chrome than the value is worth at this density.
   *
   * `label` names the location a caller is rendering (channel, operation, message, server).
   * It matters because a card can legitimately show two binding lists side by side -- e.g. an
   * operation's own bindings plus the channel bindings it inherits -- and without it those rows
   * are indistinguishable even though they mean different things. It renders inline with the
   * protocol badge rather than as its own heading line, so labelling costs no extra row height.
   */
  interface Props {
    bindings: readonly BindingInfo[] | undefined;
    testId: string;
    label?: string;
  }

  const { bindings, testId, label }: Props = $props();

  function formatValue(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
</script>

{#if bindings?.length}
  <div class="bindings" data-testid={testId}>
    {#each bindings as binding (binding.protocol)}
      <div class="binding" data-testid="{testId}-{binding.protocol}">
        <span class="heading">
          {#if label}
            <span class="location" data-testid="{testId}-{binding.protocol}-location">{label}</span>
          {/if}
          <Badge variant="outline" small testId="{testId}-{binding.protocol}-protocol">
            {binding.protocol}
          </Badge>
          {#if binding.version}
            <span class="version" data-testid="{testId}-{binding.protocol}-version">
              v{binding.version}
            </span>
          {/if}
        </span>
        {#if binding.fields.length}
          <span class="fields">
            {#each binding.fields as field (field.key)}
              <Chip
                label={field.key}
                value={formatValue(field.value)}
                code
                testId="{testId}-{binding.protocol}-{field.key}"
              />
            {/each}
          </span>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .bindings {
    display: flex;
    flex-direction: column;
    gap: var(--apibox-space-2);
  }

  .binding {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
    align-items: center;
  }

  .heading {
    display: flex;
    gap: var(--apibox-space-2);
    align-items: center;
  }

  .version {
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
  }

  .location {
    font-size: var(--apibox-font-size-sm);
    color: var(--apibox-fg-muted);
    text-transform: uppercase;
  }

  .fields {
    display: flex;
    flex-wrap: wrap;
    gap: var(--apibox-space-2);
  }
</style>
