import { PRODUCTION_BASE_PROFILE, PRODUCTION_LARGE_PROFILE } from '../rules/selfHostedCapacity';
import type { SelfHostedSizingInput } from '../types/sizing';

interface Props {
  value: SelfHostedSizingInput;
  onChange: (value: SelfHostedSizingInput) => void;
}

function isAdjustedFromPreset(field: 'cpu' | 'ramGb' | 'storageTb' | 'iops' | 'throughputMibS', value: SelfHostedSizingInput): boolean {
  if (value.scenario === 'custom') return false;
  const preset = value.scenario === 'base' ? PRODUCTION_BASE_PROFILE : PRODUCTION_LARGE_PROFILE;
  return value[field] !== preset[field];
}

export function SelfHostedSizing({ value, onChange }: Props) {
  const setNumber = (field: keyof SelfHostedSizingInput, rawValue: string) =>
    onChange({ ...value, [field]: Math.max(0, Number(rawValue) || 0) });

  const handleScenarioChange = (newScenario: SelfHostedSizingInput['scenario']) => {
    if (newScenario === 'base') {
      onChange({ ...value, scenario: 'base', cpu: PRODUCTION_BASE_PROFILE.cpu, ramGb: PRODUCTION_BASE_PROFILE.ramGb, storageTb: PRODUCTION_BASE_PROFILE.storageTb, iops: PRODUCTION_BASE_PROFILE.iops, throughputMibS: PRODUCTION_BASE_PROFILE.throughputMibS });
    } else if (newScenario === 'large') {
      onChange({ ...value, scenario: 'large', cpu: PRODUCTION_LARGE_PROFILE.cpu, ramGb: PRODUCTION_LARGE_PROFILE.ramGb, storageTb: PRODUCTION_LARGE_PROFILE.storageTb, iops: PRODUCTION_LARGE_PROFILE.iops, throughputMibS: PRODUCTION_LARGE_PROFILE.throughputMibS });
    } else {
      onChange({ ...value, scenario: 'custom' });
    }
  };

  return (
    <section className="section-card" id="self-hosted-sizing" data-testid="self-hosted-sizing-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sizing técnico</p>
          <h2>Configuración Self-Hosted</h2>
          <p>Selecciona un escenario referencial de capacidad o define valores propios. Los campos de capacidad pueden editarse manualmente independientemente del escenario seleccionado.</p>
        </div>
      </div>

      <div className="form-grid compact">
        <label>
          Escenario referencial Self-Hosted
          <select
            data-testid="self-hosted-scenario-select"
            value={value.scenario}
            onChange={(event) => handleScenarioChange(event.target.value as SelfHostedSizingInput['scenario'])}
          >
            <option value="base">Production base</option>
            <option value="large">Production large</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>

      <div className="sh-warning-card section-gap" data-testid="self-hosted-sizing-warning">
        <strong>Advertencia de sizing Self-Hosted</strong>
        <p>La capacidad mostrada es referencial y no reemplaza un sizing técnico final. Para confirmar CPU, memoria, storage, IOPS, throughput y arquitectura, se requiere conocer el inventario a monitorear, volumen de trazas, volumen de logs, retención, cantidad de servicios, tecnologías, uso de Kubernetes, número de pods/contenedores, EUM, Synthetic y crecimiento esperado.</p>
        <p>Kubernetes puede generar una carga mayor que VMs tradicionales debido a la cantidad de pods, contenedores, namespaces, métricas y entidades dinámicas. Para ambientes multinodo, alta disponibilidad, Custom Edition o cargas críticas, validar con IBM preventa.</p>
      </div>

      <h3 className="section-subheading">Capacidad del backend Instana</h3>
      <div className="form-grid section-gap">
        <label>
          <span className="label-with-help">
            CPU requerida / referencial (vCPU)
            {isAdjustedFromPreset('cpu', value) && <span className="adjusted-badge">Ajustado manualmente</span>}
          </span>
          <input data-testid="self-hosted-cpu-input" type="number" min={0} value={value.cpu} onChange={(event) => setNumber('cpu', event.target.value)} />
        </label>
        <label>
          <span className="label-with-help">
            Memoria requerida / referencial (GB RAM)
            {isAdjustedFromPreset('ramGb', value) && <span className="adjusted-badge">Ajustado manualmente</span>}
          </span>
          <input data-testid="self-hosted-ram-input" type="number" min={0} value={value.ramGb} onChange={(event) => setNumber('ramGb', event.target.value)} />
        </label>
        <label>
          <span className="label-with-help">
            Storage requerido / referencial (TB)
            {isAdjustedFromPreset('storageTb', value) && <span className="adjusted-badge">Ajustado manualmente</span>}
          </span>
          <input data-testid="self-hosted-storage-input" type="number" min={0} step="0.1" value={value.storageTb} onChange={(event) => setNumber('storageTb', event.target.value)} />
        </label>
        <label>
          <span className="label-with-help">
            IOPS mínimo
            {isAdjustedFromPreset('iops', value) && <span className="adjusted-badge">Ajustado manualmente</span>}
          </span>
          <input data-testid="self-hosted-iops-input" type="number" min={0} value={value.iops} onChange={(event) => setNumber('iops', event.target.value)} />
        </label>
        <label>
          <span className="label-with-help">
            Throughput mínimo (MiB/s)
            {isAdjustedFromPreset('throughputMibS', value) && <span className="adjusted-badge">Ajustado manualmente</span>}
          </span>
          <input data-testid="self-hosted-throughput-input" type="number" min={0} value={value.throughputMibS} onChange={(event) => setNumber('throughputMibS', event.target.value)} />
        </label>
      </div>

      <h3 className="section-subheading">Volúmenes referenciales de ingesta</h3>
      <div className="notice compact-notice section-gap">
        Los volúmenes de trazas y logs son datos referenciales para orientar el sizing. Deben ajustarse con información real del cliente: inventario a monitorear, TPS, spans por transacción, volumen de logs, retención, Kubernetes, pods, tecnologías observadas y crecimiento esperado.
      </div>
      <div className="form-grid section-gap">
        <label>
          Volumen referencial de trazas
          <input data-testid="self-hosted-trace-volume-input" type="number" min={0} value={value.traceVolume} onChange={(event) => setNumber('traceVolume', event.target.value)} />
        </label>
        <label>
          Unidad de trazas
          <select value={value.traceVolumeUnit} onChange={(event) => onChange({ ...value, traceVolumeUnit: event.target.value as SelfHostedSizingInput['traceVolumeUnit'] })}>
            <option>GB/día</option>
            <option>GB/mes</option>
            <option>TB/mes</option>
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
          <select data-testid="self-hosted-ha-select" value={value.highAvailability} onChange={(event) => onChange({ ...value, highAvailability: event.target.value as SelfHostedSizingInput['highAvailability'] })}>
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

      <div className="definition-grid section-gap">
        <article>
          <h3>1. Licenciamiento MVS</h3>
          <p>El inventario anterior determina las licencias MVS Standard y Essentials aplicables a la modalidad Self-Hosted.</p>
        </article>
        <article className="warning-panel">
          <h3>2. Información para sizing técnico del backend</h3>
          <p>Esta calculadora estima las licencias MVS. El dimensionamiento definitivo de CPU, memoria, nodos y almacenamiento debe validarse con la herramienta o guía técnica de sizing de Instana.</p>
        </article>
      </div>
    </section>
  );
}
