import { useMemo, useState } from 'react';
import { AddOnToggles } from './components/AddOnToggles';
import { DetectedRecommendations } from './components/DetectedRecommendations';
import { DistributedInventory } from './components/DistributedInventory';
import { GeneralInfo } from './components/GeneralInfo';
import { IngestCalculator } from './components/IngestCalculator';
import { LogsCalculator } from './components/LogsCalculator';
import { QuoteSummary } from './components/QuoteSummary';
import { SyntheticCalculator } from './components/SyntheticCalculator';
import type { IngestInput, ScenarioInput, SyntheticRowInput } from './types/sizing';
import { buildQuoteLines, buildRecommendations, calculateIngest, calculateInventory, calculateLogs, calculateSynthetic } from './utils/calculations';
import { exportScenarioToExcel } from './utils/exportExcel';
import { loadScenario } from './utils/storage';

const syntheticDefaults: SyntheticRowInput[] = [
  { id: 'apiSimple', label: 'API Simple', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.025 },
  { id: 'apiScript', label: 'API Script', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.042 },
  { id: 'browserTest', label: 'Browser Test', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 1 },
];

const defaultScenario: ScenarioInput = {
  general: {
    client: '',
    mode: 'SaaS',
    environment: 'Producción',
    region: 'US',
    notes: '',
  },
  inventory: {
    standardPhysical: 0,
    standardVirtual: 0,
    standardKubernetesWorkers: 0,
    essentialsPhysical: 0,
    essentialsVirtual: 0,
    essentialsKubernetesWorkers: 0,
  },
  addOns: {
    dataIngest: false,
    logs: false,
    syntheticManagedPop: false,
  },
  ingest: {
    agentConsumptionPercent: 80,
    growthPercent: 20,
    serverlessOtelGbMonth: 0,
    useTransactionalMode: false,
    transactionalWorkloads: [],
    useFiftyMvsScenario: false,
  },
  logs: {
    retentionDays: 7,
    tbMonth: 0,
    growthPercent: 0,
  },
  synthetic: syntheticDefaults,
  syntheticGrowthPercent: 0,
};

function normalizeIngest(ingest: Partial<IngestInput> | undefined): IngestInput {
  return {
    ...defaultScenario.ingest,
    ...ingest,
    transactionalWorkloads: ingest?.transactionalWorkloads || [],
  };
}

function initialScenario(): ScenarioInput {
  const saved = loadScenario();
  if (!saved) return defaultScenario;
  return {
    ...defaultScenario,
    ...saved,
    general: { ...defaultScenario.general, ...saved.general },
    inventory: { ...defaultScenario.inventory, ...saved.inventory },
    addOns: { ...defaultScenario.addOns, ...saved.addOns },
    ingest: normalizeIngest(saved.ingest),
    logs: {
      ...defaultScenario.logs,
      ...saved.logs,
      tbMonth: (saved.logs as any)?.tbMonth ?? (saved.logs as any)?.gbMonth ?? 0,
      growthPercent: (saved.logs as any)?.growthPercent ?? 0,
      retentionDays: Number(saved.logs?.retentionDays) === 3 ? 7 : saved.logs?.retentionDays || 7,
    },
    synthetic: saved.synthetic?.length ? saved.synthetic : syntheticDefaults,
    syntheticGrowthPercent: saved.syntheticGrowthPercent ?? 0,
  };
}


