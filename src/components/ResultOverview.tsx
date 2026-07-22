import type { IngestResult, InventoryResult, LogsResult, QuoteLine, ScenarioInput, SyntheticResult } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  scenario: ScenarioInput;
  inventory: InventoryResult;
  ingest: IngestResult;
  logs: LogsResult;
  synthetic: SyntheticResult;
  lines: QuoteLine[];
}

function lineSentence(line: QuoteLine) {
  return `Cotizar ${formatNumber(line.quantity)} unidades del Part Number ${line.partNumber} para ${line.component}.`;
}

export function ResultOverview({ scenario, inventory, ingest, logs, synthetic, lines }: Props) {
  const isSelfHosted = scenario.general.mode === 'Self-Hosted';
  const hasMinimum = inventory.standardMinimumApplied || inventory.essentialsMinimumApplied || (scenario.ingest.serverlessOnly && ingest.standardLicensed === 10 && inventory.standardRaw === 0);
  const warnings: string[] = [];
  if (hasMinimum) warnings.push('Mínimo comercial aplicado.');
  if (scenario.logs.retentionDays === 7 && scenario.addOns.logs) warnings.push('Retención incluida, sin licencia adicional de logs.');
  if (isSelfHosted) warnings.push('Sizing Self-Hosted pendiente de validación técnica.');

  return (
    <section className="result-hero" id="resultado-principal" data-testid="result-overview">
      <p className="eyebrow">Resultado ejecutivo</p>
      <h2>Resultado principal</h2>
      <h3>{lines.length === 0 ? 'Ingresa el inventario para obtener una recomendación.' : lineSentence(lines[0])}</h3>
      <p>Revisa el cálculo antes de emitir la cotización. La tabla de Part Numbers aparece en la siguiente sección y no incluye componentes con cantidad cero.</p>
      <div className="result-metrics">
        <div><span>Cliente u oportunidad</span><strong>{scenario.general.client || 'Sin cliente'}</strong></div>
        <div><span>Modalidad</span><strong>{scenario.general.mode}</strong></div>
        <div><span>Standard declarado</span><strong>{formatNumber(inventory.standardRaw)} MVS</strong></div>
        <div><span>Standard licenciado</span><strong>{formatNumber(ingest.standardLicensed)} MVS</strong></div>
        <div><span>Essentials declarado</span><strong>{formatNumber(inventory.essentialsRaw)} MVS</strong></div>
        <div><span>Essentials licenciado</span><strong>{formatNumber(inventory.essentialsLicensed)} MVS</strong></div>
        <div><span>Mínimo aplicado</span><strong>{hasMinimum ? 'Sí' : 'No'}</strong></div>
        <div><span>Componentes adicionales</span><strong>{lines.filter((line) => !line.component.includes('Standard') && !line.component.includes('Essentials')).length}</strong></div>
      </div>
      {lines.length > 0 && (
        <div className="executive-lines">
          {lines.map((line) => (
            <article key={`${line.component}-${line.partNumber}`}>
              <strong>{line.component}</strong>
              <p>Part Number: {line.partNumber}. Cantidad: {formatNumber(line.quantity)}. Unidad comercial: {line.unit}.</p>
              <p>{line.explanation}</p>
            </article>
          ))}
        </div>
      )}
      <div className="result-notes">
        <p><strong>Supuestos:</strong> las cantidades provienen del inventario declarado, los mínimos comerciales configurados y las capacidades SaaS activadas.</p>
        <p><strong>Validación CPQ:</strong> validar vigencia del Part Number, modalidad de licencia, plazo, precio y condiciones comerciales aplicables.</p>
        {warnings.map((warning) => <p key={warning}><strong>Advertencia:</strong> {warning}</p>)}
      </div>
      {scenario.ingest.serverlessOnly && ingest.standardLicensed === 10 && inventory.standardRaw === 0 && <p className="note strong-note">Alcance solo serverless/OpenTelemetry: Base comercial mínima de 10 MVS Standard. Esto no implica instalar físicamente 10 agentes.</p>}
      {scenario.addOns.dataIngest && <p className="note">Serverless/OpenTelemetry proyectado: {formatNumber(ingest.projectedServerlessOtelGb)} GB/mes. Data Ingest adicional: {formatNumber(ingest.dataIngestUnits)} bloques.</p>}
      {scenario.addOns.logs && <p className="note">Logs: {formatNumber(logs.projectedTbMonth, 1)} TB mensuales considerados. Unidades: {formatNumber(logs.units)}.</p>}
      {scenario.addOns.syntheticManagedPop && <p className="note">Synthetic: {formatNumber(synthetic.projectedRu, 1)} RU proyectadas. Unidades licenciadas: {formatNumber(synthetic.consideredUnits)}.</p>}
      {isSelfHosted && <p className="note strong-note">Self-Hosted separa las licencias MVS del dimensionamiento técnico de backend, storage, retención, ingesta y PoP privado si aplica.</p>}
    </section>
  );
}
