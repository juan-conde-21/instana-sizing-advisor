import { INSTANA_RULES } from '../rules/instanaRules';
import type { IngestResult, InventoryResult, LogsResult, QuoteLine, Recommendation, ScenarioInput, SyntheticResult } from '../types/sizing';
import { formatNumber } from './calculations';

export interface ReportPayload {
  scenario: ScenarioInput;
  inventory: InventoryResult;
  ingest: IngestResult;
  logs: LogsResult;
  synthetic: SyntheticResult;
  quoteLines: QuoteLine[];
  recommendations: Recommendation[];
}

export function safeFileName(input: string) {
  return (input || 'escenario')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'escenario';
}

export function selectedEditions(payload: ReportPayload) {
  const editions: string[] = [];
  if (payload.inventory.standardRaw > 0 || payload.ingest.standardLicensed > 0) editions.push('Standard');
  if (payload.inventory.essentialsRaw > 0 || payload.inventory.essentialsLicensed > 0) editions.push('Essentials');
  return editions.length ? editions.join(', ') : 'Sin edición con cantidad mayor a cero';
}

export function additionalCapabilities(payload: ReportPayload) {
  const values: string[] = [];
  if (payload.scenario.addOns.dataIngest && payload.ingest.dataIngestUnits > 0) values.push('Data Ingest adicional');
  if (payload.scenario.addOns.logs && payload.logs.units > 0) values.push('Logs in Context');
  if (payload.scenario.addOns.syntheticManagedPop && payload.synthetic.consideredUnits > 0) values.push('Synthetic Managed PoP');
  return values.length ? values.join(', ') : 'Sin capacidades adicionales a cotizar';
}

export function minimumSummary(payload: ReportPayload) {
  const values: string[] = [];
  if (payload.inventory.standardMinimumApplied) values.push('Standard');
  if (payload.inventory.essentialsMinimumApplied) values.push('Essentials');
  if (payload.scenario.ingest.serverlessOnly && payload.ingest.standardLicensed === INSTANA_RULES.commercialMinimumMvs && payload.inventory.standardRaw === 0) values.push('Base comercial mínima Standard por solo serverless/OpenTelemetry');
  return values.length ? values.join(', ') : 'No se aplicó mínimo comercial';
}

export function warningMessages(payload: ReportPayload) {
  const warnings = payload.recommendations.map((item) => `${item.title} ${item.detail}`);
  if (payload.quoteLines.some((line) => line.unit.includes('Pendiente'))) warnings.push('Unidad comercial pendiente de validación comercial.');
  warnings.push('Validar Part Numbers, cantidades, condiciones y vigencia comercial contra CPQ antes de emitir la cotización.');
  return Array.from(new Set(warnings));
}

export function recommendationHeadline(payload: ReportPayload) {
  if (!payload.quoteLines.length) return 'No hay componentes con cantidad mayor a cero para cotizar.';
  const first = payload.quoteLines[0];
  return `Cotizar ${formatNumber(first.quantity)} unidades del Part Number ${first.partNumber} para ${first.component}.`;
}

export function quoteSummaryText(payload: ReportPayload) {
  const lines = [
    'IBM Instana Observability - Estimación de licenciamiento',
    `Cliente u oportunidad: ${payload.scenario.general.client || 'Sin cliente'}`,
    `Modalidad: ${payload.scenario.general.mode}`,
    `Recomendación: ${recommendationHeadline(payload)}`,
    'Part Numbers:',
    ...(payload.quoteLines.length ? payload.quoteLines.map((line) => `- ${line.component}: ${line.partNumber}, cantidad ${formatNumber(line.quantity)}, unidad ${line.unit}`) : ['- Sin componentes con cantidad mayor a cero']),
    'Advertencias:',
    ...warningMessages(payload).map((warning) => `- ${warning}`),
  ];
  return lines.join('\n');
}
