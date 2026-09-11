import type { SchemaNode } from '@apibox/core';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { text } from '../test-utils.js';
import CodeBlock from './CodeBlock.svelte';
import CollapsibleCard from './CollapsibleCard.svelte';
import KeyValueRow from './KeyValueRow.svelte';
import NavItem from './NavItem.svelte';
import PropertyRow from './PropertyRow.svelte';
import SchemaTypeLabel from './SchemaTypeLabel.svelte';
import SearchInput from './SearchInput.svelte';
import TabBar from './TabBar.svelte';

describe('CodeBlock', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders the code verbatim', () => {
    render(CodeBlock, { code: '{\n  "a": 1\n}', language: 'json' });
    expect(screen.getByTestId('code-block-content')).toHaveTextContent('"a": 1');
  });

  it('copies to the clipboard and confirms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(CodeBlock, { code: 'hello' });
    await userEvent.click(screen.getByTestId('code-block-copy'));

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(screen.getByTestId('code-block-copy-state')).toHaveTextContent('Copied');
  });

  it('says so when the clipboard is unavailable rather than appearing to succeed', async () => {
    // A restrictive webview policy or an insecure origin can deny clipboard access.
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    render(CodeBlock, { code: 'hello' });
    await userEvent.click(screen.getByTestId('code-block-copy'));

    expect(screen.getByTestId('code-block-copy-state')).toHaveTextContent('Failed');
  });

  it('collapses a long block and expands on request', async () => {
    const code = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    render(CodeBlock, { code, maxLines: 5 });

    expect(screen.getByTestId('code-block-content')).not.toHaveTextContent('line 19');
    expect(screen.getByTestId('code-block-toggle')).toHaveTextContent('Show all 20 lines');

    await userEvent.click(screen.getByTestId('code-block-toggle'));
    expect(screen.getByTestId('code-block-content')).toHaveTextContent('line 19');
  });

  it('does not offer to collapse a block that fits', () => {
    render(CodeBlock, { code: 'one\ntwo', maxLines: 5 });
    expect(screen.queryByTestId('code-block-toggle')).not.toBeInTheDocument();
  });

  it('collapses again when the payload changes', async () => {
    // A renderer switching media types reuses this instance; the next example must not
    // arrive expanded merely because the previous one was.
    const long = (tag: string) => Array.from({ length: 20 }, (_, i) => `${tag} ${i}`).join('\n');
    const { rerender } = render(CodeBlock, { code: long('json'), maxLines: 5 });

    await userEvent.click(screen.getByTestId('code-block-toggle'));
    expect(screen.getByTestId('code-block-content')).toHaveTextContent('json 19');

    await rerender({ code: long('xml'), maxLines: 5 });
    expect(screen.getByTestId('code-block-content')).not.toHaveTextContent('xml 19');
  });

  it('announces a copy failure rather than only showing it', async () => {
    // A changed button label is not announced on its own; a live region is what tells a
    // screen-reader user that nothing was copied.
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    render(CodeBlock, { code: 'hello' });
    await userEvent.click(screen.getByTestId('code-block-copy'));

    const announcement = screen.getByTestId('code-block-copy-announcement');
    expect(announcement).toHaveAttribute('role', 'status');
    expect(announcement).toHaveTextContent(/could not copy/i);
    expect(screen.getByTestId('code-block-copy')).toHaveAccessibleName(/failed/i);
  });

  it('announces a successful copy', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });

    render(CodeBlock, { code: 'hello' });
    await userEvent.click(screen.getByTestId('code-block-copy'));

    expect(screen.getByTestId('code-block-copy-announcement')).toHaveTextContent(
      /copied to clipboard/i,
    );
  });
});

describe('SchemaTypeLabel', () => {
  it('labels a plain type', () => {
    render(SchemaTypeLabel, { schema: { types: ['string'] } satisfies SchemaNode });
    expect(screen.getByTestId('schema-type')).toHaveTextContent('string');
  });

  it('calls out an unresolved reference rather than showing an empty type', () => {
    // The reader must be able to tell "accepts anything" from "we could not follow this".
    render(SchemaTypeLabel, {
      schema: { types: [], unresolvedRef: 'https://example.invalid/x.yaml', refName: 'x.yaml' },
    });
    expect(screen.getByTestId('schema-type-unresolved')).toBeInTheDocument();
  });

  it('marks a recursive reference', () => {
    render(SchemaTypeLabel, { schema: { types: ['object'], circularRef: 'Pet', refName: 'Pet' } });
    expect(screen.getByTestId('schema-type-circular')).toHaveTextContent('recursive');
  });
});

