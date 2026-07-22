import type { ScenarioInput } from '../types/sizing';

export interface ScenarioExample {
  id: string;
  title: string;
  bullets: string[];
  scenario: ScenarioInput;
}

interface Props {
  examples: ScenarioExample[];
  activeExampleId: string | null;
  onSelect: (example: ScenarioExample) => void;
}

export function ExampleCards({ examples, activeExampleId, onSelect }: Props) {
  return (
    <section className="section-card" id="ejemplos" data-testid="examples-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Inicio rápido</p>
          <h2>Comienza con un ejemplo</h2>
          <p>Selecciona el escenario más parecido al cliente. Luego puedes editar cualquier valor y revisar cómo cambia la cotización.</p>
        </div>
      </div>
      <div className="example-grid">
        {examples.map((example) => (
          <button
            className={`example-card ${activeExampleId === example.id ? 'selected' : ''}`}
            type="button"
            data-testid={`example-${example.id}`}
            key={example.id}
            onClick={() => onSelect(example)}
          >
            <strong>{example.title}</strong>
            <ul>
              {example.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
            {activeExampleId === example.id && <span className="selected-label">Escenario cargado</span>}
          </button>
        ))}
      </div>
    </section>
  );
}
