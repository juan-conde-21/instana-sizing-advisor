import { describe, expect, it } from 'vitest';
import type { ScenarioInput } from '../types/sizing';
import { SELF_HOSTED_CAPACITY_IMPACTS, SELF_HOSTED_PROFILES } from '../rules/selfHostedCapacity';
import { buildQuoteLines, buildRecommendations, calculateIngest, calculateInventory, calculateLogs, calculateSynthetic } from './calculations';
import { createScenarioWorkbook } from './exportExcel';
import { createScenarioPdfBlob } from './exportPdf';
import { quoteSummaryText } from './reporting';

const baseScenario = (): ScenarioInput => ({
  general: { client: 'QA', mode: 'SaaS', environment: 'Producción', region: 'US', notes: '' },
  editions: { standard: true, essentials: false },
  inventory: {
    standardPhysical: 0,
    standardVirtual: 0,
    standardKubernetesWorkers: 0,
    essentialsPhysical: 0,
    essentialsVirtual: 0,
    essentialsKubernetesWorkers: 0,
  },
  addOns: { dataIngest: false, logs: false, syntheticManagedPop: false },
  ingest: {
    agentConsumptionPercent: 80,
    growthPercent: 20,
    serverlessOtelGbMonth: 0,
    serverlessOnly: false,
    useTransactionalMode: false,
    transactionalWorkloads: [],
    useFiftyMvsScenario: false,
    fiftyMvsConfirmed: false,
  },
  logs: { retentionDays: 7, tbMonth: 0, growthPercent: 0 },
  selfHostedSizing: { traceVolume: 0, traceVolumeUnit: 'GB/día', logsTbMonth: 0, retention: 'Por confirmar', highAvailability: 'Por confirmar', environments: 1, growthPercent: 20, notes: '' },
  synthetic: [
    { id: 'apiSimple', label: 'API Simple', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.025 },
    { id: 'apiScript', label: 'API Script', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.042 },
    { id: 'browserTest', label: 'Browser Test', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 1 },
  ],
  syntheticGrowthPercent: 0,

});



function hexForWinAnsi(input: string) {
  return input.split('').map((char) => char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()).join('');
}

function worksheetText(workbook: ReturnType<typeof createScenarioWorkbook>, name: string) {
  const worksheet = workbook.getWorksheet(name);
  if (!worksheet) return '';
  const values: string[] = [];
  worksheet.eachRow((row) => row.eachCell((cell) => values.push(String(cell.value ?? ''))));
  return values.join(' ');
}

function workbookText(workbook: ReturnType<typeof createScenarioWorkbook>) {
  return workbook.worksheets.map((sheet) => worksheetText(workbook, sheet.name)).join(' ');
}

