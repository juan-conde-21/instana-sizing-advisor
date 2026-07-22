import type { DeploymentMode, GeneralInfo } from '../types/sizing';

interface Props {
  value: GeneralInfo;
  onChange: (value: GeneralInfo) => void;
}

const modes: Array<{ mode: DeploymentMode; title: string; eyebrow: string; description: string; tags: string[] }> = [
  {
    mode: 'SaaS',
    title: 'IBM Instana SaaS',
    eyebrow: 'Modalidad administrada por IBM',
    description: 'IBM administra la plataforma. Ingresa los servidores que serán monitoreados y, cuando corresponda, la ingesta adicional, logs y pruebas Synthetic.',
    tags: ['Operación administrada', 'Add-ons SaaS'],
  },
  {
    mode: 'Self-Hosted',
    title: 'IBM Instana Self-Hosted',
    eyebrow: 'Instalación en infraestructura del cliente',
    description: 'Instana se instala en la infraestructura del cliente. La herramienta calcula las licencias de monitoreo y recopila información para el dimensionamiento técnico de la plataforma.',
    tags: ['Licencias MVS', 'Sizing técnico separado'],
  },
];

export function DeploymentModeCards({ value, onChange }: Props) {
  const setMode = (mode: DeploymentMode) => onChange({ ...value, mode, region: mode === 'Self-Hosted' ? 'No aplica / Self-Hosted' : value.region });

  return (
    <section className="section-card" id="modalidad">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Paso 1</p>
          <h2>Selecciona la modalidad</h2>
          <p>Esta decisión define quién administra la plataforma y qué capacidades adicionales aplican al escenario.</p>
        </div>
      </div>
      <div className="mode-grid" role="radiogroup" aria-label="Modalidad de Instana">
        {modes.map((item) => (
          <button
            type="button"
            role="radio"
            aria-checked={value.mode === item.mode}
            className={`mode-card ${value.mode === item.mode ? 'selected' : ''}`}
            data-testid={item.mode === 'SaaS' ? 'deployment-mode-saas' : 'deployment-mode-self-hosted'}
            key={item.mode}
            onClick={() => setMode(item.mode)}
          >
            <span className="card-kicker">{item.eyebrow}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
            <span className="tag-row">{item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</span>
          </button>
        ))}
      </div>
      <select
        className="sr-only"
        data-testid="deployment-type-select"
        aria-label="Modalidad"
        value={value.mode}
        onChange={(event) => setMode(event.target.value as DeploymentMode)}
      >
        <option>SaaS</option>
        <option>Self-Hosted</option>
      </select>
    </section>
  );
}
