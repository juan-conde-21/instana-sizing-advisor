import ExcelJS from 'exceljs';
import { INSTANA_RULES } from '../rules/instanaRules';
import type { IngestResult, InventoryResult, LogsResult, QuoteLine, Recommendation, ScenarioInput, SyntheticResult } from '../types/sizing';
import { formatNumber } from './calculations';
import { additionalCapabilities, minimumSummary, recommendationHeadline, safeFileName, selectedEditions, warningMessages } from './reporting';

export interface ExportPayload {
  scenario: ScenarioInput;
  inventory: InventoryResult;
  ingest: IngestResult;
  logs: LogsResult;
  synthetic: SyntheticResult;
  quoteLines: QuoteLine[];
  recommendations: Recommendation[];
}

type CellValue = string | number;
type RowObject = Record<string, CellValue>;

const headerFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF0F62FE' } };
const titleFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF001D6C' } };
const border = { style: 'thin' as const, color: { argb: 'FFE0E0E0' } };

function styleSheet(worksheet: ExcelJS.Worksheet, freeze = true) {
  if (freeze) worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
    cell.border = { top: border, right: border, bottom: border, left: border };
  });
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = { top: border, right: border, bottom: border, left: border };
      cell.alignment = { vertical: 'top', wrapText: true };
      if (rowNumber > 1 && String(row.getCell(1).value).toLowerCase().includes('total')) cell.font = { bold: true };
    });
  });
}

function addTableSheet(workbook: ExcelJS.Workbook, name: string, rows: RowObject[], widths?: number[]) {
  if (!rows.length) return undefined;
  const worksheet = workbook.addWorksheet(name);
  const headers = Object.keys(rows[0]);
  worksheet.columns = headers.map((header, index) => ({ header, key: header, width: widths?.[index] || Math.max(16, Math.min(42, header.length + 8)) }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: worksheet.rowCount, column: headers.length } };
  styleSheet(worksheet);
  return worksheet;
}