describe('PropertyRow', () => {
  it('shows name, type and requiredness', () => {
    render(PropertyRow, {
      schema: { name: 'id', types: ['string'], required: true } satisfies SchemaNode,
    });
    expect(screen.getByTestId('property-id-name')).toHaveTextContent('id');
    expect(screen.getByTestId('property-id-type')).toHaveTextContent('string');
    expect(screen.getByTestId('property-id-required')).toBeInTheDocument();
  });

  it('omits the required marker when the property is optional', () => {
    render(PropertyRow, { schema: { name: 'tag', types: ['string'], required: false } });
    expect(screen.queryByTestId('property-tag-required')).not.toBeInTheDocument();
  });

  it('renders constraints, default and enum values', () => {
    render(PropertyRow, {
      schema: {
        name: 'status',
        types: ['string'],
        constraints: [{ label: 'min length', value: '1' }],
        default: 'available',
        enum: ['available', 'sold'],
      } satisfies SchemaNode,
    });

    expect(screen.getByTestId('property-status-constraint-min-length')).toHaveTextContent('1');
    expect(screen.getByTestId('property-status-default')).toHaveTextContent('"available"');
    expect(screen.getByTestId('property-status-enum-0')).toHaveTextContent('"available"');
    expect(screen.getByTestId('property-status-enum-1')).toHaveTextContent('"sold"');
  });

  it('renders duplicate constraint labels without aborting', () => {
    render(PropertyRow, {
      schema: {
        name: 'value',
        types: ['number'],
        constraints: [
          { label: 'minimum', value: '0' },
          { label: 'minimum', value: 'exclusive' },
        ],
      } satisfies SchemaNode,
    });

    expect(screen.getAllByTestId('property-value-constraint-minimum')).toHaveLength(2);
  });

  it('labels the enum as the permitted set rather than loose literals', () => {
    render(PropertyRow, { schema: { name: 'status', types: ['string'], enum: ['a', 'b'] } });

    const group = screen.getByTestId('property-status-enum');
    expect(group).toHaveAttribute('role', 'group');
    expect(group).toHaveAccessibleName('Permitted values');
    expect(group).toHaveTextContent('enum');
  });

  it('renders non-string enum and default values faithfully', () => {
    // Enums are not always strings: nulls, numbers and booleans all appear in real specs.
    render(PropertyRow, {
      schema: { name: 'value', types: ['integer'], enum: [1, null, true, 'x'], default: null },
    });

    expect(screen.getByTestId('property-value-enum-0')).toHaveTextContent('1');
    expect(screen.getByTestId('property-value-enum-1')).toHaveTextContent('null');
    expect(screen.getByTestId('property-value-enum-2')).toHaveTextContent('true');
    expect(screen.getByTestId('property-value-enum-3')).toHaveTextContent('"x"');
    // `null` as a default is meaningfully different from having no default.
    expect(screen.getByTestId('property-value-default')).toHaveTextContent('null');
  });

  it('omits the enum group entirely when there is no enum', () => {
    render(PropertyRow, { schema: { name: 'free', types: ['string'] } });
    expect(screen.queryByTestId('property-free-enum')).not.toBeInTheDocument();
  });

  it('marks read-only, write-only and deprecated properties', () => {
    render(PropertyRow, {
      schema: { name: 'id', types: ['string'], readOnly: true, deprecated: true },
    });
    expect(screen.getByTestId('property-id-readonly')).toBeInTheDocument();
    expect(screen.getByTestId('property-id-deprecated')).toBeInTheDocument();
    expect(screen.queryByTestId('property-id-writeonly')).not.toBeInTheDocument();
  });

  it('omits the xml chip entirely when the schema declared no xml keyword', () => {
    render(PropertyRow, { schema: { name: 'id', types: ['string'] } });
    expect(screen.queryByTestId('property-id-xml')).not.toBeInTheDocument();
  });

  it('summarises the xml keyword as a single chip', () => {
    render(PropertyRow, {
      schema: {
        name: 'id',
        types: ['string'],
        xml: { attribute: true },
      } satisfies SchemaNode,
    });
    expect(screen.getByTestId('property-id-xml')).toHaveTextContent('attribute');
  });

  it('names the element in the xml chip when the document declared one', () => {
    render(PropertyRow, {
      schema: {
        name: 'tags',
        types: ['array'],
        xml: { name: 'tag', wrapped: true },
      } satisfies SchemaNode,
    });
    expect(screen.getByTestId('property-tags-xml')).toHaveTextContent('tag');
    expect(screen.getByTestId('property-tags-xml')).toHaveTextContent('wrapped');
  });
});

