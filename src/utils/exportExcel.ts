import ExcelJS from 'exceljs';
import { INSTANA_RULES } from '../rules/instanaRules';
import type { IngestResult, InventoryResult, LogsResult, QuoteLine, Recommendation, ScenarioInput, SyntheticResult } from '../types/sizing';
import { formatNumber } from './calculations';
import { additionalCapabilities, commercialJustification, CPQ_VALIDATION_NOTE, executiveRecommendation, minimumSummary, safeFileName, selectedEditions, warningMessages } from './reporting';

export interface ExportPayload {
  scenario: ScenarioInput;
  inventory: InventoryResult;
  ingest: IngestResult;
  logs: LogsResult;
  synthetic: SyntheticResult;
  quoteLines: QuoteLine[];
  recommendations: Recommendation[];
}

type CellValue = string | number | null;
type RowValues = CellValue[];

const COLORS = {
  blue: 'FF0F62FE',
  darkBlue: 'FF001D6C',
  cyanSoft: 'FFEDF5FF',
  graySoft: 'FFF4F4F4',
  border: 'FFE0E0E0',
  text: 'FF161616',
  white: 'FFFFFFFF',
  greenSoft: 'FFDEFBE6',
};

const thinBorder = { style: 'thin' as const, color: { argb: COLORS.border } };

function setupPage(worksheet: ExcelJS.Worksheet, landscape = false) {
  worksheet.properties.defaultRowHeight = 22;
  worksheet.pageSetup = {
    orientation: landscape ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.35, right: 0.35, top: 0.55, bottom: 0.55, header: 0.2, footer: 0.2 },
  };
  worksheet.headerFooter.oddHeader = '&LIBM Instana Observability&CEstimación comercial&R&D';
  worksheet.headerFooter.oddFooter = '&LValidar contra CPQ&CConfidencial de trabajo&R Página &P de &N';
}

function styleRange(worksheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromCol: number, toCol: number) {
  for (let rowIndex = fromRow; rowIndex <= toRow; rowIndex += 1) {
    const row = worksheet.getRow(rowIndex);
    for (let colIndex = fromCol; colIndex <= toCol; colIndex += 1) {
      const cell = row.getCell(colIndex);
      cell.border = { top: thinBorder, right: thinBorder, bottom: thinBorder, left: thinBorder };
      cell.alignment = { vertical: 'top', wrapText: true };
    }
  }
}

function addTitle(worksheet: ExcelJS.Worksheet, title: string, subtitle: string) {
  worksheet.mergeCells('A1:F1');
  worksheet.getCell('A1').value = title;
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBlue } };
  worksheet.getCell('A1').font = { bold: true, color: { argb: COLORS.white }, size: 18 };
  worksheet.getCell('A1').alignment = { vertical: 'middle' };
  worksheet.getRow(1).height = 30;
  worksheet.mergeCells('A2:F2');
  worksheet.getCell('A2').value = subtitle;
  worksheet.getCell('A2').font = { bold: true, color: { argb: COLORS.darkBlue }, size: 13 };
  worksheet.getRow(2).height = 24;
}

function addSection(worksheet: ExcelJS.Worksheet, row: number, title: string, cols = 6) {
  worksheet.mergeCells(row, 1, row, cols);
  const cell = worksheet.getCell(row, 1);
  cell.value = title;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.blue } };
  cell.font = { bold: true, color: { argb: COLORS.white } };
  cell.alignment = { vertical: 'middle' };
  worksheet.getRow(row).height = 22;
}

function addKeyValues(worksheet: ExcelJS.Worksheet, startRow: number, pairs: Array<[string, CellValue]>) {
  pairs.forEach(([label, value], index) => {
    const row = worksheet.getRow(startRow + index);
    row.values = [label, value];
    row.getCell(1).font = { bold: true, color: { argb: COLORS.darkBlue } };
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
  });
  styleRange(worksheet, startRow, startRow + pairs.length - 1, 1, 2);
  return startRow + pairs.length;
}

