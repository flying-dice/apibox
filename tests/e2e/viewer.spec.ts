import { expect, test } from '@playwright/test';
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

test('shows a document validation failure', async ({ page }) => {
  await page.route('**/data/petstore.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"id":"petstore"}' }),
  );
  await page.goto('/#/petstore');

  await expect(page.getByTestId('viewer-error')).toContainText(
    'not a valid normalized API document',
  );
});