describe('Instana sizing calculations', () => {
  it('creates professional workbook sheets without empty quote rows and preserves Spanish text', async () => {
    const scenario = baseScenario();
    scenario.general.client = 'Cliente Ñandú Año';
    scenario.inventory.standardPhysical = 5;
    scenario.addOns.logs = true;
    scenario.logs.retentionDays = 30;
    scenario.logs.tbMonth = 2.2;
    const inventory = calculateInventory(scenario.inventory);
    const logs = calculateLogs(scenario);
    const ingest = calculateIngest(scenario, inventory);
    const synthetic = calculateSynthetic(scenario.synthetic, 0, false);
    const quoteLines = buildQuoteLines(scenario, inventory, ingest, logs, synthetic);
    const recommendations = buildRecommendations(scenario, inventory, ingest, logs, synthetic);
    const workbook = createScenarioWorkbook({ scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations });
    expect(workbook.getWorksheet('Resumen ejecutivo')).toBeDefined();
    expect(workbook.getWorksheet('Detalle del cálculo')).toBeDefined();
    expect(workbook.getWorksheet('Capacidades adicionales')).toBeDefined();
    expect(workbook.getWorksheet('Catálogo y validaciones')).toBeDefined();
    expect(workbook.worksheets.every((sheet) => sheet.rowCount > 0)).toBe(true);
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
    const summaryValues = worksheetText(workbook, 'Resumen ejecutivo');
    expect(summaryValues).toContain('Ñandú Año');
    expect(summaryValues).toContain('Resultado principal');
    expect(summaryValues).toContain('Part Numbers a cotizar');
    expect(summaryValues).toContain('D0N79ZX');
    expect(summaryValues).not.toContain('Campo Valor');
  });

  it('creates a valid PDF blob with Spanish words and no empty quote sections', async () => {
    const scenario = baseScenario();
    scenario.general.client = 'Cliente Año Ñ';
    scenario.inventory.standardPhysical = 12;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const logs = calculateLogs(scenario);
    const synthetic = calculateSynthetic(scenario.synthetic, 0, false);
    const quoteLines = buildQuoteLines(scenario, inventory, ingest, logs, synthetic);
    const recommendations = buildRecommendations(scenario, inventory, ingest, logs, synthetic);
    const payload = { scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations };
    const pdf = createScenarioPdfBlob(payload);
    expect(pdf.type).toBe('application/pdf');
    expect(pdf.size).toBeGreaterThan(1000);
    const pdfText = new TextDecoder().decode(await pdf.arrayBuffer());
    expect(pdfText).toContain(hexForWinAnsi('IBM Instana Observability'));
    expect(pdfText).toContain(hexForWinAnsi('Estimación comercial de licenciamiento'));
    expect(pdfText).toContain(hexForWinAnsi('Resultado principal'));
    expect(pdfText).toContain(hexForWinAnsi('Part Numbers a cotizar'));
    expect(pdfText).toContain(hexForWinAnsi('Año de generación'));
    expect(pdfText).not.toContain(hexForWinAnsi('Aæo'));
    expect(pdfText).not.toContain('2022');
    expect((pdfText.match(new RegExp(hexForWinAnsi('Validar en CPQ la vigencia de los Part Numbers'), 'g')) || []).length).toBe(1);
    const summary = quoteSummaryText(payload);
    expect(summary).toContain('Cliente Año Ñ');
    expect(summary).toContain('D0N79ZX');
  });

  it('applies 10 MVS commercial minimum as licensed quantity while keeping declared quantity', () => {
    const inventory = calculateInventory({ standardPhysical: 5, standardVirtual: 0, standardKubernetesWorkers: 0, essentialsPhysical: 2, essentialsVirtual: 1, essentialsKubernetesWorkers: 0 });
    expect(inventory.standardRaw).toBe(5);
    expect(inventory.standardLicensed).toBe(10);
    expect(inventory.essentialsRaw).toBe(3);
    expect(inventory.essentialsLicensed).toBe(10);
  });



  it('applies 10 Standard MVS commercial base for explicit serverless-only scope', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOnly = true;
    scenario.ingest.serverlessOtelGbMonth = 4000;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const quote = buildQuoteLines(scenario, inventory, ingest, calculateLogs(scenario), calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, false));
    expect(inventory.standardLicensed).toBe(0);
    expect(ingest.standardLicensed).toBe(10);
    expect(ingest.baseIncludedGb).toBe(3250);
    expect(ingest.agentAverageGb).toBe(0);
    expect(ingest.projectedServerlessOtelGb).toBe(4800);
    expect(ingest.gbToLicense).toBe(1550);
    expect(ingest.dataIngestUnits).toBe(16);
    expect(quote.some((line) => line.partNumber === 'D0N79ZX' && line.quantity === 10)).toBe(true);
  });



  it('does not create licenses for serverless-only when volume is zero', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOnly = true;
    scenario.ingest.serverlessOtelGbMonth = 0;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const quote = buildQuoteLines(scenario, inventory, ingest, calculateLogs(scenario), calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, false));
    expect(ingest.standardLicensed).toBe(0);
    expect(ingest.baseIncludedGb).toBe(0);
    expect(quote).toHaveLength(0);
  });

  it('serverless-only covered by the commercial base does not create Data Ingest', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOnly = true;
    scenario.ingest.serverlessOtelGbMonth = 2500;
    scenario.ingest.growthPercent = 0;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const quote = buildQuoteLines(scenario, inventory, ingest, calculateLogs(scenario), calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, false));
    expect(ingest.standardLicensed).toBe(10);
    expect(ingest.baseIncludedGb).toBe(3250);
    expect(ingest.agentAverageGb).toBe(0);
    expect(ingest.gbToLicense).toBe(0);
    expect(ingest.dataIngestUnits).toBe(0);
    expect(quote.some((line) => line.partNumber === 'D0N7BZX')).toBe(false);
  });

  it('serverless-only excess rounds Data Ingest blocks up', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOnly = true;
    scenario.ingest.serverlessOtelGbMonth = 5000;
    scenario.ingest.growthPercent = 0;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    expect(ingest.standardLicensed).toBe(10);
    expect(ingest.baseIncludedGb).toBe(3250);
    expect(ingest.gbToLicense).toBe(1750);
    expect(ingest.dataIngestUnits).toBe(18);
  });

  it('applies ingest growth only once', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOnly = true;
    scenario.ingest.serverlessOtelGbMonth = 3000;
    scenario.ingest.growthPercent = 20;
    const ingest = calculateIngest(scenario, calculateInventory(scenario.inventory));
    expect(ingest.projectedServerlessOtelGb).toBe(3600);
    expect(ingest.gbToLicense).toBe(350);
    expect(ingest.dataIngestUnits).toBe(4);
  });

  it('50 MVS comparison does not change quote without explicit confirmation', () => {
    const scenario = baseScenario();
    scenario.inventory.standardPhysical = 5;
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOtelGbMonth = 6000;
    scenario.ingest.useFiftyMvsScenario = true;
    scenario.ingest.fiftyMvsConfirmed = false;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const quote = buildQuoteLines(scenario, inventory, ingest, calculateLogs(scenario), calculateSynthetic(scenario.synthetic, 0, false));
    expect(ingest.selectedScenario).toBe('current');
    expect(quote.find((line) => line.partNumber === 'D0N79ZX')?.quantity).toBe(10);
  });

  it('50 MVS comparison changes quote after explicit confirmation', () => {
    const scenario = baseScenario();
    scenario.inventory.standardPhysical = 5;
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOtelGbMonth = 6000;
    scenario.ingest.useFiftyMvsScenario = true;
    scenario.ingest.fiftyMvsConfirmed = true;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const quote = buildQuoteLines(scenario, inventory, ingest, calculateLogs(scenario), calculateSynthetic(scenario.synthetic, 0, false));
    expect(ingest.selectedScenario).toBe('fifty-mvs');
    expect(quote.find((line) => line.partNumber === 'D0N79ZX')?.quantity).toBe(50);
  });

  it('calculates agent consumption from declared MVS and quota from licensed MVS', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = true;
    scenario.inventory.standardPhysical = 5;
    scenario.ingest.serverlessOtelGbMonth = 1250;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    expect(ingest.baseIncludedGb).toBe(3250);
    expect(ingest.agentAverageGb).toBe(1300);
    expect(ingest.remainingGb).toBe(1950);
    expect(ingest.projectedServerlessOtelGb).toBe(1500);
    expect(ingest.gbToLicense).toBe(0);
    expect(ingest.dataIngestUnits).toBe(0);
  });

  it('subtracts serverless/OTel projected volume from remaining quota before Data Ingest', () => {
    const scenario = baseScenario();
    scenario.inventory.standardPhysical = 5;
    scenario.ingest.serverlessOtelGbMonth = 2500;
    scenario.addOns.dataIngest = true;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const quote = buildQuoteLines(scenario, inventory, ingest, calculateLogs(scenario), calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, false));
    expect(ingest.projectedServerlessOtelGb).toBe(3000);
    expect(ingest.gbToLicense).toBe(1050);
    expect(ingest.dataIngestUnits).toBe(11);
    expect(quote.some((line) => line.partNumber === 'D0N7BZX' && line.quantity === 11)).toBe(true);
  });

  it('disabled add-ons produce no quote items and no add-on recommendations', () => {
    const scenario = baseScenario();
    scenario.inventory.standardPhysical = 5;
    // All add-ons OFF (default). Stale data simulating a prior enabled session.
    scenario.ingest.serverlessOtelGbMonth = 2500;
    scenario.logs.retentionDays = 30;
    scenario.logs.tbMonth = 2.2;
    scenario.synthetic[0] = { ...scenario.synthetic[0], tests: 1, frequencyMinutes: 60, locations: 1 };
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const logs = calculateLogs(scenario);
    const synthetic = calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, scenario.addOns.syntheticManagedPop);
    const quote = buildQuoteLines(scenario, inventory, ingest, logs, synthetic);
    const recommendations = buildRecommendations(scenario, inventory, ingest, logs, synthetic);
    expect(quote.map((line) => line.partNumber)).toEqual(['D0N79ZX']);
    const ids = recommendations.map((r) => r.id);
    expect(ids).not.toContain('data-ingest');
    expect(ids).not.toContain('logs');
    expect(ids).not.toContain('synthetic');
    expect(ids).not.toContain('fifty-mvs');
  });


  it('keeps included logs retention out of quote lines', () => {
    const scenario = baseScenario();
    scenario.addOns.logs = true;
    scenario.logs.retentionDays = 7;
    scenario.logs.tbMonth = 2.2;
    const inventory = calculateInventory(scenario.inventory);
    const quote = buildQuoteLines(scenario, inventory, calculateIngest(scenario, inventory), calculateLogs(scenario), calculateSynthetic(scenario.synthetic, 0, false));
    expect(calculateLogs(scenario).units).toBe(0);
    expect(quote.some((line) => line.partNumber === 'D0RL4ZX')).toBe(false);
  });

  it('calculates Synthetic monthly executions correctly', () => {
    const scenario = baseScenario();
    scenario.addOns.syntheticManagedPop = true;
    scenario.synthetic[0] = { ...scenario.synthetic[0], tests: 2, frequencyMinutes: 60, locations: 3 };
    const synthetic = calculateSynthetic(scenario.synthetic, 0, true);
    expect(synthetic.rows[0].monthlyExecutions).toBe(4320);
    expect(synthetic.rows[0].monthlyRu).toBe(108);
  });

  it('does not create Synthetic quote line with zero tests', () => {
    const scenario = baseScenario();
    scenario.addOns.syntheticManagedPop = true;
    const inventory = calculateInventory(scenario.inventory);
    const synthetic = calculateSynthetic(scenario.synthetic, 0, true);
    const quote = buildQuoteLines(scenario, inventory, calculateIngest(scenario, inventory), calculateLogs(scenario), synthetic);
    expect(synthetic.projectedRu).toBe(0);
    expect(quote.some((line) => line.partNumber === 'D0I5PZX')).toBe(false);
  });

  it('uses catalog commercial units for quote lines', () => {
    const scenario = baseScenario();
    scenario.inventory.standardPhysical = 12;
    let inventory = calculateInventory(scenario.inventory);
    let quote = buildQuoteLines(scenario, inventory, calculateIngest(scenario, inventory), calculateLogs(scenario), calculateSynthetic(scenario.synthetic, 0, false));
    expect(quote.find((line) => line.partNumber === 'D0N79ZX')?.unit).toBe('MVS / mes');
    scenario.general.mode = 'Self-Hosted';
    inventory = calculateInventory(scenario.inventory);
    quote = buildQuoteLines(scenario, inventory, calculateIngest(scenario, inventory), calculateLogs(scenario), calculateSynthetic(scenario.synthetic, 0, false));
    expect(quote.find((line) => line.partNumber === 'D29RTLL')?.unit).toBe('MVS');
    scenario.inventory.essentialsVirtual = 15;
    inventory = calculateInventory(scenario.inventory);
    quote = buildQuoteLines(scenario, inventory, calculateIngest(scenario, inventory), calculateLogs(scenario), calculateSynthetic(scenario.synthetic, 0, false));
    expect(quote.find((line) => line.partNumber === 'D29RRLL')?.unit).toBe('MVS');
  });

  it('exports Self-Hosted MVS units to Excel, PDF and copied summary', async () => {
    const scenario = baseScenario();
    scenario.general.mode = 'Self-Hosted';
    scenario.inventory.standardPhysical = 20;
    scenario.inventory.essentialsVirtual = 15;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const logs = calculateLogs(scenario);
    const synthetic = calculateSynthetic(scenario.synthetic, 0, false);
    const quoteLines = buildQuoteLines(scenario, inventory, ingest, logs, synthetic);
    const recommendations = buildRecommendations(scenario, inventory, ingest, logs, synthetic);
    const payload = { scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations };
    expect(quoteLines.find((line) => line.partNumber === 'D29RTLL')).toMatchObject({ quantity: 20, unit: 'MVS' });
    expect(quoteLines.find((line) => line.partNumber === 'D29RRLL')).toMatchObject({ quantity: 15, unit: 'MVS' });
    const workbook = createScenarioWorkbook(payload);
    expect(worksheetText(workbook, 'Resumen ejecutivo')).toContain('MVS');
    expect(worksheetText(workbook, 'Resumen ejecutivo')).toContain('D29RTLL');
    expect(worksheetText(workbook, 'Resumen ejecutivo')).toContain('D29RRLL');
    const summary = quoteSummaryText(payload);
    expect(summary).toContain('D29RTLL, cantidad 20, unidad MVS');
    expect(summary).toContain('D29RRLL, cantidad 15, unidad MVS');
    expect(summary).toContain('Validar en CPQ la vigencia de los Part Numbers');
    const pdfText = new TextDecoder().decode(await createScenarioPdfBlob(payload).arrayBuffer());
    expect(pdfText).toContain('44323952544C4C');
    expect(pdfText).toContain('4D5653');
  });

  it('calculates logs with independent growth and 1 TB blocks', () => {
    const scenario = baseScenario();
    scenario.addOns.logs = true;
    scenario.logs.tbMonth = 1;
    expect(calculateLogs(scenario).units).toBe(0);
    scenario.logs.retentionDays = 30;
    expect(calculateLogs(scenario).projectedTbMonth).toBe(1);
    expect(calculateLogs(scenario).units).toBe(1);
    scenario.logs.tbMonth = 2;
    expect(calculateLogs(scenario).units).toBe(2);
    scenario.logs.tbMonth = 2.2;
    expect(calculateLogs(scenario).units).toBe(3);
    scenario.logs.tbMonth = 1;
    scenario.logs.growthPercent = 20;
    expect(calculateLogs(scenario).projectedTbMonth).toBeCloseTo(1.2);
    expect(calculateLogs(scenario).units).toBe(2);
    scenario.logs.growthPercent = 0;
    scenario.ingest.growthPercent = 50;
    expect(calculateLogs(scenario).projectedTbMonth).toBe(1);
    expect(calculateLogs(scenario).units).toBe(1);
    expect(calculateLogs(scenario).retentionPartNumber).toBe('D0RL4ZX');
  });

  it('calculates transactional serverless/OTel projected GB', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = true;
    scenario.ingest.useTransactionalMode = true;
    scenario.ingest.transactionalWorkloads = [{ id: '1', name: 'Lambda API', type: 'AWS Lambda', averageTps: 10, spansPerTransaction: 5, averageSpanKb: 2 }];
    const ingest = calculateIngest(scenario, calculateInventory(scenario.inventory));
    expect(ingest.transactionalWorkloads[0].gbMonth).toBeCloseTo(247.19, 2);
    expect(ingest.projectedServerlessOtelGb).toBeCloseTo(296.63, 2);
  });

  it('applies projected Synthetic RU and 30 unit minimum', () => {
    const scenario = baseScenario();
    scenario.addOns.syntheticManagedPop = true;
    scenario.synthetic[0] = { ...scenario.synthetic[0], tests: 1, frequencyMinutes: 60, locations: 1 };
    const synthetic = calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, scenario.addOns.syntheticManagedPop);
    expect(synthetic.totalRu).toBe(18);
    expect(synthetic.projectedRu).toBeCloseTo(18);
    expect(synthetic.calculatedUnits).toBe(1);
    expect(synthetic.consideredUnits).toBe(30);
    expect(synthetic.licensedRu).toBe(30000);
    expect(synthetic.availableRu).toBeCloseTo(29982);
  });

  it('licenses Synthetic normally when projected RU exceed 30,000', () => {
    const rows = [
      { id: 'apiSimple' as const, label: 'API Simple', tests: 1, frequencyMinutes: 1, locations: 1, ruPerExecution: 0.7523148148148148 },
      { id: 'apiScript' as const, label: 'API Script', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.042 },
      { id: 'browserTest' as const, label: 'Browser Test', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 1 },
    ];
    const synthetic = calculateSynthetic(rows, 0);
    expect(synthetic.projectedRu).toBeCloseTo(32500, 1);
    expect(synthetic.calculatedUnits).toBe(33);
    expect(synthetic.consideredUnits).toBe(33);
    expect(synthetic.licensedRu).toBe(33000);
    expect(synthetic.availableRu).toBeCloseTo(500, 1);
  });

  it('excludes SaaS add-ons from Self-Hosted quote', () => {
    const scenario = baseScenario();
    scenario.general.mode = 'Self-Hosted';
    scenario.inventory.standardPhysical = 5;
    scenario.addOns.dataIngest = true;
    scenario.addOns.logs = true;
    scenario.logs.retentionDays = 30;
    scenario.logs.tbMonth = 2.2;
    scenario.ingest.serverlessOtelGbMonth = 2500;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const quote = buildQuoteLines(scenario, inventory, ingest, calculateLogs(scenario), calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent));
    expect(quote.map((line) => line.partNumber)).toEqual(['D29RTLL']);
  });

  it('keeps SaaS add-ons available in SaaS quote when active', () => {
    const scenario = baseScenario();
    scenario.addOns.logs = true;
    scenario.logs.retentionDays = 30;
    scenario.logs.tbMonth = 2.2;
    const inventory = calculateInventory(scenario.inventory);
    const logs = calculateLogs(scenario);
    const quote = buildQuoteLines(scenario, inventory, calculateIngest(scenario, inventory), logs, calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent));
    expect(quote.some((line) => line.partNumber === 'D0RL4ZX' && line.quantity === 3)).toBe(true);
  });

  // ── Addon-gating tests (new) ────────────────────────────────────────────

  it('disabled dataIngest addon ignores serverless/OTel data for calculations', () => {
    const scenario = baseScenario();
    scenario.addOns.dataIngest = false;
    scenario.inventory.standardPhysical = 5;
    scenario.ingest.serverlessOtelGbMonth = 2500;
    scenario.ingest.transactionalWorkloads = [{ id: '1', name: 'Lambda', type: 'AWS Lambda', averageTps: 10, spansPerTransaction: 5, averageSpanKb: 2 }];
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    expect(ingest.projectedServerlessOtelGb).toBe(0);
    expect(ingest.gbToLicense).toBe(0);
    expect(ingest.dataIngestUnits).toBe(0);
    expect(ingest.manualProjectedServerlessOtelGb).toBe(0);
    expect(ingest.transactionalWorkloads).toHaveLength(0);
  });

  it('disabled logs addon ignores log volume and returns zero units', () => {
    const scenario = baseScenario();
    scenario.addOns.logs = false;
    scenario.logs.tbMonth = 2.2;
    scenario.logs.retentionDays = 30;
    const logs = calculateLogs(scenario);
    expect(logs.projectedTbMonth).toBe(0);
    expect(logs.units).toBe(0);
  });

  it('disabled synthetic addon returns zero RU and no quote item', () => {
    const scenario = baseScenario();
    scenario.addOns.syntheticManagedPop = false;
    scenario.synthetic[0] = { ...scenario.synthetic[0], tests: 10, frequencyMinutes: 5, locations: 2 };
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const logs = calculateLogs(scenario);
    const synthetic = calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, scenario.addOns.syntheticManagedPop);
    expect(synthetic.projectedRu).toBe(0);
    expect(synthetic.consideredUnits).toBe(0);
    const quote = buildQuoteLines(scenario, inventory, ingest, logs, synthetic);
    expect(quote.some((line) => line.partNumber === 'D0I5PZX')).toBe(false);
  });

  it('no add-on recommendations fire when add-ons are disabled with stale data', () => {
    const scenario = baseScenario();
    scenario.inventory.standardPhysical = 5;
    scenario.ingest.serverlessOtelGbMonth = 2500;
    scenario.logs.tbMonth = 2.2;
    scenario.logs.retentionDays = 30;
    scenario.synthetic[0] = { ...scenario.synthetic[0], tests: 1, frequencyMinutes: 60, locations: 1 };
    // All add-ons OFF
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const logs = calculateLogs(scenario);
    const synthetic = calculateSynthetic(scenario.synthetic, 0, false);
    const recommendations = buildRecommendations(scenario, inventory, ingest, logs, synthetic);
    const ids = recommendations.map((r) => r.id);
    expect(ids).not.toContain('data-ingest');
    expect(ids).not.toContain('logs');
    expect(ids).not.toContain('synthetic');
    expect(ids).not.toContain('fifty-mvs');
  });
});

