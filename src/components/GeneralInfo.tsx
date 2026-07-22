import type { GeneralInfo as GeneralInfoType } from '../types/sizing';

interface Props {
  value: GeneralInfoType;
  onChange: (value: GeneralInfoType) => void;
}

export function GeneralInfo({ value, onChange }: Props) {
  return (
    <section className="section-card" id="datos-generales">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Alcance</p>
          <h2>Datos generales del escenario</h2>
          <p>Completa el contexto de la oportunidad para que el Excel y el resumen queden identificados.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Cliente
          <input data-testid="client-name-input" value={value.client} onChange={(event) => onChange({ ...value, client: event.target.value })} placeholder="Nombre del cliente" />
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