describe('TabBar', () => {
  const tabs = [
    { id: 'json', label: 'application/json' },
    { id: 'xml', label: 'application/xml' },
    { id: 'text', label: 'text/plain' },
  ];

  it('marks the selected tab and only that tab is reachable by Tab key', () => {
    render(TabBar, { tabs, selected: 'xml', label: 'Media type', onselect: vi.fn() });

    expect(screen.getByTestId('tab-bar-tab-xml')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('tab-bar-tab-xml')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('tab-bar-tab-json')).toHaveAttribute('tabindex', '-1');
  });

  it('selects on click', async () => {
    const onselect = vi.fn();
    render(TabBar, { tabs, selected: 'json', label: 'Media type', onselect });

    await userEvent.click(screen.getByTestId('tab-bar-tab-xml'));
    expect(onselect).toHaveBeenCalledWith('xml');
  });

  it('moves between tabs with the arrow keys', async () => {
    const onselect = vi.fn();
    render(TabBar, { tabs, selected: 'json', label: 'Media type', onselect });

    screen.getByTestId('tab-bar-tab-json').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(onselect).toHaveBeenCalledWith('xml');
  });

  it('moves focus as well as selection, so the keyboard user is not stranded', async () => {
    // With a roving tabindex, leaving focus on the old tab parks it on a `tabindex="-1"`
    // element and the next arrow key goes nowhere.
    const onselect = vi.fn();
    render(TabBar, { tabs, selected: 'json', label: 'Media type', onselect });

    screen.getByTestId('tab-bar-tab-json').focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(screen.getByTestId('tab-bar-tab-xml'));
  });

  it('points each tab at the panel it controls', () => {
    // Without `aria-controls` assistive technology cannot connect a tab to what it reveals.
    render(TabBar, {
      tabs,
      selected: 'json',
      label: 'Media type',
      panelId: 'body-panel',
      onselect: vi.fn(),
    });

    expect(screen.getByTestId('tab-bar-tab-json')).toHaveAttribute('aria-controls', 'body-panel');
    // The id is stable, so a panel can name itself with `aria-labelledby`.
    expect(screen.getByTestId('tab-bar-tab-json')).toHaveAttribute('id', 'tab-bar-tab-json');
  });

  it('wraps at the ends so the strip has no dead ends', async () => {
    const onselect = vi.fn();
    render(TabBar, { tabs, selected: 'json', label: 'Media type', onselect });

    screen.getByTestId('tab-bar-tab-json').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onselect).toHaveBeenCalledWith('text');
  });

  it('jumps to the ends with Home and End', async () => {
    const onselect = vi.fn();
    render(TabBar, { tabs, selected: 'xml', label: 'Media type', onselect });

    screen.getByTestId('tab-bar-tab-xml').focus();
    await userEvent.keyboard('{End}');
    expect(onselect).toHaveBeenCalledWith('text');
  });
});

describe('SearchInput', () => {
  it('reports each keystroke', async () => {
    const onchange = vi.fn();
    render(SearchInput, { value: '', onchange });

    await userEvent.type(screen.getByTestId('search-input'), 'p');
    expect(onchange).toHaveBeenCalledWith('p');
  });

  it('clears on Escape, so a filtered sidebar is one key from whole again', async () => {
    const onchange = vi.fn();
    render(SearchInput, { value: 'pets', onchange });

    screen.getByTestId('search-input').focus();
    await userEvent.keyboard('{Escape}');
    expect(onchange).toHaveBeenCalledWith('');
  });

  it('offers a clear button only when there is something to clear', () => {
    const { unmount } = render(SearchInput, { value: '', onchange: vi.fn() });
    expect(screen.queryByTestId('search-clear')).not.toBeInTheDocument();
    unmount();

    render(SearchInput, { value: 'pets', onchange: vi.fn() });
    expect(screen.getByTestId('search-clear')).toBeInTheDocument();
  });
});