export default function App() {
  const [scenario, setScenario] = useState<ScenarioInput>(initialScenario);

  const inventory = useMemo(() => calculateInventory(scenario.inventory), [scenario.inventory]);
  const ingest = useMemo(() => calculateIngest(scenario, inventory), [scenario, inventory]);
  const logs = useMemo(() => calculateLogs(scenario), [scenario]);
  const synthetic = useMemo(() => calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, scenario.addOns.syntheticManagedPop), [scenario.synthetic, scenario.syntheticGrowthPercent, scenario.addOns.syntheticManagedPop]);
  const quoteLines = useMemo(() => buildQuoteLines(scenario, inventory, ingest, logs, synthetic), [scenario, inventory, ingest, logs, synthetic]);
  const recommendations = useMemo(() => buildRecommendations(scenario, inventory, ingest, logs, synthetic), [scenario, inventory, ingest, logs, synthetic]);

  const updateScenario = (next: Partial<ScenarioInput>) => setScenario((current) => {
    const merged = { ...current, ...next };
    if (merged.general.mode === 'Self-Hosted') {
      return { ...merged, addOns: { dataIngest: false, logs: false, syntheticManagedPop: false } };
    }
    return merged;
  });

  const handleExport = () => exportScenarioToExcel({ scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations });

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div>
              <h1>Instana Sizing Advisor</h1>
              <p>Estimación comercial y técnica para IBM Instana Observability distribuido</p>
            </div>
          </div>
          <div className="actions">
            <button className="primary" type="button" data-testid="export-excel-button" onClick={handleExport}>Exportar Excel</button>
          </div>
        </div>
      </header>

      <div className="page">
        <aside className="sidebar" aria-label="Secciones">
          <div className="sidebar-title">Advisor</div>
          {['Datos generales', 'Inventario', 'Add-ons', 'Ingesta', 'Logs', 'Synthetic', 'Recomendaciones', 'Resumen'].map((item, index) => (
            <a className={`nav-item ${index === 0 ? 'active' : ''}`} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} key={item}>
              <span className="dot" />
              {item}
            </a>
          ))}
        </aside>

        <main>
          <section className="hero">
            <h2>Instana Sizing Advisor</h2>
            <p>Aplicación para orientar el sizing referencial de IBM Instana Observability distribuido, facilitando el cálculo de MVS, consumo de ingesta, logs, Synthetic RU y componentes aplicables según la modalidad SaaS o Self-Hosted.</p>
          </section>

          <div className="grid">
            <GeneralInfo value={scenario.general} onChange={(general) => updateScenario({ general })} />
            <DistributedInventory value={scenario.inventory} result={inventory} onChange={(inventoryValue) => updateScenario({ inventory: inventoryValue })} />
            <section className="card span-12" id="crecimiento">
              <div className="card-header">
                <div>
                  <h3>Crecimiento proyectado</h3>
                  <p className="sub">Se aplica exclusivamente a la ingesta serverless/OpenTelemetry. Logs y Synthetic tienen campos de crecimiento independientes en sus respectivas secciones.</p>
                </div>
              </div>
              <div className="form-grid compact">
                <label>
                  <span className="label-with-help">Crecimiento serverless / OpenTelemetry (%)<span className="help-icon" title="Porcentaje recomendado para cubrir crecimiento esperado de ingesta serverless/OpenTelemetry, variación de tráfico o incorporación de nuevas funciones. Logs y Synthetic tienen campos de crecimiento propios en sus secciones correspondientes.">?</span></span>
                  <input data-testid="growth-percentage-input" type="number" min={0} value={scenario.ingest.growthPercent} onChange={(event) => updateScenario({ ingest: { ...scenario.ingest, growthPercent: Math.max(0, Number(event.target.value) || 0) } })} />
                </label>
              </div>
            </section>
            <AddOnToggles scenario={scenario} ingest={ingest} logs={logs} synthetic={synthetic} onChange={(addOns) => updateScenario({ addOns })} />
            {scenario.general.mode === 'SaaS' && scenario.addOns.dataIngest && <IngestCalculator scenario={scenario} inventory={inventory} ingest={ingest} onChange={(ingestValue) => updateScenario({ ingest: ingestValue })} />}
            {scenario.general.mode === 'SaaS' && scenario.addOns.logs && <LogsCalculator scenario={scenario} logs={logs} onChange={(logsValue) => updateScenario({ logs: logsValue })} />}
            {scenario.general.mode === 'SaaS' && scenario.addOns.syntheticManagedPop && <SyntheticCalculator scenario={scenario} result={synthetic} onChange={(syntheticValue) => updateScenario({ synthetic: syntheticValue })} onGrowthChange={(syntheticGrowthPercent) => updateScenario({ syntheticGrowthPercent })} />}
            <DetectedRecommendations
              recommendations={recommendations}
              onActivateAddOn={(target) => {
                if (scenario.general.mode !== 'SaaS') return;
                const key = target === 'synthetic' ? 'syntheticManagedPop' : target;
                updateScenario({ addOns: { ...scenario.addOns, [key]: true } });
              }}
              onSelectFiftyMvs={() => {
                if (scenario.general.mode !== 'SaaS') return;
                updateScenario({ ingest: { ...scenario.ingest, useFiftyMvsScenario: true }, addOns: { ...scenario.addOns, dataIngest: true } });
              }}
            />
            <QuoteSummary scenario={scenario} lines={quoteLines} />
          </div>
        </main>
      </div>
    </>
  );
}
