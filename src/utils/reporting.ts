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

export const CPQ_VALIDATION_NOTE = 'Validar en CPQ la vigencia de los Part Numbers, modalidad de licencia, plazo, precio y condiciones comerciales aplicables.';

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
  return Array.from(new Set(payload.recommendations.map((item) => `${item.title} ${item.detail}`)));
}

function phraseForLine(line: QuoteLine) {
  if (line.unit === 'MVS' || line.unit === 'MVS / mes') return `${formatNumber(line.quantity)} ${line.unit.replace(' / mes', '')} de ${line.component}`;
  return `${formatNumber(line.quantity)} ${line.unit} de ${line.component}`;
}

export function executiveRecommendation(payload: ReportPayload) {
  const lines = payload.quoteLines.filter((line) => line.quantity > 0);
  if (!lines.length) return 'No hay componentes con cantidad mayor a cero para cotizar.';
  if (lines.length === 1) return `Cotizar ${phraseForLine(lines[0])}.`;
  const phrases = lines.map(phraseForLine);
  return `Cotizar ${phrases.slice(0, -1).join(', ')} y ${phrases[phrases.length - 1]}.`;
}

export function recommendationHeadline(payload: ReportPayload) {
  return executiveRecommendation(payload);
}

export function commercialJustification(payload: ReportPayload) {
  const { scenario, inventory, ingest, logs, synthetic } = payload;
  if (scenario.general.mode === 'Self-Hosted') {
    return `El escenario Self-Hosted considera ${formatNumber(inventory.standardRaw)} MVS Standard declarados y ${formatNumber(inventory.essentialsRaw)} MVS Essentials declarados. La cotización incluye las licencias MVS aplicables; la infraestructura de backend, storage, retención, ingesta y PoP privado debe validarse con sizing técnico.`;
  }
  if (scenario.addOns.dataIngest && ingest.projectedServerlessOtelGb > 0) {
    return `Los MVS base entregan una cuota incluida de ${formatNumber(ingest.baseIncludedGb)} GB/mes. Considerando un uso estimado del ${formatNumber(scenario.ingest.agentConsumptionPercent)}% por los agentes, quedan ${formatNumber(ingest.remainingGb)} GB/mes disponibles. La telemetría adicional proyectada asciende a ${formatNumber(ingest.projectedServerlessOtelGb)} GB/mes, por lo que se requieren ${formatNumber(ingest.dataIngestUnits)} bloques adicionales de ${formatNumber(INSTANA_RULES.dataIngest.unitGb)} GB/mes.`;
  }
  if (scenario.addOns.logs && logs.units > 0) {
    return `El escenario incluye retención ampliada de logs para ${formatNumber(logs.projectedTbMonth, 1)} TB mensuales considerados. El cálculo se redondea a ${formatNumber(logs.units)} unidades según bloques de 1 TB mensual.`;
  }
  if (scenario.addOns.syntheticManagedPop && synthetic.consideredUnits > 0) {
    return `El escenario incluye Synthetic Managed PoP con ${formatNumber(synthetic.projectedRu, 1)} RU proyectadas. Se cotizan ${formatNumber(synthetic.consideredUnits)} unidades y quedan ${formatNumber(synthetic.availableRu, 1)} RU disponibles luego del redondeo.`;
  }
  return `El resultado se obtiene a partir de los MVS declarados para Standard y Essentials, aplicando los mínimos comerciales configurados cuando corresponden y excluyendo líneas con cantidad cero.`;
}

export function quoteSummaryText(payload: ReportPayload) {
  const lines = [
    'IBM Instana Observability - Estimación de licenciamiento',
    `Cliente u oportunidad: ${payload.scenario.general.client || 'Sin cliente'}`,
    `Modalidad: ${payload.scenario.general.mode}`,
    `Recomendación: ${executiveRecommendation(payload)}`,
    'Part Numbers:',
    ...(payload.quoteLines.length ? payload.quoteLines.map((line) => `- ${line.component}: ${line.partNumber}, cantidad ${formatNumber(line.quantity)}, unidad ${line.unit}`) : ['- Sin componentes con cantidad mayor a cero']),
    'Advertencias:',
    `- ${CPQ_VALIDATION_NOTE}`,
    ...warningMessages(payload).map((warning) => `- ${warning}`),
  ];
  return lines.join('\n');
}