function addSummarySheet(workbook: ExcelJS.Workbook, payload: ExportPayload) {
  const { scenario, inventory, ingest, quoteLines, recommendations } = payload;
  const worksheet = workbook.addWorksheet('Resumen comercial');
  worksheet.columns = [{ width: 34 }, { width: 92 }];
  const rows: Array<[string, string | number]> = [
    ['IBM Instana Observability', 'Estimación de licenciamiento'],
    ['Cliente u oportunidad', scenario.general.client || 'Sin cliente'],
    ['Modalidad', scenario.general.mode],
    ['Fecha', new Date().toLocaleString('es-ES')],
    ['Recomendación principal', recommendationHeadline(payload)],
    ['Ediciones seleccionadas', selectedEditions(payload)],
    ['MVS declarados', `Standard ${formatNumber(inventory.standardRaw)} / Essentials ${formatNumber(inventory.essentialsRaw)}`],
    ['MVS licenciados', `Standard ${formatNumber(ingest.standardLicensed)} / Essentials ${formatNumber(inventory.essentialsLicensed)}`],
    ['Mínimos aplicados', minimumSummary(payload)],
    ['Capacidades adicionales', additionalCapabilities(payload)],
    ['Part Numbers', quoteLines.length ? quoteLines.map((line) => `${line.partNumber} (${formatNumber(line.quantity)} ${line.unit})`).join('\n') : 'Sin componentes con cantidad mayor a cero'],
    ['Advertencias', warningMessages(payload).join('\n')],
    ['Nota de validación CPQ', 'Validar Part Numbers, cantidades, condiciones y vigencia comercial contra CPQ antes de emitir la cotización.'],
    ['Reglas pendientes de validación', INSTANA_RULES.catalog.filter((item) => item.validationStatus.includes('Pendiente')).map((item) => `${item.id}: ${item.validationStatus}`).join('\n')],
    ['Recomendaciones detectadas', recommendations.length ? recommendations.map((item) => `${item.title} ${item.detail}`).join('\n') : 'Información completa. Sin recomendaciones adicionales detectadas.'],
  ];
  worksheet.addRow(['Campo', 'Valor']);
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).eachCell((cell) => {
    cell.fill = titleFill;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
  styleSheet(worksheet, false);
}

function quoteRows(payload: ExportPayload): RowObject[] {
  return payload.quoteLines.filter((line) => line.quantity > 0).map((line) => {
    const catalogEntry = INSTANA_RULES.catalog.find((item) => item.partNumber === line.partNumber);
    const edition = line.component.includes('Standard') ? 'Standard' : line.component.includes('Essentials') ? 'Essentials' : '';
    return {
      Componente: line.component,
      Modalidad: payload.scenario.general.mode,
      Edición: edition,
      'Part Number': line.partNumber,
      Descripción: catalogEntry?.description || line.component,
      Cantidad: line.quantity,
      'Unidad comercial': line.unit,
      'Regla aplicada': catalogEntry?.minimum || catalogEntry?.blockSize || 'Cantidad calculada según regla aplicable',
      Explicación: line.explanation,
    };
  });
}

function mvsRows(payload: ExportPayload): RowObject[] {
  const rows: RowObject[] = [];
  const { scenario, inventory, ingest } = payload;
  if (inventory.standardRaw > 0 || ingest.standardLicensed > 0) rows.push({
    Edición: 'Standard',
    'Servidores físicos': scenario.inventory.standardPhysical,
    'Servidores virtuales': scenario.inventory.standardVirtual,
    'Worker nodes': scenario.inventory.standardKubernetesWorkers,
    'MVS declarados': inventory.standardRaw,
    'Mínimo aplicado': inventory.standardMinimumApplied || (scenario.ingest.serverlessOnly && inventory.standardRaw === 0 && ingest.standardLicensed === INSTANA_RULES.commercialMinimumMvs) ? 'Sí' : 'No',
    'MVS a licenciar': ingest.standardLicensed,
    Explicación: scenario.ingest.serverlessOnly && inventory.standardRaw === 0 && ingest.standardLicensed > 0 ? 'Base comercial mínima de 10 MVS Standard para alcance solo serverless/OpenTelemetry.' : 'Suma de servidores físicos, virtuales y worker nodes Standard.',
  });
  if (inventory.essentialsRaw > 0 || inventory.essentialsLicensed > 0) rows.push({
    Edición: 'Essentials',
    'Servidores físicos': scenario.inventory.essentialsPhysical,
    'Servidores virtuales': scenario.inventory.essentialsVirtual,
    'Worker nodes': scenario.inventory.essentialsKubernetesWorkers,
    'MVS declarados': inventory.essentialsRaw,
    'Mínimo aplicado': inventory.essentialsMinimumApplied ? 'Sí' : 'No',
    'MVS a licenciar': inventory.essentialsLicensed,
    Explicación: 'Suma de servidores físicos, virtuales y worker nodes Essentials.',
  });
  return rows;
}

function ingestRows(payload: ExportPayload): RowObject[] {
  const { scenario, ingest } = payload;
  if (scenario.general.mode !== 'SaaS' || !scenario.addOns.dataIngest || ingest.projectedServerlessOtelGb <= 0) return [];
  return [
    { Campo: 'Tipo de escenario', Valor: scenario.ingest.serverlessOnly ? 'Solo serverless/OpenTelemetry' : 'Agentes + serverless/OpenTelemetry', Unidad: '' },
    { Campo: 'MVS base', Valor: `Standard ${formatNumber(ingest.standardLicensed)} / Essentials ${formatNumber(ingest.essentialsLicensed)}`, Unidad: 'MVS' },
    { Campo: 'Cuota incluida', Valor: ingest.baseIncludedGb, Unidad: 'GB/mes' },
    { Campo: 'Porcentaje usado por agentes', Valor: scenario.ingest.agentConsumptionPercent, Unidad: '%' },
    { Campo: 'Cuota disponible', Valor: ingest.remainingGb, Unidad: 'GB/mes' },
    { Campo: 'Volumen ingresado', Valor: scenario.ingest.useTransactionalMode ? ingest.transactionalWorkloads.reduce((sum, row) => sum + row.gbMonth, 0) : scenario.ingest.serverlessOtelGbMonth, Unidad: 'GB/mes' },
    { Campo: 'Crecimiento', Valor: scenario.ingest.growthPercent, Unidad: '%' },
    { Campo: 'Volumen proyectado', Valor: ingest.projectedServerlessOtelGb, Unidad: 'GB/mes' },
    { Campo: 'Exceso', Valor: ingest.gbToLicense, Unidad: 'GB/mes' },
    { Campo: 'Tamaño de bloque', Valor: INSTANA_RULES.dataIngest.unitGb, Unidad: 'GB/mes' },
    { Campo: 'Unidades', Valor: ingest.dataIngestUnits, Unidad: INSTANA_RULES.dataIngest.unitLabel },
    { Campo: 'Part Number', Valor: ingest.dataIngestUnits > 0 ? INSTANA_RULES.dataIngest.partNumber : 'No aplica', Unidad: '' },
  ];
}

function logsSyntheticRows(payload: ExportPayload): RowObject[] {
  const rows: RowObject[] = [];
  const { scenario, logs, synthetic } = payload;
  if (scenario.addOns.logs) {
    rows.push({ Capacidad: 'Logs in Context', Métrica: 'Retención', Valor: logs.retentionLabel, Unidad: '' });
    rows.push({ Capacidad: 'Logs in Context', Métrica: 'Volumen considerado', Valor: logs.projectedTbMonth, Unidad: 'TB mensual' });
    rows.push({ Capacidad: 'Logs in Context', Métrica: 'Unidades', Valor: logs.units, Unidad: INSTANA_RULES.logs.unitLabel });
    if (logs.units > 0) rows.push({ Capacidad: 'Logs in Context', Métrica: 'Part Number', Valor: logs.retentionPartNumber, Unidad: '' });
  }
  if (scenario.addOns.syntheticManagedPop && synthetic.projectedRu > 0) {
    synthetic.rows.forEach((row) => rows.push({ Capacidad: 'Synthetic', Métrica: row.label, Valor: `${formatNumber(row.tests)} pruebas / ${formatNumber(row.monthlyExecutions)} ejecuciones / ${formatNumber(row.projectedRu, 1)} RU`, Unidad: 'mensual' }));
    rows.push({ Capacidad: 'Synthetic', Métrica: 'Total RU proyectadas', Valor: synthetic.projectedRu, Unidad: 'RU/mes' });
    rows.push({ Capacidad: 'Synthetic', Métrica: 'Unidades a cotizar', Valor: synthetic.consideredUnits, Unidad: INSTANA_RULES.synthetic.unitLabel });
    rows.push({ Capacidad: 'Synthetic', Métrica: 'RU disponibles luego del redondeo', Valor: synthetic.availableRu, Unidad: 'RU/mes' });
    rows.push({ Capacidad: 'Synthetic', Métrica: 'Part Number', Valor: INSTANA_RULES.synthetic.managedPopPartNumber, Unidad: '' });
  }
  return rows;
}

function assumptionsRows(payload: ExportPayload): RowObject[] {
  return [
    { Categoría: 'Regla comercial vigente', Detalle: `Mínimo comercial: ${INSTANA_RULES.commercialMinimumMvs} MVS cuando aplica.` },
    { Categoría: 'Fecha del catálogo', Detalle: INSTANA_RULES.catalogDate },
    { Categoría: 'Cuotas SaaS', Detalle: `Standard ${INSTANA_RULES.saasQuotaGb.standard} GB/MVS/mes; Essentials ${INSTANA_RULES.saasQuotaGb.essentials} GB/MVS/mes.` },
    { Categoría: 'Redondeos', Detalle: `Data Ingest redondea por ${INSTANA_RULES.dataIngest.unitLabel}; Logs redondea por ${INSTANA_RULES.logs.unitLabel}; Synthetic redondea por ${INSTANA_RULES.synthetic.unitLabel}.` },
    { Categoría: 'Synthetic', Detalle: `Mínimo: ${INSTANA_RULES.synthetic.minimumUnits} unidades. Minutos por mes: ${INSTANA_RULES.monthlyMinutes}.` },
    { Categoría: 'Fuente configurada', Detalle: INSTANA_RULES.catalogSource },
    { Categoría: 'Validación CPQ', Detalle: 'Validar Part Numbers, cantidades, unidad comercial, condiciones y vigencia contra CPQ antes de emitir la cotización.' },
    ...warningMessages(payload).map((warning) => ({ Categoría: 'Advertencia', Detalle: warning })),
  ];
}

export function createScenarioWorkbook(payload: ExportPayload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Instana Sizing Advisor';
  workbook.created = new Date();
  addSummarySheet(workbook, payload);
  addTableSheet(workbook, 'Part Numbers a cotizar', quoteRows(payload), [28, 16, 14, 16, 34, 12, 26, 34, 56]);
  addTableSheet(workbook, 'Detalle de MVS', mvsRows(payload), [18, 18, 18, 16, 16, 18, 16, 60]);
  addTableSheet(workbook, 'Ingesta adicional', ingestRows(payload), [30, 32, 18]);
  addTableSheet(workbook, 'Logs y Synthetic', logsSyntheticRows(payload), [22, 30, 34, 20]);
  addTableSheet(workbook, 'Supuestos y validaciones', assumptionsRows(payload), [28, 92]);
  workbook.worksheets.forEach((sheet) => {
    sheet.eachRow((row) => row.eachCell((cell) => {
      if (typeof cell.value === 'number') cell.numFmt = '#,##0.0';
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
