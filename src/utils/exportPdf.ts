import type { ExportPayload } from './exportExcel';
import { commercialJustification, CPQ_VALIDATION_NOTE, executiveRecommendation, minimumSummary, safeFileName, selectedEditions, warningMessages } from './reporting';
import { formatNumber } from './calculations';
import { INSTANA_RULES } from '../rules/instanaRules';
import { LOGS_CAPACITY_IMPACT, SYNTHETIC_CAPACITY_IMPACT } from '../rules/selfHostedCapacity';

const pageWidth = 595;
const pageHeight = 842;
const margin = 42;
const lineHeight = 13;

type PdfPage = string[];
type PdfRow = Array<string | number>;

type Rgb = [number, number, number];

const blue: Rgb = [0.059, 0.384, 0.996];
const darkBlue: Rgb = [0, 0.114, 0.424];
const cyanSoft: Rgb = [0.929, 0.961, 1];
const greenSoft: Rgb = [0.871, 0.984, 0.902];
const gray: Rgb = [0.32, 0.32, 0.32];
const border: Rgb = [0.82, 0.82, 0.82];

function winAnsiHex(text: string) {
  const bytes: number[] = [];
  const normalized = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/•/g, '-');
  for (const char of normalized) {
    const code = char.charCodeAt(0);
    bytes.push(code <= 255 ? code : 32);
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}>`;
}

function num(value: number) {
  return Number(value.toFixed(2));
}

function rgb([r, g, b]: Rgb) {
  return `${r} ${g} ${b}`;
}

function wrap(text: string, max = 86) {
  const words = String(text).split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : [''];
}

class PdfBuilder {
  pages: PdfPage[] = [[]];
  y = pageHeight - margin;

  current() { return this.pages[this.pages.length - 1]; }

  addPage() {
    this.pages.push([]);
    this.y = pageHeight - margin;
  }

  ensure(height = lineHeight) {
    if (this.y - height < margin + 28) this.addPage();
  }

  rect(x: number, y: number, w: number, h: number, fill?: Rgb, stroke?: Rgb) {
    const commands = this.current();
    if (fill) commands.push(`${rgb(fill)} rg ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`);
    if (stroke) commands.push(`${rgb(stroke)} RG ${num(x)} ${num(y)} ${num(w)} ${num(h)} re S`);
  }

  textAt(text: string, x: number, y: number, size = 10, bold = false, color: Rgb = [0.086, 0.086, 0.086]) {
    this.current().push(`${rgb(color)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${num(x)} ${num(y)} Td ${winAnsiHex(text)} Tj ET`);
  }

  text(text: string, size = 10, bold = false, indent = 0, max = 88, color: Rgb = [0.086, 0.086, 0.086]) {
    wrap(text, max).forEach((line) => {
      this.ensure(lineHeight);
      this.textAt(line, margin + indent, this.y, size, bold, color);
      this.y -= lineHeight;
    });
  }

  gap(lines = 1) { this.y -= lineHeight * lines; }

  header(title: string, subtitle: string) {
    this.ensure(62);
    this.rect(margin, this.y - 48, pageWidth - margin * 2, 58, darkBlue);
    this.textAt(title, margin + 16, this.y - 12, 18, true, [1, 1, 1]);
    this.textAt(subtitle, margin + 16, this.y - 32, 12, false, [0.82, 0.89, 1]);
    this.y -= 74;
  }

  section(title: string) {
    this.ensure(30);
    this.rect(margin, this.y - 19, pageWidth - margin * 2, 24, blue);
    this.textAt(title, margin + 10, this.y - 11, 11, true, [1, 1, 1]);
    this.y -= 34;
  }

  card(title: string, body: string, fill: Rgb = greenSoft) {
    const lines = wrap(body, 82);
    const height = 36 + lines.length * lineHeight;
    this.ensure(height);
    this.rect(margin, this.y - height + 8, pageWidth - margin * 2, height, fill, border);
    this.textAt(title, margin + 12, this.y - 12, 11, true, darkBlue);
    let y = this.y - 30;
    lines.forEach((line) => {
      this.textAt(line, margin + 12, y, 10, false);
      y -= lineHeight;
    });
    this.y -= height + 8;
  }

  kvGrid(items: Array<[string, string | number]>) {
    const colW = (pageWidth - margin * 2 - 12) / 2;
    const rowH = 42;
    items.forEach((item, index) => {
      const col = index % 2;
      if (col === 0) this.ensure(rowH + 6);
      const x = margin + col * (colW + 12);
      const y = this.y - rowH;
      this.rect(x, y, colW, rowH, cyanSoft, border);
      this.textAt(item[0], x + 9, y + 24, 8, true, gray);
      this.textAt(String(item[1]), x + 9, y + 9, 11, true, darkBlue);
      if (col === 1 || index === items.length - 1) this.y -= rowH + 8;
    });
  }

  table(headers: string[], rows: PdfRow[], widths: number[]) {
    if (!rows.length) return;
    const tableWidth = widths.reduce((sum, width) => sum + width, 0);
    const headerH = 24;
    this.ensure(headerH + 24);
    let x = margin;
    this.rect(margin, this.y - headerH, tableWidth, headerH, darkBlue, border);
    headers.forEach((header, index) => {
      this.textAt(header, x + 4, this.y - 15, 8, true, [1, 1, 1]);
      x += widths[index];
    });
    this.y -= headerH;
    rows.forEach((row) => {
      const wrapped = row.map((cell, index) => wrap(String(cell ?? ''), Math.max(8, Math.floor(widths[index] / 5.3))));
      const rowH = Math.max(24, Math.max(...wrapped.map((lines) => lines.length)) * 11 + 10);
      this.ensure(rowH + headerH);
      x = margin;
      this.rect(margin, this.y - rowH, tableWidth, rowH, undefined, border);
      row.forEach((_, index) => {
        let y = this.y - 13;
        wrapped[index].forEach((line) => {
          this.textAt(line, x + 4, y, 7.5, index === 1);
          y -= 10;
        });
        x += widths[index];
      });
      this.y -= rowH;
    });
    this.y -= 12;
  }

  footer() {
    this.pages.forEach((page, index) => {
      page.push(`${rgb(border)} RG ${margin} 30 m ${pageWidth - margin} 30 l S`);
      page.push(`${rgb(gray)} rg BT /F1 8 Tf ${margin} 18 Td ${winAnsiHex('Validar contra CPQ antes de emitir cotización')} Tj ET`);
      page.push(`${rgb(gray)} rg BT /F1 8 Tf ${pageWidth - margin - 70} 18 Td ${winAnsiHex(`Página ${index + 1} de ${this.pages.length}`)} Tj ET`);
    });
  }
}

function quoteRows(payload: ExportPayload): PdfRow[] {
  return payload.quoteLines.filter((line) => line.quantity > 0).map((line) => [line.component, line.partNumber, formatNumber(line.quantity), line.unit]);
}

function indicatorItems(payload: ExportPayload): Array<[string, string | number]> {
  const items: Array<[string, string | number]> = [];
  if (payload.inventory.standardRaw > 0 || payload.ingest.standardLicensed > 0) items.push(['MVS Standard', `${formatNumber(payload.ingest.standardLicensed)} MVS`]);
  if (payload.inventory.essentialsRaw > 0 || payload.inventory.essentialsLicensed > 0) items.push(['MVS Essentials', `${formatNumber(payload.inventory.essentialsLicensed)} MVS`]);
  if (payload.scenario.general.mode === 'SaaS' && payload.ingest.baseIncludedGb > 0) items.push(['Cuota incluida', `${formatNumber(payload.ingest.baseIncludedGb)} GB/mes`]);
  if (payload.scenario.addOns.dataIngest && payload.ingest.projectedServerlessOtelGb > 0) items.push(['Volumen proyectado', `${formatNumber(payload.ingest.projectedServerlessOtelGb)} GB/mes`]);
  if (payload.scenario.addOns.dataIngest && payload.ingest.gbToLicense > 0) items.push(['Exceso', `${formatNumber(payload.ingest.gbToLicense)} GB/mes`]);
  if (payload.scenario.addOns.logs && payload.logs.units > 0) items.push(['Logs', `${formatNumber(payload.logs.units)} unidades`]);
  if (payload.scenario.addOns.syntheticManagedPop && payload.synthetic.consideredUnits > 0) items.push(['Synthetic', `${formatNumber(payload.synthetic.consideredUnits)} unidades`]);
  return items;
}

function buildPages(payload: ExportPayload) {
  const pdf = new PdfBuilder();
  const { scenario, inventory, ingest, logs, synthetic, quoteLines } = payload;

  pdf.header('IBM Instana Observability', 'Estimación comercial de licenciamiento');
  pdf.kvGrid([
    ['Cliente u oportunidad', scenario.general.client || 'Sin cliente'],
    ['Modalidad', scenario.general.mode],
    ['Fecha', new Date().toLocaleString('es-ES')],
    ['Escenario', scenario.ingest.serverlessOnly ? 'Solo serverless/OpenTelemetry' : selectedEditions(payload)],
  ]);
  pdf.card('Resultado principal', executiveRecommendation(payload));
  pdf.section('Part Numbers a cotizar');
  if (quoteLines.length) pdf.table(['Componente', 'Part Number', 'Cantidad', 'Unidad'], quoteRows(payload), [225, 78, 62, 146]);
  else pdf.text('Sin componentes con cantidad mayor a cero.', 10, false);
  pdf.section('Indicadores principales');
  pdf.kvGrid(indicatorItems(payload));
  pdf.card('Justificación resumida', commercialJustification(payload), cyanSoft);
  if (ingest.fiftyMvsScenario && ingest.selectedScenario !== 'fifty-mvs') {
    pdf.card('Alternativa por evaluar', 'Incrementar la base a 50 MVS podría reducir o eliminar Data Ingest adicional. Esta alternativa no está aplicada en la cotización actual y requiere confirmación.', cyanSoft);
  }
  pdf.card('Validación comercial', CPQ_VALIDATION_NOTE, [1, 0.973, 0.851]);

  pdf.addPage();
  pdf.header('Detalle del cálculo', 'Información técnica que respalda la recomendación comercial');
  const mvsRows: PdfRow[] = [];
  if (inventory.standardRaw > 0 || ingest.standardLicensed > 0) mvsRows.push(['Standard', scenario.inventory.standardPhysical, scenario.inventory.standardVirtual, scenario.inventory.standardKubernetesWorkers, inventory.standardRaw, inventory.standardMinimumApplied || (scenario.ingest.serverlessOnly && inventory.standardRaw === 0 && ingest.standardLicensed === INSTANA_RULES.commercialMinimumMvs) ? 'Sí' : 'No', ingest.standardLicensed]);
  if (inventory.essentialsRaw > 0 || inventory.essentialsLicensed > 0) mvsRows.push(['Essentials', scenario.inventory.essentialsPhysical, scenario.inventory.essentialsVirtual, scenario.inventory.essentialsKubernetesWorkers, inventory.essentialsRaw, inventory.essentialsMinimumApplied ? 'Sí' : 'No', inventory.essentialsLicensed]);
  if (mvsRows.length) {
    pdf.section('Detalle MVS');
    pdf.table(['Edición', 'Físicos', 'Virtuales', 'Workers', 'Declarados', 'Mínimo', 'Licenciados'], mvsRows, [78, 62, 66, 62, 78, 72, 93]);
  }

  if (scenario.addOns.dataIngest && ingest.projectedServerlessOtelGb > 0) {
    pdf.section('Data Ingest');
    pdf.table(['Concepto', 'Valor', 'Unidad'], [
      ['Escenario', scenario.ingest.serverlessOnly ? 'Solo serverless/OpenTelemetry' : 'Agentes + serverless/OpenTelemetry', ''],
      ['Cuota incluida', formatNumber(ingest.baseIncludedGb), 'GB/mes'],
      ['Porcentaje usado por agentes', formatNumber(scenario.ingest.agentConsumptionPercent), '%'],
      ['Cuota disponible', formatNumber(ingest.remainingGb), 'GB/mes'],
      ['Volumen ingresado', formatNumber(scenario.ingest.useTransactionalMode ? ingest.transactionalWorkloads.reduce((sum, row) => sum + row.gbMonth, 0) : scenario.ingest.serverlessOtelGbMonth), 'GB/mes'],
      ['Crecimiento', formatNumber(scenario.ingest.growthPercent), '%'],
      ['Volumen proyectado', formatNumber(ingest.projectedServerlessOtelGb), 'GB/mes'],
      ['Exceso', formatNumber(ingest.gbToLicense), 'GB/mes'],
      ['Tamaño del bloque', formatNumber(INSTANA_RULES.dataIngest.unitGb), 'GB/mes'],
      ['Unidades', formatNumber(ingest.dataIngestUnits), INSTANA_RULES.dataIngest.unitLabel],
    ], [230, 120, 161]);
  }

  if (scenario.addOns.logs && (logs.units > 0 || !logs.isExtendedRetention)) {
    pdf.section('Logs');
    pdf.table(['Concepto', 'Valor', 'Unidad'], [
      ['Retención', logs.retentionLabel, ''],
      ['Volumen considerado', formatNumber(logs.projectedTbMonth, 1), 'TB mensual'],
      ['Unidades', formatNumber(logs.units), INSTANA_RULES.logs.unitLabel],
    ], [230, 120, 161]);
  }

  if (scenario.addOns.syntheticManagedPop && synthetic.projectedRu > 0) {
    pdf.section('Synthetic');
    pdf.table(['Concepto', 'Valor', 'Unidad'], [
      ['RU proyectadas', formatNumber(synthetic.projectedRu, 1), 'RU/mes'],
      ['Unidades a cotizar', formatNumber(synthetic.consideredUnits), INSTANA_RULES.synthetic.unitLabel],
      ['RU disponibles', formatNumber(synthetic.availableRu, 1), 'RU/mes'],
    ], [230, 120, 161]);
  }

  if (scenario.general.mode === 'Self-Hosted') {
    const sh = scenario.selfHostedSizing;
    const scenarioLabel = sh.scenario === 'base' ? 'Production base' : sh.scenario === 'large' ? 'Production large' : 'Custom';
    const logsApplied = sh.logsTbMonth > 0;
    const syntheticApplied = synthetic.rows.some((r) => r.tests > 0) || scenario.synthetic.some((r) => r.tests > 0);
    const k8sIntensive = sh.workloadType === 'Kubernetes intensivo';
    const addCpu = (logsApplied ? LOGS_CAPACITY_IMPACT.cpuVcpu : 0) + (syntheticApplied ? SYNTHETIC_CAPACITY_IMPACT.cpuVcpu : 0);
    const addRamGb = (logsApplied ? LOGS_CAPACITY_IMPACT.ramGb : 0) + (syntheticApplied ? SYNTHETIC_CAPACITY_IMPACT.ramGb : 0);
    const addStorageTb = logsApplied ? LOGS_CAPACITY_IMPACT.storageTb : 0;
    const totalCpu = sh.cpu + addCpu;
    const totalRam = sh.ramGb + addRamGb;
    const totalStorage = parseFloat((sh.storageTb + addStorageTb).toFixed(3));

    pdf.addPage();
    pdf.header('Capacidad Self-Hosted referencial', 'Dimensionamiento orientativo. Requiere validacion con IBM preventa.');

    pdf.section('A. Escenario seleccionado');
    pdf.table(['Concepto', 'Valor', ''], [
      ['Escenario', scenarioLabel, ''],
      ['Alta disponibilidad', sh.highAvailability, ''],
      ['Cantidad de ambientes', sh.environments, ''],
    ], [230, 200, 81]);

    pdf.section('B. Capacidad del backend Instana');
    pdf.table(['Recurso', 'Valor base', 'Unidad'], [
      ['CPU referencial', sh.cpu, 'vCPU'],
      ['Memoria referencial', sh.ramGb, 'GB RAM'],
      ['Storage referencial', sh.storageTb, 'TB'],
      ['IOPS minimo', sh.iops, ''],
      ['Throughput minimo', sh.throughputMibS, 'MiB/s'],
    ], [230, 120, 161]);

    pdf.section('C. Volumenes referenciales de ingesta');
    pdf.table(['Concepto', 'Valor', 'Unidad'], [
      ['Hosts referenciales a monitorear', sh.referenceHosts > 0 ? sh.referenceHosts : 'No declarado', ''],
      ['Tipo de carga predominante', sh.workloadType, ''],
      ['Volumen referencial de trazas', formatNumber(sh.traceVolume), sh.traceVolumeUnit],
      ['Volumen de logs', formatNumber(sh.logsTbMonth, 1), 'TB mensual'],
      ['Retencion', sh.retention, ''],
      ['Crecimiento esperado', formatNumber(sh.growthPercent), '%'],
    ], [230, 200, 81]);

    pdf.section('D. Capacidad referencial a validar');
    const capacityRows: PdfRow[] = [
      ['CPU base', sh.cpu, 'vCPU'],
      ['Memoria base', sh.ramGb, 'GB RAM'],
      ['Storage base', sh.storageTb, 'TB'],
    ];
    if (addCpu > 0) capacityRows.push(['Incremento CPU tecnico', `+${addCpu}`, 'vCPU']);
    if (addRamGb > 0) capacityRows.push(['Incremento memoria tecnica', `+${addRamGb}`, 'GB RAM']);
    if (addStorageTb > 0) capacityRows.push([`Incremento storage tecnico`, `+${addStorageTb.toFixed(3)}`, 'TB']);
    capacityRows.push(['Total referencial CPU', totalCpu, 'vCPU']);
    capacityRows.push(['Total referencial memoria', totalRam, 'GB RAM']);
    capacityRows.push(['Total referencial storage', totalStorage, 'TB']);
    pdf.table(['Concepto', 'Valor', 'Unidad'], capacityRows, [230, 120, 161]);

    const technicalImpacts: PdfRow[] = [];
    if (logsApplied) technicalImpacts.push(['Logs / Analyze Logs', '+4 vCPU, +12 GB RAM, +3.688 TB storage']);
    if (syntheticApplied) technicalImpacts.push(['Synthetic privado', '+2 vCPU, +9 GB RAM']);
    if (ingest.projectedServerlessOtelGb > 0) technicalImpacts.push(['Serverless / OpenTelemetry', 'Requiere estimacion por TPS, spans, peso promedio y retencion']);
    if (k8sIntensive) technicalImpacts.push(['Kubernetes intensivo', 'Advertencia: pods, contenedores, namespaces y cardinalidad generan carga adicional']);
    if (sh.highAvailability === 'Sí') technicalImpacts.push(['Alta disponibilidad', 'Requiere validacion de arquitectura multinodo o diseno especifico con IBM preventa']);
    if (technicalImpacts.length > 0) {
      pdf.section('E. Impactos tecnicos aplicados');
      pdf.table(['Componente', 'Impacto'], technicalImpacts, [200, 311]);
    }

    pdf.card(
      'F. Advertencia de sizing',
      'La capacidad mostrada es referencial y no reemplaza un sizing tecnico final. Para confirmar CPU, memoria, storage, IOPS, throughput y arquitectura, se requiere conocer el inventario a monitorear, volumen de trazas, volumen de logs, retencion, cantidad de servicios, tecnologias, uso de Kubernetes, numero de pods/contenedores, EUM, Synthetic y crecimiento esperado.',
      [1, 0.973, 0.851]
    );
    pdf.card(
      'Kubernetes y entornos mixtos',
      'Kubernetes puede generar una carga mayor que VMs tradicionales debido a la cantidad de pods, contenedores, namespaces, metricas y entidades dinamicas. Para ambientes multinodo, alta disponibilidad, Custom Edition o cargas criticas, validar con IBM preventa.',
      cyanSoft
    );
    pdf.card(
      'G. Escenarios avanzados',
      'Para escenarios multinodo, Custom Edition, alta disponibilidad o cargas criticas, el sizing debe validarse con IBM preventa.',
      cyanSoft
    );
  }

  pdf.section('Supuestos y validaciones');
  pdf.table(['Categoría', 'Detalle'], [
    ['Mínimos aplicados', minimumSummary(payload)],
    ['Año de generación', new Date().getFullYear()],
    ...warningMessages(payload).map((warning) => ['Recomendación', warning] as PdfRow),
  ], [150, 361]);

  pdf.footer();
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
    const stream = `0.4 w\n${commands.join('\n')}`;
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
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
