import type { ExportPayload } from './exportExcel';
import { additionalCapabilities, minimumSummary, recommendationHeadline, safeFileName, selectedEditions, warningMessages } from './reporting';
import { formatNumber } from './calculations';

const pageWidth = 595;
const pageHeight = 842;
const margin = 46;
const lineHeight = 15;

type PdfPage = string[];

function hexUtf16(text: string) {
  const bytes = [0xfe, 0xff];
  for (const char of text) {
    const code = char.codePointAt(0) || 32;
    if (code > 0xffff) continue;
    bytes.push((code >> 8) & 0xff, code & 0xff);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}>`;
}

function escapeNumber(value: number) {
  return Number(value.toFixed(2));
}

function wrap(text: string, max = 88) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines;
}

class PdfBuilder {
  pages: PdfPage[] = [[]];
  y = pageHeight - margin;

  current() { return this.pages[this.pages.length - 1]; }

  addPage() {
    this.pages.push([]);
    this.y = pageHeight - margin;
  }

  ensure(lines = 1) {
    if (this.y - lines * lineHeight < margin) this.addPage();
  }

  text(text: string, size = 10, bold = false, indent = 0) {
    wrap(text, size >= 15 ? 58 : 92 - Math.floor(indent / 4)).forEach((line) => {
      this.ensure();
      this.current().push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${escapeNumber(margin + indent)} ${escapeNumber(this.y)} Td ${hexUtf16(line)} Tj ET`);
      this.y -= lineHeight;
    });
  }

  gap(lines = 1) { this.y -= lineHeight * lines; }

  rule() {
    this.ensure();
    this.current().push(`${margin} ${escapeNumber(this.y)} m ${pageWidth - margin} ${escapeNumber(this.y)} l S`);
    this.y -= 10;
  }

  section(title: string) {
    this.ensure(3);
    this.gap(0.3);
    this.text(title, 15, true);
    this.rule();
  }

  kv(label: string, value: string | number) {
    this.text(`${label}: ${value}`, 10, false, 8);
  }

  bullets(items: string[]) {
    items.forEach((item) => this.text(`• ${item}`, 10, false, 12));
  }
}

function buildPages(payload: ExportPayload) {
  const pdf = new PdfBuilder();
  const { scenario, inventory, ingest, logs, synthetic, quoteLines } = payload;
  pdf.text('IBM Instana Observability', 20, true);
  pdf.text('Estimación de licenciamiento', 16, true);
  pdf.gap();
  pdf.kv('Cliente', scenario.general.client || 'Sin cliente');
  pdf.kv('Modalidad', scenario.general.mode);
  pdf.kv('Fecha', new Date().toLocaleString('es-ES'));
  pdf.gap();
  pdf.text('Resultado principal', 15, true);
  pdf.text(recommendationHeadline(payload), 11, false);
  pdf.gap();
  pdf.text('Part Numbers y cantidades', 13, true);
  if (quoteLines.length) quoteLines.forEach((line) => pdf.text(`${line.partNumber} - ${line.component}: ${formatNumber(line.quantity)} ${line.unit}.`, 10, false, 8));
  else pdf.text('Sin componentes con cantidad mayor a cero.', 10, false, 8);
  pdf.gap();
  pdf.text('Principales advertencias', 13, true);
  pdf.bullets(warningMessages(payload).slice(0, 6));

  pdf.addPage();
  pdf.section('Detalle MVS');
  pdf.kv('Ediciones seleccionadas', selectedEditions(payload));
  pdf.kv('Standard declarado', `${formatNumber(inventory.standardRaw)} MVS`);
  pdf.kv('Standard licenciado', `${formatNumber(ingest.standardLicensed)} MVS`);
  pdf.kv('Essentials declarado', `${formatNumber(inventory.essentialsRaw)} MVS`);
  pdf.kv('Essentials licenciado', `${formatNumber(inventory.essentialsLicensed)} MVS`);
  pdf.kv('Mínimos aplicados', minimumSummary(payload));

  if (scenario.addOns.dataIngest && ingest.projectedServerlessOtelGb > 0) {
    pdf.section('Ingesta adicional');
    pdf.kv('Escenario', scenario.ingest.serverlessOnly ? 'Solo serverless/OpenTelemetry' : 'Agentes + serverless/OpenTelemetry');
    pdf.kv('Cuota incluida', `${formatNumber(ingest.baseIncludedGb)} GB/mes`);
    pdf.kv('Cuota disponible', `${formatNumber(ingest.remainingGb)} GB/mes`);
    pdf.kv('Volumen proyectado', `${formatNumber(ingest.projectedServerlessOtelGb)} GB/mes`);
    pdf.kv('Exceso', `${formatNumber(ingest.gbToLicense)} GB/mes`);
    pdf.kv('Unidades Data Ingest', formatNumber(ingest.dataIngestUnits));
  }

  if (scenario.addOns.logs && (logs.units > 0 || logs.isExtendedRetention === false)) {
    pdf.section('Logs');
    pdf.kv('Retención', logs.retentionLabel);
    pdf.kv('Volumen considerado', `${formatNumber(logs.projectedTbMonth, 1)} TB mensual`);
    pdf.kv('Unidades', formatNumber(logs.units));
  }

  if (scenario.addOns.syntheticManagedPop && synthetic.projectedRu > 0) {
    pdf.section('Synthetic');
    pdf.kv('RU proyectadas', `${formatNumber(synthetic.projectedRu, 1)} RU/mes`);
    pdf.kv('Unidades a cotizar', formatNumber(synthetic.consideredUnits));
    pdf.kv('RU disponibles luego del redondeo', `${formatNumber(synthetic.availableRu, 1)} RU/mes`);
  }

  if (scenario.general.mode === 'Self-Hosted') {
    pdf.section('Self-Hosted');
    pdf.text('Esta calculadora estima las licencias MVS. El dimensionamiento definitivo de CPU, memoria, nodos y almacenamiento debe validarse con la herramienta o guía técnica de sizing de Instana.', 10, false);
    pdf.kv('Volumen de trazas', `${formatNumber(scenario.selfHostedSizing.traceVolume)} ${scenario.selfHostedSizing.traceVolumeUnit}`);
    pdf.kv('Volumen de logs', `${formatNumber(scenario.selfHostedSizing.logsTbMonth, 1)} TB mensual`);
    pdf.kv('Retención', scenario.selfHostedSizing.retention);
    pdf.kv('Alta disponibilidad', scenario.selfHostedSizing.highAvailability);
    pdf.kv('Cantidad de ambientes', scenario.selfHostedSizing.environments);
  }

  pdf.section('Supuestos y validaciones');
  pdf.kv('Capacidades adicionales', additionalCapabilities(payload));
  pdf.kv('Año de generación', new Date().getFullYear());
  pdf.bullets(warningMessages(payload));
  return pdf.pages;
}

function makePdf(pages: PdfPage[]) {
  const objects: string[] = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((commands, index) => {
    const pageObj = 3 + index * 2;
    const contentObj = pageObj + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R /F2 ${4 + pages.length * 2} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    const stream = `0.2 w\n${commands.join('\n')}`;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => { body += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([body], { type: 'application/pdf' });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function createScenarioPdfBlob(payload: ExportPayload) {
  return makePdf(buildPages(payload));
}

export function exportScenarioToPdf(payload: ExportPayload) {
  downloadBlob(createScenarioPdfBlob(payload), `instana-sizing-advisor-${safeFileName(payload.scenario.general.client)}.pdf`);
}
