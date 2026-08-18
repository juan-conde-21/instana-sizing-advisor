import { expect, test, type Page } from '@playwright/test';

const quote = (page: Page) => page.getByTestId('quote-summary-table');

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

test('carga inicial con recorrido comercial vertical y sin sidebar sticky', async ({ page }) => {
  await expect(page.locator('h1')).toHaveText('IBM Instana Observability - Calculadora comercial de licenciamiento');
  await expect(page.locator('body')).toContainText('Aplicación para orientar el sizing referencial de IBM Instana Observability distribuido, facilitando el cálculo de MVS, consumo de ingesta, logs, Synthetic RU y componentes aplicables según la modalidad SaaS o Self-Hosted.');
  await expect(page.getByRole('heading', { name: 'Comienza con un ejemplo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Datos generales del escenario' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Selecciona la modalidad' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Define el nivel de observabilidad requerido' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Qué se cuenta como MVS?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ingresa las cantidades que forman la licencia' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Capacidades adicionales' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Revisa antes de cotizar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resultado principal' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Part Numbers a cotizar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Genera el entregable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar reporte PDF' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar Excel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar resumen' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Limpiar' })).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/mockup/i);
  await expect(page.getByRole('button', { name: 'Guardar escenario' })).toHaveCount(0);
});

test('el ejemplo SaaS Standard 23 MVS carga físicos, virtuales y worker nodes', async ({ page }) => {
  await page.getByTestId('example-saas-23').click();
  await expect(page.getByTestId('example-saas-23')).toContainText('Escenario cargado');
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('2');
  await expect(page.getByTestId('standard-vm-input')).toHaveValue('18');
  await expect(page.getByTestId('standard-worker-input')).toHaveValue('3');
  await expect(page.getByText('23 MVS declarados. Se licencian 23 MVS.')).toBeVisible();
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('23');
});

test('ejemplos opcionales permiten comenzar desde cero y quitar el ejemplo', async ({ page }) => {
  await expect(page.getByTestId('examples-section')).toContainText('Los ejemplos son opcionales');
  await page.getByTestId('example-saas-23').click();
  await expect(page.getByTestId('example-saas-23')).toContainText('Escenario cargado');
  await expect(page.getByTestId('example-state')).toContainText('Ejemplo de origen: SaaS Standard · 23 MVS');
  await expect(page.getByTestId('example-state')).toContainText('Estado: Escenario cargado');
  await page.getByTestId('remove-example-button').click();
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('0');
  await expect(page.getByTestId('example-state')).toHaveCount(0);
  await expect(quote(page)).not.toContainText('D0N79ZX');

  await page.getByTestId('example-saas-23').click();
  await page.getByTestId('example-start-blank').click();
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('0');
  await expect(page.getByTestId('example-state')).toHaveCount(0);
});

test('editar un ejemplo marca escenario modificado y protege cambios al reemplazar', async ({ page }) => {
  await page.getByTestId('example-standard-essentials').click();
  await expect(page.getByTestId('example-state')).toContainText('Estado: Escenario cargado');
  await fillNumber(page, 'standard-vm-input', '21');
  await expect(page.getByTestId('example-standard-essentials')).toContainText('Escenario modificado');
  await expect(page.getByTestId('example-state')).toContainText('Estado: Escenario modificado');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('Se reemplazarán los valores actuales por los del ejemplo seleccionado. ¿Deseas continuar?');
    await dialog.dismiss();
  });
  await page.getByTestId('example-saas-23').click();
  await expect(page.getByTestId('standard-vm-input')).toHaveValue('21');
  await expect(page.getByTestId('example-state')).toContainText('SaaS Standard + Essentials');

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('Se reemplazarán los valores actuales por los del ejemplo seleccionado. ¿Deseas continuar?');
    await dialog.accept();
  });
  await page.getByTestId('example-saas-23').click();
  await expect(page.getByTestId('standard-vm-input')).toHaveValue('18');
  await expect(page.getByTestId('example-state')).toContainText('Ejemplo de origen: SaaS Standard · 23 MVS');
  await expect(page.getByTestId('example-state')).toContainText('Estado: Escenario cargado');
});

