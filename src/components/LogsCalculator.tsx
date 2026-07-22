import { INSTANA_RULES } from '../rules/instanaRules';
import type { LogsInput, LogsResult, LogRetention } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  logs: LogsResult;
  onChange: (value: LogsInput) => void;
  value: LogsInput;
}

export function LogsCalculator({ value, logs, onChange }: Props) {
  const includedRetention = value.retentionDays === 7;

  return (
    <section className="section-card" id="logs" data-testid="logs-module">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SaaS</p>
          <h2>Retención ampliada de logs asociados a aplicaciones</h2>
          <p>Permite consultar por más tiempo los logs relacionados con servicios, errores y transacciones observadas en Instana.</p>
        </div>
      </div>
      <div className="question-panel">
        <strong>Pregunta al cliente</strong>
        <p>¿Cuántos TB de logs generan al mes y durante cuántos días necesitan conservarlos en Instana?</p>
      </div>
      <div className="form-grid compact section-gap">
        <label>
          Retención requerida
          <select data-testid="logs-retention-select" value={value.retentionDays} onChange={(event) => onChange({ ...value, retentionDays: Number(event.target.value) as LogRetention })}>
            <option value={7}>7 días - incluido</option>
            <option value={30}>30 días - retención extendida</option>
            <option value={60}>60 días - retención extendida</option>
            <option value={90}>90 días - retención extendida</option>
          </select>
        </label>
        {!includedRetention && (
          <>
            <label>
              Volumen mensual de logs (TB)
              <input data-testid="logs-volume-input" type="number" min={0} step="0.1" value={value.tbMonth} onChange={(event) => onChange({ ...value, tbMonth: Math.max(0, Number(event.target.value) || 0) })} />
            </label>
            <label>
              <span className="label-with-help">Sugerencia de crecimiento Logs (%)<span className="help-icon" title="Use este porcentaje solo si desea reservar capacidad adicional para crecimiento de logs. Por defecto se mantiene en 0% porque el volumen mensual ingresado se considera la base estimada para cotización.">?</span></span>
              <input data-testid="logs-growth-input" type="number" min={0} value={value.growthPercent} onChange={(event) => onChange({ ...value, growthPercent: Math.max(0, Number(event.target.value) || 0) })} />
            </label>
          </>
        )}
      </div>
      {includedRetention ? (
        <div className="included-panel section-gap" data-testid="logs-included-message">
          <strong>Incluido, sin licencia adicional</strong>
          <p>La retención incluida no genera Part Number adicional ni línea de cotización.</p>
        </div>
      ) : (
        <>
          <div className="metric-grid section-gap">
            <Metric label="Volumen mensual" value={`${formatNumber(value.tbMonth, 1)} TB`} />
            <Metric label={value.growthPercent > 0 ? 'Logs proyectados' : 'Volumen considerado'} value={`${formatNumber(logs.projectedTbMonth, 1)} TB`} />
            <Metric label="Retención adicional" value={logs.retentionLabel} />
            <Metric label="Tamaño del bloque" value={INSTANA_RULES.logs.unitLabel} />
            <Metric label="Redondeo" value="Hacia arriba" />
            <Metric label="Cantidad a cotizar" value={`${formatNumber(logs.units)} unidades`} />
          </div>
          <p className="note">Si el cliente genera 2.2 TB mensuales y el producto se licencia en bloques de 1 TB, se consideran 3 unidades.</p>
        </>
      )}
      <p className="note">La retención base incluida es de 7 días para logs de aplicación con severidad warning y critical. Para retenciones extendidas de 30, 60 o 90 días se calculan unidades adicionales por bloques de 1 TB mensual.</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
