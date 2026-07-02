import { INSTANA_RULES } from '../rules/instanaRules';
import type {
  IngestResult,
  IngestScenarioComparison,
  InventoryInput,
  InventoryResult,
  LogsResult,
  QuoteLine,
  Recommendation,
  ScenarioInput,
  ServerlessWorkloadInput,
  ServerlessWorkloadResult,
  SyntheticResult,
  SyntheticRowInput,
  SyntheticRowResult,
} from '../types/sizing';

export const clampNumber = (value: number, min = 0): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, value);
};

const commercialMvs = (raw: number): number => {
  if (raw === 0) return 0;
  if (raw < INSTANA_RULES.commercialMinimumMvs) return INSTANA_RULES.commercialMinimumMvs;
  return raw;
};

export function calculateInventory(input: InventoryInput): InventoryResult {
  const standardRaw = clampNumber(input.standardPhysical) + clampNumber(input.standardVirtual) + clampNumber(input.standardKubernetesWorkers);
  const essentialsRaw = clampNumber(input.essentialsPhysical) + clampNumber(input.essentialsVirtual) + clampNumber(input.essentialsKubernetesWorkers);
  const standardLicensed = commercialMvs(standardRaw);
  const essentialsLicensed = commercialMvs(essentialsRaw);

  return {
    standardRaw,
    essentialsRaw,
    standardConsidered: standardLicensed,
    essentialsConsidered: essentialsLicensed,
    standardLicensed,
    essentialsLicensed,
    standardMinimumApplied: standardRaw > 0 && standardRaw < INSTANA_RULES.commercialMinimumMvs,
    essentialsMinimumApplied: essentialsRaw > 0 && essentialsRaw < INSTANA_RULES.commercialMinimumMvs,
  };
}

export function calculateServerlessWorkloads(rows: ServerlessWorkloadInput[], growthPercent: number): ServerlessWorkloadResult[] {
  const growthFactor = 1 + clampNumber(growthPercent) / 100;
  return rows.map((row) => {
    const averageTps = clampNumber(row.averageTps);
    const spansPerTransaction = clampNumber(row.spansPerTransaction);
    const averageSpanKb = clampNumber(row.averageSpanKb);
    const gbMonth = averageTps * 86400 * 30 * spansPerTransaction * averageSpanKb / (1024 ** 2);
    return {
      ...row,
      averageTps,
      spansPerTransaction,
      averageSpanKb,
      gbMonth,
      projectedGbMonth: gbMonth * growthFactor,
    };
  });
}

function buildIngestScenario(
  label: string,
  standardLicensed: number,
  essentialsLicensed: number,
  inventory: InventoryResult,
  agentConsumptionPercent: number,
  projectedServerlessOtelGb: number,
): IngestScenarioComparison {
  const baseIncludedGb = standardLicensed * INSTANA_RULES.saasQuotaGb.standard + essentialsLicensed * INSTANA_RULES.saasQuotaGb.essentials;
  const agentAverageGb =
    inventory.standardRaw * INSTANA_RULES.saasQuotaGb.standard * (clampNumber(agentConsumptionPercent) / 100) +
    inventory.essentialsRaw * INSTANA_RULES.saasQuotaGb.essentials * (clampNumber(agentConsumptionPercent) / 100);
  const remainingGb = Math.max(0, baseIncludedGb - agentAverageGb);
  const gbToLicense = Math.max(0, projectedServerlessOtelGb - remainingGb);
  const dataIngestUnits = Math.ceil(gbToLicense / INSTANA_RULES.dataIngest.unitGb);

  return {
    label,
    standardLicensed,
    essentialsLicensed,
    baseIncludedGb,
    agentAverageGb,
    remainingGb,
    projectedServerlessOtelGb,
    gbToLicense,
    dataIngestUnits,
  };
}