function addTable(worksheet: ExcelJS.Worksheet, startRow: number, headers: string[], rows: RowValues[], widths?: number[]) {
  const headerRow = worksheet.getRow(startRow);
  headerRow.values = headers;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkBlue } };
    cell.font = { bold: true, color: { argb: COLORS.white } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  rows.forEach((values, index) => {
    worksheet.getRow(startRow + 1 + index).values = values.map((value) => value === '' ? null : value);
  });
  styleRange(worksheet, startRow, startRow + rows.length, 1, headers.length);
  headers.forEach((_, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = widths?.[index] || 18;
  });
  worksheet.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow + rows.length, column: headers.length } };
  return startRow + rows.length + 1;
}

function quoteRows(payload: ExportPayload): RowValues[] {
  return payload.quoteLines.filter((line) => line.quantity > 0).map((line) => [
    line.component,
    line.partNumber,
    line.quantity,
    line.unit,
    line.explanation,
  ]);
}

function indicatorRows(payload: ExportPayload): RowValues[] {
  const rows: RowValues[] = [];
  if (payload.inventory.standardRaw > 0 || payload.ingest.standardLicensed > 0) rows.push(['MVS Standard', payload.ingest.standardLicensed, 'MVS licenciados']);
  if (payload.inventory.essentialsRaw > 0 || payload.inventory.essentialsLicensed > 0) rows.push(['MVS Essentials', payload.inventory.essentialsLicensed, 'MVS licenciados']);
  if (payload.scenario.general.mode === 'SaaS' && payload.ingest.baseIncludedGb > 0) rows.push(['Cuota incluida', payload.ingest.baseIncludedGb, 'GB/mes']);
  if (payload.scenario.addOns.dataIngest && payload.ingest.projectedServerlessOtelGb > 0) rows.push(['Volumen proyectado', payload.ingest.projectedServerlessOtelGb, 'GB/mes']);
  if (payload.scenario.addOns.dataIngest && payload.ingest.gbToLicense > 0) rows.push(['Exceso', payload.ingest.gbToLicense, 'GB/mes']);
  if (payload.scenario.addOns.dataIngest && payload.ingest.dataIngestUnits > 0) rows.push(['Data Ingest', payload.ingest.dataIngestUnits, INSTANA_RULES.dataIngest.unitLabel]);
  if (payload.scenario.addOns.logs && payload.logs.units > 0) rows.push(['Logs', payload.logs.units, INSTANA_RULES.logs.unitLabel]);
  if (payload.scenario.addOns.syntheticManagedPop && payload.synthetic.consideredUnits > 0) rows.push(['Synthetic', payload.synthetic.consideredUnits, INSTANA_RULES.synthetic.unitLabel]);
  return rows;
}

