import { describe, expect, it } from 'vitest';
import type { ScenarioInput } from '../types/sizing';
import { buildQuoteLines, buildRecommendations, calculateIngest, calculateInventory, calculateLogs, calculateSynthetic } from './calculations';
import { createScenarioWorkbook } from './exportExcel';

const baseScenario = (): ScenarioInput => ({
  general: { client: 'QA', mode: 'SaaS', environment: 'Producción', region: 'US', notes: '' },
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
    useTransactionalMode: false,
    transactionalWorkloads: [],
    useFiftyMvsScenario: false,
  },
  logs: { retentionDays: 7, tbMonth: 0, growthPercent: 0 },
  synthetic: [
    { id: 'apiSimple', label: 'API Simple', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.025 },
    { id: 'apiScript', label: 'API Script', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.042 },
    { id: 'browserTest', label: 'Browser Test', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 1 },
  ],
  syntheticGrowthPercent: 0,
});

describe('Instana sizing calculations', () => {
  it('applies 10 MVS commercial minimum as licensed quantity while keeping declared quantity', () => {
    const inventory = calculateInventory({ standardPhysical: 5, standardVirtual: 0, standardKubernetesWorkers: 0, essentialsPhysical: 2, essentialsVirtual: 1, essentialsKubernetesWorkers: 0 });
    expect(inventory.standardRaw).toBe(5);
    expect(inventory.standardLicensed).toBe(10);
    expect(inventory.essentialsRaw).toBe(3);
    expect(inventory.essentialsLicensed).toBe(10);
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
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen Ejecutivo', 'Inventario', 'Ingesta', 'Serverless OTel', 'Comparacion 50 MVS', 'Logs', 'Synthetic', 'Resumen de cotizacion', 'Recomendaciones']);
    const quoteSheet = workbook.getWorksheet('Resumen de cotizacion');
    expect(quoteSheet?.getColumn(2).values).toContain('D0N7BZX');
    expect(quoteSheet?.getColumn(2).values).not.toContain('D0RL4ZX');
    expect(quoteSheet?.getColumn(2).values).not.toContain('D0I5PZX');
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
    expect(workbook.getWorksheet('Consideraciones Self-Hosted')).toBeDefined();
    const quoteSheet = workbook.getWorksheet('Resumen de cotizacion');
    expect(quoteSheet?.getColumn(2).values).not.toContain('D0N7BZX');
    expect(quoteSheet?.getColumn(2).values).not.toContain('D0RL4ZX');
    expect(quoteSheet?.getColumn(2).values).not.toContain('D0I5PZX');
  });
});
