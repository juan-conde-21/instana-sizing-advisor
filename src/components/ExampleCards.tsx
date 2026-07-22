import type { ScenarioInput } from '../types/sizing';

export type ExampleStatus = 'none' | 'loaded' | 'modified';

export interface ScenarioExample {
  id: string;
  title: string;
  bullets: string[];
  scenario: ScenarioInput;
}

interface Props {
  examples: ScenarioExample[];
  activeExampleId: string | null;
  exampleStatus: ExampleStatus;
  onSelect: (example: ScenarioExample) => void;
  onStartBlank: () => void;
  onClearActiveExample: () => void;
}

export function ExampleCards({ examples, activeExampleId, exampleStatus, onSelect, onStartBlank, onClearActiveExample }: Props) {
  const activeExample = examples.find((example) => example.id === activeExampleId) || null;

  return (
    <section className="section-card" id="ejemplos" data-testid="examples-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Inicio rápido</p>
          <h2>Comienza con un ejemplo</h2>
          <p>Los ejemplos son opcionales. Selecciona uno para cargar sus valores o utiliza “Comenzar desde cero” para realizar un dimensionamiento manual.</p>
        </div>
      </div>
      {activeExample && (
        <div className="example-state" data-testid="example-state">
          <strong>Ejemplo de origen: {activeExample.title}</strong>
          <span>Estado: {exampleStatus === 'modified' ? 'Escenario modificado' : 'Escenario cargado'}</span>
        </div>
      )}
      <div className="example-grid">
        <article className="example-card-shell">
          <button
            className={`example-card ${activeExampleId === null && exampleStatus === 'none' ? 'selected' : ''}`}
            type="button"
            data-testid="example-start-blank"
            aria-pressed={activeExampleId === null && exampleStatus === 'none'}
            onClick={onStartBlank}
          >
            <strong>Comenzar desde cero</strong>
            <p>Limpia el escenario precargado e ingresa manualmente los datos del cliente.</p>
          </button>
        </article>
        {examples.map((example) => {
          const isActive = activeExampleId === example.id;
          return (
            <article className="example-card-shell" key={example.id}>
              <button
                className={`example-card ${isActive ? 'selected' : ''}`}
                type="button"
                data-testid={`example-${example.id}`}
                aria-pressed={isActive}
                onClick={() => onSelect(example)}
              >
                <strong>{example.title}</strong>
                <ul>
                  {example.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
                {isActive && <span className="selected-label">{exampleStatus === 'modified' ? 'Escenario modificado' : 'Escenario cargado'}</span>}
              </button>
              {isActive && (
                <button className="secondary example-remove" type="button" data-testid="remove-example-button" onClick={onClearActiveExample}>
                  Quitar ejemplo
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