test('quitar ejemplo modificado solicita confirmación y limpiar elimina estado del ejemplo', async ({ page }) => {
  await page.getByTestId('example-saas-23').click();
  await fillNumber(page, 'standard-physical-input', '4');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('Se eliminarán los valores actuales y se iniciará un cálculo en blanco. ¿Deseas continuar?');
    await dialog.dismiss();
  });
  await page.getByTestId('remove-example-button').click();
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('4');
  await expect(page.getByTestId('example-state')).toContainText('Escenario modificado');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.getByTestId('remove-example-button').click();
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('0');
  await expect(page.getByTestId('example-state')).toHaveCount(0);

  await page.getByTestId('example-saas-23').click();
  await page.getByTestId('clear-form-button').click();
  await expect(page.getByTestId('example-state')).toHaveCount(0);
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('0');
});

test('tarjetas de ejemplo funcionan con teclado', async ({ page }) => {
  await page.getByTestId('example-start-blank').focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('example-saas-23')).toContainText('Escenario cargado');
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('2');
});

test('mínimo comercial de 10 MVS Standard', async ({ page }) => {
  await fillNumber(page, 'standard-physical-input', '5');
  await expect(page.locator('.inventory-edition').first()).toContainText('5 MVS declarados. Se aplica el mínimo comercial de 10 MVS.');
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('10');
  await expect(quote(page)).not.toContainText('D0N77ZX');
});

test('Standard y Essentials se calculan por separado desde el ejemplo mixto', async ({ page }) => {
  await page.getByTestId('example-standard-essentials').click();
  await expect(page.getByTestId('standard-vm-input')).toHaveValue('20');
  await expect(page.getByTestId('essentials-vm-input')).toHaveValue('15');
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('20');
  await expect(quote(page).locator('tr', { hasText: 'D0N77ZX' })).toContainText('15');
});

test('la suma de físicos, virtuales y worker nodes forma MVS y no hay campos por sistema operativo', async ({ page }) => {
  await fillNumber(page, 'standard-physical-input', '2');
  await fillNumber(page, 'standard-vm-input', '18');
  await fillNumber(page, 'standard-worker-input', '3');
  await expect(page.getByText('23 MVS declarados. Se licencian 23 MVS.')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /Linux|Windows|AIX|Solaris|ubicación|nube|cloud/i })).toHaveCount(0);
});

test('advierte cuando Standard y Essentials tienen exactamente el mismo inventario', async ({ page }) => {
  await page.getByTestId('edition-essentials-toggle').check();
  await fillNumber(page, 'standard-physical-input', '2');
  await fillNumber(page, 'standard-vm-input', '3');
  await fillNumber(page, 'standard-worker-input', '1');
  await fillNumber(page, 'essentials-physical-input', '2');
  await fillNumber(page, 'essentials-vm-input', '3');
  await fillNumber(page, 'essentials-worker-input', '1');
  await expect(page.getByTestId('validation-panel')).toContainText('Standard y Essentials tienen exactamente el mismo inventario');
});

test('ejemplo solo serverless aplica base comercial mínima Standard y calcula exceso Data Ingest', async ({ page }) => {
  await page.getByTestId('example-serverless-only').click();
  await expect(page.getByTestId('ingest-module')).toBeVisible();
  await expect(page.getByTestId('serverless-only-toggle')).toBeChecked();
  await expect(page.getByTestId('ingest-module')).toContainText('Base comercial mínima de 10 MVS Standard.');
  await expect(page.locator('.metric').filter({ hasText: 'Cuota incluida total' }).first()).toContainText(/3\.?250 GB/);
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('10');
  await expect(quote(page)).toContainText('D0N7BZX');
});


test('solo serverless con volumen cero no genera licencias ni Data Ingest', async ({ page }) => {
  await activateDataIngest(page);
  await page.getByTestId('serverless-only-toggle').check();
  await fillNumber(page, 'serverless-otel-ingest-input', '0');
  await expect(page.locator('.metric').filter({ hasText: 'MVS base' }).first()).toContainText('0 Standard');
  await expect(quote(page)).not.toContainText('D0N79ZX');
  await expect(quote(page)).not.toContainText('D0N7BZX');
});