describe('NavItem', () => {
  it('is a real link so deep links and open-in-new-tab work', () => {
    render(NavItem, { href: '#/pets/listPets', label: 'List pets', testId: 'nav-listpets' });
    expect(screen.getByTestId('nav-listpets')).toHaveAttribute('href', '#/pets/listPets');
  });

  it('marks the current item for assistive technology, not just visually', () => {
    render(NavItem, { href: '#/a', label: 'A', current: true, testId: 'nav-a' });
    expect(screen.getByTestId('nav-a')).toHaveAttribute('aria-current', 'true');
  });

  it('notifies on a plain click', async () => {
    const onnavigate = vi.fn();
    render(NavItem, { href: '#/a', label: 'A', testId: 'nav-a', onnavigate });

    const link = screen.getByTestId('nav-a');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(onnavigate).toHaveBeenCalledWith('#/a');
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves a modified click to the browser', async () => {
    // Otherwise ctrl-click would be hijacked and open-in-new-tab would break.
    // One `setup()` session throughout: modifier state does not carry across the
    // convenience API's implicit sessions.
    const user = userEvent.setup();
    const onnavigate = vi.fn();
    render(NavItem, { href: '#/a', label: 'A', testId: 'nav-a', onnavigate });

    await user.keyboard('{Meta>}');
    await user.click(screen.getByTestId('nav-a'));
    await user.keyboard('{/Meta}');
    expect(onnavigate).not.toHaveBeenCalled();
  });

  it.each([
    ['Control', 'opens a new tab'],
    ['Shift', 'opens a new window'],
    ['Alt', 'downloads the target'],
  ])('leaves a %s-click to the browser, which %s', async (modifier) => {
    const user = userEvent.setup();
    const onnavigate = vi.fn();
    render(NavItem, { href: '#/a', label: 'A', testId: 'nav-a', onnavigate });

    await user.keyboard(`{${modifier}>}`);
    await user.click(screen.getByTestId('nav-a'));
    await user.keyboard(`{/${modifier}}`);
    expect(onnavigate).not.toHaveBeenCalled();
  });

  it('renders a method badge when given one', () => {
    render(NavItem, {
      href: '#/a',
      label: 'List pets',
      badge: 'GET',
      badgeTone: 'get',
      testId: 'nav-a',
    });
    expect(screen.getByTestId('nav-a-badge')).toHaveTextContent('GET');
  });
});

describe('KeyValueRow', () => {
  it('renders a labelled value', () => {
    render(KeyValueRow, { label: 'Version', children: text('1.4.0') });
    const row = screen.getByTestId('kv-version');
    expect(row).toHaveTextContent('Version');
    expect(row).toHaveTextContent('1.4.0');
  });
});

describe('CollapsibleCard', () => {
  it('renders collapsed by default', () => {
    render(CollapsibleCard, {
      id: 'item-1',
      testId: 'item',
      summary: text('Item one'),
      children: text('Body'),
    });

    expect(screen.getByTestId('item-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('item-content')).toHaveAttribute('hidden', 'until-found');
  });

  it('expands on a header click, without affecting a second instance', async () => {
    render(CollapsibleCard, {
      id: 'item-1',
      testId: 'item-one',
      summary: text('Item one'),
      children: text('Body one'),
    });
    render(CollapsibleCard, {
      id: 'item-2',
      testId: 'item-two',
      summary: text('Item two'),
      children: text('Body two'),
    });

    await userEvent.click(screen.getByTestId('item-one-toggle'));

    expect(screen.getByTestId('item-one-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('item-one-content')).not.toHaveAttribute('hidden');
    // Independent toggling, not an accordion: the second card is untouched.
    expect(screen.getByTestId('item-two-toggle')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('item-two-content')).toHaveAttribute('hidden', 'until-found');
  });

  it('collapses again on a second click', async () => {
    render(CollapsibleCard, {
      id: 'item-1',
      testId: 'item',
      summary: text('Item'),
      children: text('Body'),
    });

    const toggle = screen.getByTestId('item-toggle');
    await userEvent.click(toggle);
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('item-content')).toHaveAttribute('hidden', 'until-found');
  });

  it('points the toggle at the region it controls', () => {
    render(CollapsibleCard, {
      id: 'item-1',
      testId: 'item',
      summary: text('Item'),
      children: text('Body'),
    });

    expect(screen.getByTestId('item-toggle')).toHaveAttribute('aria-controls', 'item-content');
    expect(screen.getByTestId('item-content')).toHaveAttribute('id', 'item-content');
  });

  it('expands when navigation or a deep link reveals it, without a click', async () => {
    render(CollapsibleCard, {
      id: 'item-1',
      testId: 'item',
      summary: text('Item'),
      children: text('Body'),
    });

    // `section-tracker.ts` dispatches this at the target id before it scrolls to it, so a
    // sidebar click or a deep link on first load opens the card rather than scrolling to a
    // closed one.
    document.getElementById('item-1')?.dispatchEvent(new CustomEvent('apibox-reveal'));
    await tick();

    expect(screen.getByTestId('item-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('item-content')).not.toHaveAttribute('hidden');
  });

  it('expands when a browser find-in-page match lands inside it', async () => {
    render(CollapsibleCard, {
      id: 'item-1',
      testId: 'item',
      summary: text('Item'),
      children: text('Body'),
    });

    // Chrome fires `beforematch` on the hidden element itself; the card must open rather
    // than leave the match sitting inside a still-collapsed region.
    screen.getByTestId('item-content').dispatchEvent(new Event('beforematch'));
    await tick();

    expect(screen.getByTestId('item-toggle')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('item-content')).not.toHaveAttribute('hidden');
  });
});
