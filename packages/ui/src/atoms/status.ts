import type { BadgeTone } from './tone.js';

/**
 * HTTP status presentation.
 *
 * Colour follows the class of the code so a reader can take in the shape of a response
 * list — successes, client errors, server errors — without reading the numbers.
 */

/** Handles concrete codes, OpenAPI's wildcard forms (`4XX`) and `default`. */
export function statusTone(status: string): BadgeTone {
  if (status.trim().toLowerCase() === 'default') return 'neutral';

  // `4XX` means "any 4xx"; substituting zeroes puts it in the right class.
  const leading = Number.parseInt(status.replace(/x/gi, '0'), 10);
  if (Number.isNaN(leading)) return 'neutral';
  if (leading >= 200 && leading < 300) return 'success';
  if (leading >= 300 && leading < 400) return 'info';
  if (leading >= 400 && leading < 500) return 'warning';
  if (leading >= 500 && leading < 600) return 'danger';
  return 'neutral';
}

const NAMES: Record<string, string> = {
  '200': 'OK',
  '201': 'Created',
  '202': 'Accepted',
  '204': 'No Content',
  '301': 'Moved Permanently',
  '302': 'Found',
  '304': 'Not Modified',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '409': 'Conflict',
  '410': 'Gone',
  '422': 'Unprocessable Content',
  '429': 'Too Many Requests',
  '500': 'Internal Server Error',
  '502': 'Bad Gateway',
  '503': 'Service Unavailable',
  '504': 'Gateway Timeout',
};

/** A human label for a status, used as the badge's tooltip. */
export function statusLabel(status: string): string {
  const trimmed = status.trim();
  if (trimmed.toLowerCase() === 'default') return 'Default response';
  const name = NAMES[trimmed];
  return name ? `${trimmed} ${name}` : trimmed;
}
