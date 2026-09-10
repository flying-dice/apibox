<script lang="ts">
  import type { WorkspaceFile } from './workspace.js';

  interface Props {
    files: readonly WorkspaceFile[];
    onremove(fileId: string): Promise<void>;
  }

  const { files, onremove }: Props = $props();
</script>

<div class="file-manager" data-testid="workspace-file-manager">
  <h3 data-testid="workspace-file-manager-title">Imported files</h3>
  {#if files.length === 0}
    <p data-testid="workspace-file-manager-empty">No files in this workspace yet.</p>
  {:else}
    <ul data-testid="workspace-file-list">
      {#each files as file (file.id)}
        <li data-testid="workspace-file-{file.id}">
          <span data-testid="workspace-file-{file.id}-name">{file.fileName}</span>
          <button
            type="button"
            aria-label="Remove {file.fileName}"
            data-testid="workspace-file-{file.id}-remove"
            onclick={() => onremove(file.id)}>Remove</button
          >
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .file-manager { display: grid; gap: var(--apibox-space-2); padding-top: var(--apibox-space-3); border-top: 1px solid var(--apibox-border); }
  h3, p { margin: 0; }
  p { margin-top: var(--apibox-space-2); color: var(--apibox-fg-muted); }
  ul { display: grid; gap: var(--apibox-space-1); padding: 0; margin: 0; list-style: none; }
  li { display: flex; gap: var(--apibox-space-2); align-items: center; justify-content: space-between; min-width: 0; }
  li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { color: var(--apibox-danger); cursor: pointer; background: transparent; border: 0; }
</style>
