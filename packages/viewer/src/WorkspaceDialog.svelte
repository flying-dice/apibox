<script lang="ts">
  import type { WorkspaceFile, WorkspaceSnapshot } from './workspace.js';
  import { workspaceDetail } from './workspace.js';
  import WorkspaceFileList from './WorkspaceFileList.svelte';

  interface Props {
    open: boolean;
    snapshot: WorkspaceSnapshot;
    files: readonly WorkspaceFile[];
    busy?: boolean;
    onclose(): void;
    oncreate(name: string): Promise<void>;
    onactivate(id: string): Promise<void>;
    ondelete(id: string): Promise<void>;
    onremove(fileId: string): Promise<void>;
  }

  const {
    open,
    snapshot,
    files,
    busy = false,
    onclose,
    oncreate,
    onactivate,
    ondelete,
    onremove,
  }: Props = $props();
  let dialog: HTMLDialogElement;
  let workspaceName = $state('');
  let deleteId = $state<string>();

  async function createWorkspace(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    await oncreate(workspaceName);
    workspaceName = '';
  }

  async function chooseWorkspace(id: string): Promise<void> {
    await onactivate(id);
    onclose();
  }

  $effect(() => {
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="manager"
  data-testid="workspace-manager-dialog"
  onclose={onclose}
>
  <div class="manager-head" data-testid="workspace-manager-header">
    <div data-testid="workspace-manager-heading-copy">
      <span class="workspace-eyebrow" data-testid="workspace-manager-kicker">Browser storage</span>
      <h2 data-testid="workspace-manager-title">Your workspaces</h2>
      <p data-testid="workspace-manager-description">
        Separate projects, private to this browser. Nothing is uploaded.
      </p>
    </div>
    <button
      class="close"
      type="button"
      aria-label="Close workspace manager"
      data-testid="workspace-manager-close"
      onclick={onclose}>×</button
    >
  </div>

  <div class="manager-grid" data-testid="workspace-manager-grid">
    <section class="workspace-list" aria-label="Available workspaces" data-testid="workspace-list">
      {#each snapshot.workspaces as workspace (workspace.id)}
        <article
          class:current={workspace.id === snapshot.activeId}
          class="workspace-card"
          data-testid="workspace-card-{workspace.id}"
        >
          <button
            class="workspace-card-main"
            type="button"
            data-testid="workspace-card-{workspace.id}-activate"
            onclick={() => chooseWorkspace(workspace.id)}
          >
            <strong data-testid="workspace-card-{workspace.id}-name">{workspace.name}</strong>
            <small data-testid="workspace-card-{workspace.id}-detail">{workspaceDetail(workspace)}</small>
          </button>
          {#if workspace.readOnly}
            <span class="workspace-status-pill" data-testid="workspace-card-{workspace.id}-readonly">Read only</span>
          {:else if deleteId === workspace.id}
            <div class="delete-confirm" data-testid="workspace-card-{workspace.id}-confirm">
              <span data-testid="workspace-card-{workspace.id}-confirm-text">Delete?</span>
              <button
                type="button"
                data-testid="workspace-card-{workspace.id}-delete-confirm"
                onclick={async () => {
                  await ondelete(workspace.id);
                  deleteId = undefined;
                }}>Yes</button
              >
              <button
                type="button"
                data-testid="workspace-card-{workspace.id}-delete-cancel"
                onclick={() => (deleteId = undefined)}>No</button
              >
            </div>
          {:else}
            <button
              class="delete"
              type="button"
              aria-label="Delete {workspace.name}"
              data-testid="workspace-card-{workspace.id}-delete"
              onclick={() => (deleteId = workspace.id)}>Delete</button
            >
          {/if}
        </article>
      {/each}
    </section>

    <section class="create-panel" aria-label="Create a workspace" data-testid="workspace-create-panel">
      <h3 data-testid="workspace-create-title">New workspace</h3>
      <form data-testid="workspace-create-form" onsubmit={createWorkspace}>
        <label for="workspace-name" data-testid="workspace-name-label">Name</label>
        <input
          id="workspace-name"
          bind:value={workspaceName}
          maxlength="64"
          placeholder="Payments platform"
          data-testid="workspace-name-input"
        />
        <button class="create" type="submit" disabled={busy} data-testid="workspace-create-submit"
          >Create workspace</button
        >
      </form>

      {#if !snapshot.active.readOnly}
        <WorkspaceFileList {files} {onremove} />
      {/if}
    </section>
  </div>
</dialog>

<style>
  .manager { width: min(46rem, calc(100vw - 2rem)); padding: 0; color: var(--apibox-fg); background: var(--apibox-bg-raised); border: 1px solid var(--apibox-border-strong); border-radius: calc(var(--apibox-radius) * 2); outline: 1px solid var(--apibox-border-contrast); outline-offset: -1px; box-shadow: 0 24px 80px var(--apibox-shadow-widget); }
  .manager::backdrop { background: rgb(0 0 0 / 58%); backdrop-filter: blur(3px); }
  .manager-head { display: flex; gap: var(--apibox-space-4); align-items: flex-start; justify-content: space-between; padding: var(--apibox-space-5); border-bottom: 1px solid var(--apibox-border); }
  .manager h2, .manager h3, .manager p { margin: 0; }
  .manager h2 { margin-top: var(--apibox-space-1); }
  .manager-head p { margin-top: var(--apibox-space-2); color: var(--apibox-fg-muted); }
  .close { padding: var(--apibox-space-1) var(--apibox-space-2); color: var(--apibox-fg-muted); font-size: 1.5rem; cursor: pointer; background: transparent; border: 0; }
  .manager-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(15rem, 0.8fr); min-height: 24rem; }
  .workspace-list, .create-panel { display: grid; gap: var(--apibox-space-2); align-content: start; padding: var(--apibox-space-4); }
  .workspace-list { background: var(--apibox-bg); border-right: 1px solid var(--apibox-border); }
  .workspace-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--apibox-space-2); align-items: center; padding: var(--apibox-space-1); background: var(--apibox-bg-raised); border: 1px solid var(--apibox-border); border-radius: var(--apibox-radius); }
  .workspace-card.current { background: color-mix(in srgb, var(--apibox-accent) 8%, var(--apibox-bg-raised)); border-color: var(--apibox-accent); }
  .workspace-card.current { outline: 1px dashed var(--apibox-border-active); outline-offset: -1px; }
  .workspace-card-main { display: grid; gap: 0.15rem; min-width: 0; padding: var(--apibox-space-2); color: var(--apibox-fg); text-align: left; cursor: pointer; background: transparent; border: 0; }
  .workspace-card small { color: var(--apibox-fg-muted); }
  .delete, .delete-confirm button { color: var(--apibox-danger); cursor: pointer; background: transparent; border: 0; }
  .delete-confirm { display: flex; gap: var(--apibox-space-1); align-items: center; font-size: var(--apibox-font-size-sm); }
  .create-panel { gap: var(--apibox-space-3); background: var(--apibox-bg-sunken); }
  .create-panel form { display: grid; gap: var(--apibox-space-2); }
  .create-panel label { color: var(--apibox-fg-muted); font-size: var(--apibox-font-size-sm); }
  .create-panel input { min-width: 0; padding: var(--apibox-space-2); color: var(--apibox-fg); background: var(--apibox-bg-input); border: 1px solid var(--apibox-border-input); border-radius: var(--apibox-radius); }
  .create-panel input:focus { border-color: var(--apibox-focus); }
  .create { padding: var(--apibox-space-2) var(--apibox-space-3); color: var(--apibox-fg-on-accent); cursor: pointer; background: var(--apibox-button-bg); border: 0; border-radius: var(--apibox-radius); }
  @media (width <= 38rem) { .manager-grid { grid-template-columns: 1fr; } .workspace-list { border-right: 0; border-bottom: 1px solid var(--apibox-border); } }
</style>
