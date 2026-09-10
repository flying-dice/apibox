import { describe, expect, it } from 'vitest';
import { statusLabel, statusTone } from './status.js';
import { methodTone, toneToken } from './tone.js';

describe('statusTone', () => {
  it('colours by response class', () => {
    expect(statusTone('200')).toBe('success');
    expect(statusTone('301')).toBe('info');
    expect(statusTone('404')).toBe('warning');
    expect(statusTone('500')).toBe('danger');
  });

  it('handles OpenAPI wildcard statuses', () => {
    // `4XX` means "any 4xx"; it must land in the same class as a concrete 4xx code.
    expect(statusTone('4XX')).toBe(statusTone('400'));
    expect(statusTone('5xx')).toBe(statusTone('500'));
    expect(statusTone('2XX')).toBe('success');
  });

  it('treats `default` as neutral rather than guessing', () => {
    expect(statusTone('default')).toBe('neutral');
    expect(statusTone('Default')).toBe('neutral');
  });

  it('falls back to neutral for anything unparseable', () => {
    expect(statusTone('')).toBe('neutral');
    expect(statusTone('banana')).toBe('neutral');
    expect(statusTone('999')).toBe('neutral');
  });
});

describe('statusLabel', () => {
  it('names well-known codes', () => {
    expect(statusLabel('404')).toBe('404 Not Found');
    expect(statusLabel('204')).toBe('204 No Content');
  });

  it('returns the code unchanged when it has no well-known name', () => {
    expect(statusLabel('418')).toBe('418');
    expect(statusLabel('4XX')).toBe('4XX');
  });

  it('spells out `default`', () => {
    expect(statusLabel('default')).toBe('Default response');
  });
});

describe('tone tokens', () => {
  it('routes methods and actions to their own token families', () => {
    expect(toneToken('get')).toBe('method-get');
    expect(toneToken('delete')).toBe('method-delete');
    expect(toneToken('receive')).toBe('action-receive');
    expect(toneToken('rpc')).toBe('action-rpc');
  });

  it('leaves semantic tones as they are', () => {
    expect(toneToken('success')).toBe('success');
    expect(toneToken('accent')).toBe('accent');
  });
});

describe('methodTone', () => {
  it('is case- and whitespace-insensitive', () => {
    expect(methodTone('GET')).toBe('get');
    expect(methodTone(' post ')).toBe('post');
  });

  it('falls back to neutral for a non-standard method', () => {
    // Some specs describe custom verbs; they should render, just without a colour claim.
    expect(methodTone('PURGE')).toBe('neutral');
  });
});
