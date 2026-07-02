import type { Recommendation } from '../types/sizing';

interface Props {
  recommendations: Recommendation[];
  onActivateAddOn?: (target: 'dataIngest' | 'logs' | 'synthetic') => void;
  onSelectFiftyMvs?: () => void;
}

export function DetectedRecommendations({ recommendations, onActivateAddOn, onSelectFiftyMvs }: Props) {
  const handleAction = (item: Recommendation) => {
    if (item.action === 'dataIngest' || item.action === 'logs' || item.action === 'synthetic') onActivateAddOn?.(item.action);
    if (item.action === 'fiftyMvs') onSelectFiftyMvs?.();
  };

  return (
    <section className="card span-12" id="recomendaciones" data-testid="recommendations-section">
      <div className="card-header">
        <div>
          <h3>Recomendaciones detectadas</h3>
          <p className="sub">Estas recomendaciones ayudan a identificar componentes que podrían requerirse según los datos ingresados.</p>
        </div>
      </div>
      {recommendations.length === 0 ? (
        <p className="empty">No hay recomendaciones detectadas para los valores actuales.</p>
      ) : (
        <div className="recommendation-grid">
          {recommendations.map((item) => (
            <article className={`recommendation ${item.severity}`} key={item.id}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              {item.action && (
                <button className="secondary recommendation-action" type="button" onClick={() => handleAction(item)}>
                  {item.action === 'fiftyMvs' ? 'Usar escenario 50 MVS' : 'Activar add-on'}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
