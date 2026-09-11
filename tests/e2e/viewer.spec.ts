import { expect, test } from '@playwright/test';
import { VSCODE_THEME_FIXTURE } from '../../packages/viewer/src/vscode-theme-fixture.js';
import { expectCompleteTestIdCoverage } from './coverage.js';

test('opens the first document and canonicalizes the empty route', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('openapi-document')).toBeVisible();
  await expect(page).toHaveURL(/#\/petstore$/);
  await expect(page.getByTestId('viewer-document-petstore')).toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('sidebar is a content-height card, not a full-height rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/petstore');

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Playwright did not expose the configured viewport.');
  const sidebar = await page.getByTestId('viewer-layout-sidebar').boundingBox();
  if (!sidebar) throw new Error('viewer-layout-sidebar is not visible.');

  // The old layout stretched the sidebar to fill the viewport; the card now stops at its
  // own content height, floating with a margin off the top edge and short of the bottom.
  expect(sidebar.y).toBeGreaterThan(0);
  expect(sidebar.height).toBeLessThan(viewport.height);

  await expect(page.getByTestId('viewer-layout-right-rail')).toHaveCount(0);
});

test('switches documents through stable navigation hooks', async ({ page }) => {
  await page.goto('/#/petstore');
  await page.getByTestId('viewer-document-streetlights').click();
  await expect(page.getByTestId('asyncapi-document')).toBeVisible();
  await expect(page).toHaveURL(/#\/streetlights$/);

  await page.getByTestId('viewer-document-wallet').click();
  await expect(page.getByTestId('jsonrpc-document')).toBeVisible();
  await expect(page.getByTestId('viewer-document-wallet')).toHaveAttribute('aria-current', 'true');
});

test('filters and clears the section navigation', async ({ page }) => {
  await page.goto('/#/petstore');
  const input = page.getByTestId('viewer-search-input');

  await input.fill('inventory');
  await expect(page.getByTestId('viewer-nav-getinventory')).toBeVisible();
  await expect(page.getByTestId('viewer-nav-listpets')).toHaveCount(0);

  await page.getByTestId('viewer-search-clear').click();
  await expect(input).toHaveValue('');
  await expect(page.getByTestId('viewer-nav-listpets')).toBeVisible();
  await expectCompleteTestIdCoverage(page);
});

test('clears a navigation filter with Escape', async ({ page }) => {
  await page.goto('/#/petstore');
  const input = page.getByTestId('viewer-search-input');
  await input.fill('inventory');
  await input.press('Escape');

  await expect(input).toHaveValue('');
  await expect(page.getByTestId('viewer-nav-listpets')).toBeVisible();
});

test('changes the standalone viewer theme', async ({ page }) => {
  await page.goto('/#/petstore');
  const toggle = page.getByTestId('viewer-theme-toggle');

  await expect(toggle).toHaveText('Light theme');
  await toggle.click();
  await expect(toggle).toHaveText('Dark theme');
  await expect
    .poll(() =>
      page
        .getByTestId('viewer-theme-control')
        .evaluate((element) => element.ownerDocument.documentElement.dataset.apiboxTheme),
    )
    .toBe('light');
});

test('inherits native VS Code roles and high-contrast selection treatment', async ({ page }) => {
  await page.addInitScript((variables) => {
    document.addEventListener('DOMContentLoaded', () => {
      for (const [name, value] of Object.entries(variables)) {
        document.documentElement.style.setProperty(name, value);
      }
    });
  }, VSCODE_THEME_FIXTURE);
  await page.goto('/#/petstore');

  const inherited = await page.evaluate(() => {
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolveColour = (token: string) => {
      probe.style.color = `var(${token})`;
      return getComputedStyle(probe).color;
    };
    const resolved = {
      foreground: resolveColour('--apibox-fg'),
      icon: resolveColour('--apibox-fg-icon'),
      toolbarHover: resolveColour('--apibox-bg-toolbar-hover'),
      widgetBorder: resolveColour('--apibox-border-strong'),
      warning: resolveColour('--apibox-warning'),
      danger: resolveColour('--apibox-danger'),
      info: resolveColour('--apibox-info'),
    };
    probe.remove();
    return resolved;
  });
  expect(inherited).toEqual({
    foreground: 'rgb(18, 52, 86)',
    icon: 'rgb(171, 205, 239)',
    toolbarHover: 'rgb(16, 32, 48)',
    widgetBorder: 'rgb(69, 103, 137)',
    warning: 'rgb(118, 84, 50)',
    danger: 'rgb(135, 101, 67)',
    info: 'rgb(86, 120, 144)',
  });

  const activeNavigation = page.getByTestId('viewer-nav-listpets');
  await activeNavigation.click();
  await expect(activeNavigation).toHaveCSS('outline-style', 'dashed');
  await expect(activeNavigation).toHaveCSS('outline-color', 'rgb(243, 133, 24)');
});

test('navigates to a document section with a deep link', async ({ page }) => {
  await page.goto('/#/petstore');
  await page.getByTestId('viewer-nav-listpets').click();

  await expect(page).toHaveURL(/#\/petstore\/listpets$/);
  await expect(page.getByTestId('openapi-document-operation-listpets')).toBeVisible();
});

test('shows loading and manifest failure states with complete hooks', async ({ page }) => {
  await page.route('**/data/manifest.json', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({ contentType: 'application/json', body: '{"invalid":true}' });
  });
  const navigation = page.goto('/');
  await expect(page.getByTestId('viewer-loading')).toBeVisible();
  await navigation;
  await expect(page.getByTestId('viewer-error')).toBeVisible();
  await expectCompleteTestIdCoverage(page);
});

test('items render collapsed on first paint', async ({ page }) => {
  await page.goto('/#/petstore');

  const toggle = page.getByTestId('openapi-document-operation-listpets-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByTestId('openapi-document-operation-listpets-content')).toBeHidden();
});

test('expands an item on header click, leaving the rest collapsed', async ({ page }) => {
  await page.goto('/#/petstore');

  await page.getByTestId('openapi-document-operation-listpets-toggle').click();
  await expect(page.getByTestId('openapi-document-operation-listpets-toggle')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByTestId('openapi-document-operation-listpets-content')).toBeVisible();

  // Independent toggling, not an accordion: opening one card leaves every other as it was.
  await expect(page.getByTestId('openapi-document-operation-createpet-toggle')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(page.getByTestId('openapi-document-operation-createpet-content')).toBeHidden();
});

test('expands the target item when reached through the sidebar', async ({ page }) => {
  await page.goto('/#/petstore');

  await page.getByTestId('viewer-nav-listpets').click();

  await expect(page).toHaveURL(/#\/petstore\/listpets$/);
  await expect(page.getByTestId('openapi-document-operation-listpets-toggle')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByTestId('openapi-document-operation-listpets-content')).toBeVisible();
});

test('expands the target item on a fresh deep-link load', async ({ page }) => {
  // A real navigation to a URL with a section already in the hash, not a client-side route
  // change after the page has settled — this is the case most likely to race the router
  // against the card mounting for the first time.
  await page.goto('/#/petstore/listpets');

  await expect(page.getByTestId('openapi-document-operation-listpets-toggle')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByTestId('openapi-document-operation-listpets-content')).toBeVisible();
});

test('scroll-spy reaches the final section once every card is collapsed', async ({ page }) => {
  await page.goto('/#/petstore');

  // Collapsing every item by default makes the document barely taller than the viewport, so
  // scroll position can no longer separate the middle sections from one another: at 1280x720
  // the Petstore fixture's whole operation list lives inside the last few hundred pixels and
  // an item like `createpet` would need more scroll room than the document has. What must
  // still hold is the end of the range — before the tracker read live geometry, the final
  // section could never become current at all, because a short document ran out of room
  // before anything crossed the old `-70%` threshold band.
  // Wait for the document to render before scrolling: scrolling an empty page goes nowhere,
  // and the tracker would then correctly report no current section.
  await expect(page.getByTestId('openapi-document')).toBeVisible();
  await expect(page.getByTestId('viewer-nav-schema-error')).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  // The final navigable section is the last schema entry, not the `schemas` heading above it.
  await expect(page.getByTestId('viewer-nav-schema-error')).toHaveAttribute('aria-current', 'true');

  // And scrolling back to the top releases it again rather than latching.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByTestId('viewer-nav-schema-error')).not.toHaveAttribute(
    'aria-current',
    'true',
  );
});

test('shows a document validation failure', async ({ page }) => {
  await page.route('**/data/petstore.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"id":"petstore"}' }),
  );
  await page.goto('/#/petstore');

  await expect(page.getByTestId('viewer-error')).toContainText(
    'not a valid normalized API document',
  );
});