test('solo serverless cubierto por cuota genera Standard 10 pero no Data Ingest', async ({ page }) => {
  await activateDataIngest(page);
  await page.getByTestId('serverless-only-toggle').check();
  await page.getByTestId('ingest-growth-input').fill('0');
  await fillNumber(page, 'serverless-otel-ingest-input', '2500');
  await expect(page.locator('.metric').filter({ hasText: 'MVS base' }).first()).toContainText('10 Standard');
  await expect(page.locator('.metric').filter({ hasText: 'Cuota incluida total' }).first()).toContainText(/3\.?250 GB/);
  await expect(page.locator('.metric').filter({ hasText: 'Exceso' }).first()).toContainText('0 GB');
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('10');
  await expect(quote(page)).not.toContainText('D0N7BZX');
});

test('solo serverless con exceso redondea bloques de Data Ingest', async ({ page }) => {
  await activateDataIngest(page);
  await page.getByTestId('serverless-only-toggle').check();
  await page.getByTestId('ingest-growth-input').fill('0');
  await fillNumber(page, 'serverless-otel-ingest-input', '5000');
  await expect(page.locator('.metric').filter({ hasText: 'Exceso' }).first()).toContainText(/1\.?750 GB/);
  await expect(page.locator('.metric').filter({ hasText: 'Unidades Data Ingest' }).first()).toContainText('18');
  await expect(quote(page).locator('tr', { hasText: 'D0N7BZX' })).toContainText('18');
});

test('escenario 50 MVS compara sin modificar y solo aplica con confirmación', async ({ page }) => {
  await fillNumber(page, 'standard-physical-input', '5');
  await activateDataIngest(page);
  await fillNumber(page, 'serverless-otel-ingest-input', '6000');
  await expect(page.getByTestId('fifty-mvs-comparison')).toBeVisible();
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('10');
  await page.getByTestId('confirm-fifty-mvs-button').click();
  await expect(page.getByText('Escenario 50 MVS confirmado')).toBeVisible();
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('50');
});

test('cambio a Self-Hosted oculta la opción solo serverless', async ({ page }) => {
  await activateDataIngest(page);
  await page.getByTestId('serverless-only-toggle').check();
  await page.getByTestId('deployment-mode-self-hosted').click();
  await expect(page.getByTestId('ingest-module')).toHaveCount(0);
  await expect(page.getByTestId('serverless-only-toggle')).toHaveCount(0);
});

test('Self-Hosted oculta módulos SaaS y bloquea add-ons', async ({ page }) => {
  await page.getByTestId('deployment-mode-self-hosted').click();
  await fillNumber(page, 'standard-physical-input', '5');
  await page.getByTestId('edition-essentials-toggle').check();
  await fillNumber(page, 'essentials-vm-input', '12');
  await expect(page.getByTestId('addon-data-ingest-toggle')).toHaveCount(0);
  await expect(page.getByTestId('addon-logs-toggle')).toHaveCount(0);
  await expect(page.getByTestId('addon-synthetic-toggle')).toHaveCount(0);
  await expect(page.getByTestId('self-hosted-sizing-section')).toBeVisible();
  await expect(page.getByTestId('ingest-module')).toHaveCount(0);
  await expect(page.getByTestId('logs-module')).toHaveCount(0);
  await expect(page.getByTestId('synthetic-module')).toHaveCount(0);
  await expect(quote(page)).toContainText('D29RTLL');
  await expect(quote(page)).toContainText('D29RRLL');
  await expect(quote(page).locator('tr', { hasText: 'D29RTLL' })).toContainText('MVS');
  await expect(quote(page).locator('tr', { hasText: 'D29RRLL' })).toContainText('MVS');
  await expect(quote(page)).not.toContainText('D0N7BZX');
  await expect(quote(page)).not.toContainText('D0RL4ZX');
  await expect(quote(page)).not.toContainText('D0I5PZX');

  await page.getByTestId('deployment-mode-saas').click();
  await expect(page.getByTestId('addon-data-ingest-toggle')).toBeEnabled();
  await expect(page.getByTestId('addon-logs-toggle')).toBeEnabled();
  await expect(page.getByTestId('addon-synthetic-toggle')).toBeEnabled();
});

