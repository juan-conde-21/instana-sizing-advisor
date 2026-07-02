import { expect, test, type Page } from '@playwright/test';

const quote = (page: Page) => page.getByTestId('quote-summary-table');
const recommendations = (page: Page) => page.getByTestId('recommendations-section');
const storageKey = 'instana-sizing-advisor:last-scenario';

async function clearState(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function fillNumber(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId);
  await input.fill(value);
  await expect(input).toHaveValue(value);
}

async function activateDataIngest(page: Page) {
  await page.getByTestId('addon-data-ingest-toggle').check();
  await expect(page.getByTestId('ingest-module')).toBeVisible();
}

async function activateLogs(page: Page) {
  await page.getByTestId('addon-logs-toggle').check();
  await expect(page.getByTestId('logs-module')).toBeVisible();
}

async function activateSynthetic(page: Page) {
  await page.getByTestId('addon-synthetic-toggle').check();
  await expect(page.getByTestId('synthetic-module')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await clearState(page);
});

test('carga inicial, secciones y módulos de add-ons ocultos', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('Instana Sizing Advisor');
  await expect(page.getByRole('heading', { name: 'Datos generales' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inventario a monitorear' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Add-ons opcionales' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Crecimiento proyectado' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resumen de cotización' })).toBeVisible();
  await expect(page.getByTestId('ingest-module')).toHaveCount(0);
  await expect(page.getByTestId('logs-module')).toHaveCount(0);
  await expect(page.getByTestId('synthetic-module')).toHaveCount(0);
  await expect(page.locator('body')).toContainText('Aplicación para orientar el sizing referencial de IBM Instana Observability distribuido');
  await expect(page.locator('body')).not.toContainText('sin mostrar precios');
  await expect(page.locator('body')).not.toContainText('reglas comerciales');
  await expect(page.locator('body')).not.toContainText(/mockup/i);
  await expect(page.locator('body')).not.toContainText('GitHub Pages no tiene backend');
  await expect(page.locator('body')).not.toContainText('localStorage');
  await expect(page.locator('body')).not.toContainText('Se muestran aunque el add-on opcional esté desactivado');
  await expect(page.getByRole('button', { name: 'Importar JSON' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Exportar JSON' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Guardar escenario' })).toHaveCount(0);
});

test('mínimo comercial y MVS declarados vs licenciados', async ({ page }) => {
  await fillNumber(page, 'standard-physical-input', '5');
  await expect(page.getByText('MVS declarados Standard').locator('..')).toContainText('5 MVS');
  await expect(page.getByText('MVS licenciados Standard').locator('..')).toContainText('10 MVS');
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('10');
  await expect(quote(page)).not.toContainText('D0N77ZX');
  await expect(quote(page)).not.toContainText('D0N7BZX');
});

test('Data Ingest usa remanente de MVS licenciados y consumo de agentes reales', async ({ page }) => {
  await fillNumber(page, 'standard-physical-input', '5');
  await activateDataIngest(page);
  await fillNumber(page, 'serverless-otel-ingest-input', '2500');

  await expect(page.locator('.metric').filter({ hasText: 'Cuota base incluida' }).first()).toContainText(/3\.?250 GB/);
  await expect(page.locator('.metric').filter({ hasText: 'Consumo promedio agentes reales' }).first()).toContainText(/1\.?300 GB/);
  await expect(page.locator('.metric').filter({ hasText: 'Remanente disponible' }).first()).toContainText(/1\.?950 GB/);
  await expect(page.locator('.metric').filter({ hasText: 'Serverless/OTel proyectado' }).first()).toContainText(/3\.?000 GB/);
  await expect(page.locator('.metric').filter({ hasText: 'Ingesta a licenciar' }).first()).toContainText(/1\.?050 GB/);
  await expect(page.locator('.metric').filter({ hasText: 'Unidades Data Ingest' }).first()).toContainText('11');
  await expect(quote(page).locator('tr', { hasText: 'D0N7BZX' })).toContainText('11');
});

