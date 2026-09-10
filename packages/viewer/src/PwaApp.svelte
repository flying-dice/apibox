<script lang="ts">
  import ViewerShell from './ViewerShell.svelte';
  import { untrack } from 'svelte';
  import type { DataSource } from './data-source.js';
  import type { ViewerNavigation } from './navigation.js';
  import WorkspaceManager from './WorkspaceManager.svelte';
  import './workspace-chrome.css';
  import {
    type ImportCandidate,
    type ImportResult,
    type WorkspaceController,
    type WorkspaceSnapshot,
  } from './workspace.js';

  interface Props {
    controller: WorkspaceController;
    dataSource: DataSource;
    navigation: ViewerNavigation;
  }

  const { controller, dataSource, navigation }: Props = $props();
  let snapshot = $state.raw<WorkspaceSnapshot>(untrack(() => controller.snapshot()));
  let reloadRevision = $state(0);
  let busy = $state(false);
  let notice = $state<string>();
  let error = $state<string>();
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

  function showNotice(message: string): void {
    notice = message;
    error = undefined;
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => (notice = undefined), 5000);
  }

  function showError(message: string): void {
    error = message;
    notice = undefined;
  }

  async function runWorkspaceOperation(operation: () => Promise<void>): Promise<void> {
    busy = true;
    error = undefined;
    try {
      await operation();
    } catch (cause) {
      showError(cause instanceof Error ? cause.message : 'The workspace operation failed.');
    } finally {
      busy = false;
    }
  }

  async function createWorkspace(name: string): Promise<void> {
    await runWorkspaceOperation(async () => {
      const workspace = await controller.create(name);
      reloadRevision += 1;
      showNotice(`Created ${workspace.name}.`);
    });
  }

  async function activateWorkspace(id: string): Promise<void> {
    await runWorkspaceOperation(async () => {
      await controller.activate(id);
      reloadRevision += 1;
    });
  }

  async function deleteWorkspace(id: string): Promise<void> {
    await runWorkspaceOperation(async () => {
      const workspaceName = snapshot.workspaces.find((workspace) => workspace.id === id)?.name;
      await controller.deleteWorkspace(id);
      reloadRevision += 1;
      showNotice(`Deleted ${workspaceName ?? 'workspace'}.`);
    });
  }

  async function importFiles(files: readonly ImportCandidate[]): Promise<void> {
    await runWorkspaceOperation(async () => {
      const result: ImportResult = await controller.importFiles(files);
      if (result.imported.length > 0) {
        navigation.router.navigate({ documentId: result.imported[0]?.document.id }, true);
        reloadRevision += 1;
      }
      if (result.failures.length > 0) {
        const summary = result.failures
          .map((failure) => `${failure.fileName}: ${failure.message}`)
          .join(' · ');
        showError(
          result.imported.length > 0
            ? `Imported ${result.imported.length} file(s). ${summary}`
            : summary,
        );
      } else if (result.imported.length > 0) {
        showNotice(
          `Imported ${result.imported.length} ${result.imported.length === 1 ? 'file' : 'files'}.`,
        );
      }
    });
  }

  async function removeFile(fileId: string): Promise<void> {
    await runWorkspaceOperation(async () => {
      await controller.removeFile(fileId);
      reloadRevision += 1;
      showNotice('Removed the file from this workspace.');
    });
  }

  $effect(() => {
    const unsubscribe = controller.subscribe((next) => (snapshot = next));
    void controller.initialise().catch((cause) => {
      showError(cause instanceof Error ? cause.message : 'Local workspace storage is unavailable.');
    });
    return () => {
      unsubscribe();
      if (noticeTimer) clearTimeout(noticeTimer);
    };
  });
</script>

<ViewerShell {dataSource} {navigation} {reloadRevision}>
  {#snippet sidebarHeader()}
    <WorkspaceManager
      {snapshot}
      files={controller.activeFiles()}
      {busy}
      {notice}
      {error}
      oncreate={createWorkspace}
      onactivate={activateWorkspace}
      ondelete={deleteWorkspace}
      onimport={importFiles}
      onremove={removeFile}
    />
  {/snippet}
</ViewerShell>