test('Data Ingest, Logs y Synthetic SaaS mantienen comportamiento funcional', async ({ page }) => {
  await fillNumber(page, 'standard-physical-input', '5');
  await activateDataIngest(page);
  await fillNumber(page, 'serverless-otel-ingest-input', '2500');
  await expect(quote(page).locator('tr', { hasText: 'D0N7BZX' })).toContainText('11');

  await activateLogs(page);
  await page.getByTestId('logs-retention-select').selectOption('30');
  await fillNumber(page, 'logs-volume-input', '2.2');
  await expect(quote(page).locator('tr', { hasText: 'D0RL4ZX' })).toContainText('3');

  await activateSynthetic(page);
  const synthetic = page.getByTestId('synthetic-table');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(0).fill('1');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(1).fill('60');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(2).fill('1');
  await expect(quote(page).locator('tr', { hasText: 'D0I5PZX' })).toContainText('30');
});

test('la aplicación funciona en viewport tablet', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1100 });
  await clearState(page);
  await page.getByTestId('example-standard-essentials').click();
  await expect(page.getByTestId('standard-vm-input')).toBeVisible();
  await expect(page.getByTestId('essentials-vm-input')).toBeVisible();
  await expect(quote(page)).toContainText('D0N79ZX');
  await expect(quote(page)).toContainText('D0N77ZX');
});

test('la aplicación funciona en viewport móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await clearState(page);
  await page.getByTestId('example-saas-23').click();
  await expect(page.getByRole('heading', { name: 'IBM Instana Observability - Calculadora comercial de licenciamiento' })).toBeVisible();
  await expect(page.getByTestId('standard-physical-input')).toBeVisible();
  await expect(quote(page).locator('tr', { hasText: 'D0N79ZX' })).toContainText('23');
});


test('Logs explica retención incluida y redondeo extendido', async ({ page }) => {
  await activateLogs(page);
  await expect(page.getByRole('heading', { name: 'Retención ampliada de logs asociados a aplicaciones' })).toBeVisible();
  await expect(page.getByTestId('logs-included-message')).toContainText('Incluido, sin licencia adicional');
  await expect(quote(page)).not.toContainText('D0RL4ZX');
  await page.getByTestId('logs-retention-select').selectOption('30');
  await fillNumber(page, 'logs-volume-input', '2.2');
  await expect(page.locator('.metric').filter({ hasText: 'Cantidad a cotizar' }).first()).toContainText('3');
  await expect(page.locator('body')).toContainText('Si el cliente genera 2.2 TB mensuales');
  await expect(quote(page).locator('tr', { hasText: 'D0RL4ZX' })).toContainText('3');
});

test('Synthetic muestra explicación, calcula ejecuciones y aplica mínimo', async ({ page }) => {
  await activateSynthetic(page);
  await expect(page.getByRole('heading', { name: 'Pruebas automáticas de disponibilidad y experiencia' })).toBeVisible();
  await expect(page.locator('body')).toContainText('Comprueba que un endpoint responda correctamente.');
  const synthetic = page.getByTestId('synthetic-table');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(0).fill('2');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(1).fill('60');
  await synthetic.locator('tbody tr').nth(0).locator('input').nth(2).fill('3');
  await expect(synthetic.locator('tbody tr').nth(0)).toContainText('4320');
  await expect(page.locator('.summary-strip > div').filter({ hasText: 'Unidades a cotizar' }).first()).toContainText('30');
  await expect(quote(page).locator('tr', { hasText: 'D0I5PZX' })).toContainText('30');
});