function addSummarySheet(workbook: ExcelJS.Workbook, payload: ExportPayload) {
  const worksheet = workbook.addWorksheet('Resumen ejecutivo');
  setupPage(worksheet, false);
  worksheet.columns = [{ width: 24 }, { width: 28 }, { width: 18 }, { width: 24 }, { width: 30 }, { width: 38 }];
  addTitle(worksheet, 'IBM Instana Observability', 'Estimación comercial de licenciamiento');

  let row = 4;
  row = addKeyValues(worksheet, row, [
    ['Cliente u oportunidad', payload.scenario.general.client || 'Sin cliente'],
    ['Modalidad', payload.scenario.general.mode],
    ['Fecha', new Date().toLocaleString('es-ES')],
    ['Escenario', payload.scenario.ingest.serverlessOnly ? 'Solo serverless/OpenTelemetry' : selectedEditions(payload)],
  ]) + 1;

  addSection(worksheet, row, 'Resultado principal');
  row += 1;
  worksheet.mergeCells(row, 1, row + 1, 6);
  const recommendation = worksheet.getCell(row, 1);
  recommendation.value = executiveRecommendation(payload);
  recommendation.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenSoft } };
  recommendation.font = { bold: true, color: { argb: COLORS.text }, size: 14 };
  recommendation.alignment = { wrapText: true, vertical: 'middle' };
  styleRange(worksheet, row, row + 1, 1, 6);
  row += 3;

  const indicators = indicatorRows(payload);
  if (indicators.length) {
    addSection(worksheet, row, 'Indicadores principales');
    row += 1;
    row = addTable(worksheet, row, ['Indicador', 'Valor', 'Unidad'], indicators, [28, 18, 32]) + 1;
  }

  addSection(worksheet, row, 'Part Numbers a cotizar');
  row += 1;
  row = addTable(worksheet, row, ['Componente', 'Part Number', 'Cantidad', 'Unidad', 'Motivo'], quoteRows(payload), [34, 18, 12, 24, 52]) + 1;

  addSection(worksheet, row, 'Alcance y justificación');
  row += 1;
  worksheet.mergeCells(row, 1, row + 2, 6);
  worksheet.getCell(row, 1).value = commercialJustification(payload);
  worksheet.getCell(row, 1).alignment = { wrapText: true, vertical: 'top' };
  styleRange(worksheet, row, row + 2, 1, 6);
  row += 4;

  if (payload.ingest.fiftyMvsScenario && payload.ingest.selectedScenario !== 'fifty-mvs') {
    addSection(worksheet, row, 'Alternativa por evaluar');
    row += 1;
    worksheet.mergeCells(row, 1, row + 1, 6);
    worksheet.getCell(row, 1).value = 'Incrementar la base a 50 MVS podría reducir o eliminar Data Ingest adicional. Esta alternativa no está aplicada en la cotización actual y requiere confirmación.';
    worksheet.getCell(row, 1).alignment = { wrapText: true, vertical: 'top' };
    styleRange(worksheet, row, row + 1, 1, 6);
    row += 3;
  }

  addSection(worksheet, row, 'Validación comercial');
  row += 1;
  worksheet.mergeCells(row, 1, row + 1, 6);
  worksheet.getCell(row, 1).value = CPQ_VALIDATION_NOTE;
  worksheet.getCell(row, 1).alignment = { wrapText: true, vertical: 'middle' };
  styleRange(worksheet, row, row + 1, 1, 6);
  worksheet.views = [{ state: 'frozen', ySplit: 3 }];
  worksheet.pageSetup.printArea = `A1:F${row + 1}`;
}

