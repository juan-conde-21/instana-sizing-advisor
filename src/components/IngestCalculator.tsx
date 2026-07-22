import { INSTANA_RULES } from '../rules/instanaRules';
import type { IngestInput, IngestResult, InventoryResult, ScenarioInput, ServerlessWorkloadInput, ServerlessWorkloadType } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  scenario: ScenarioInput;
  inventory: InventoryResult;
  ingest: IngestResult;
  onChange: (value: IngestInput) => void;
}

const workloadTypes: ServerlessWorkloadType[] = ['AWS Lambda', 'Cloud Run', 'Azure Functions', 'Azure Web Apps', 'OpenTelemetry', 'Otro'];

export function IngestCalculator({ scenario, inventory, ingest, onChange }: Props) {
  const value = scenario.ingest;
  const rawAdditionalGb = value.useTransactionalMode
    ? ingest.transactionalWorkloads.reduce((sum, row) => sum + row.gbMonth, 0)
    : Math.max(0, value.serverlessOtelGbMonth);
  const hasDeclaredMvs = inventory.standardRaw > 0 || inventory.essentialsRaw > 0;
  const serverlessOnlyActive = value.serverlessOnly && !hasDeclaredMvs && ingest.projectedServerlessOtelGb > 0;

  const setNumber = (field: keyof IngestInput, next: string) => onChange({ ...value, [field]: Math.max(0, Number(next) || 0), fiftyMvsConfirmed: field === 'serverlessOtelGbMonth' || field === 'growthPercent' || field === 'agentConsumptionPercent' ? false : value.fiftyMvsConfirmed });

  const updateWorkload = (index: number, next: Partial<ServerlessWorkloadInput>) => {
    const rows = [...value.transactionalWorkloads];
    rows[index] = { ...rows[index], ...next };
    onChange({ ...value, transactionalWorkloads: rows, fiftyMvsConfirmed: false });
  };

  const addWorkload = () => {
    onChange({
      ...value,
      fiftyMvsConfirmed: false,
      transactionalWorkloads: [
        ...value.transactionalWorkloads,
        { id: (globalThis.crypto?.randomUUID?.() || `workload-${Date.now()}-${value.transactionalWorkloads.length}`), name: `Workload ${value.transactionalWorkloads.length + 1}`, type: 'OpenTelemetry', averageTps: 1, spansPerTransaction: 5, averageSpanKb: 2 },
      ],
    });
  };

  const removeWorkload = (index: number) => onChange({ ...value, transactionalWorkloads: value.transactionalWorkloads.filter((_, rowIndex) => rowIndex !== index), fiftyMvsConfirmed: false });
  const setServerlessOnly = (checked: boolean) => onChange({ ...value, serverlessOnly: checked, useFiftyMvsScenario: false, fiftyMvsConfirmed: false });
  const setMode = (checked: boolean) => onChange({ ...value, useTransactionalMode: checked, useFiftyMvsScenario: false, fiftyMvsConfirmed: false });

  return (
    <section className="section-card" id="ingesta" data-testid="ingest-module">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SaaS</p>
          <h2>Ingesta adicional de datos - SaaS</h2>
          <p>Utiliza esta sección cuando se enviará telemetría desde AWS Lambda, Azure Functions, Cloud Run, Azure Web Apps, OpenTelemetry Collector u otras fuentes que no dependen de un agente instalado en un servidor tradicional.</p>
        </div>
      </div>

      <div className="question-panel">
        <strong>Preguntas sugeridas</strong>
        <ul>
          <li>¿Existen funciones serverless o telemetría OpenTelemetry?</li>
          <li>¿También habrá servidores con agente o el alcance será únicamente serverless?</li>
          <li>¿Cuál es el volumen mensual estimado o medido en GB?</li>
        </ul>
      </div>

      <div className="form-grid compact section-gap">
        <label>
          <span className="label-with-help">Porcentaje estimado de la cuota incluida utilizado por los agentes<span className="help-icon" title="Utiliza 80% como referencia inicial cuando todavía no exista una medición real. Reemplaza este porcentaje cuando se cuente con datos observados.">?</span></span>
          <input data-testid="agent-consumption-input" type="number" min={0} value={value.agentConsumptionPercent} onChange={(event) => setNumber('agentConsumptionPercent', event.target.value)} />
        </label>
        <label className="checkbox-label">
          <input data-testid="serverless-only-toggle" type="checkbox" checked={value.serverlessOnly} onChange={(event) => setServerlessOnly(event.target.checked)} />
          El alcance es solo serverless / OpenTelemetry
        </label>
        <label className="checkbox-label">
          <input data-testid="transactional-mode-toggle" type="checkbox" checked={value.useTransactionalMode} onChange={(event) => setMode(event.target.checked)} />
          Calcular desde TPS y spans
        </label>
      </div>

      {value.serverlessOnly && (
        <p className="note strong-note">No existen servidores físicos, servidores virtuales ni worker nodes con agente. La herramienta considerará una base comercial mínima de 10 MVS Standard antes de calcular cualquier exceso de ingesta.</p>
      )}
      {value.serverlessOnly && hasDeclaredMvs && (
        <p className="note warning-note">El alcance está marcado como solo serverless/OpenTelemetry, pero existen MVS ingresados. Cambia a agentes + serverless o deja el inventario en cero para aplicar la base comercial mínima.</p>
      )}
      {serverlessOnlyActive && <p className="note strong-note">Base comercial mínima de 10 MVS Standard.</p>}

      {!value.useTransactionalMode ? (
        <div className="form-grid compact section-gap">
          <label>
            Volumen mensual conocido en GB
            <input data-testid="serverless-otel-ingest-input" type="number" min={0} value={value.serverlessOtelGbMonth} onChange={(event) => setNumber('serverlessOtelGbMonth', event.target.value)} />
          </label>
          <label>
            Crecimiento esperado (%)
            <input data-testid="ingest-growth-input" type="number" min={0} value={value.growthPercent} onChange={(event) => setNumber('growthPercent', event.target.value)} />
          </label>
        </div>
      ) : (
        <div className="section-gap" data-testid="technical-ingest-mode">
          <p className="note">Modo técnico avanzado. TPS significa transacciones por segundo; los spans son eventos de trazabilidad generados por una transacción. La fórmula actual usa 30 días de mes comercial.</p>
          <div className="table-wrap">
            <table data-testid="transactional-ingest-table">
              <thead>
                <tr>
                  <th>Nombre del workload</th>
                  <th>Tipo</th>
                  <th>TPS promedio</th>
                  <th>Spans por transacción</th>
                  <th>Tamaño promedio del span KB</th>
                  <th>Días aplicables</th>
                  <th>GB/mes calculado</th>
                  <th>GB/mes proyectado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {ingest.transactionalWorkloads.length === 0 && (
                  <tr><td colSpan={9} className="empty">Agrega un workload para estimar la ingesta por volumen transaccional.</td></tr>
                )}
                {ingest.transactionalWorkloads.map((row, index) => (
                  <tr key={row.id}>
                    <td><input aria-label="Nombre del workload" value={row.name} onChange={(event) => updateWorkload(index, { name: event.target.value })} /></td>
                    <td>
                      <select aria-label="Tipo" value={row.type} onChange={(event) => updateWorkload(index, { type: event.target.value as ServerlessWorkloadType })}>
                        {workloadTypes.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </td>
                    <td><input aria-label="TPS promedio" type="number" min={0} value={row.averageTps} onChange={(event) => updateWorkload(index, { averageTps: Math.max(0, Number(event.target.value) || 0) })} /></td>
                    <td><input aria-label="Spans por transacción" type="number" min={0} value={row.spansPerTransaction} onChange={(event) => updateWorkload(index, { spansPerTransaction: Math.max(0, Number(event.target.value) || 0) })} /></td>
                    <td><input aria-label="Tamaño promedio del span KB" type="number" min={0} value={row.averageSpanKb} onChange={(event) => updateWorkload(index, { averageSpanKb: Math.max(0, Number(event.target.value) || 0) })} /></td>
                    <td>30 días</td>
                    <td>{formatNumber(row.gbMonth, 2)}</td>
                    <td>{formatNumber(row.projectedGbMonth, 2)}</td>
                    <td><button className="secondary" type="button" onClick={() => removeWorkload(index)}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="secondary section-gap" data-testid="add-transactional-row-button" type="button" onClick={addWorkload}>Agregar fila</button>
        </div>
      )}

      <div className="metric-grid section-gap">
        <Metric label="MVS base" value={`${formatNumber(ingest.standardLicensed)} Standard / ${formatNumber(ingest.essentialsLicensed)} Essentials`} />
        <Metric label="Cuota incluida total" value={`${formatNumber(ingest.baseIncludedGb)} GB/mes`} />
        <Metric label="Consumo estimado de agentes" value={`${formatNumber(ingest.agentAverageGb)} GB/mes`} />
        <Metric label="Cuota disponible" value={`${formatNumber(ingest.remainingGb)} GB/mes`} />
        <Metric label="Volumen adicional" value={`${formatNumber(rawAdditionalGb)} GB/mes`} />
        <Metric label="Crecimiento" value={`${formatNumber(value.growthPercent)}%`} />
        <Metric label="Volumen proyectado" value={`${formatNumber(ingest.projectedServerlessOtelGb)} GB/mes`} />
        <Metric label="Exceso" value={`${formatNumber(ingest.gbToLicense)} GB/mes`} />
        <Metric label="Tamaño del bloque" value={`${formatNumber(INSTANA_RULES.dataIngest.unitGb)} GB/mes`} />
        <Metric label="Unidades Data Ingest" value={formatNumber(ingest.dataIngestUnits)} />
        <Metric label="Part Number" value={ingest.dataIngestUnits > 0 ? INSTANA_RULES.dataIngest.partNumber : 'No aplica'} />
      </div>

      <p className="note">Cálculo: primero se determina la cuota incluida por los MVS base. Luego se descuenta el consumo estimado de agentes tradicionales. La telemetría serverless/OpenTelemetry proyectada consume la cuota disponible y solo el exceso se convierte en bloques de Data Ingest.</p>
      {ingest.dataIngestUnits === 0 && ingest.projectedServerlessOtelGb > 0 && <p className="note strong-note">El volumen proyectado está cubierto por la cuota disponible. No se genera Data Ingest adicional.</p>}

      {ingest.fiftyMvsScenario && (
        <div className="comparison-grid section-gap" data-testid="fifty-mvs-comparison">
          <div className="comparison-intro">
            <h3>Comparación de escenario 50 MVS</h3>
            <p>Esta alternativa incrementa las licencias base para obtener una mayor cuota de ingesta. Debe validarse comercialmente antes de incluirla en la propuesta.</p>
          </div>
          {[ingest.currentScenario, ingest.fiftyMvsScenario].map((scenarioOption) => (
            <article key={scenarioOption.label}>
              <h4>{scenarioOption.label}</h4>
              <p>MVS Standard base: {formatNumber(scenarioOption.standardLicensed)}</p>
              <p>Diferencia de licencias base: {formatNumber(Math.max(0, scenarioOption.standardLicensed - ingest.currentScenario.standardLicensed))} MVS</p>
              <p>Cuota incluida total: {formatNumber(scenarioOption.baseIncludedGb)} GB</p>
              <p>Cuota disponible: {formatNumber(scenarioOption.remainingGb)} GB</p>
              <p>Volumen proyectado: {formatNumber(scenarioOption.projectedServerlessOtelGb)} GB</p>
              <p>Exceso a licenciar: {formatNumber(scenarioOption.gbToLicense)} GB</p>
              <p>Unidades Data Ingest: {formatNumber(scenarioOption.dataIngestUnits)}</p>
            </article>
          ))}
          <div className="comparison-actions">
            <button className="secondary" type="button" onClick={() => onChange({ ...value, useFiftyMvsScenario: false, fiftyMvsConfirmed: false })}>Mantener escenario actual</button>
            <button className="primary" data-testid="confirm-fifty-mvs-button" type="button" onClick={() => onChange({ ...value, useFiftyMvsScenario: true, fiftyMvsConfirmed: true })}>Confirmar escenario 50 MVS</button>
            {value.fiftyMvsConfirmed && <span className="selected-label">Escenario 50 MVS confirmado</span>}
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
