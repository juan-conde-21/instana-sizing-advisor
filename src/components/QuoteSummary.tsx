import type { QuoteLine, ScenarioInput } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  scenario: ScenarioInput;
  lines: QuoteLine[];
}

const hasSyntheticDeclared = (scenario: ScenarioInput) => scenario.synthetic.some((row) => row.tests > 0);

export function QuoteSummary({ scenario, lines }: Props) {
  const isSelfHosted = scenario.general.mode === 'Self-Hosted';

  return (
    <section className="section-card" id="part-numbers">
      <div className="card-header">
        <div>
          <p className="eyebrow">Part Numbers</p>
          <h2>Part Numbers a cotizar</h2>
          <p className="sub">Solo aquí se muestran part numbers. No se incluyen componentes con cantidad cero.</p>
        </div>
      </div>
      <div className="table-wrap">
        <table data-testid="quote-summary-table">
          <thead>
            <tr>
              <th>Componente</th>
              <th>Part number</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Explicación</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr><td colSpan={5} className="empty">No hay componentes con cantidad mayor a cero.</td></tr>
            ) : (
              lines.map((line) => (
                <tr key={`${line.component}-${line.partNumber}`}>
                  <td>{line.component}</td>
                  <td><strong>{line.partNumber}</strong></td>
                  <td>{formatNumber(line.quantity)}</td>
                  <td>{line.unit}</td>
                  <td>{line.explanation}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {isSelfHosted && (
        <section className="technical-notes" data-testid="self-hosted-notes">
          <h4>Consideraciones Self-Hosted</h4>
          <p>En despliegues Self-Hosted, los add-ons SaaS de Data Ingest, Logs in Context y Synthetic Managed PoP no se incluyen como componentes de cotización. Estos volúmenes deben considerarse dentro del dimensionamiento técnico de la plataforma Instana, incluyendo backend, storage, retención, capacidad de ingesta y PoP privado si aplica.</p><p>Esta calculadora estima las licencias MVS. El dimensionamiento definitivo de CPU, memoria, nodos y almacenamiento debe validarse con la herramienta o guía técnica de sizing de Instana.</p>
          {scenario.selfHostedSizing.traceVolume > 0 || scenario.ingest.serverlessOtelGbMonth > 0 || scenario.ingest.transactionalWorkloads.length > 0 ? <p>La ingesta declarada debe considerarse como referencia para estimar capacidad de backend, procesamiento y almacenamiento.</p> : null}
          {scenario.selfHostedSizing.logsTbMonth > 0 || scenario.logs.tbMonth > 0 ? <p>El volumen de logs debe considerarse para estimar storage, retención e impacto en la plataforma Self-Hosted.</p> : null}
          {hasSyntheticDeclared(scenario) ? <p>Las pruebas Synthetic desde PoP privado deben considerarse en el dimensionamiento del PoP y su infraestructura asociada.</p> : null}
        </section>
      )}
    </section>
  );
}
