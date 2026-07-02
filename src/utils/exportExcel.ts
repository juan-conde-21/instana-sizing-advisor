import ExcelJS from 'exceljs';
import type { IngestResult, InventoryResult, LogsResult, QuoteLine, Recommendation, ScenarioInput, SyntheticResult } from '../types/sizing';
import { formatNumber } from './calculations';

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
const border = { style: 'thin' as const, color: { argb: 'FFE0E0E0' } };

function addSheet(workbook: ExcelJS.Workbook, name: string, rows: RowObject[]) {
  const worksheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  const headers = Object.keys(rows[0] || { Columna: '' });
  worksheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(header.length + 4, ...rows.map((row) => String(row[header] ?? '').length + 2), 14) }));
  rows.forEach((row) => worksheet.addRow(row));
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, worksheet.rowCount), column: headers.length } };
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

export function createScenarioWorkbook(payload: ExportPayload) {
  const { scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations } = payload;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Instana Sizing Advisor';
  workbook.created = new Date();

  addSheet(workbook, 'Resumen Ejecutivo', [
    { Campo: 'Cliente', Valor: scenario.general.client || 'Sin cliente' },
    { Campo: 'Modalidad', Valor: scenario.general.mode },
    { Campo: 'Ambiente', Valor: scenario.general.environment },
    { Campo: 'Region / ubicacion', Valor: scenario.general.region },
    { Campo: 'Fecha de generacion', Valor: new Date().toLocaleString('es-ES') },
    { Campo: 'Add-on Data Ingest', Valor: scenario.general.mode === 'SaaS' ? (scenario.addOns.dataIngest ? 'Activado' : 'Desactivado') : 'No aplica Self-Hosted' },
    { Campo: 'Add-on Logs', Valor: scenario.general.mode === 'SaaS' ? (scenario.addOns.logs ? 'Activado' : 'Desactivado') : 'No aplica Self-Hosted' },
    { Campo: 'Add-on Synthetic Managed PoP', Valor: scenario.general.mode === 'SaaS' ? (scenario.addOns.syntheticManagedPop ? 'Activado' : 'Desactivado') : 'No aplica Self-Hosted' },
    { Campo: 'Observaciones', Valor: scenario.general.notes },
  ]);

  addSheet(workbook, 'Inventario', [
    { Metrica: 'Standard declarado', Cantidad: inventory.standardRaw, Unidad: 'MVS' },
    { Metrica: 'Standard licenciado', Cantidad: ingest.standardLicensed, Unidad: 'MVS' },
    { Metrica: 'Essentials declarado', Cantidad: inventory.essentialsRaw, Unidad: 'MVS' },
    { Metrica: 'Essentials licenciado', Cantidad: inventory.essentialsLicensed, Unidad: 'MVS' },
    { Metrica: 'Fisicas Standard con sistema operativo', Cantidad: scenario.inventory.standardPhysical, Unidad: 'MVS' },
    { Metrica: 'VMs Standard con sistema operativo', Cantidad: scenario.inventory.standardVirtual, Unidad: 'MVS' },
    { Metrica: 'Kubernetes worker nodes Standard', Cantidad: scenario.inventory.standardKubernetesWorkers, Unidad: 'MVS' },
    { Metrica: 'Fisicas Essentials con sistema operativo', Cantidad: scenario.inventory.essentialsPhysical, Unidad: 'MVS' },
    { Metrica: 'VMs Essentials con sistema operativo', Cantidad: scenario.inventory.essentialsVirtual, Unidad: 'MVS' },
    { Metrica: 'Kubernetes worker nodes Essentials', Cantidad: scenario.inventory.essentialsKubernetesWorkers, Unidad: 'MVS' },
  ]);

  addSheet(workbook, 'Ingesta', [
    { Metrica: 'Modo serverless/OTel', Valor: scenario.ingest.useTransactionalMode ? 'Transaccional' : 'Rapido' },
    { Metrica: 'Crecimiento proyectado', Valor: scenario.ingest.growthPercent, Unidad: '%' },
    { Metrica: 'Cuota base incluida', Valor: ingest.baseIncludedGb, Unidad: 'GB/mes' },
    { Metrica: 'Consumo promedio agentes reales', Valor: ingest.agentAverageGb, Unidad: 'GB/mes' },
    { Metrica: 'Remanente disponible', Valor: ingest.remainingGb, Unidad: 'GB/mes' },
    { Metrica: 'Serverless / OTel proyectado', Valor: ingest.projectedServerlessOtelGb, Unidad: 'GB/mes' },
    { Metrica: 'Ingesta a licenciar', Valor: ingest.gbToLicense, Unidad: 'GB/mes' },
    { Metrica: 'Unidades Data Ingest', Valor: ingest.dataIngestUnits, Unidad: 'bloques de 100 GB/mes' },
  ]);

  addSheet(workbook, 'Serverless OTel', scenario.ingest.useTransactionalMode && ingest.transactionalWorkloads.length ? ingest.transactionalWorkloads.map((row) => ({
    Workload: row.name,
    Tipo: row.type,
    'TPS promedio': row.averageTps,
    'Spans por transaccion': row.spansPerTransaction,
    'Peso span KB': row.averageSpanKb,
    'GB/mes calculado': row.gbMonth,
    'GB/mes proyectado': row.projectedGbMonth,
  })) : [{ Workload: 'Modo rapido', Tipo: 'Manual', 'TPS promedio': '', 'Spans por transaccion': '', 'Peso span KB': '', 'GB/mes calculado': scenario.ingest.serverlessOtelGbMonth, 'GB/mes proyectado': ingest.manualProjectedServerlessOtelGb }]);

  addSheet(workbook, 'Comparacion 50 MVS', ingest.fiftyMvsScenario ? [ingest.currentScenario, ingest.fiftyMvsScenario].map((item) => ({
    Escenario: item.label,
    'MVS licenciados': item.standardLicensed,
    'Cuota base incluida': item.baseIncludedGb,
    'Consumo agentes reales': item.agentAverageGb,
    'Remanente disponible': item.remainingGb,
    'Serverless/OTel proyectado': item.projectedServerlessOtelGb,
    'Ingesta a licenciar': item.gbToLicense,
    'Unidades Data Ingest': item.dataIngestUnits,
  })) : [{ Escenario: 'No aplica', 'MVS licenciados': '', 'Cuota base incluida': '', 'Consumo agentes reales': '', 'Remanente disponible': '', 'Serverless/OTel proyectado': '', 'Ingesta a licenciar': '', 'Unidades Data Ingest': '' }]);

  addSheet(workbook, 'Logs', [
    { Metrica: 'Add-on activado', Valor: scenario.addOns.logs ? 'Si' : 'No' },
    { Metrica: 'Retencion', Valor: logs.retentionLabel },
    { Metrica: 'Volumen logs actual', Valor: scenario.logs.tbMonth, Unidad: 'TB mensual' },
    { Metrica: 'Sugerencia de crecimiento Logs', Valor: scenario.logs.growthPercent, Unidad: '%' },
    { Metrica: scenario.logs.growthPercent > 0 ? 'Logs proyectados' : 'Volumen considerado', Valor: logs.projectedTbMonth, Unidad: 'TB mensual' },
    { Metrica: 'Unidades logs', Valor: logs.units, Unidad: 'bloques de 1 TB mensual' },
  ]);

  addSheet(workbook, 'Synthetic', [
    ...synthetic.rows.map((row) => ({
      'Tipo de prueba': row.label,
      'Cantidad de tests': row.tests,
      'Frecuencia en minutos': row.frequencyMinutes,
      Ubicaciones: row.locations,
      'RU por ejecucion': row.ruPerExecution,
      'Ejecuciones mensuales': row.monthlyExecutions,
      'Subtotal RU mensual': row.monthlyRu,
      'RU proyectadas': row.projectedRu,
    })),
    { 'Tipo de prueba': `Total RU calculadas (crecimiento Synthetic ${scenario.syntheticGrowthPercent}%)`, 'Cantidad de tests': '', 'Frecuencia en minutos': '', Ubicaciones: '', 'RU por ejecucion': '', 'Ejecuciones mensuales': '', 'Subtotal RU mensual': synthetic.totalRu, 'RU proyectadas': synthetic.projectedRu },
    { 'Tipo de prueba': 'Unidades calculadas', 'Cantidad de tests': '', 'Frecuencia en minutos': '', Ubicaciones: '', 'RU por ejecucion': '', 'Ejecuciones mensuales': '', 'Subtotal RU mensual': '', 'RU proyectadas': synthetic.calculatedUnits },
    { 'Tipo de prueba': 'Unidades licenciadas', 'Cantidad de tests': '', 'Frecuencia en minutos': '', Ubicaciones: '', 'RU por ejecucion': '', 'Ejecuciones mensuales': '', 'Subtotal RU mensual': '', 'RU proyectadas': synthetic.consideredUnits },
    { 'Tipo de prueba': 'RU licenciadas', 'Cantidad de tests': '', 'Frecuencia en minutos': '', Ubicaciones: '', 'RU por ejecucion': '', 'Ejecuciones mensuales': '', 'Subtotal RU mensual': '', 'RU proyectadas': synthetic.licensedRu },
    { 'Tipo de prueba': 'RU disponibles', 'Cantidad de tests': '', 'Frecuencia en minutos': '', Ubicaciones: '', 'RU por ejecucion': '', 'Ejecuciones mensuales': '', 'Subtotal RU mensual': '', 'RU proyectadas': synthetic.availableRu },
  ]);



  if (scenario.general.mode === 'Self-Hosted') {
    addSheet(workbook, 'Consideraciones Self-Hosted', [
      { Consideracion: 'General', Detalle: 'En despliegues Self-Hosted, los add-ons SaaS de Data Ingest, Logs in Context y Synthetic Managed PoP no se incluyen como componentes de cotización. Estos volúmenes deben considerarse dentro del dimensionamiento técnico de la plataforma Instana, incluyendo backend, storage, retención, capacidad de ingesta y PoP privado si aplica.' },
      { Consideracion: 'Ingesta serverless/OpenTelemetry', Detalle: ingest.projectedServerlessOtelGb > 0 ? 'La ingesta declarada debe considerarse como referencia para estimar capacidad de backend, procesamiento y almacenamiento.' : 'Sin ingesta declarada.' },
      { Consideracion: 'Logs', Detalle: scenario.logs.tbMonth > 0 ? 'El volumen de logs debe considerarse para estimar storage, retención e impacto en la plataforma Self-Hosted.' : 'Sin volumen de logs declarado.' },
      { Consideracion: 'Synthetic', Detalle: synthetic.projectedRu > 0 ? 'Las pruebas Synthetic desde PoP privado deben considerarse en el dimensionamiento del PoP y su infraestructura asociada.' : 'Sin pruebas Synthetic declaradas.' },
    ]);
  }

  addSheet(workbook, 'Resumen de cotizacion', quoteLines.length ? quoteLines.map((line) => ({
    Componente: line.component,
    'Part number': line.partNumber,
    Cantidad: line.quantity,
    Unidad: line.unit,
    Explicacion: line.explanation,
  })) : [{ Componente: 'Sin componentes con cantidad mayor a cero', 'Part number': '', Cantidad: '', Unidad: '', Explicacion: '' }]);

  addSheet(workbook, 'Recomendaciones', recommendations.length ? recommendations.map((item) => ({
    Recomendacion: item.title,
    Detalle: item.detail,
    Severidad: item.severity,
  })) : [{ Recomendacion: 'Sin recomendaciones detectadas', Detalle: '', Severidad: '' }]);

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
  const safeClient = (payload.scenario.general.client || 'escenario').replace(/\s+/g, '-').toLowerCase();
  await downloadWorkbook(workbook, `instana-sizing-advisor-${safeClient}.xlsx`);
}
