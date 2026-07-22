import type { EditionSelection as EditionSelectionType } from '../types/sizing';

interface Props {
  value: EditionSelectionType;
  onChange: (value: EditionSelectionType) => void;
}

export function EditionSelection({ value, onChange }: Props) {
  const toggle = (field: keyof EditionSelectionType, checked: boolean) => onChange({ ...value, [field]: checked });

  return (
    <section className="section-card" id="ediciones">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Paso 2</p>
          <h2>Define el nivel de observabilidad requerido</h2>
          <p>Separa la infraestructura que necesita seguimiento completo de aplicaciones de la que requiere monitoreo de infraestructura.</p>
        </div>
      </div>
      <div className="edition-grid">
        <label className={`edition-card ${value.standard ? 'selected' : ''}`}>
          <input data-testid="edition-standard-toggle" type="checkbox" checked={value.standard} onChange={(event) => toggle('standard', event.target.checked)} />
          <span>
            <span className="card-kicker">APM y observabilidad completa</span>
            <strong>Instana Standard - APM y observabilidad completa</strong>
            <p>Utiliza Standard cuando se necesita revisar el recorrido de las transacciones, tiempos de respuesta, errores, servicios, dependencias, bases de datos y también la infraestructura donde se ejecutan las aplicaciones.</p>
            <em>Pregunta al cliente: ¿Cuántos servidores o worker nodes ejecutan las aplicaciones que requieren seguimiento de transacciones y rendimiento?</em>
          </span>
        </label>
        <label className={`edition-card ${value.essentials ? 'selected' : ''}`}>
          <input data-testid="edition-essentials-toggle" type="checkbox" checked={value.essentials} onChange={(event) => toggle('essentials', event.target.checked)} />
          <span>
            <span className="card-kicker">Infraestructura y disponibilidad</span>
            <strong>Instana Essentials - monitoreo de infraestructura</strong>
            <p>Utiliza Essentials cuando el alcance está orientado principalmente a disponibilidad, CPU, memoria, disco, red y estado de los servidores, sin requerir el análisis completo de las transacciones de la aplicación.</p>
            <em>Pregunta al cliente: ¿Cuántos servidores o worker nodes requieren monitoreo de infraestructura, pero no seguimiento detallado de las transacciones?</em>
          </span>
        </label>
      </div>
    </section>
  );
}
