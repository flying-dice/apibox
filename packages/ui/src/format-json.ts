export function formatJson(value: unknown, failureMessage: string): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return failureMessage;
  }
}
