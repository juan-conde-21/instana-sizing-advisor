import type { InventoryInput, InventoryResult } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  value: InventoryInput;
  result: InventoryResult;
  onChange: (value: InventoryInput) => void;
}

const osTooltip = 'Considerar servidores físicos o virtuales con sistema operativo Linux, Windows, Unix o AIX donde se ejecutan workloads, servicios, bases de datos, middleware o componentes de aplicación monitoreados por Instana. No incluir equipos de red como switches, routers, firewalls, balanceadores, storage appliances u otros dispositivos que no sean servidores con sistema operativo monitoreado.';
const workerTooltip = 'Considerar los worker nodes donde corren los workloads de aplicación. No se cuentan pods de forma individual.';

const fields: Array<[keyof InventoryInput, string, string, string]> = [
  ['standardPhysical', 'Máquinas físicas Standard con sistema operativo', 'standard-physical-input', osTooltip],
  ['standardVirtual', 'Máquinas virtuales Standard con sistema operativo', 'standard-vm-input', osTooltip],
  ['standardKubernetesWorkers', 'Kubernetes worker nodes Standard', 'standard-worker-input', workerTooltip],
  ['essentialsPhysical', 'Máquinas físicas Essentials con sistema operativo', 'essentials-physical-input', osTooltip],
  ['essentialsVirtual', 'Máquinas virtuales Essentials con sistema operativo', 'essentials-vm-input', osTooltip],
  ['essentialsKubernetesWorkers', 'Kubernetes worker nodes Essentials', 'essentials-worker-input', workerTooltip],
];

export function DistributedInventory({ value, result, onChange }: Props) {
  const setNumber = (field: keyof InventoryInput, next: string) => onChange({ ...value, [field]: Math.max(0, Number(next) || 0) });

  return (
    <section className="card span-12" id="inventario">
      <div className="card-header">
        <div>
          <h3>Inventario a monitorear</h3>
          <p className="sub">Instana distribuido se calcula por máquina física, máquina virtual o Kubernetes worker node.</p>
        </div>
      </div>
      <div className="form-grid">
        {fields.map(([field, label, testId, tooltip]) => (
          <label key={field}>
            <span className="label-with-help">{label}<span className="help-icon" title={tooltip}>?</span></span>
            <input data-testid={testId} title={tooltip} type="number" min={0} value={value[field]} onChange={(event) => setNumber(field, event.target.value)} />
          </label>
        ))}
      </div>
      <div className="help-grid">
        <article>
          <h4>¿Qué debo contar?</h4>
          <p>Incluye servidores físicos, máquinas virtuales y worker nodes Kubernetes donde se ejecutan workloads monitoreados.</p>
        </article>
        <article>
          <h4>¿Qué no debo contar?</h4>
          <p>No incluir equipos de red, appliances, switches, routers, firewalls, balanceadores o dispositivos que no representen servidores con sistema operativo monitoreado.</p>
        </article>
      </div>
      <div className="summary-strip">
        <div>
          <span>MVS declarados Standard</span>
          <strong>{formatNumber(result.standardRaw)} MVS</strong>
        </div>
        <div>
          <span>MVS licenciados Standard</span>
          <strong>{formatNumber(result.standardLicensed)} MVS</strong>
        </div>
        <div>
          <span>MVS declarados Essentials</span>
          <strong>{formatNumber(result.essentialsRaw)} MVS</strong>
        </div>
        <div>
          <span>MVS licenciados Essentials</span>
          <strong>{formatNumber(result.essentialsLicensed)} MVS</strong>
        </div>
      </div>
    </section>
  );
}