test('Self-Hosted muestra sizing técnico sin afirmar cálculo de infraestructura', async ({ page }) => {
  await page.getByTestId('deployment-mode-self-hosted').click();
  await expect(page.getByTestId('addon-data-ingest-toggle')).toHaveCount(0);
  await expect(page.getByTestId('addon-logs-toggle')).toHaveCount(0);
  await expect(page.getByTestId('addon-synthetic-toggle')).toHaveCount(0);
  await expect(page.getByTestId('self-hosted-sizing-section')).toContainText('Información para dimensionamiento técnico Self-Hosted');
  await expect(page.getByTestId('self-hosted-sizing-section')).toContainText('Esta calculadora estima las licencias MVS');
  await expect(page.getByTestId('self-hosted-sizing-section')).toContainText('debe validarse con la herramienta o guía técnica de sizing de Instana');
  await expect(page.getByTestId('self-hosted-sizing-section')).not.toContainText('CPU calculada');
  await expect(page.getByTestId('self-hosted-sizing-section')).not.toContainText('memoria calculada');
});

test('Resultado ejecutivo no muestra líneas cero y usa unidad de catálogo Self-Hosted', async ({ page }) => {
  await page.getByTestId('deployment-mode-self-hosted').click();
  await fillNumber(page, 'standard-physical-input', '12');
  await expect(page.getByTestId('result-overview')).toContainText('Cliente u oportunidad');
  await expect(quote(page).locator('tr', { hasText: 'D29RTLL' })).toContainText('MVS');
  await expect(quote(page)).not.toContainText('D0N7BZX');
  await expect(quote(page)).not.toContainText('D0RL4ZX');
  await expect(quote(page)).not.toContainText('D0I5PZX');
  await expect(page.getByTestId('result-overview')).toContainText('Validación CPQ');
  await expect(page.getByTestId('cpq-validation-note')).toContainText('Validar en CPQ la vigencia del Part Number');
});

test('descargar Excel y PDF genera archivos válidos', async ({ page }) => {
  await page.getByTestId('client-name-input').fill('Cliente Excel Año Ñ');
  await fillNumber(page, 'standard-physical-input', '5');
  await activateDataIngest(page);
  await fillNumber(page, 'serverless-otel-ingest-input', '2500');

  const excelPromise = page.waitForEvent('download');
  await page.getByTestId('export-excel-button').click();
  const excel = await excelPromise;
  expect(excel.suggestedFilename()).toBe('instana-sizing-advisor-cliente-excel-ano-n.xlsx');
  const excelStream = await excel.createReadStream();
  const excelChunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    excelStream!.on('data', (chunk) => excelChunks.push(Buffer.from(chunk)));
    excelStream!.on('end', resolve);
    excelStream!.on('error', reject);
  });
  expect(Buffer.concat(excelChunks).byteLength).toBeGreaterThan(0);

  const pdfPromise = page.waitForEvent('download');
  await page.getByTestId('export-pdf-button').click();
  const pdf = await pdfPromise;
  expect(pdf.suggestedFilename()).toBe('instana-sizing-advisor-cliente-excel-ano-n.pdf');
  const pdfStream = await pdf.createReadStream();
  const pdfChunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    pdfStream!.on('data', (chunk) => pdfChunks.push(Buffer.from(chunk)));
    pdfStream!.on('end', resolve);
    pdfStream!.on('error', reject);
  });
  expect(Buffer.concat(pdfChunks).byteLength).toBeGreaterThan(1000);
});

test('copiar resumen y limpiar restablecen la aplicación', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByTestId('client-name-input').fill('Cliente Copia');
  await fillNumber(page, 'standard-physical-input', '5');
  await page.getByTestId('copy-summary-button').click();
  await expect(page.getByTestId('export-status-message')).toContainText('Resumen copiado');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('Cliente Copia');
  expect(copied).toContain('D0N79ZX');

  await page.getByTestId('clear-form-button').click();
  await expect(page.getByTestId('client-name-input')).toHaveValue('');
  await expect(page.getByTestId('standard-physical-input')).toHaveValue('0');
  await expect(page.getByTestId('deployment-type-select')).toHaveValue('SaaS');
  await expect(page.getByTestId('example-saas-23')).not.toContainText('Escenario cargado');
});

