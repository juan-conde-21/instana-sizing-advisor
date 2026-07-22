import type { InventoryInput, InventoryResult, ScenarioInput } from '../types/sizing';

interface Props {
  scenario: ScenarioInput;
  inventory: InventoryResult;
}

function sameInventory(value: InventoryInput) {
  const standard = [value.standardPhysical, value.standardVirtual, value.standardKubernetesWorkers];
  const essentials = [value.essentialsPhysical, value.essentialsVirtual, value.essentialsKubernetesWorkers];
  return standard.some((item) => item > 0) && standard.every((item, index) => item === essentials[index]);
}

export function ValidationPanel({ scenario, inventory }: Props) {
  const messages: string[] = [];
  if (sameInventory(scenario.inventory)) messages.push('Standard y Essentials tienen exactamente el mismo inventario. Revisa que la misma infraestructura no esté duplicada entre ediciones.');
  if (inventory.standardMinimumApplied) messages.push(`Standard: ${inventory.standardRaw} MVS declarados. Se aplica el mínimo comercial de ${inventory.standardLicensed} MVS.`);
  if (inventory.essentialsMinimumApplied) messages.push(`Essentials: ${inventory.essentialsRaw} MVS declarados. Se aplica el mínimo comercial de ${inventory.essentialsLicensed} MVS.`);
  if (messages.length === 0) messages.push('No hay advertencias de inventario para los valores actuales.');

  return (
    <section className="section-card" id="validaciones" data-testid="validation-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Validaciones</p>
          <h2>Revisa antes de cotizar</h2>
          <p>Confirma que las cantidades no dupliquen infraestructura y que los mínimos comerciales aplicados sean claros.</p>
        </div>
      </div>
      <div className="validation-list">
        {messages.map((message) => <p key={message}>{message}</p>)}
      </div>
    </section>
  );
}
