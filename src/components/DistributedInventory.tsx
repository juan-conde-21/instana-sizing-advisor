import type { EditionSelection, InventoryInput, InventoryResult } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  value: InventoryInput;
  result: InventoryResult;
  editions: EditionSelection;
  serverlessMinimumApplied: boolean;
  onChange: (value: InventoryInput) => void;
}

const osTooltip = 'Considerar servidores físicos o virtuales con sistema operativo Linux, Windows, Unix o AIX donde se ejecutan workloads, servicios, bases de datos, middleware o componentes de aplicación monitoreados por Instana. No incluir equipos de red como switches, routers, firewalls, balanceadores, storage appliances u otros dispositivos que no sean servidores con sistema operativo monitoreado.';
const workerTooltip = 'Considerar los worker nodes donde corren los workloads de aplicación. No se cuentan pods de forma individual.';

type Field = [keyof InventoryInput, string, string, string];

const standardFields: Field[] = [
  ['standardPhysical', 'Servidores físicos', 'standard-physical-input', osTooltip],
  ['standardVirtual', 'Servidores virtuales', 'standard-vm-input', osTooltip],
  ['standardKubernetesWorkers', 'Worker nodes', 'standard-worker-input', workerTooltip],
];

const essentialsFields: Field[] = [
  ['essentialsPhysical', 'Servidores físicos', 'essentials-physical-input', osTooltip],
  ['essentialsVirtual', 'Servidores virtuales', 'essentials-vm-input', osTooltip],
  ['essentialsKubernetesWorkers', 'Worker nodes', 'essentials-worker-input', workerTooltip],
];

function toWholeNumber(next: string) {
  return Math.max(0, Math.floor(Number(next) || 0));
}

function ruleMessage(raw: number, licensed: number, serverlessMinimum = false) {
  if (serverlessMinimum) return '0 MVS declarados. Se usa base comercial mínima de 10 MVS Standard por alcance solo serverless/OpenTelemetry.';
  if (raw === 0) return '0 MVS declarados. No se genera una línea de licencia, salvo que se seleccione el escenario solo serverless.';
  if (raw < licensed) return `${formatNumber(raw)} MVS declarados. Se aplica el mínimo comercial de ${formatNumber(licensed)} MVS.`;
  return `${formatNumber(raw)} MVS declarados. Se licencian ${formatNumber(licensed)} MVS.`;
}

export function DistributedInventory({ value, result, editions, serverlessMinimumApplied, onChange }: Props) {
  const setNumber = (field: keyof InventoryInput, next: string) => onChange({ ...value, [field]: toWholeNumber(next) });

  return (
    <section className="section-card" id="inventario">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Paso 3</p>
          <h2>Ingresa las cantidades que forman la licencia</h2>
          <p>Registra servidores físicos, servidores virtuales y worker nodes. La suma de esos tres valores forma el total MVS de cada edición.</p>
        </div>
      </div>
      <div className="notice compact-notice">
        Pregunta al cliente cuántos equipos físicos, máquinas virtuales y worker nodes serán monitoreados. No separes Linux, Windows, AIX, nube u on-premises en campos distintos para no duplicar la suma.
      </div>
      <div className="inventory-grid">
        {editions.standard && (
          <InventoryEdition
            title="Instana Standard - APM y observabilidad completa"
            description="Incluye los servidores y worker nodes donde se requiere seguimiento de transacciones, servicios, dependencias, errores y rendimiento."
            fields={standardFields}
            value={value}
            raw={result.standardRaw}
            licensed={serverlessMinimumApplied ? 10 : result.standardLicensed}
            minimumApplied={result.standardMinimumApplied || serverlessMinimumApplied}
            serverlessMinimumApplied={serverlessMinimumApplied}
            onChange={setNumber}
          />
        )}
        {editions.essentials && (
          <InventoryEdition
            title="Instana Essentials - monitoreo de infraestructura"
            description="Incluye los servidores y worker nodes donde solo se requiere disponibilidad, CPU, memoria, disco y red, sin APM completo."
            fields={essentialsFields}
            value={value}
            raw={result.essentialsRaw}
            licensed={result.essentialsLicensed}
            minimumApplied={result.essentialsMinimumApplied}
            onChange={setNumber}
          />
        )}
      </div>
    </section>
  );
}

function InventoryEdition({ title, description, fields, value, raw, licensed, minimumApplied, serverlessMinimumApplied = false, onChange }: {
  title: string;
  description: string;
  fields: Field[];
  value: InventoryInput;
  raw: number;
  licensed: number;
  minimumApplied: boolean;
  serverlessMinimumApplied?: boolean;
  onChange: (field: keyof InventoryInput, next: string) => void;
}) {
  return (
    <article className="inventory-edition">
      <div className="inventory-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="inventory-fields">
        {fields.map(([field, label, testId, tooltip]) => (
          <label key={field}>
            <span className="label-with-help">{label}<span className="help-icon" title={tooltip}>?</span></span>
            <input data-testid={testId} title={tooltip} type="number" inputMode="numeric" step={1} min={0} value={value[field]} onChange={(event) => onChange(field, event.target.value)} />
          </label>
        ))}
      </div>
      <div className="inventory-total-row">
        <div><span>MVS declarados</span><strong>{formatNumber(raw)}</strong></div>
        <div><span>Regla aplicada</span><strong>{minimumApplied ? 'Mínimo comercial' : 'Sin mínimo'}</strong></div>
        <div><span>Mínimo comercial</span><strong>{minimumApplied ? '10 MVS' : 'No aplica'}</strong></div>
        <div><span>MVS a licenciar</span><strong>{formatNumber(licensed)}</strong></div>
      </div>
      <p className="note">{ruleMessage(raw, licensed, serverlessMinimumApplied)}</p>
    </article>
  );
}
