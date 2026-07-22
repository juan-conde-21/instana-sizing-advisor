import type { AddOns, IngestResult, LogsResult, ScenarioInput, SyntheticResult } from '../types/sizing';

interface Props {
  scenario: ScenarioInput;
  ingest: IngestResult;
  logs: LogsResult;
  synthetic: SyntheticResult;
  onChange: (value: AddOns) => void;
}

export function AddOnToggles({ scenario, ingest, logs, synthetic, onChange }: Props) {
  const isSaas = scenario.general.mode === 'SaaS';
  if (!isSaas) return null;
  const items: Array<{ key: keyof AddOns; title: string; detail: string; recommended: boolean; testId: string; disabled?: boolean }> = [
    { key: 'dataIngest', title: 'Data ingest adicional', detail: isSaas ? 'Bloques SaaS de 100 GB/mes.' : 'Referencia técnica para dimensionamiento de storage/capacidad en Self-Hosted.', recommended: isSaas && ingest.dataIngestUnits > 0, testId: 'addon-data-ingest-toggle', disabled: !isSaas },
    { key: 'logs', title: 'Logs in Context', detail: isSaas ? 'Retención extendida y volumen mensual.' : 'En Self-Hosted se considera dentro del dimensionamiento técnico de storage, retención y plataforma.', recommended: isSaas && logs.units > 0, testId: 'addon-logs-toggle', disabled: !isSaas },
    { key: 'syntheticManagedPop', title: 'Synthetic Managed PoP', detail: isSaas ? 'RU mensuales para PoP administrado.' : 'Para Self-Hosted considerar PoP privado y dimensionamiento técnico correspondiente.', recommended: isSaas && synthetic.totalRu > 0, testId: 'addon-synthetic-toggle', disabled: !isSaas },
  ];

  return (
    <section className="section-card" id="capacidades-adicionales">
      <div className="card-header">
        <div>
          <p className="eyebrow">Paso 4</p>
          <h2>Capacidades adicionales</h2>
          <p className="sub">Activa únicamente los componentes que formen parte del alcance. Una recomendación detectada no se incluye en el resumen hasta que el add-on esté activado.</p>
        </div>
      </div>
      <div className="toggle-grid">
        {items.map((item) => (
          <label className={`toggle-card ${item.disabled ? 'disabled' : ''}`} key={item.key}>
            <input
              type="checkbox"
              data-testid={item.testId}
              checked={isSaas && scenario.addOns[item.key]}
              disabled={item.disabled}
              onChange={(event) => onChange({ ...scenario.addOns, [item.key]: event.target.checked })}
            />
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
              {item.recommended && !item.disabled && <em>Recomendación detectada</em>}
              {item.disabled && <em className="disabled-badge">No aplica en Self-Hosted</em>}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