export function calculateIngest(scenario: ScenarioInput, inventory: InventoryResult): IngestResult {
  const dataIngestEnabled = scenario.addOns.dataIngest;
  const growthFactor = 1 + clampNumber(scenario.ingest.growthPercent) / 100;
  const manualProjectedServerlessOtelGb = dataIngestEnabled
    ? clampNumber(scenario.ingest.serverlessOtelGbMonth) * growthFactor
    : 0;
  const transactionalWorkloads = dataIngestEnabled
    ? calculateServerlessWorkloads(scenario.ingest.transactionalWorkloads || [], scenario.ingest.growthPercent)
    : [];
  const transactionalProjectedServerlessOtelGb = transactionalWorkloads.reduce((sum, row) => sum + row.projectedGbMonth, 0);
  const projectedServerlessOtelGb = dataIngestEnabled
    ? (scenario.ingest.useTransactionalMode ? transactionalProjectedServerlessOtelGb : manualProjectedServerlessOtelGb)
    : 0;

  const currentScenario = buildIngestScenario(
    'Escenario actual',
    inventory.standardLicensed,
    inventory.essentialsLicensed,
    inventory,
    scenario.ingest.agentConsumptionPercent,
    projectedServerlessOtelGb,
  );

  const fiftyMvsScenario = inventory.standardLicensed < 50 && projectedServerlessOtelGb > 0
    ? buildIngestScenario('Escenario 50 MVS', 50, inventory.essentialsLicensed, inventory, scenario.ingest.agentConsumptionPercent, projectedServerlessOtelGb)
    : null;

  const selectedScenario = scenario.ingest.useFiftyMvsScenario && fiftyMvsScenario ? 'fifty-mvs' : 'current';
  const selected = selectedScenario === 'fifty-mvs' && fiftyMvsScenario ? fiftyMvsScenario : currentScenario;
  const dataIngestUnits = scenario.general.mode === 'SaaS' ? selected.dataIngestUnits : 0;
  const gbToLicense = scenario.general.mode === 'SaaS' ? selected.gbToLicense : 0;

  return {
    ...selected,
    gbToLicense,
    dataIngestUnits,
    manualProjectedServerlessOtelGb,
    transactionalWorkloads,
    transactionalProjectedServerlessOtelGb,
    selectedScenario,
    currentScenario,
    fiftyMvsScenario,
  };
}

export function calculateLogs(scenario: ScenarioInput): LogsResult {
  const logsEnabled = scenario.addOns.logs;
  const retentionPartNumber = INSTANA_RULES.logs.retentionPartNumbers[scenario.logs.retentionDays];
  const effectiveTbMonth = logsEnabled ? clampNumber(scenario.logs.tbMonth) : 0;
  const projectedTbMonth = effectiveTbMonth * (1 + clampNumber(scenario.logs.growthPercent) / 100);
  const isExtendedRetention = scenario.logs.retentionDays !== 7;
  const units = scenario.general.mode === 'SaaS' && logsEnabled && isExtendedRetention ? Math.ceil(projectedTbMonth) : 0;
  return {
    projectedTbMonth,
    units,
    retentionPartNumber,
    retentionLabel: scenario.logs.retentionDays === 7 ? '7 días - incluido' : `${scenario.logs.retentionDays} días - retención extendida`,
    isExtendedRetention,
  };
}