function addDetailSheet(workbook: ExcelJS.Workbook, payload: ExportPayload) {
  const worksheet = workbook.addWorksheet('Detalle del cálculo');
  setupPage(worksheet, true);
  worksheet.columns = [{ width: 24 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 22 }];
  addTitle(worksheet, 'Detalle del cálculo', 'Inventario, cuota incluida, mínimos y redondeos');
  let row = 4;
  addSection(worksheet, row, 'Detalle MVS', 7);
  row += 1;
  const mvsRows: RowValues[] = [];
  if (payload.inventory.standardRaw > 0 || payload.ingest.standardLicensed > 0) mvsRows.push(['Standard', payload.scenario.inventory.standardPhysical, payload.scenario.inventory.standardVirtual, payload.scenario.inventory.standardKubernetesWorkers, payload.inventory.standardRaw, payload.inventory.standardMinimumApplied || (payload.scenario.ingest.serverlessOnly && payload.inventory.standardRaw === 0 && payload.ingest.standardLicensed === INSTANA_RULES.commercialMinimumMvs) ? 'Sí' : 'No', payload.ingest.standardLicensed]);
  if (payload.inventory.essentialsRaw > 0 || payload.inventory.essentialsLicensed > 0) mvsRows.push(['Essentials', payload.scenario.inventory.essentialsPhysical, payload.scenario.inventory.essentialsVirtual, payload.scenario.inventory.essentialsKubernetesWorkers, payload.inventory.essentialsRaw, payload.inventory.essentialsMinimumApplied ? 'Sí' : 'No', payload.inventory.essentialsLicensed]);
  row = addTable(worksheet, row, ['Edición', 'Servidores físicos', 'Servidores virtuales', 'Worker nodes', 'MVS declarados', 'Mínimo aplicado', 'MVS licenciados'], mvsRows, [18, 18, 18, 16, 16, 16, 18]) + 1;

  addSection(worksheet, row, 'Cuota e ingesta', 7);
  row += 1;
  const ingestRows: RowValues[] = [
    ['Ediciones seleccionadas', selectedEditions(payload), null],
    ['Mínimos aplicados', minimumSummary(payload), null],
    ['Cuota incluida', payload.ingest.baseIncludedGb, 'GB/mes'],
    ['Porcentaje usado por agentes', payload.scenario.ingest.agentConsumptionPercent, '%'],
    ['Cuota disponible', payload.ingest.remainingGb, 'GB/mes'],
  ];
  if (payload.scenario.addOns.dataIngest && payload.ingest.projectedServerlessOtelGb > 0) {
    ingestRows.push(['Volumen ingresado', payload.scenario.ingest.useTransactionalMode ? payload.ingest.transactionalWorkloads.reduce((sum, item) => sum + item.gbMonth, 0) : payload.scenario.ingest.serverlessOtelGbMonth, 'GB/mes']);
    ingestRows.push(['Crecimiento', payload.scenario.ingest.growthPercent, '%']);
    ingestRows.push(['Volumen proyectado', payload.ingest.projectedServerlessOtelGb, 'GB/mes']);
    ingestRows.push(['Exceso', payload.ingest.gbToLicense, 'GB/mes']);
    ingestRows.push(['Tamaño del bloque', INSTANA_RULES.dataIngest.unitGb, 'GB/mes']);
    ingestRows.push(['Unidades Data Ingest', payload.ingest.dataIngestUnits, INSTANA_RULES.dataIngest.unitLabel]);
  }
  addTable(worksheet, row, ['Concepto', 'Valor', 'Unidad'], ingestRows, [32, 32, 24]);
  worksheet.views = [{ state: 'frozen', ySplit: 3 }];
}

function additionalRows(payload: ExportPayload): RowValues[] {
  const rows: RowValues[] = [];
  if (payload.scenario.addOns.dataIngest && payload.ingest.projectedServerlessOtelGb > 0) {
    rows.push(['Data Ingest', 'Escenario', payload.scenario.ingest.serverlessOnly ? 'Solo serverless/OpenTelemetry' : 'Agentes + serverless/OpenTelemetry', null]);
    rows.push(['Data Ingest', 'Exceso', payload.ingest.gbToLicense, 'GB/mes']);
    rows.push(['Data Ingest', 'Unidades', payload.ingest.dataIngestUnits, INSTANA_RULES.dataIngest.unitLabel]);
    if (payload.ingest.dataIngestUnits > 0) rows.push(['Data Ingest', 'Part Number', INSTANA_RULES.dataIngest.partNumber, null]);
  }
  if (payload.scenario.addOns.logs) {
    rows.push(['Logs in Context', 'Retención', payload.logs.retentionLabel, null]);
    rows.push(['Logs in Context', 'Volumen considerado', payload.logs.projectedTbMonth, 'TB mensual']);
    rows.push(['Logs in Context', 'Unidades', payload.logs.units, INSTANA_RULES.logs.unitLabel]);
    if (payload.logs.units > 0) rows.push(['Logs in Context', 'Part Number', payload.logs.retentionPartNumber, null]);
  }
  if (payload.scenario.addOns.syntheticManagedPop && payload.synthetic.projectedRu > 0) {
    payload.synthetic.rows.forEach((row) => rows.push(['Synthetic', row.label, `${formatNumber(row.tests)} pruebas / ${formatNumber(row.monthlyExecutions)} ejecuciones`, `${formatNumber(row.projectedRu, 1)} RU proyectadas`]));
    rows.push(['Synthetic', 'Total RU proyectadas', payload.synthetic.projectedRu, 'RU/mes']);
    rows.push(['Synthetic', 'Unidades a cotizar', payload.synthetic.consideredUnits, INSTANA_RULES.synthetic.unitLabel]);
    rows.push(['Synthetic', 'RU disponibles', payload.synthetic.availableRu, 'RU/mes']);
    rows.push(['Synthetic', 'Part Number', INSTANA_RULES.synthetic.managedPopPartNumber, null]);
  }
  return rows;
}

