import type { IngestInput, IngestResult, InventoryResult, ScenarioInput, ServerlessWorkloadInput, ServerlessWorkloadType } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  scenario: ScenarioInput;
  inventory: InventoryResult;
  ingest: IngestResult;
  onChange: (value: IngestInput) => void;
}

const workloadTypes: ServerlessWorkloadType[] = ['AWS Lambda', 'Cloud Run', 'Azure Functions', 'Azure Web Apps', 'OpenTelemetry', 'Otro'];

export function IngestCalculator({ scenario, ingest, onChange }: Props) {
  const value = scenario.ingest;
  const setNumber = (field: keyof IngestInput, next: string) => onChange({ ...value, [field]: Math.max(0, Number(next) || 0) });
  const isSaas = scenario.general.mode === 'SaaS';

  const updateWorkload = (index: number, next: Partial<ServerlessWorkloadInput>) => {
    const rows = [...value.transactionalWorkloads];
    rows[index] = { ...rows[index], ...next };
    onChange({ ...value, transactionalWorkloads: rows });
  };

  const addWorkload = () => {
    onChange({
      ...value,
      transactionalWorkloads: [
        ...value.transactionalWorkloads,
        { id: (globalThis.crypto?.randomUUID?.() || `workload-${Date.now()}-${value.transactionalWorkloads.length}`), name: `Workload ${value.transactionalWorkloads.length + 1}`, type: 'OpenTelemetry', averageTps: 1, spansPerTransaction: 5, averageSpanKb: 2 },
      ],
    });
  };

  const removeWorkload = (index: number) => onChange({ ...value, transactionalWorkloads: value.transactionalWorkloads.filter((_, rowIndex) => rowIndex !== index) });

  return (
    <section className="card span-12" id="ingesta" data-testid="ingest-module">
      <div className="card-header">
        <div>
          <h3>Ingesta y crecimiento</h3>
          <p className="sub">La ingesta serverless/OpenTelemetry puede estimarse a partir del volumen transaccional entre servicios, TPS, cantidad promedio de spans por transacción y peso promedio del span. Esto aplica para escenarios como AWS Lambda, Cloud Run, Azure Functions, Azure Web Apps u OpenTelemetry.</p>
        </div>
      </div>
      <div className="form-grid compact">
        <label>
          Consumo promedio cuota por agente (%)
          <input data-testid="agent-consumption-input" type="number" min={0} value={value.agentConsumptionPercent} onChange={(event) => setNumber('agentConsumptionPercent', event.target.value)} />
        </label>
        <label className="checkbox-label">
          <input data-testid="transactional-mode-toggle" type="checkbox" checked={value.useTransactionalMode} onChange={(event) => onChange({ ...value, useTransactionalMode: event.target.checked })} />
          Calcular por volumen transaccional
        </label>
      </div>

      {!value.useTransactionalMode ? (
        <div className="form-grid compact section-gap">
          <label>
            Ingesta serverless / OpenTelemetry estimada (GB/mes)
            <input data-testid="serverless-otel-ingest-input" type="number" min={0} value={value.serverlessOtelGbMonth} onChange={(event) => setNumber('serverlessOtelGbMonth', event.target.value)} />
          </label>
        </div>
      ) : (
        <div className="section-gap">
          <div className="table-wrap">
            <table data-testid="transactional-ingest-table">
              <thead>
                <tr>
                  <th>Nombre del workload</th>
                  <th>Tipo</th>
                  <th>TPS promedio</th>
                  <th>Spans por transacción</th>
                  <th>Peso promedio span KB</th>
                  <th>GB/mes calculado</th>
                  <th>GB/mes proyectado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {ingest.transactionalWorkloads.length === 0 && (
                  <tr><td colSpan={8} className="empty">Agrega un workload para estimar la ingesta por volumen transaccional.</td></tr>
                )}
                {ingest.transactionalWorkloads.map((row, index) => (
                  <tr key={row.id}>
                    <td><input value={row.name} onChange={(event) => updateWorkload(index, { name: event.target.value })} /></td>
                    <td>
                      <select value={row.type} onChange={(event) => updateWorkload(index, { type: event.target.value as ServerlessWorkloadType })}>
                        {workloadTypes.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </td>
                    <td><input type="number" min={0} value={row.averageTps} onChange={(event) => updateWorkload(index, { averageTps: Math.max(0, Number(event.target.value) || 0) })} /></td>
                    <td><input type="number" min={0} value={row.spansPerTransaction} onChange={(event) => updateWorkload(index, { spansPerTransaction: Math.max(0, Number(event.target.value) || 0) })} /></td>
                    <td><input type="number" min={0} value={row.averageSpanKb} onChange={(event) => updateWorkload(index, { averageSpanKb: Math.max(0, Number(event.target.value) || 0) })} /></td>
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

      <div className="metric-grid">
        <Metric label="MVS declarados Standard" value={`${formatNumber(scenario.inventory.standardPhysical + scenario.inventory.standardVirtual + scenario.inventory.standardKubernetesWorkers)} MVS`} />
        <Metric label="MVS licenciados Standard" value={`${formatNumber(ingest.standardLicensed)} MVS`} />
        <Metric label="Cuota base incluida" value={`${formatNumber(ingest.baseIncludedGb)} GB`} />
        <Metric label="Consumo promedio agentes reales" value={`${formatNumber(ingest.agentAverageGb)} GB`} />
        <Metric label="Remanente disponible" value={`${formatNumber(ingest.remainingGb)} GB`} />
        <Metric label="Serverless/OTel proyectado" value={`${formatNumber(ingest.projectedServerlessOtelGb)} GB`} />
        <Metric label={isSaas ? 'Ingesta a licenciar' : 'Referencia técnica'} value={`${formatNumber(isSaas ? ingest.gbToLicense : ingest.projectedServerlessOtelGb)} GB`} />
        <Metric label="Unidades Data Ingest" value={isSaas ? `${formatNumber(ingest.dataIngestUnits)}` : 'No aplica SaaS'} />
      </div>

      {ingest.fiftyMvsScenario && (
        <div className="comparison-grid section-gap" data-testid="fifty-mvs-comparison">
          {[ingest.currentScenario, ingest.fiftyMvsScenario].map((scenarioOption) => (
            <article key={scenarioOption.label}>
              <h4>{scenarioOption.label}</h4>
              <p>MVS licenciados: {formatNumber(scenarioOption.standardLicensed)}</p>
              <p>Cuota base incluida: {formatNumber(scenarioOption.baseIncludedGb)} GB</p>
              <p>Consumo agentes reales: {formatNumber(scenarioOption.agentAverageGb)} GB</p>
              <p>Remanente disponible: {formatNumber(scenarioOption.remainingGb)} GB</p>
              <p>Serverless/OTel proyectado: {formatNumber(scenarioOption.projectedServerlessOtelGb)} GB</p>
              <p>Ingesta a licenciar: {formatNumber(scenarioOption.gbToLicense)} GB</p>
              <p>Unidades Data Ingest: {formatNumber(scenarioOption.dataIngestUnits)}</p>
            </article>
          ))}
          <div className="comparison-actions">
            <button className="secondary" type="button" onClick={() => onChange({ ...value, useFiftyMvsScenario: false })}>Usar escenario actual</button>
            <button className="primary" type="button" onClick={() => onChange({ ...value, useFiftyMvsScenario: true })}>Usar escenario 50 MVS</button>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
