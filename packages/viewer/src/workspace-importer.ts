import type { ImportCandidate, ImportFailure, ImportResult, WorkspaceFile } from './workspace.js';

export async function importWorkspaceFiles(
  files: readonly ImportCandidate[],
  existingFiles: readonly WorkspaceFile[],
  createId: () => string,
): Promise<ImportResult> {
  const { parseApiSource, slugify, sourceName, uniqueId } = await import('@apibox/core/browser');
  const taken = new Set(existingFiles.map((file) => file.document.id));
  const imported: WorkspaceFile[] = [];
  const failures: ImportFailure[] = [];

  for (const file of files) {
    try {
      const content = await file.text();
      const requestedId = uniqueId(slugify(sourceName(file.name)), taken);
      const document = await parseApiSource(content, { id: requestedId });
      imported.push({
        id: createId(),
        fileName: file.name,
        content,
        document,
      });
    } catch (cause) {
      failures.push({
        fileName: file.name,
        message: cause instanceof Error ? cause.message : 'The file could not be imported.',
      });
    }
  }

  return { imported, failures };
}
