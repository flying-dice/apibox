import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { expectCompleteTestIdCoverage } from './coverage.js';

const examples = resolve(import.meta.dirname, '../../examples');

test.use({ serviceWorkers: 'allow' });

test('creates a workspace, imports every format and restores it after refresh', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('workspace-new-button').click();
  await page.getByTestId('workspace-name-input').fill('Client APIs');
  await page.getByTestId('workspace-create-submit').click();
  await expect(page.getByTestId('workspace-current-name')).toHaveText('Client APIs');
  await expect(page.getByTestId('viewer-empty-workspace')).toBeVisible();

  await page
    .getByTestId('workspace-file-input')
    .setInputFiles([
      resolve(examples, 'petstore.yaml'),
      resolve(examples, 'streetlights.asyncapi.yaml'),
      resolve(examples, 'wallet.openrpc.json'),
    ]);
  await expect(page.getByTestId('workspace-notice')).toHaveText('Imported 3 files.');
  await expect(page.getByTestId('openapi-document')).toBeVisible();

  await page.getByTestId('viewer-document-streetlights').click();
  await expect(page.getByTestId('asyncapi-document')).toBeVisible();
  await page.reload();

  await expect(page.getByTestId('workspace-current-name')).toHaveText('Client APIs');
  await expect(page.getByTestId('asyncapi-document')).toBeVisible();
  await page.getByTestId('workspace-switcher-button').click();
  await page.getByTestId('workspace-manage-open').click();
  await expect(page.getByTestId('workspace-file-list')).toBeVisible();
  await expect(page.getByTestId('workspace-file-list').getByRole('listitem')).toHaveCount(3);
  await expectCompleteTestIdCoverage(page);
});

test('keeps valid imports when another selected file is invalid', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('workspace-file-input').setInputFiles([
    {
      name: 'catalog.openapi.yaml',
      mimeType: 'application/yaml',
      buffer: Buffer.from(`openapi: 3.1.0
info:
  title: Catalog API
  version: 1.0.0
paths: {}
`),
    },
    {
      name: 'notes.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"not":"an api description"}'),
    },
  ]);

  await expect(page.getByTestId('openapi-document')).toBeVisible();
  await expect(page.getByTestId('workspace-error')).toContainText('Imported 1 file(s).');
  await expect(page.getByTestId('workspace-error')).toContainText('notes.json');
  await expect(page.getByTestId('workspace-current-name')).toHaveText('My workspace');
});

test('requires confirmation before deleting a workspace and returns to examples', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('workspace-new-button').click();
  await page.getByTestId('workspace-name-input').fill('Disposable');
  await page.getByTestId('workspace-create-submit').click();
  await page.getByTestId('workspace-switcher-button').click();
  await page.getByTestId('workspace-manage-open').click();

  const card = page.getByTestId(/^workspace-card-/).filter({ hasText: 'Disposable' });
  await card.getByTestId(/^workspace-card-.*-delete$/).click();
  await expect(card.getByText('Delete?')).toBeVisible();
  await card.getByTestId(/^workspace-card-.*-delete-confirm$/).click();

  await expect(page.getByTestId('workspace-current-name')).toHaveText('APIBox browser tests');
  await expect(page.getByTestId('openapi-document')).toBeVisible();
  await expect(page.getByTestId('workspace-notice')).toContainText('Deleted Disposable');
});

test('publishes an installable app manifest and offline worker', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: 'APIBox Workspace',
    display: 'standalone',
    start_url: './',
  });

  const workerResponse = await request.get('/service-worker.js');
  expect(workerResponse.ok()).toBe(true);
  await expect(workerResponse.text()).resolves.toContain("CACHE_NAME = 'apibox-shell-v1'");
  expect((await request.get('/.vite/manifest.json')).ok()).toBe(true);
});

test('reopens the bundled workspace offline after installation', async ({ page, context }) => {
  await page.goto('/#/petstore');
  await expect(page.getByTestId('openapi-document')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('workspace-current-name')).toHaveText('APIBox browser tests');
  await expect(page.getByTestId('openapi-document')).toBeVisible();
});