describe('Self-Hosted capacity reference data', () => {
  it('profile base has correct resource values', () => {
    const base = SELF_HOSTED_PROFILES.find((p) => p.id === 'base');
    expect(base?.cpu).toBe(28);
    expect(base?.ramGb).toBe(112);
    expect(base?.storageTb).toBe(3.7);
    expect(base?.iops).toBe(3000);
  });

  it('profile large has correct resource values', () => {
    const large = SELF_HOSTED_PROFILES.find((p) => p.id === 'large');
    expect(large?.cpu).toBe(56);
    expect(large?.ramGb).toBe(224);
    expect(large?.storageTb).toBe(7.4);
    expect(large?.iops).toBe(3000);
  });

  it('Logs capacity impact has correct additional capacity text', () => {
    const logs = SELF_HOSTED_CAPACITY_IMPACTS.find((item) => item.component === 'Logs / Analyze Logs');
    expect(logs?.additionalCapacity).toBe('+4 vCPU / +12 GB RAM / +3.688 TB storage');
  });

  it('Synthetic capacity impact has correct additional capacity text', () => {
    const synthetic = SELF_HOSTED_CAPACITY_IMPACTS.find((item) => item.component === 'Synthetic Monitoring Self-Hosted');
    expect(synthetic?.additionalCapacity).toBe('+2 vCPU / +9 GB RAM / storage base incluido');
  });
});

