import { expect, test } from '@playwright/test';
import { expectCompleteTestIdCoverage } from './coverage.js';

test('renders and operates the complete OpenAPI surface', async ({ page }) => {
  await page.goto('/#/petstore');

  await expect(page.getByTestId('openapi-document-header-title')).toHaveText('Petstore');
  await expect(page.getByTestId('openapi-document-servers-0-url')).toBeVisible();
  await expect(page.getByTestId('openapi-document-security-0')).toBeVisible();
  await expect(page.getByTestId('openapi-document-operation-listpets-method')).toHaveText('GET');
  // Cards render collapsed by default; open the ones this test inspects the body of.
  await page.getByTestId('openapi-document-operation-listpets-toggle').click();
  await expect(
    page.getByTestId('openapi-document-operation-listpets-parameters-query-0'),
  ).toBeVisible();
  await page.getByTestId('openapi-document-operation-createpet-toggle').click();
  await expect(page.getByTestId('openapi-document-operation-createpet-request')).toBeVisible();
  await expect(page.getByTestId('openapi-document-operation-listpets-responses-0')).toBeVisible();
  await page.getByTestId('openapi-document-schemas-0-toggle').click();
  await expect(page.getByTestId('openapi-document-schemas-0-viewer')).toBeVisible();

  const schemaToggle = page.getByTestId('openapi-document-schemas-0-viewer-expand-all');
  await schemaToggle.click();
  await expect(schemaToggle).toContainText('Collapse all');

  const copy = page.getByTestId(
    'openapi-document-operation-listpets-responses-0-media-examples-code-copy',
  );
  await copy.click();
  await expect(
    page.getByTestId(
      'openapi-document-operation-listpets-responses-0-media-examples-code-copy-state',
    ),
  ).toHaveText('Copied');
  await expectCompleteTestIdCoverage(page);
});

test('renders the complete AsyncAPI surface', async ({ page }) => {
  await page.goto('/#/streetlights');

  await expect(page.getByTestId('asyncapi-document-header-title')).toHaveText('Streetlights');
  await expect(page.getByTestId('asyncapi-document-action-receive')).toBeVisible();
  await expect(page.getByTestId('asyncapi-document-action-send')).toBeVisible();
  await expect(
    page.getByTestId('asyncapi-document-operation-receivelightmeasurement-address'),
  ).toContainText('lighting/measured');
  // Cards render collapsed by default; open the ones this test inspects the body of.
  await page.getByTestId('asyncapi-document-operation-receivelightmeasurement-toggle').click();
  await expect(
    page.getByTestId('asyncapi-document-operation-receivelightmeasurement-parameters-path-0'),
  ).toBeVisible();
  await expect(
    page.getByTestId('asyncapi-document-operation-receivelightmeasurement-message-0-payload'),
  ).toBeVisible();
  await page.getByTestId('asyncapi-document-operation-sendturnon-toggle').click();
  await expect(
    page.getByTestId('asyncapi-document-operation-sendturnon-message-0-payload'),
  ).toBeVisible();
});

test('renders and operates the complete JSON-RPC surface', async ({ page }) => {
  await page.goto('/#/wallet');

  await expect(page.getByTestId('jsonrpc-document-header-title')).toHaveText('Wallet RPC');
  await expect(page.getByTestId('jsonrpc-document-tag-accounts')).toBeVisible();
  await expect(page.getByTestId('jsonrpc-document-method-getbalance')).toBeVisible();
  // Cards render collapsed by default; open the ones this test inspects the body of.
  await page.getByTestId('jsonrpc-document-method-getbalance-toggle').click();
  await expect(
    page.getByTestId('jsonrpc-document-method-getbalance-param-address-0'),
  ).toBeVisible();
  await expect(page.getByTestId('jsonrpc-document-method-getbalance-result')).toBeVisible();
  await expect(page.getByTestId('jsonrpc-document-method-getbalance-error--32001-0')).toBeVisible();
  await expect(
    page.getByTestId('jsonrpc-document-method-getbalance-example-0-request'),
  ).toContainText('getBalance');
  await expect(
    page.getByTestId('jsonrpc-document-method-getbalance-example-0-response'),
  ).toBeVisible();
  await page.getByTestId('jsonrpc-document-schemas-0-toggle').click();
  await expect(page.getByTestId('jsonrpc-document-schemas-0-viewer')).toBeVisible();

  const schemaDisclosureIcon = page.getByTestId(
    'jsonrpc-document-schemas-0-viewer-root-toggle-icon',
  );
  const schemaPropertyName = page.getByTestId(
    'jsonrpc-document-schemas-0-viewer-root-property-name',
  );
  const expectDisclosureAligned = async () => {
    const icon = await schemaDisclosureIcon.boundingBox();
    const propertyName = await schemaPropertyName.boundingBox();
    if (!icon || !propertyName) throw new Error('Schema disclosure alignment target is missing.');
    const iconCentre = icon.y + icon.height / 2;
    const propertyCentre = propertyName.y + propertyName.height / 2;
    expect(Math.abs(iconCentre - propertyCentre)).toBeLessThanOrEqual(1);
  };
  await expectDisclosureAligned();
  await page.getByTestId('jsonrpc-document-schemas-0-viewer-root-toggle').click();
  await expectDisclosureAligned();

  const copy = page.getByTestId('jsonrpc-document-method-getbalance-example-0-request-copy');
  await copy.click();
  await expect(
    page.getByTestId('jsonrpc-document-method-getbalance-example-0-request-copy-state'),
  ).toHaveText('Copied');
  await expectCompleteTestIdCoverage(page);
});
