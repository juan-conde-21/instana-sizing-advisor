import { SELF_HOSTED_CAPACITY_IMPACTS, SELF_HOSTED_PROFILES, SELF_HOSTED_SIZING_WARNINGS } from '../rules/selfHostedCapacity';
import type { ScenarioInput } from '../types/sizing';

interface Props {
  scenario: ScenarioInput;
}

export function SelfHostedCapacity({ scenario }: Props) {
  const hasSynthetic = scenario.synthetic.some((r) => r.tests > 0);

  return (
    <section className="section-card" id="capacidad-self-hosted" data-testid="self-hosted-capacity-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sizing referencial</p>
          <h2>Plantilla referencial de capacidad Self-Hosted</h2>
          <p>Para despliegues Self-Hosted, los componentes de ingesta, logs y Synthetic no se cotizan como add-ons SaaS. Estos volúmenes deben evaluarse como parte del dimensionamiento técnico de la plataforma Instana, considerando backend, storage, retención, capacidad de ingesta, complejidad de Kubernetes, trace load y PoP privado si aplica.</p>
        </div>
      </div>

      <div className="notice warning-note compact-notice" data-testid="self-hosted-capacity-warning">
        Esta plantilla es referencial. El dimensionamiento final debe validarse de acuerdo con el volumen real de monitoreo, tecnologías observadas, cantidad de contenedores/pods, trazas, logs, retención y patrones de tráfico. Para escenarios multinodo, Custom Edition o ambientes de alta criticidad, consultar con el equipo IBM de preventa.
      </div>

      <div className="definition-grid section-gap" data-testid="self-hosted-profiles-grid">
        {SELF_HOSTED_PROFILES.map((profile) => (
          <article key={profile.id} data-testid={`self-hosted-profile-${profile.id}`}>
            <h3>{profile.name}</h3>
            <div className="inventory-total-row">
              <div><span>CPU</span><strong>{profile.cpu} vCPU</strong></div>
              <div><span>Memoria</span><strong>{profile.ramGb} GB RAM</strong></div>
              <div><span>Storage</span><strong>{profile.storageTb} TB</strong></div>
              <div><span>IOPS mín.</span><strong>{profile.iops.toLocaleString('es-ES')}</strong></div>
              <div><span>Throughput mín.</span><strong>{profile.throughputMibS} MiB/s</strong></div>
            </div>
            <p className="note">{profile.note}</p>
          </article>
        ))}
      </div>

      <h3 className="section-subheading">Impacto de capacidad por componente opcional</h3>
      <div className="table-wrap">
        <table data-testid="self-hosted-capacity-impact-table">
          <thead>
            <tr>
              <th>Componente</th>
              <th>Impacto esperado</th>
              <th>Capacidad referencial adicional</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {SELF_HOSTED_CAPACITY_IMPACTS.map((item) => (
              <tr key={item.component}>
                <td><strong>{item.component}</strong></td>
                <td>{item.impact}</td>
                <td>{item.additionalCapacity}</td>
                <td>{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="technical-notes section-gap" data-testid="self-hosted-warnings">
        <h4>Advertencias de dimensionamiento</h4>
        <ul className="capacity-warnings-list">
          {SELF_HOSTED_SIZING_WARNINGS.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>

      <div className="comparison-grid section-gap">
        <article>
          <h4>Single-node production base</h4>
          <p>Uso: referencia inicial para ambientes productivos base.</p>
          <p>Ventaja: despliegue más simple.</p>
          <p>Advertencia: requiere validar límites de carga y crecimiento.</p>
        </article>
        <article>
          <h4>Multinode / Custom Edition</h4>
          <p>Uso: ambientes de mayor criticidad, mayor carga, alta disponibilidad, crecimiento sostenido o requerimientos específicos de plataforma.</p>
          <p><strong>Acción:</strong> Consultar con IBM preventa para validación de arquitectura y sizing.</p>
        </article>
      </div>

      {hasSynthetic && (
        <p className="note" data-testid="self-hosted-pop-note">
          Para Synthetic con PoP privado, dimensionar la infraestructura del PoP de forma separada. Como referencia mínima de prueba se puede considerar 4 vCPU, 16 GB RAM y k3s; para producción se debe usar sizing específico según cantidad de pruebas, frecuencia, ubicaciones y tipo de test.
        </p>
      )}
    </section>
  );
}