test('desactivar Data Ingest limpia cálculos y elimina recomendaciones y D0N7BZX', async ({ page }) => {
  await fillNumber(page, 'standard-physical-input', '5');
  await activateDataIngest(page);
  await fillNumber(page, 'serverless-otel-ingest-input', '2500');

  // Addon ON: D0N7BZX debe estar en el resumen
  await expect(quote(page)).toContainText('D0N7BZX');

  // Desactivar add-on
  await page.getByTestId('addon-data-ingest-toggle').uncheck();
  await expect(page.getByTestId('ingest-module')).toHaveCount(0);

  // Sin addon: D0N7BZX no debe aparecer
  await expect(quote(page)).not.toContainText('D0N7BZX');

  // Sin addon: ninguna recomendación de Data Ingest
  await expect(recommendations(page)).not.toContainText('Data ingest adicional');
  await expect(recommendations(page)).not.toContainText('50 MVS');
});

test('Logs 7 días incluido y 30 días extendido', async ({ page }) => {
  await activateLogs(page);
  await expect(page.locator('body')).toContainText('Volumen de logs (TB mensual)');
  await fillNumber(page, 'logs-volume-input', '1');
  await expect(page.getByTestId('logs-retention-select')).toHaveValue('7');
  await expect(page.getByText('Unidades logs').locator('..')).toContainText('0');
  await expect(page.locator('body')).toContainText('La retención base incluida es de 7 días. No se agrega retención extendida.');
  await expect(quote(page)).not.toContainText('D0RL4ZX');

  await page.getByTestId('logs-retention-select').selectOption('30');
  await expect(page.getByText('Volumen considerado').locator('..')).toContainText(/1,?0|1\.0|1 TB/);
  await expect(page.locator('body')).not.toContainText('1.2 TB');
  await expect(page.getByText('Unidades logs').locator('..')).toContainText('1');
  await expect(quote(page).locator('tr', { hasText: 'D0RL4ZX' })).toContainText('1');
});

test('desactivar Logs limpia unidades y elimina recomendaciones y D0RL4ZX', async ({ page }) => {
  await activateLogs(page);
  await fillNumber(page, 'logs-volume-input', '2.2');
  await page.getByTestId('logs-retention-select').selectOption('30');

  // Addon ON: 3 unidades y D0RL4ZX en resumen
  await expect(page.getByText('Unidades logs').locator('..')).toContainText('3');
  await expect(quote(page).locator('tr', { hasText: 'D0RL4ZX' })).toContainText('3');

  // Desactivar add-on
  await page.getByTestId('addon-logs-toggle').uncheck();
  await expect(page.getByTestId('logs-module')).toHaveCount(0);

  // Sin addon: D0RL4ZX no debe aparecer
  await expect(quote(page)).not.toContainText('D0RL4ZX');

  // Sin addon: ninguna recomendación de Logs
  await expect(recommendations(page)).not.toContainText('Logs in Context');
});

test('Serverless/OTel modo transaccional agrega filas y calcula GB', async ({ page }) => {
  await activateDataIngest(page);
  await page.getByTestId('transactional-mode-toggle').check();
  await page.getByTestId('add-transactional-row-button').click();
  const row = page.getByTestId('transactional-ingest-table').locator('tbody tr').first();
  await row.locator('input').nth(1).fill('10');
  await row.locator('input').nth(2).fill('5');
  await row.locator('input').nth(3).fill('2');
  await expect(row).toContainText(/247/);
  await expect(row).toContainText(/296/);
});

test('Synthetic aplica crecimiento y mínimo de 30 unidades', async ({ page }) => {
  await activateSynthetic(page);
  await expect(page.getByTestId('synthetic-growth-input')).toHaveValue('0');
  const synthetic = page.getByTestId('synthetic-table');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(0).fill('1');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(1).fill('60');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(2).fill('1');
  await expect(page.locator('.summary-strip > div').filter({ hasText: 'RU proyectadas' }).first()).toContainText(/18,?0|18\.0|18 RU/);
  await expect(page.locator('.summary-strip > div').filter({ hasText: 'Unidades licenciadas' }).first()).toContainText('30');
  await expect(page.locator('.summary-strip > div').filter({ hasText: 'RU licenciadas' }).first()).toContainText(/30\.?000 RU/);
  await expect(quote(page).locator('tr', { hasText: 'D0I5PZX' })).toContainText('30');
  await expect(page.locator('body')).not.toContainText(/\$|USD|EUR|Costo total|\bCosto\b/i);
});

