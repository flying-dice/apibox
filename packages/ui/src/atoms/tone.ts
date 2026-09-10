/**
 * Badge tones and their token mapping.
 *
 * Lives outside the component so it can be unit-tested directly and imported as a type
 * without Svelte's module-context rules getting in the way.
 */

const BASE_TONES = ['neutral', 'info', 'success', 'warning', 'danger', 'accent'] as const;
const METHOD_TONES = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;
const ACTION_TONES = ['send', 'receive', 'rpc'] as const;
const BADGE_TONES = [...BASE_TONES, ...METHOD_TONES, ...ACTION_TONES] as const;

export type BadgeTone = (typeof BADGE_TONES)[number];
type MethodTone = (typeof METHOD_TONES)[number];

function isBadgeTone(value: string): value is BadgeTone {
  return BADGE_TONES.some((tone) => tone === value);
}

function isMethodTone(value: string): value is MethodTone {
  return METHOD_TONES.some((tone) => tone === value);
}

/** A tone name from a normalized document, falling back for future or unknown kinds. */
export function badgeTone(value?: string): BadgeTone {
  const normalised = value?.trim().toLowerCase();
  return normalised && isBadgeTone(normalised) ? normalised : 'neutral';
}

/** The `--apibox-*` token a tone resolves to, without the prefix. */
export function toneToken(tone: BadgeTone): string {
  if (isMethodTone(tone)) return `method-${tone}`;
  if (ACTION_TONES.some((actionTone) => actionTone === tone)) return `action-${tone}`;
  return tone;
}

/** The tone for an HTTP method, falling back to neutral for anything unrecognised. */
export function methodTone(method: string): BadgeTone {
  const normalised = method.trim().toLowerCase();
  return isMethodTone(normalised) ? normalised : 'neutral';
}
