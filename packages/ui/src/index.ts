/**
 * `@apibox/ui` — the apibox design language and component library.
 *
 * Styles are imported separately, not from here:
 *
 * ```ts
 * import '@apibox/ui/tokens.css';        // always
 * import '@apibox/ui/themes/dark.css';   // outside a VS Code webview only
 * ```
 *
 * Inside a webview, VS Code supplies the `--vscode-*` variables the tokens are built on, so
 * no theme stylesheet is needed and the documentation follows the user's own theme.
 */

/* -- Atoms ----------------------------------------------------------------- */
export { type BadgeVariant, default as Badge } from './atoms/Badge.svelte';
export { default as Button } from './atoms/Button.svelte';
export { default as Chip } from './atoms/Chip.svelte';
export { default as Code } from './atoms/Code.svelte';
export { default as HttpMethod } from './atoms/HttpMethod.svelte';
export type { IconName } from './atoms/Icon.svelte';
export { default as Icon } from './atoms/Icon.svelte';
export { default as Link } from './atoms/Link.svelte';
export { default as Spinner } from './atoms/Spinner.svelte';
export { default as StatusCode } from './atoms/StatusCode.svelte';
export { statusLabel, statusTone } from './atoms/status.js';
export type { BadgeTone } from './atoms/tone.js';
export { badgeTone, methodTone, toneToken } from './atoms/tone.js';

/* -- Molecules ------------------------------------------------------------- */
export { default as CodeBlock } from './molecules/CodeBlock.svelte';
export { default as KeyValueRow } from './molecules/KeyValueRow.svelte';
export { default as NavItem } from './molecules/NavItem.svelte';
export { default as PropertyRow } from './molecules/PropertyRow.svelte';
export { default as SchemaTypeLabel } from './molecules/SchemaTypeLabel.svelte';
export { default as SearchInput } from './molecules/SearchInput.svelte';
export type { Tab } from './molecules/TabBar.svelte';
export { default as TabBar } from './molecules/TabBar.svelte';
/* -- Organisms ------------------------------------------------------------- */
export { default as DocumentHeader } from './organisms/DocumentHeader.svelte';
export { default as ExampleViewer } from './organisms/ExampleViewer.svelte';
export { default as OperationCard } from './organisms/OperationCard.svelte';
export { default as ParameterTable } from './organisms/ParameterTable.svelte';
export { default as RequestBody } from './organisms/RequestBody.svelte';
export { default as ResponseList } from './organisms/ResponseList.svelte';
export { default as SchemaCatalog } from './organisms/SchemaCatalog.svelte';
export { default as SchemaViewer } from './organisms/SchemaViewer.svelte';
export { default as SecuritySchemes } from './organisms/SecuritySchemes.svelte';
export { default as ServerList } from './organisms/ServerList.svelte';
/* -- Renderers ------------------------------------------------------------- */
export { default as AsyncApiDocument } from './renderers/asyncapi/AsyncApiDocument.svelte';
export { default as JsonRpcDocument } from './renderers/jsonrpc/JsonRpcDocument.svelte';
export { default as OpenApiDocument } from './renderers/openapi/OpenApiDocument.svelte';

/* -- Templates ------------------------------------------------------------- */
export { default as DocLayout } from './templates/DocLayout.svelte';

/* -- Foundations ----------------------------------------------------------- */
export { default as Tokens } from './tokens/Tokens.svelte';
export type { TokenGroup, TokenSpec, TokenUsage } from './tokens/token-manifest.js';
export {
  ALL_COLOUR_TOKENS,
  RADIUS_TOKENS,
  SPACING_TOKENS,
  TEXT_SURFACES,
  TOKEN_GROUPS,
} from './tokens/token-manifest.js';