test('desactivar Synthetic limpia RU y elimina recomendaciones y D0I5PZX', async ({ page }) => {
  await activateSynthetic(page);
  const synthetic = page.getByTestId('synthetic-table');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(0).fill('1');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(1).fill('60');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(2).fill('1');

  // Addon ON: D0I5PZX en resumen
  await expect(quote(page)).toContainText('D0I5PZX');

  // Desactivar add-on
  await page.getByTestId('addon-synthetic-toggle').uncheck();
  await expect(page.getByTestId('synthetic-module')).toHaveCount(0);

  // Sin addon: D0I5PZX no debe aparecer
  await expect(quote(page)).not.toContainText('D0I5PZX');

  // Sin addon: ninguna recomendación de Synthetic
  await expect(recommendations(page)).not.toContainText('Synthetic Managed PoP');
});

test('Self-Hosted bloquea add-ons SaaS y muestra consideraciones técnicas', async ({ page }) => {
  await page.getByTestId('addon-data-ingest-toggle').check();
  await page.getByTestId('deployment-type-select').selectOption('Self-Hosted');
  await fillNumber(page, 'standard-physical-input', '5');
  await fillNumber(page, 'essentials-vm-input', '12');
  await expect(page.getByTestId('addon-data-ingest-toggle')).toBeDisabled();
  await expect(page.getByTestId('addon-logs-toggle')).toBeDisabled();
  await expect(page.getByTestId('addon-synthetic-toggle')).toBeDisabled();
  await expect(page.locator('body')).toContainText('Referencia técnica para dimensionamiento de storage/capacidad en Self-Hosted.');
  await expect(page.locator('body')).toContainText('Para Self-Hosted considerar PoP privado y dimensionamiento técnico correspondiente.');
  await expect(page.getByTestId('ingest-module')).toHaveCount(0);
  await expect(page.getByTestId('logs-module')).toHaveCount(0);
  await expect(page.getByTestId('synthetic-module')).toHaveCount(0);
  await expect(quote(page)).toContainText('D29RTLL');
  await expect(quote(page)).toContainText('D29RRLL');
  await expect(quote(page)).not.toContainText('D0N7BZX');
  await expect(quote(page)).not.toContainText('D0RL4ZX');
  await expect(quote(page)).not.toContainText('D0I5PZX');
  await expect(page.getByTestId('self-hosted-notes')).toContainText('Consideraciones Self-Hosted');
  await expect(page.getByTestId('self-hosted-notes')).toContainText('los add-ons SaaS de Data Ingest, Logs in Context y Synthetic Managed PoP no se incluyen');

  await page.getByTestId('deployment-type-select').selectOption('SaaS');
  await expect(page.getByTestId('addon-data-ingest-toggle')).toBeEnabled();
  await expect(page.getByTestId('addon-logs-toggle')).toBeEnabled();
  await expect(page.getByTestId('addon-synthetic-toggle')).toBeEnabled();
});

test('exportar Excel', async ({ page }) => {
  await page.getByTestId('client-name-input').fill('Cliente Excel');
  await fillNumber(page, 'standard-physical-input', '5');
  await activateDataIngest(page);
  await fillNumber(page, 'serverless-otel-ingest-input', '2500');
  await expect(page.getByRole('button', { name: 'Guardar escenario' })).toHaveCount(0);

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('export-excel-button').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('instana-sizing-advisor-cliente-excel.xlsx');
  const stream = await download.createReadStream();
  expect(stream).toBeTruthy();
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream!.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream!.on('end', resolve);
    stream!.on('error', reject);
  });
  expect(Buffer.concat(chunks).byteLength).toBeGreaterThan(0);
});
