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
const descriptions: Record<SyntheticRowInput['id'], string> = {
  apiSimple: 'Comprueba que un endpoint responda correctamente.',
  apiScript: 'Ejecuta una secuencia de llamadas o validaciones sobre una API.',
  browserTest: 'Simula acciones de una persona en una aplicación web, como iniciar sesión, realizar una consulta o completar una operación.',
};

export function SyntheticCalculator({ scenario, result, onChange, onGrowthChange }: Props) {
  const setNumber = (index: number, field: keyof SyntheticRowInput, rawValue: string) => {
    const next = [...scenario.synthetic];
    const min = field === 'frequencyMinutes' ? 1 : field === 'locations' && next[index].tests > 0 ? 1 : 0;
    next[index] = { ...next[index], [field]: Math.max(min, Number(rawValue) || min) };
    onChange(next);
  };

  return (
    <section className="section-card" id="synthetic" data-testid="synthetic-module">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SaaS</p>
          <h2>Pruebas automáticas de disponibilidad y experiencia</h2>
          <p>Synthetic ejecuta pruebas programadas para comprobar que una API o aplicación web esté disponible y funcione correctamente, incluso cuando no existan usuarios conectados.</p>
        </div>
      </div>
      <div className="question-panel">
        <strong>Preguntas al cliente</strong>
        <ul>
          <li>¿Cuántas pruebas desean ejecutar?</li>
          <li>¿Cada cuánto tiempo deben ejecutarse?</li>
          <li>¿Desde cuántas ubicaciones?</li>
          <li>¿Qué tipo de prueba se utilizará?</li>
        </ul>
      </div>
      <div className="definition-grid section-gap">
        {scenario.synthetic.map((row) => (
          <article key={row.id}>
            <h3>{row.label}</h3>
            <p>{descriptions[row.id]}</p>
            <p><strong>Tasa RU:</strong> {row.ruPerExecution} RU por ejecución.</p>
          </article>
        ))}
      </div>
      <div className="form-grid compact section-gap">
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
              <th>Cantidad de pruebas</th>
              <th>Frecuencia en minutos</th>
              <th>Ubicaciones</th>
              <th>RU por ejecución</th>
              <th>Ejecuciones mensuales</th>
              <th>RU calculadas</th>
              <th>RU proyectadas</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => (
              <tr key={row.id}>
                <td>{row.label}</td>
                <td><input aria-label={`${row.label} cantidad de pruebas`} type="number" min={0} value={row.tests} onChange={(event) => setNumber(index, 'tests', event.target.value)} /></td>
                <td><input aria-label={`${row.label} frecuencia`} type="number" min={1} value={row.frequencyMinutes} onChange={(event) => setNumber(index, 'frequencyMinutes', event.target.value)} /></td>
                <td><input aria-label={`${row.label} ubicaciones`} type="number" min={row.tests > 0 ? 1 : 0} value={row.locations} onChange={(event) => setNumber(index, 'locations', event.target.value)} /></td>
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
        <div><span>Cantidad de pruebas</span><strong>{formatNumber(result.rows.reduce((sum, row) => sum + row.tests, 0))}</strong></div>
        <div><span>RU calculadas</span><strong>{formatNumber(result.totalRu, 1)} RU</strong></div>
        <div><span>Crecimiento</span><strong>{formatNumber(scenario.syntheticGrowthPercent)}%</strong></div>
        <div><span>RU proyectadas</span><strong>{formatNumber(result.projectedRu, 1)} RU</strong></div>
        <div><span>Mínimo comercial</span><strong>{INSTANA_RULES.synthetic.minimumUnits} unidades</strong></div>
        <div><span>Unidades a cotizar</span><strong>{formatNumber(result.consideredUnits)}</strong></div>
        <div><span>RU licenciadas</span><strong>{formatNumber(result.licensedRu)} RU</strong></div>
        <div><span>RU disponibles luego del redondeo</span><strong>{formatNumber(result.availableRu, 1)} RU</strong></div>
      </div>
      {result.minimumApplied && <p className="note">El cálculo está por debajo del mínimo. Se consideran {INSTANA_RULES.synthetic.minimumUnits} unidades, equivalentes a {formatNumber(INSTANA_RULES.synthetic.minimumUnits * INSTANA_RULES.synthetic.unitRu)} RU/mes. Las RU disponibles quedan para crecimiento o nuevas pruebas.</p>}
      <p className="note">Ejemplo: 1 API Simple cada 60 minutos desde 1 ubicación ejecuta 720 veces al mes. Con una tasa de 0.025 RU por ejecución, calcula 18 RU mensuales. Al aplicar el mínimo configurado, se cotizan {INSTANA_RULES.synthetic.minimumUnits} unidades si Managed PoP está incluido.</p>
    </section>
  );
}
