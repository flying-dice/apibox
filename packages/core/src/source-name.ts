/** Derive a stable API document name from a source filename. */
export function sourceName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  return withoutExtension.replace(/\.(openapi|asyncapi|openrpc|jsonrpc|api|spec)$/i, '') || 'api';
}