export function calculateSynthetic(rows: SyntheticRowInput[], growthPercent = 0, enabled = true): SyntheticResult {
  if (!enabled) {
    return { rows: [], totalRu: 0, projectedRu: 0, calculatedUnits: 0, consideredUnits: 0, licensedRu: 0, consideredRu: 0, availableRu: 0, minimumApplied: false };
  }
  const growthFactor = 1 + clampNumber(growthPercent) / 100;
  const resultRows: SyntheticRowResult[] = rows.map((row) => {
    const tests = clampNumber(row.tests);
    const frequencyMinutes = Math.max(1, clampNumber(row.frequencyMinutes, 1));
    const locations = tests > 0 ? Math.max(1, clampNumber(row.locations, 1)) : clampNumber(row.locations);
    const monthlyExecutions = tests * locations * (INSTANA_RULES.monthlyMinutes / frequencyMinutes);
    const monthlyRu = monthlyExecutions * row.ruPerExecution;
    return { ...row, tests, frequencyMinutes, locations, monthlyExecutions, monthlyRu, projectedRu: monthlyRu * growthFactor };
  });
  const totalRu = resultRows.reduce((sum, row) => sum + row.monthlyRu, 0);
  const projectedRu = resultRows.reduce((sum, row) => sum + row.projectedRu, 0);
  const calculatedUnits = Math.ceil(projectedRu / INSTANA_RULES.synthetic.unitRu);
  const consideredUnits = projectedRu > 0 ? Math.max(INSTANA_RULES.synthetic.minimumUnits, calculatedUnits) : 0;
  const licensedRu = consideredUnits * INSTANA_RULES.synthetic.unitRu;
  return {
    rows: resultRows,
    totalRu,
    projectedRu,
    calculatedUnits,
    consideredUnits,
    licensedRu,
    consideredRu: licensedRu,
    availableRu: Math.max(0, licensedRu - projectedRu),
    minimumApplied: projectedRu > 0 && calculatedUnits < INSTANA_RULES.synthetic.minimumUnits,
  };
}

export function buildQuoteLines(scenario: ScenarioInput, inventory: InventoryResult, ingest: IngestResult, logs: LogsResult, synthetic: SyntheticResult): QuoteLine[] {
  const lines: QuoteLine[] = [];
  const isSaas = scenario.general.mode === 'SaaS';
  const standardQuantity = isSaas && scenario.ingest.useFiftyMvsScenario && ingest.fiftyMvsScenario ? 50 : inventory.standardLicensed;

  if (standardQuantity > 0) {
    lines.push({
      component: isSaas ? 'Instana Observability Standard SaaS' : 'Instana Observability Standard Self-Hosted',
      partNumber: isSaas ? INSTANA_RULES.partNumbers.saasStandard : INSTANA_RULES.partNumbers.selfHostedStandard,
      quantity: standardQuantity,
      unit: 'MVS / mes',
      explanation: 'MVS licenciados para máquinas físicas, máquinas virtuales y Kubernetes worker nodes Standard.',
    });
  }

  if (inventory.essentialsLicensed > 0) {
    lines.push({
      component: isSaas ? 'Instana Observability Essentials SaaS' : 'Instana Observability Essentials Self-Hosted',
      partNumber: isSaas ? INSTANA_RULES.partNumbers.saasEssentials : INSTANA_RULES.partNumbers.selfHostedEssentials,
      quantity: inventory.essentialsLicensed,
      unit: 'MVS / mes',
      explanation: 'MVS licenciados para máquinas físicas, máquinas virtuales y Kubernetes worker nodes Essentials.',
    });
  }

  if (isSaas && scenario.addOns.dataIngest && ingest.dataIngestUnits > 0) {
    lines.push({
      component: 'Data ingest adicional',
      partNumber: INSTANA_RULES.dataIngest.partNumber,
      quantity: ingest.dataIngestUnits,
      unit: INSTANA_RULES.dataIngest.unitLabel,
      explanation: 'Ingesta adicional después de descontar remanente de cuota base incluida.',
    });
  }

  if (isSaas && scenario.addOns.logs && logs.isExtendedRetention && logs.units > 0 && logs.retentionPartNumber) {
    lines.push({
      component: `Logs in Context ${logs.retentionLabel}`,
      partNumber: logs.retentionPartNumber,
      quantity: logs.units,
      unit: INSTANA_RULES.logs.unitLabel,
      explanation: 'Las unidades se calculan por bloques de 1 TB mensual para retenciones extendidas de 30, 60 o 90 días.',
    });
  }

  if (isSaas && scenario.addOns.syntheticManagedPop && synthetic.projectedRu > 0) {
    lines.push({
      component: 'Synthetic Managed PoP',
      partNumber: INSTANA_RULES.synthetic.managedPopPartNumber,
      quantity: synthetic.consideredUnits,
      unit: INSTANA_RULES.synthetic.unitLabel,
      explanation: 'Unidades licenciadas para RU Synthetic proyectadas.',
    });
  }

  return lines;
}

