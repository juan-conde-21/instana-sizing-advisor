import type { GeneralInfo as GeneralInfoType } from '../types/sizing';

interface Props {
  value: GeneralInfoType;
  onChange: (value: GeneralInfoType) => void;
}

export function GeneralInfo({ value, onChange }: Props) {
  return (
    <section className="card span-12" id="datos-generales">
      <div className="card-header">
        <div>
          <h3>Datos generales</h3>
          <p className="sub">Contexto del escenario y modalidad de despliegue.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Cliente
          <input data-testid="client-name-input" value={value.client} onChange={(event) => onChange({ ...value, client: event.target.value })} placeholder="Nombre del cliente" />
        </label>
        <label>
          Modalidad
          <select data-testid="deployment-type-select" value={value.mode} onChange={(event) => onChange({ ...value, mode: event.target.value as GeneralInfoType['mode'], region: event.target.value === 'Self-Hosted' ? 'No aplica / Self-Hosted' : value.region })}>
            <option>SaaS</option>
            <option>Self-Hosted</option>
          </select>
        </label>
        <label>
          Ambiente
          <select value={value.environment} onChange={(event) => onChange({ ...value, environment: event.target.value as GeneralInfoType['environment'] })}>
            <option>Producción</option>
            <option>Producción + No Producción</option>
            <option>Desarrollo / Prueba</option>
          </select>
        </label>
        <label>
          Región SaaS / ubicación
          <select value={value.region} onChange={(event) => onChange({ ...value, region: event.target.value as GeneralInfoType['region'] })}>
            <option>US</option>
            <option>EU</option>
            <option>No aplica / Self-Hosted</option>
          </select>
        </label>
        <label className="span-full">
          Observaciones del escenario
          <textarea value={value.notes} onChange={(event) => onChange({ ...value, notes: event.target.value })} rows={3} placeholder="Notas, supuestos o alcance del sizing" />
        </label>
      </div>
    </section>
  );
}
