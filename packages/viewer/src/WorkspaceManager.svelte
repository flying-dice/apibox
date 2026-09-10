<script lang="ts">
  import { Button } from '@apibox/ui';
  import WorkspaceDialog from './WorkspaceDialog.svelte';
  import type { ImportCandidate, WorkspaceFile, WorkspaceSnapshot } from './workspace.js';
  import { workspaceDetail } from './workspace.js';

  interface Props {
    snapshot: WorkspaceSnapshot;
    files: readonly WorkspaceFile[];
    busy?: boolean;
    notice?: string;
    error?: string;
    oncreate(name: string): Promise<void>;
    onactivate(id: string): Promise<void>;
    ondelete(id: string): Promise<void>;
    onimport(files: readonly ImportCandidate[]): Promise<void>;
    onremove(fileId: string): Promise<void>;
  }

  const {
    snapshot,
    files,
    busy = false,
    notice,
    error,
    oncreate,
    onactivate,
    ondelete,
    onimport,
    onremove,
  }: Props = $props();

  let menuOpen = $state(false);
  let managerOpen = $state(false);
  let fileInput: HTMLInputElement;
  let dragging = $state(false);

  function openManager(): void {
    menuOpen = false;
    managerOpen = true;
  }

  async function chooseWorkspace(id: string): Promise<void> {
    menuOpen = false;
    await onactivate(id);
  }

  async function importSelection(candidateFiles: FileList | null): Promise<void> {
    if (!candidateFiles?.length) return;
    await onimport([...candidateFiles]);
    fileInput.value = '';
  }

  async function dropFiles(event: DragEvent): Promise<void> {
    event.preventDefault();
    dragging = false;
    await importSelection(event.dataTransfer?.files ?? null);
  }

</script>

<section
  class="workspace-shell"
  class:dragging
  aria-label="Browser workspace"
  data-testid="workspace-shell"
  ondragenter={(event) => {
    event.preventDefault();
    dragging = true;
  }}
  ondragover={(event) => event.preventDefault()}
  ondragleave={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dragging = false;
  }}
  ondrop={dropFiles}