function addAdditionalSheet(workbook: ExcelJS.Workbook, payload: ExportPayload) {
  const rows = additionalRows(payload);
  if (!rows.length) return;
  const worksheet = workbook.addWorksheet('Capacidades adicionales');
  setupPage(worksheet, true);
  addTitle(worksheet, 'Capacidades adicionales', 'Data Ingest, Logs y Synthetic aplicables');
  addTable(worksheet, 4, ['Capacidad', 'Métrica', 'Valor', 'Unidad'], rows, [24, 28, 34, 26]);
  worksheet.views = [{ state: 'frozen', ySplit: 4 }];
}

function addCatalogSheet(workbook: ExcelJS.Workbook, payload: ExportPayload) {
  const worksheet = workbook.addWorksheet('Catálogo y validaciones');
  setupPage(worksheet, true);
  worksheet.columns = [{ width: 26 }, { width: 24 }, { width: 18 }, { width: 18 }, { width: 30 }, { width: 28 }, { width: 28 }, { width: 34 }];
  addTitle(worksheet, 'Catálogo y validaciones', 'Reglas configuradas y validaciones pendientes');
  let row = 4;
  row = addTable(worksheet, row, ['ID', 'Modalidad', 'Edición', 'Part Number', 'Unidad comercial', 'Mínimo', 'Cuota / bloque', 'Estado'], INSTANA_RULES.catalog.map((item) => [
    item.id,
    item.modality,
    item.edition || null,
    item.partNumber,
    item.commercialUnit,
    item.minimum || null,
    item.quota || item.blockSize || null,
    item.validationStatus,
  ]), [28, 18, 16, 16, 30, 28, 28, 34]) + 1;
  addSection(worksheet, row, 'Validaciones y supuestos', 8);
  row += 1;
  addTable(worksheet, row, ['Categoría', 'Detalle'], [
    ['Fuente configurada', INSTANA_RULES.catalogSource],
    ['Fecha del catálogo', INSTANA_RULES.catalogDate],
    ['Mínimo comercial', `${INSTANA_RULES.commercialMinimumMvs} MVS cuando aplica`],
    ['Cuotas SaaS', `Standard ${INSTANA_RULES.saasQuotaGb.standard} GB/MVS/mes; Essentials ${INSTANA_RULES.saasQuotaGb.essentials} GB/MVS/mes`],
    ['Redondeos', `Data Ingest: ${INSTANA_RULES.dataIngest.unitLabel}; Logs: ${INSTANA_RULES.logs.unitLabel}; Synthetic: ${INSTANA_RULES.synthetic.unitLabel}`],
    ['Validación CPQ', CPQ_VALIDATION_NOTE],
    ...warningMessages(payload).map((warning) => ['Recomendación detectada', warning] as RowValues),
  ], [28, 90]);
  worksheet.views = [{ state: 'frozen', ySplit: 4 }];
}

export function createScenarioWorkbook(payload: ExportPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Instana Sizing Advisor';
  workbook.created = new Date();
  addSummarySheet(workbook, payload);
  addDetailSheet(workbook, payload);
  addAdditionalSheet(workbook, payload);
  addCatalogSheet(workbook, payload);
  workbook.worksheets.forEach((sheet) => {
    sheet.eachRow((row) => row.eachCell((cell) => {
      if (typeof cell.value === 'number') cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.0';
      cell.alignment = { ...cell.alignment, wrapText: true, vertical: cell.alignment?.vertical || 'top' };
    }));
  });
  return workbook;
}

async function downloadWorkbook(workbook: ExcelJS.Workbook, fileName: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportScenarioToExcel(payload: ExportPayload) {
  const workbook = createScenarioWorkbook(payload);
  await downloadWorkbook(workbook, `instana-sizing-advisor-${safeFileName(payload.scenario.general.client)}.xlsx`);
}
