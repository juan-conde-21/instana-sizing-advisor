import type { SelfHostedSizingInput } from '../types/sizing';

interface Props {
  value: SelfHostedSizingInput;
  onChange: (value: SelfHostedSizingInput) => void;
}

export function SelfHostedSizing({ value, onChange }: Props) {
  const setNumber = (field: keyof SelfHostedSizingInput, rawValue: string) => onChange({ ...value, [field]: Math.max(0, Number(rawValue) || 0) });

  return (
    <section className="section-card" id="self-hosted-sizing" data-testid="self-hosted-sizing-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sizing técnico</p>
          <h2>Información para dimensionamiento técnico Self-Hosted</h2>
          <p>Los siguientes datos no generan add-ons SaaS, pero deben considerarse para definir procesamiento, almacenamiento, retención, capacidad de ingesta, alta disponibilidad y arquitectura de la plataforma.</p>
        </div>
      </div>
      <div className="definition-grid">
        <article>
          <h3>1. Licenciamiento MVS</h3>
          <p>El inventario anterior determina las licencias MVS Standard y Essentials aplicables a la modalidad Self-Hosted.</p>
        </article>
        <article className="warning-panel">
          <h3>2. Información para sizing técnico del backend</h3>
          <p>Esta calculadora estima las licencias MVS. El dimensionamiento definitivo de CPU, memoria, nodos y almacenamiento debe validarse con la herramienta o guía técnica de sizing de Instana.</p>
        </article>
      </div>
      <div className="form-grid section-gap">
        <label>
          Volumen de trazas
          <input data-testid="self-hosted-trace-volume-input" type="number" min={0} value={value.traceVolume} onChange={(event) => setNumber('traceVolume', event.target.value)} />
        </label>
        <label>
          Unidad de trazas
          <select value={value.traceVolumeUnit} onChange={(event) => onChange({ ...value, traceVolumeUnit: event.target.value as SelfHostedSizingInput['traceVolumeUnit'] })}>
            <option>GB/día</option>
            <option>GB/mes</option>
          </select>
        </label>
        <label>
          Volumen de logs (TB mensual)
          <input data-testid="self-hosted-logs-volume-input" type="number" min={0} step="0.1" value={value.logsTbMonth} onChange={(event) => setNumber('logsTbMonth', event.target.value)} />
        </label>
        <label>
          Retención requerida
          <select value={value.retention} onChange={(event) => onChange({ ...value, retention: event.target.value })}>
            <option>Por confirmar</option>
            <option>7 días</option>
            <option>14 días</option>
            <option>30 días</option>
            <option>60 días</option>
            <option>90 días</option>
          </select>
        </label>
        <label>
          Alta disponibilidad
          <select value={value.highAvailability} onChange={(event) => onChange({ ...value, highAvailability: event.target.value as SelfHostedSizingInput['highAvailability'] })}>
            <option>Por confirmar</option>
            <option>Sí</option>
            <option>No</option>
          </select>
        </label>
        <label>
          Cantidad de ambientes
          <input data-testid="self-hosted-environments-input" type="number" min={0} step={1} value={value.environments} onChange={(event) => setNumber('environments', event.target.value)} />
        </label>
        <label>
          Crecimiento esperado (%)
          <input type="number" min={0} value={value.growthPercent} onChange={(event) => setNumber('growthPercent', event.target.value)} />
        </label>
        <label className="span-full">
          Observaciones para sizing técnico
          <textarea rows={3} value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} placeholder="Supuestos, arquitectura, retención, alta disponibilidad o restricciones técnicas" />
        </label>
      </div>
    </section>
  );
}