>
  <div class="workspace-eyebrow" data-testid="workspace-label">
    <span data-testid="workspace-label-text">Workspace</span>
    <span class="workspace-status-pill" data-testid="workspace-local-pill">Local</span>
  </div>

  <div class="switcher" data-testid="workspace-switcher">
    <button
      class="workspace-button"
      type="button"
      aria-expanded={menuOpen}
      data-testid="workspace-switcher-button"
      onclick={() => (menuOpen = !menuOpen)}
    >
      <span class="workspace-mark" aria-hidden="true" data-testid="workspace-mark">◇</span>
      <span class="workspace-copy" data-testid="workspace-current-copy">
        <strong data-testid="workspace-current-name">{snapshot.active.name}</strong>
        <small data-testid="workspace-current-detail">{workspaceDetail(snapshot.active)}</small>
      </span>
      <span class="chevron" aria-hidden="true" data-testid="workspace-chevron">⌄</span>
    </button>

    {#if menuOpen}
      <div class="workspace-menu" role="menu" data-testid="workspace-menu">
        {#each snapshot.workspaces as workspace (workspace.id)}
          <button
            class:active={workspace.id === snapshot.activeId}
            class="workspace-option"
            type="button"
            role="menuitemradio"
            aria-checked={workspace.id === snapshot.activeId}
            data-testid="workspace-option-{workspace.id}"
            onclick={() => chooseWorkspace(workspace.id)}
          >
            <span data-testid="workspace-option-{workspace.id}-name">{workspace.name}</span>
            <small data-testid="workspace-option-{workspace.id}-detail">{workspaceDetail(workspace)}</small>
          </button>
        {/each}
        <button
          class="manage-link"
          type="button"
          role="menuitem"
          data-testid="workspace-manage-open"
          onclick={openManager}
        >Manage workspaces…</button>
      </div>
    {/if}
  </div>

  <div class="workspace-actions" data-testid="workspace-actions">
    <Button
      variant="primary"
      size="small"
      disabled={busy}
      testId="workspace-import-button"
      onclick={() => fileInput.click()}>＋ Import files</Button
    >
    <Button
      variant="secondary"
      size="small"
      disabled={busy}
      testId="workspace-new-button"
      onclick={openManager}>New</Button
    >
  </div>
  <input
    class="file-input"
    bind:this={fileInput}
    type="file"
    multiple
    accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
    aria-label="Import API description files"
    data-testid="workspace-file-input"
    onchange={(event) => importSelection(event.currentTarget.files)}
  />

  <p class="privacy" data-testid="workspace-privacy">
    Files stay on this device. Drop JSON or YAML here.
  </p>
  {#if notice}
    <p class="message success" role="status" data-testid="workspace-notice">{notice}</p>
  {/if}
  {#if error}
    <p class="message failure" role="alert" data-testid="workspace-error">{error}</p>
  {/if}
  {#if dragging}
    <div class="drop-prompt" role="status" data-testid="workspace-drop-prompt">Drop to import</div>
  {/if}
</section>

<WorkspaceDialog
  open={managerOpen}
  {snapshot}
  {files}
  {busy}
  onclose={() => (managerOpen = false)}
  {oncreate}
  {onactivate}
  {ondelete}
  {onremove}
/>

<style>
  .workspace-shell {
    position: relative;
    display: grid;
    gap: var(--apibox-space-2);
    padding: var(--apibox-space-3) 0;
    border-top: 1px solid var(--apibox-border);
    border-bottom: 1px solid var(--apibox-border);
  }

  .workspace-shell.dragging {
    border-color: var(--apibox-accent);
  }

  .switcher {
    position: relative;
  }

  .workspace-button {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--apibox-space-2);
    align-items: center;
    width: 100%;
    padding: var(--apibox-space-2);
    color: var(--apibox-fg);
    text-align: left;
    cursor: pointer;
    background: var(--apibox-bg);
    border: 1px solid var(--apibox-border-strong);
    border-radius: calc(var(--apibox-radius) + 2px);
  }

  .workspace-button:hover,
  .workspace-button[aria-expanded='true'] {
    border-color: var(--apibox-accent);
  }

  .workspace-mark {
    display: grid;
    width: 1.75rem;
    height: 1.75rem;
    color: var(--apibox-fg-on-accent);
    place-items: center;
    background: var(--apibox-button-bg);
    border-radius: var(--apibox-radius);
  }

  .workspace-copy {
    display: grid;
    min-width: 0;
  }

  .workspace-copy strong,
  .workspace-copy small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-copy small,
  .workspace-option small {
    color: var(--apibox-fg-muted);
  }

  .chevron {
    color: var(--apibox-fg-muted);
  }

  .workspace-menu {
    position: absolute;
    z-index: 20;
    top: calc(100% + var(--apibox-space-1));
    right: 0;
    left: 0;
    display: grid;
    padding: var(--apibox-space-1);
    background: var(--apibox-bg-raised, var(--apibox-bg));
    border: 1px solid var(--apibox-border-strong);
    border-radius: var(--apibox-radius);
    box-shadow: 0 12px 30px rgb(0 0 0 / 24%);
  }

  .workspace-option,
  .manage-link {
    display: grid;
    gap: 0.15rem;
    padding: var(--apibox-space-2);
    color: var(--apibox-fg);
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: var(--apibox-radius);
  }

  .workspace-option:hover,
  .workspace-option.active,
  .manage-link:hover {
    background: var(--apibox-bg-hover);
  }

  .workspace-option.active span::before {
    margin-right: var(--apibox-space-1);
    color: var(--apibox-accent);
    content: '✓';
  }

  .manage-link {
    margin-top: var(--apibox-space-1);
    color: var(--apibox-accent);
    border-top: 1px solid var(--apibox-border);
    border-radius: 0;
  }

  .workspace-actions {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: var(--apibox-space-2);
  }

  .file-input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .privacy,
  .message {
    margin: 0;
    color: var(--apibox-fg-muted);
    font-size: 0.72rem;
    line-height: 1.45;
  }

  .success {
    color: var(--apibox-success, var(--apibox-accent));
  }

  .failure {
    color: var(--apibox-danger);
  }

  .drop-prompt {
    position: absolute;
    z-index: 30;
    inset: 0;
    display: grid;
    color: var(--apibox-fg-on-accent);
    font-weight: var(--apibox-font-weight-bold);
    pointer-events: none;
    place-items: center;
    background: color-mix(in srgb, var(--apibox-button-bg) 90%, transparent);
    border-radius: var(--apibox-radius);
  }

</style>