describe('Excel export', () => {
  it('creates workbook with updated sheets and no zero-quantity part numbers', async () => {
    const scenario = baseScenario();
    scenario.inventory.standardPhysical = 5;
    scenario.addOns.dataIngest = true;
    scenario.ingest.serverlessOtelGbMonth = 2500;
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const logs = calculateLogs(scenario);
    const synthetic = calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, false);
    const quoteLines = buildQuoteLines(scenario, inventory, ingest, logs, synthetic);
    const recommendations = buildRecommendations(scenario, inventory, ingest, logs, synthetic);
    const workbook = createScenarioWorkbook({ scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations });
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen ejecutivo', 'Detalle del cálculo', 'Capacidades adicionales', 'Catálogo y validaciones']);
    const summaryText = worksheetText(workbook, 'Resumen ejecutivo');
    expect(summaryText).toContain('Part Numbers a cotizar');
    expect(summaryText).toContain('D0N7BZX');
    expect(summaryText).not.toContain('D0RL4ZX');
    expect(summaryText).not.toContain('D0I5PZX');
    const additionalText = worksheetText(workbook, 'Capacidades adicionales');
    expect(additionalText).toContain('D0N7BZX');
    expect(additionalText).not.toContain('D0RL4ZX');
    expect(additionalText).not.toContain('D0I5PZX');
  });

  it('creates Self-Hosted workbook with technical considerations and only Self-Hosted quote lines', async () => {
    const scenario = baseScenario();
    scenario.general.mode = 'Self-Hosted';
    scenario.inventory.standardPhysical = 5;
    scenario.addOns.dataIngest = true;
    scenario.addOns.logs = true;
    scenario.addOns.syntheticManagedPop = true;
    scenario.ingest.serverlessOtelGbMonth = 1000;
    scenario.logs.tbMonth = 2;
    scenario.synthetic[0] = { ...scenario.synthetic[0], tests: 1, frequencyMinutes: 60, locations: 1 };
    const inventory = calculateInventory(scenario.inventory);
    const ingest = calculateIngest(scenario, inventory);
    const logs = calculateLogs(scenario);
    const synthetic = calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent);
    const quoteLines = buildQuoteLines(scenario, inventory, ingest, logs, synthetic);
    const workbook = createScenarioWorkbook({ scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations: [] });
    expect(quoteLines.map((line) => line.partNumber)).toEqual(['D29RTLL']);
    expect(workbook.getWorksheet('Catálogo y validaciones')).toBeDefined();
    const summaryText = worksheetText(workbook, 'Resumen ejecutivo');
    expect(summaryText).toContain('D29RTLL');
    expect(summaryText).toContain('MVS');
    expect(summaryText).not.toContain('D0N7BZX');
    expect(summaryText).not.toContain('D0RL4ZX');
    expect(summaryText).not.toContain('D0I5PZX');
  });

  it('Self-Hosted workbook includes Capacidad Self-Hosted sheet; SaaS workbook does not', () => {
    const shScenario = baseScenario();
    shScenario.general.mode = 'Self-Hosted';
    shScenario.inventory.standardPhysical = 5;
    const shInventory = calculateInventory(shScenario.inventory);
    const shIngest = calculateIngest(shScenario, shInventory);
    const shLogs = calculateLogs(shScenario);
    const shSynthetic = calculateSynthetic(shScenario.synthetic, 0, false);
    const shQuoteLines = buildQuoteLines(shScenario, shInventory, shIngest, shLogs, shSynthetic);
    const shWorkbook = createScenarioWorkbook({ scenario: shScenario, inventory: shInventory, ingest: shIngest, logs: shLogs, synthetic: shSynthetic, quoteLines: shQuoteLines, recommendations: [] });
    expect(shWorkbook.getWorksheet('Capacidad Self-Hosted')).toBeDefined();
    const capacityText = worksheetText(shWorkbook, 'Capacidad Self-Hosted');
    expect(capacityText).toContain('Single-node production base');
    expect(capacityText).toContain('Single-node production large');
    expect(capacityText).toContain('28');
    expect(capacityText).toContain('112');
    expect(capacityText).toContain('56');
    expect(capacityText).toContain('224');
    expect(capacityText).toContain('+4 vCPU / +12 GB RAM / +3.688 TB storage');
    expect(capacityText).toContain('+2 vCPU / +9 GB RAM / storage base incluido');
    expect(capacityText).toContain('IBM preventa');

    const saasScenario = baseScenario();
    saasScenario.inventory.standardPhysical = 5;
    const saasInventory = calculateInventory(saasScenario.inventory);
    const saasIngest = calculateIngest(saasScenario, saasInventory);
    const saasLogs = calculateLogs(saasScenario);
    const saasSynthetic = calculateSynthetic(saasScenario.synthetic, 0, false);
    const saasQuoteLines = buildQuoteLines(saasScenario, saasInventory, saasIngest, saasLogs, saasSynthetic);
    const saasWorkbook = createScenarioWorkbook({ scenario: saasScenario, inventory: saasInventory, ingest: saasIngest, logs: saasLogs, synthetic: saasSynthetic, quoteLines: saasQuoteLines, recommendations: [] });
    expect(saasWorkbook.getWorksheet('Capacidad Self-Hosted')).toBeUndefined();
  });
});