async function expectNoGlobalHorizontalScroll(page: Page) {
  const sizes = await page.evaluate(() => ({
    documentClient: document.documentElement.clientWidth,
    documentScroll: document.documentElement.scrollWidth,
    bodyClient: document.body.clientWidth,
    bodyScroll: document.body.scrollWidth,
  }));
  expect(sizes.documentScroll).toBeLessThanOrEqual(sizes.documentClient + 1);
  expect(sizes.bodyScroll).toBeLessThanOrEqual(sizes.bodyClient + 1);
}

async function expectStackedOnMobile(page: Page, selector: string) {
  const boxes = await page.locator(selector).evaluateAll((elements) => elements.slice(0, 2).map((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 2);
  expect(boxes[0].width).toBeGreaterThan(300);
}

for (const viewport of [1440, 1024, 768, 390]) {
  test(`layout sin scroll horizontal global en ${viewport}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 1000 });
    await clearState(page);
    await expectNoGlobalHorizontalScroll(page);
    await page.getByTestId('example-serverless-only').click();
    await expectNoGlobalHorizontalScroll(page);
  });
}

test('tarjetas de ejemplo mantienen ancho legible en desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await clearState(page);
  const widths = await page.locator('.example-card').evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
  expect(widths.length).toBeGreaterThanOrEqual(5);
  for (const width of widths) {
    expect(width).toBeGreaterThan(250);
  }
});

test('datos generales e inputs permanecen dentro de sus tarjetas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await clearState(page);
  const generalBox = await page.locator('#datos-generales').boundingBox();
  const clientBox = await page.getByTestId('client-name-input').boundingBox();
  expect(generalBox).not.toBeNull();
  expect(clientBox).not.toBeNull();
  expect(clientBox!.x).toBeGreaterThanOrEqual(generalBox!.x - 1);
  expect(clientBox!.x + clientBox!.width).toBeLessThanOrEqual(generalBox!.x + generalBox!.width + 1);
  await expectNoGlobalHorizontalScroll(page);
});

test('modalidad y ediciones se apilan en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await clearState(page);
  await expectStackedOnMobile(page, '.mode-card');
  await expectStackedOnMobile(page, '.edition-card');
});

test('inventario y resultado conservan recorrido vertical', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await clearState(page);
  await page.getByTestId('example-saas-23').click();
  const inventoryBox = await page.locator('#inventario').boundingBox();
  const resultBox = await page.getByTestId('result-overview').boundingBox();
  const inputBox = await page.getByTestId('standard-physical-input').boundingBox();
  const cardBox = await page.locator('.inventory-edition').first().boundingBox();
  expect(inventoryBox).not.toBeNull();
  expect(resultBox).not.toBeNull();
  expect(inputBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(resultBox!.y).toBeGreaterThan(inventoryBox!.y + inventoryBox!.height);
  expect(inputBox!.x).toBeGreaterThanOrEqual(cardBox!.x - 1);
  expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1);
  await expectNoGlobalHorizontalScroll(page);
});

test('botones de exportación se ven completos en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await clearState(page);
  await page.locator('#exportaciones').scrollIntoViewIfNeeded();
  for (const testId of ['export-pdf-button', 'export-excel-button', 'copy-summary-button', 'clear-form-button']) {
    const box = await page.getByTestId(testId).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  }
  await expectNoGlobalHorizontalScroll(page);
});

test('tablas usan scroll interno sin desbordar la página', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await clearState(page);
  await activateSynthetic(page);
  await page.getByTestId('synthetic-table').scrollIntoViewIfNeeded();
  const tableWrap = page.getByTestId('synthetic-table').locator('xpath=ancestor::div[contains(@class, "table-wrap")]');
  const wrapSizes = await tableWrap.evaluate((element) => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(wrapSizes.scroll).toBeGreaterThan(wrapSizes.client);
  await expectNoGlobalHorizontalScroll(page);
});