export function buildRecommendations(scenario: ScenarioInput, inventory: InventoryResult, ingest: IngestResult, logs: LogsResult, synthetic: SyntheticResult): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const isSaas = scenario.general.mode === 'SaaS';

  if (isSaas && ingest.projectedServerlessOtelGb > ingest.remainingGb && !scenario.addOns.dataIngest) {
    recommendations.push({
      id: 'data-ingest',
      title: 'Recomendación detectada: Data ingest adicional',
      detail: `La ingesta proyectada (${formatNumber(ingest.projectedServerlessOtelGb)} GB/mes) supera el remanente disponible (${formatNumber(ingest.remainingGb)} GB/mes).`,
      severity: 'warning',
      action: 'dataIngest',
    });
  }

  if (isSaas && ingest.fiftyMvsScenario && inventory.standardLicensed < 50) {
    recommendations.push({
      id: 'fifty-mvs',
      title: 'Evaluar escenario de 50 MVS para serverless/OpenTelemetry en crecimiento.',
      detail: `Actual: ${formatNumber(ingest.currentScenario.dataIngestUnits)} unidades Data Ingest. 50 MVS: ${formatNumber(ingest.fiftyMvsScenario.dataIngestUnits)} unidades Data Ingest.`,
      severity: 'info',
      action: 'fiftyMvs',
    });
  }

  if (isSaas && logs.projectedTbMonth > 0 && logs.isExtendedRetention && !scenario.addOns.logs) {
    recommendations.push({
      id: 'logs',
      title: 'Recomendación detectada: Logs in Context',
      detail: `Hay ${formatNumber(logs.projectedTbMonth, 1)} TB mensuales de logs proyectados con ${logs.retentionLabel}, pero el add-on está desactivado.`,
      severity: 'warning',
      action: 'logs',
    });
  }

  if (isSaas && synthetic.projectedRu > 0 && !scenario.addOns.syntheticManagedPop) {
    recommendations.push({
      id: 'synthetic',
      title: 'Recomendación detectada: Synthetic Managed PoP',
      detail: `Synthetic calcula ${formatNumber(synthetic.projectedRu)} RU/mes proyectadas, pero Managed PoP está desactivado.`,
      severity: 'warning',
      action: 'synthetic',
    });
  }

  const selfHostedHasServerless = scenario.ingest.useTransactionalMode
    ? (scenario.ingest.transactionalWorkloads || []).some((w) => clampNumber(w.averageTps) > 0)
    : scenario.ingest.serverlessOtelGbMonth >= 1000;
  const selfHostedHasSynthetic = scenario.synthetic.some((r) => clampNumber(r.tests) > 0);

  if (!isSaas && (scenario.logs.tbMonth >= 1 || selfHostedHasServerless || selfHostedHasSynthetic)) {
    recommendations.push({
      id: 'self-hosted-capacity',
      title: 'Sizing técnico Self-Hosted requerido',
      detail: 'Self-Hosted requiere validar backend Instana, storage, retención, ingesta, logs y PoP privado si aplica.',
      severity: 'warning',
    });
  }

  if (inventory.standardMinimumApplied) {
    recommendations.push({
      id: 'standard-minimum',
      title: 'Mínimo comercial aplicado en Standard',
      detail: `Se declararon ${inventory.standardRaw} MVS Standard y se licencian ${inventory.standardLicensed}.`,
      severity: 'info',
    });
  }

  if (inventory.essentialsMinimumApplied) {
    recommendations.push({
      id: 'essentials-minimum',
      title: 'Mínimo comercial aplicado en Essentials',
      detail: `Se declararon ${inventory.essentialsRaw} MVS Essentials y se licencian ${inventory.essentialsLicensed}.`,
      severity: 'info',
    });
  }

  return recommendations;
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits }).format(value);
}
