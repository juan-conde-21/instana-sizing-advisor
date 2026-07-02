import { INSTANA_RULES } from '../rules/instanaRules';
import type { SyntheticResult, SyntheticRowInput, ScenarioInput } from '../types/sizing';
import { formatNumber } from '../utils/calculations';

interface Props {
  scenario: ScenarioInput;
  result: SyntheticResult;
  onChange: (value: SyntheticRowInput[]) => void;
  onGrowthChange: (value: number) => void;
}

const syntheticGrowthTooltip = 'Use este porcentaje solo si desea reservar capacidad adicional para nuevas pruebas Synthetic o aumento de frecuencia/ubicaciones. Por defecto se mantiene en 0% porque Synthetic suele dimensionarse a partir de pruebas declaradas.';

export function SyntheticCalculator({ scenario, result, onChange, onGrowthChange }: Props) {
  const setNumber = (index: number, field: keyof SyntheticRowInput, rawValue: string) => {
    const next = [...scenario.synthetic];
    const min = field === 'frequencyMinutes' ? 1 : field === 'locations' && next[index].tests > 0 ? 1 : 0;
    next[index] = { ...next[index], [field]: Math.max(min, Number(rawValue) || min) };
    onChange(next);
  };

  return (
    <section className="card span-12" id="synthetic" data-testid="synthetic-module">
      <div className="card-header">
        <div>
          <h3>Synthetic</h3>
          <p className="sub">Tabla editable por tipo de prueba. Minutos al mes: {formatNumber(INSTANA_RULES.monthlyMinutes)}. Las unidades se calculan con RU proyectadas por la sugerencia de crecimiento Synthetic.</p>
        </div>
      </div>
      <div className="form-grid compact">
        <label>
          <span className="label-with-help">Sugerencia de crecimiento Synthetic (%)<span className="help-icon" title={syntheticGrowthTooltip}>?</span></span>
          <input data-testid="synthetic-growth-input" title={syntheticGrowthTooltip} type="number" min={0} value={scenario.syntheticGrowthPercent} onChange={(event) => onGrowthChange(Math.max(0, Number(event.target.value) || 0))} />
        </label>
      </div>
      <div className="table-wrap section-gap">
        <table data-testid="synthetic-table">
          <thead>
            <tr>
              <th>Tipo de prueba</th>
              <th>Cantidad de tests</th>
              <th>Frecuencia en minutos</th>
              <th>Ubicaciones</th>
              <th>RU por ejecución</th>
              <th>Ejecuciones mensuales</th>
              <th>Subtotal RU mensual</th>
              <th>RU proyectadas</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                <td><input type="number" min={0} value={row.tests} onChange={(event) => setNumber(index, 'tests', event.target.value)} /></td>
                <td><input type="number" min={1} value={row.frequencyMinutes} onChange={(event) => setNumber(index, 'frequencyMinutes', event.target.value)} /></td>
                <td><input type="number" min={row.tests > 0 ? 1 : 0} value={row.locations} onChange={(event) => setNumber(index, 'locations', event.target.value)} /></td>
                <td>{row.ruPerExecution}</td>
                <td>{formatNumber(row.monthlyExecutions)}</td>
                <td>{formatNumber(row.monthlyRu, 1)}</td>
                <td>{formatNumber(row.projectedRu, 1)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td>Total</td>
              <td colSpan={5}>RU total mensual</td>
              <td>{formatNumber(result.totalRu, 1)}</td>
              <td>{formatNumber(result.projectedRu, 1)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="summary-strip">
        <div><span>RU calculadas sin crecimiento</span><strong>{formatNumber(result.totalRu, 1)} RU</strong></div>
        <div><span>RU proyectadas</span><strong>{formatNumber(result.projectedRu, 1)} RU</strong></div>
        <div><span>Unidades calculadas</span><strong>{formatNumber(result.calculatedUnits)}</strong></div>
        <div><span>Unidades licenciadas</span><strong>{formatNumber(result.consideredUnits)}</strong></div>
        <div><span>RU licenciadas</span><strong>{formatNumber(result.licensedRu)} RU</strong></div>
        <div><span>RU disponibles</span><strong>{formatNumber(result.availableRu, 1)} RU</strong></div>
      </div>
      {result.minimumApplied && <p className="note">El cálculo está por debajo del mínimo. Se consideran 30 unidades, equivalentes a 30,000 RU/mes. El remanente queda disponible para crecimiento o nuevas pruebas.</p>}
      <p className="note">RU disponibles: capacidad remanente después de descontar las RU proyectadas de las licenciadas.</p>
    </section>
  );
}
