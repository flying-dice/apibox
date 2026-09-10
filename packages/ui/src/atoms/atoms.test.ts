import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { text } from '../test-utils.js';
import Button from './Button.svelte';
import Chip from './Chip.svelte';
import HttpMethod from './HttpMethod.svelte';
import Icon from './Icon.svelte';
import Link from './Link.svelte';
import Spinner from './Spinner.svelte';
import StatusCode from './StatusCode.svelte';

describe('HttpMethod', () => {
  it('renders the method uppercased with its tone', () => {
    render(HttpMethod, { method: 'get' });
    const badge = screen.getByTestId('http-method-get');
    expect(badge).toHaveTextContent('GET');
    expect(badge).toHaveAttribute('data-tone', 'get');
  });

  it('marks a deprecated method in its tooltip, not only visually', () => {
    // Strikethrough alone is invisible to a screen reader.
    render(HttpMethod, { method: 'delete', deprecated: true });
    expect(screen.getByTestId('http-method-delete')).toHaveAttribute(
      'title',
      'DELETE (deprecated)',
    );
  });

  it('renders an unrecognised method neutrally rather than dropping it', () => {
    render(HttpMethod, { method: 'PURGE' });
    const badge = screen.getByTestId('http-method-purge');
    expect(badge).toHaveTextContent('PURGE');
    expect(badge).toHaveAttribute('data-tone', 'neutral');
  });
});

describe('StatusCode', () => {
  it('renders the code with a descriptive tooltip', () => {
    render(StatusCode, { status: '404' });
    const badge = screen.getByTestId('status-404');
    expect(badge).toHaveTextContent('404');
    expect(badge).toHaveAttribute('title', '404 Not Found');
  });

  it('renders a wildcard status', () => {
    render(StatusCode, { status: '4XX' });
    expect(screen.getByTestId('status-4xx')).toHaveTextContent('4XX');
  });
});

describe('Chip', () => {
  it('renders a label and value pair', () => {
    render(Chip, { label: 'min length', value: '1' });
    const chip = screen.getByTestId('chip-min-length');
    expect(chip).toHaveTextContent('min length');
    expect(chip).toHaveTextContent('1');
  });
});

describe('Icon', () => {
  it('is hidden from assistive technology when purely decorative', () => {
    render(Icon, { name: 'search' });
    expect(screen.getByTestId('icon-search')).toHaveAttribute('aria-hidden', 'true');
  });

  it('becomes an image with a name when given a label', () => {
    render(Icon, { name: 'warning', label: 'Warning' });
    const icon = screen.getByTestId('icon-warning');
    expect(icon).toHaveAttribute('role', 'img');
    expect(icon).toHaveAttribute('aria-label', 'Warning');
    expect(icon).not.toHaveAttribute('aria-hidden');
  });
});

describe('Link', () => {
  it('opens an external link safely and marks it', () => {
    // Inside a webview a link that leaves the editor should say so before it is clicked.
    render(Link, { href: 'https://example.com', testId: 'external-link', children: text('Spec') });
    const link = screen.getByTestId('external-link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    expect(screen.getByTestId('external-link-external-marker')).toBeInTheDocument();
  });

  it('leaves an in-document link alone', () => {
    render(Link, { href: '#/pets/listPets', testId: 'internal-link', children: text('List pets') });
    const link = screen.getByTestId('internal-link');
    expect(link).not.toHaveAttribute('target');
    expect(screen.queryByTestId('internal-link-external-marker')).not.toBeInTheDocument();
  });
});

describe('Button', () => {
  it('calls its handler when clicked', async () => {
    const onclick = vi.fn();
    render(Button, { onclick, testId: 'copy', children: text('Copy') });

    await userEvent.click(screen.getByTestId('copy'));
    expect(onclick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', async () => {
    const onclick = vi.fn();
    render(Button, { onclick, disabled: true, testId: 'copy', children: text('Copy') });

    await userEvent.click(screen.getByTestId('copy'));
    expect(onclick).not.toHaveBeenCalled();
  });

  it('exposes its pressed state for toggle buttons', () => {
    render(Button, { pressed: true, testId: 'toggle', children: text('Expand') });
    expect(screen.getByTestId('toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  it('takes an accessible name when it has only an icon', () => {
    render(Button, { label: 'Copy to clipboard', testId: 'copy', children: text('') });
    expect(screen.getByTestId('copy')).toHaveAccessibleName('Copy to clipboard');
  });
});

describe('Spinner', () => {
  it('announces itself as a status with a name', () => {
    render(Spinner);
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveAttribute('role', 'status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });
});
