interface Props {
  onExportExcel: () => void;
  onExportPdf: () => void;
  onCopySummary: () => void;
  onClear: () => void;
  statusMessage: string;
}

export function ExportActions({ onExportExcel, onExportPdf, onCopySummary, onClear, statusMessage }: Props) {
  return (
    <section className="section-card" id="exportaciones">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Exportaciones</p>
          <h2>Genera el entregable</h2>
          <p>Descarga reportes profesionales o copia un resumen ejecutivo con recomendación, Part Numbers, cantidades y advertencias.</p>
        </div>
      </div>
      <div className="actions final-actions">
        <button className="primary" type="button" data-testid="export-pdf-button" onClick={onExportPdf}>Descargar reporte PDF</button>
        <button className="primary" type="button" data-testid="export-excel-button" onClick={onExportExcel}>Descargar Excel</button>
        <button className="secondary" type="button" data-testid="copy-summary-button" onClick={onCopySummary}>Copiar resumen</button>
        <button className="secondary" type="button" data-testid="clear-form-button" onClick={onClear}>Limpiar</button>
      </div>
      {statusMessage && <p className="note" data-testid="export-status-message">{statusMessage}</p>}
    </section>
  );
}
