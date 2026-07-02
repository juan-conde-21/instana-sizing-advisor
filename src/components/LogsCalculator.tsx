import type { LogsInput, LogsResult, LogRetention, ScenarioInput } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  scenario: ScenarioInput;
  logs: LogsResult;
  onChange: (value: LogsInput) => void;
}

export function LogsCalculator({ scenario, logs, onChange }: Props) {
  const value = scenario.logs;
  const isSaas = scenario.general.mode === 'SaaS';

  return (
    <section className="card span-12" id="logs" data-testid="logs-module">
      <div className="card-header">
        <div>
          <h3>Logs</h3>
          <p className="sub">La retención base incluida es de 7 días para logs de aplicación con severidad warning y critical. Para retenciones extendidas de 30, 60 o 90 días se calculan unidades adicionales por bloques de 1 TB mensual.</p>
        </div>
      </div>
      <div className="form-grid one">
        <label>
          Retención
          <select data-testid="logs-retention-select" value={value.retentionDays} onChange={(event) => onChange({ ...value, retentionDays: Number(event.target.value) as LogRetention })}>
            <option value={7}>7 días - incluido</option>
            <option value={30}>30 días - retención extendida</option>
            <option value={60}>60 días - retención extendida</option>
            <option value={90}>90 días - retención extendida</option>
          </select>
        </label>
        <label>
          Volumen de logs (TB mensual)
          <input data-testid="logs-volume-input" type="number" min={0} step="0.1" value={value.tbMonth} onChange={(event) => onChange({ ...value, tbMonth: Math.max(0, Number(event.target.value) || 0) })} />
        </label>
        <label>
          <span className="label-with-help">Sugerencia de crecimiento Logs (%)<span className="help-icon" title="Use este porcentaje solo si desea reservar capacidad adicional para crecimiento de logs. Por defecto se mantiene en 0% porque el volumen mensual ingresado se considera la base estimada para cotización.">?</span></span>
          <input data-testid="logs-growth-input" type="number" min={0} value={value.growthPercent} onChange={(event) => onChange({ ...value, growthPercent: Math.max(0, Number(event.target.value) || 0) })} />
        </label>
      </div>
      <div className="metric-grid one">
        <Metric label={value.growthPercent > 0 ? 'Logs proyectados' : 'Volumen considerado'} value={`${formatNumber(logs.projectedTbMonth, 1)} TB`} />
        <Metric label="Unidades logs" value={isSaas ? formatNumber(logs.units) : 'No aplica add-on'} />
        <Metric label="Retención" value={logs.retentionLabel} />
      </div>
      <p className="note">Las unidades se calculan por bloques de 1 TB mensual. Si el volumen supera un bloque completo, se redondea hacia arriba. Ejemplo: 1 TB = 1 unidad; 2.2 TB = 3 unidades.</p>
      {value.retentionDays === 7 && <p className="note">La retención base incluida es de 7 días. No se agrega retención extendida.</p>}
      {!isSaas && <p className="note">En Self-Hosted, logs se consideran dentro del dimensionamiento técnico de storage, retención y capacidad del backend Instana.</p>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
