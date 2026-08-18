import { LOGS_CAPACITY_IMPACT, SELF_HOSTED_CAPACITY_IMPACTS, SELF_HOSTED_PROFILES, SELF_HOSTED_SIZING_WARNINGS, SYNTHETIC_CAPACITY_IMPACT } from '../rules/selfHostedCapacity';
import type { ScenarioInput } from '../types/sizing';

interface Props {
  scenario: ScenarioInput;
}

function scenarioLabel(scenario: ScenarioInput['selfHostedSizing']['scenario']): string {
  if (scenario === 'base') return 'Production base';
  if (scenario === 'large') return 'Production large';
  return 'Custom';
}

export function SelfHostedCapacity({ scenario }: Props) {
  const { selfHostedSizing, synthetic, inventory } = scenario;
  const logsApplied = selfHostedSizing.logsTbMonth > 0;
  const syntheticApplied = synthetic.some((r) => r.tests > 0);
  const hasKubernetes = inventory.standardKubernetesWorkers + inventory.essentialsKubernetesWorkers > 0;
  const hasHA = selfHostedSizing.highAvailability === 'Sí';
  const hasIncrements = logsApplied || syntheticApplied;

  const addCpu = (logsApplied ? LOGS_CAPACITY_IMPACT.cpuVcpu : 0) + (syntheticApplied ? SYNTHETIC_CAPACITY_IMPACT.cpuVcpu : 0);
  const addRamGb = (logsApplied ? LOGS_CAPACITY_IMPACT.ramGb : 0) + (syntheticApplied ? SYNTHETIC_CAPACITY_IMPACT.ramGb : 0);
  const addStorageTb = logsApplied ? LOGS_CAPACITY_IMPACT.storageTb : 0;
  const totalCpu = selfHostedSizing.cpu + addCpu;
  const totalRamGb = selfHostedSizing.ramGb + addRamGb;
  const totalStorageTb = selfHostedSizing.storageTb + addStorageTb;

  return (
    <section className="section-card" id="capacidad-self-hosted" data-testid="self-hosted-capacity-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sizing referencial</p>
          <h2>Plantilla referencial de capacidad Self-Hosted</h2>
          <p>Para despliegues Self-Hosted, los componentes de ingesta, logs y Synthetic no se cotizan como add-ons SaaS. Estos volúmenes deben evaluarse como parte del dimensionamiento técnico de la plataforma Instana, considerando backend, storage, retención, capacidad de ingesta, complejidad de Kubernetes, trace load y PoP privado si aplica.</p>
        </div>
      </div>

      <div className="referential-capacity-block section-gap" data-testid="self-hosted-capacity-referential">
        <h3>Capacidad referencial a validar</h3>
        <div className="inventory-total-row">
          <div>
            <span>Escenario</span>
            <strong>{scenarioLabel(selfHostedSizing.scenario)}</strong>
          </div>
          <div>
            <span>Hosts referenciales</span>
            <strong>{selfHostedSizing.referenceHosts > 0 ? `${selfHostedSizing.referenceHosts} hosts` : 'No declarado'}</strong>
          </div>
          <div>
            <span>Tipo de carga</span>
            <strong>{selfHostedSizing.workloadType}</strong>
          </div>
          <div>
            <span>CPU base</span>
            <strong>{selfHostedSizing.cpu} vCPU</strong>
          </div>
          <div>
            <span>Memoria base</span>
            <strong>{selfHostedSizing.ramGb} GB RAM</strong>
          </div>
          <div>
            <span>Storage base</span>
            <strong>{selfHostedSizing.storageTb} TB</strong>
          </div>
          <div>
            <span>IOPS mínimo</span>
            <strong>{selfHostedSizing.iops.toLocaleString('es-ES')}</strong>
          </div>
          <div>
            <span>Throughput mínimo</span>
            <strong>{selfHostedSizing.throughputMibS} MiB/s</strong>
          </div>
          {selfHostedSizing.traceVolume > 0 && (
            <div>
              <span>Trazas referenciales</span>
              <strong>{selfHostedSizing.traceVolume} {selfHostedSizing.traceVolumeUnit}</strong>
            </div>
          )}
          {selfHostedSizing.logsTbMonth > 0 && (
            <div>
              <span>Logs referenciales</span>
              <strong>{selfHostedSizing.logsTbMonth} TB/mes</strong>
            </div>
          )}
          {selfHostedSizing.retention !== 'Por confirmar' && (
            <div>
              <span>Retención</span>
              <strong>{selfHostedSizing.retention}</strong>
            </div>
          )}
          <div>
            <span>Crecimiento esperado</span>
            <strong>{selfHostedSizing.growthPercent}%</strong>
          </div>
        </div>

        {hasIncrements && (
          <div className="capacity-impacts section-gap">
            {logsApplied && (
              <div className="capacity-impact-item" data-testid="self-hosted-logs-impact">
                <span className="capacity-impact-label">+ Logs / Analyze Logs:</span>
                <span>+{LOGS_CAPACITY_IMPACT.cpuVcpu} vCPU / +{LOGS_CAPACITY_IMPACT.ramGb} GB RAM / +{LOGS_CAPACITY_IMPACT.storageTb} TB storage</span>
              </div>
            )}
            {syntheticApplied && (
              <div className="capacity-impact-item" data-testid="self-hosted-synthetic-impact">
                <span className="capacity-impact-label">+ Synthetic Monitoring Self-Hosted:</span>
                <span>+{SYNTHETIC_CAPACITY_IMPACT.cpuVcpu} vCPU / +{SYNTHETIC_CAPACITY_IMPACT.ramGb} GB RAM</span>
              </div>
            )}
          </div>
        )}

        {hasIncrements && (
          <div className="inventory-total-row capacity-total-row section-gap" data-testid="self-hosted-capacity-total">
            <div>
              <span>CPU total referencial</span>
              <strong>{totalCpu} vCPU</strong>
            </div>
            <div>
              <span>Memoria total referencial</span>
              <strong>{totalRamGb} GB RAM</strong>
            </div>
            <div>
              <span>Storage total referencial</span>
              <strong>{totalStorageTb.toFixed(3)} TB</strong>
            </div>
          </div>
        )}

        {hasHA && (
          <div className="notice warning-note compact-notice section-gap" data-testid="self-hosted-ha-warning">
            Alta disponibilidad requiere validación de arquitectura multinodo o diseño específico con IBM preventa.
          </div>
        )}

        {hasKubernetes && (
          <div className="notice warning-note compact-notice section-gap" data-testid="self-hosted-k8s-warning">
            Kubernetes puede incrementar significativamente la carga por pods, contenedores, namespaces y cardinalidad. Validar con IBM preventa.
          </div>
        )}

        <p className="note section-gap">Los hosts, trazas y logs declarados orientan el análisis, pero el sizing final debe validarse con IBM preventa considerando inventario real, tecnologías monitoreadas y carga observada.</p>
      </div>

      <div className="notice warning-note compact-notice section-gap" data-testid="self-hosted-capacity-warning">
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
            </div>
            <p className="note">{profile.note}</p>
          </article>
        ))}
      </div>

      <h3 className="section-subheading">Impacto de capacidad por componente</h3>
      <div className="table-wrap">
        <table data-testid="self-hosted-capacity-impact-table">
          <thead>
            <tr>
              <th>Componente</th>
              <th>Impacto técnico</th>
              <th>Capacidad adicional referencial</th>
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

      <h3 className="section-subheading">Single-node vs escenarios avanzados</h3>
      <div className="comparison-grid section-gap">
        <article>
          <h4>Production base</h4>
          <p>Referencia inicial para ambientes productivos base o cargas controladas.</p>
          <p>Requiere validación si existen muchos pods, alta trazabilidad, logs intensivos o múltiples ambientes.</p>
        </article>
        <article>
          <h4>Production large</h4>
          <p>Referencia para mayor volumen, crecimiento o escenarios mixtos.</p>
          <p>No reemplaza un sizing final para alta disponibilidad, multinodo o Custom Edition.</p>
        </article>
        <article>
          <h4>Custom</h4>
          <p>Usar cuando el cliente ya dispone de supuestos propios o requiere un dimensionamiento específico.</p>
          <p><strong>Acción:</strong> Consultar con IBM preventa para validación de arquitectura y sizing.</p>
        </article>
      </div>

      {syntheticApplied && (
        <p className="note section-gap" data-testid="self-hosted-pop-note">
          Para Synthetic con PoP privado, dimensionar la infraestructura del PoP de forma separada. Como referencia mínima de prueba se puede considerar 4 vCPU, 16 GB RAM y k3s; para producción se debe usar sizing específico según cantidad de pruebas, frecuencia, ubicaciones y tipo de test.
        </p>
      )}
    </section>
  );
}
