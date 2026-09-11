import { basename } from 'node:path';
import type { FormatId } from '@apibox/core';
import { detectFormat, parseDocument } from '@apibox/core';

/** Human labels for the rail's group headings — must match `packages/ui/src/organisms/DocumentHeader.svelte`. */
export const FORMAT_LABELS: Record<FormatId, string> = {
  openapi: 'OpenAPI',
  asyncapi: 'AsyncAPI',
  jsonrpc: 'JSON-RPC',
  jsonschema: 'JSON Schema',
};

/** Fixed presentation order for the rail, independent of scan or filesystem order. */
const FORMAT_ORDER: FormatId[] = ['openapi', 'asyncapi', 'jsonrpc', 'jsonschema'];

export interface DetectedDocument {
  /** Absolute or workspace-relative path, whichever the caller supplied. */
  path: string;
  /** Basename, used as the tree item label. */
  label: string;
  format: FormatId;
}

export interface DocumentGroup {
  format: FormatId;
  label: string;
  documents: DetectedDocument[];
}

/**
 * Every supported format is required to carry one of these keys at its document root (see
 * `packages/core/src/detect.ts`), so a file mentioning none of them cannot possibly detect.
 * Checked as a plain substring search before any JSON/YAML parse, so scanning a workspace
 * never fully parses files that were never going to match — package.json, tsconfig.json,
 * lockfiles, and CI workflow YAML all fail here and are never handed to `parseDocument`.
 */
const ROOT_MARKER = /\b(openapi|asyncapi|openrpc|swagger)\b|\$schema/;

export function hasPlausibleRootMarker(text: string): boolean {
  return ROOT_MARKER.test(text);
}

/**
 * Detect, filter and group a list of candidate paths into the rail's format sections.
 *
 * Deliberately vscode-free — it takes paths and a `read` function rather than touching the
 * filesystem or `vscode.workspace` itself, so it runs under the fast vitest suite. The
 * `vscode.TreeDataProvider` in `document-tree.ts` is a thin wrapper over this that supplies
 * real file reads and turns the result into `vscode.TreeItem`s.
 */
export async function buildDocumentIndex(
  paths: readonly string[],
  read: (path: string) => Promise<string> | string,
): Promise<DocumentGroup[]> {
  const byFormat = new Map<FormatId, DetectedDocument[]>();

  for (const path of paths) {
    const text = await read(path);
    if (!hasPlausibleRootMarker(text)) continue;

    let raw: unknown;
    try {
      raw = parseDocument(text);
    } catch {
      continue; // Not valid JSON/YAML — not this rail's concern.
    }

    const detected = detectFormat(raw);
    if (!detected) continue;

    const entries = byFormat.get(detected.format) ?? [];
    entries.push({ path, label: basename(path), format: detected.format });
    byFormat.set(detected.format, entries);
  }

  return FORMAT_ORDER.filter((format) => byFormat.has(format)).map((format) => ({
    format,
    label: FORMAT_LABELS[format],
    documents: [...byFormat.get(format)!].sort((a, b) => a.label.localeCompare(b.label)),
  }));
}
