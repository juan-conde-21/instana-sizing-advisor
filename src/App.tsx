import { useMemo, useState } from 'react';
import { AddOnToggles } from './components/AddOnToggles';
import { DeploymentModeCards } from './components/DeploymentModeCards';
import { DetectedRecommendations } from './components/DetectedRecommendations';
import { DistributedInventory } from './components/DistributedInventory';
import { EditionSelection } from './components/EditionSelection';
import { ExampleCards, type ExampleStatus, type ScenarioExample } from './components/ExampleCards';
import { ExportActions } from './components/ExportActions';
import { GeneralInfo } from './components/GeneralInfo';
import { IngestCalculator } from './components/IngestCalculator';
import { LogsCalculator } from './components/LogsCalculator';
import { MvsDefinition } from './components/MvsDefinition';
import { QuoteSummary } from './components/QuoteSummary';
import { ResultOverview } from './components/ResultOverview';
import { SyntheticCalculator } from './components/SyntheticCalculator';
import { SelfHostedSizing } from './components/SelfHostedSizing';
import { ValidationPanel } from './components/ValidationPanel';
import type { EditionSelection as EditionSelectionType, IngestInput, InventoryInput, ScenarioInput, SyntheticRowInput } from './types/sizing';
import { buildQuoteLines, buildRecommendations, calculateIngest, calculateInventory, calculateLogs, calculateSynthetic } from './utils/calculations';
import { exportScenarioToExcel } from './utils/exportExcel';
import { exportScenarioToPdf } from './utils/exportPdf';
import { quoteSummaryText } from './utils/reporting';
import { loadScenario } from './utils/storage';

const syntheticDefaults: SyntheticRowInput[] = [
  { id: 'apiSimple', label: 'API Simple', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.025 },
  { id: 'apiScript', label: 'API Script', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 0.042 },
  { id: 'browserTest', label: 'Browser Test', tests: 0, frequencyMinutes: 5, locations: 1, ruPerExecution: 1 },
];

const emptyInventory: InventoryInput = {
  standardPhysical: 0,
  standardVirtual: 0,
  standardKubernetesWorkers: 0,
  essentialsPhysical: 0,
  essentialsVirtual: 0,
  essentialsKubernetesWorkers: 0,
};

const defaultScenario: ScenarioInput = {
  general: {
    client: '',
    mode: 'SaaS',
    environment: 'Producción',
    region: 'US',
    notes: '',
  },
  editions: {
    standard: true,
    essentials: false,
  },
  inventory: emptyInventory,
  addOns: {
    dataIngest: false,
    logs: false,
    syntheticManagedPop: false,
  },
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
  logs: {
    retentionDays: 7,
    tbMonth: 0,
    growthPercent: 0,
  },
  selfHostedSizing: {
    traceVolume: 0,
    traceVolumeUnit: 'GB/día',
    logsTbMonth: 0,
    retention: 'Por confirmar',
    highAvailability: 'Por confirmar',
    environments: 1,
    growthPercent: 20,
    notes: '',
  },
  synthetic: syntheticDefaults,
  syntheticGrowthPercent: 0,
};

function cloneScenario(input: ScenarioInput): ScenarioInput {
  return {
    ...input,
    general: { ...input.general },
    editions: { ...input.editions },
    inventory: { ...input.inventory },
    addOns: { ...input.addOns },
    ingest: { ...input.ingest, transactionalWorkloads: input.ingest.transactionalWorkloads.map((row) => ({ ...row })) },
    logs: { ...input.logs },
    synthetic: input.synthetic.map((row) => ({ ...row })),
  };
}

function normalizeIngest(ingest: Partial<IngestInput> | undefined): IngestInput {
  return {
    ...defaultScenario.ingest,
    ...ingest,
    serverlessOnly: ingest?.serverlessOnly ?? false,
    transactionalWorkloads: ingest?.transactionalWorkloads || [],
    fiftyMvsConfirmed: ingest?.fiftyMvsConfirmed ?? false,
  };
}

function normalizeEditions(saved: Partial<EditionSelectionType> | undefined, inventory: InventoryInput): EditionSelectionType {
  return {
    standard: saved?.standard ?? true,
    essentials: saved?.essentials ?? (inventory.essentialsPhysical + inventory.essentialsVirtual + inventory.essentialsKubernetesWorkers > 0),
  };
}

function initialScenario(): ScenarioInput {
  const saved = loadScenario();
  if (!saved) return cloneScenario(defaultScenario);
  const inventory = { ...defaultScenario.inventory, ...saved.inventory };
  return {
    ...defaultScenario,
    ...saved,
    general: { ...defaultScenario.general, ...saved.general },
    editions: normalizeEditions(saved.editions, inventory),
    inventory,
    addOns: { ...defaultScenario.addOns, ...saved.addOns },
    ingest: normalizeIngest(saved.ingest),
    logs: {
      ...defaultScenario.logs,
      ...saved.logs,
      tbMonth: (saved.logs as { tbMonth?: number; gbMonth?: number } | undefined)?.tbMonth ?? (saved.logs as { gbMonth?: number } | undefined)?.gbMonth ?? 0,
      growthPercent: saved.logs?.growthPercent ?? 0,
      retentionDays: Number(saved.logs?.retentionDays) === 3 ? 7 : saved.logs?.retentionDays || 7,
    },
    selfHostedSizing: { ...defaultScenario.selfHostedSizing, ...saved.selfHostedSizing },
    synthetic: saved.synthetic?.length ? saved.synthetic : syntheticDefaults,
    syntheticGrowthPercent: saved.syntheticGrowthPercent ?? 0,
  };
}

function scenarioWith(next: Partial<ScenarioInput>): ScenarioInput {
  return cloneScenario({ ...defaultScenario, ...next } as ScenarioInput);
}

const examples: ScenarioExample[] = [
  {
    id: 'saas-23',
    title: 'SaaS Standard · 23 MVS',
    bullets: ['2 servidores físicos', '18 servidores virtuales', '3 worker nodes'],
    scenario: scenarioWith({
      general: { ...defaultScenario.general, client: 'Ejemplo SaaS Standard 23 MVS', mode: 'SaaS' },
      editions: { standard: true, essentials: false },
      inventory: { ...emptyInventory, standardPhysical: 2, standardVirtual: 18, standardKubernetesWorkers: 3 },
    }),
  },
  {
    id: 'standard-essentials',
    title: 'SaaS Standard + Essentials',
    bullets: ['20 MVS Standard', '15 MVS Essentials', 'sin duplicidad'],
    scenario: scenarioWith({
      general: { ...defaultScenario.general, client: 'Ejemplo Standard + Essentials', mode: 'SaaS' },
      editions: { standard: true, essentials: true },
      inventory: { ...emptyInventory, standardVirtual: 20, essentialsVirtual: 15 },
    }),
  },
  {
    id: 'serverless-only',
    title: 'SaaS · Solo serverless',
    bullets: ['sin servidores con agente', 'base mínima de 10 MVS Standard', 'exceso de Data Ingest visible'],
    scenario: scenarioWith({
      general: { ...defaultScenario.general, client: 'Ejemplo solo serverless', mode: 'SaaS' },
      editions: { standard: true, essentials: false },
      addOns: { dataIngest: true, logs: false, syntheticManagedPop: false },
      ingest: { ...defaultScenario.ingest, serverlessOnly: true, serverlessOtelGbMonth: 4000 },
    }),
  },
  {
    id: 'agents-serverless',
    title: 'SaaS · Agentes + serverless',
    bullets: ['23 MVS Standard', 'telemetría serverless/OpenTelemetry adicional'],
    scenario: scenarioWith({
      general: { ...defaultScenario.general, client: 'Ejemplo agentes + serverless', mode: 'SaaS' },
      editions: { standard: true, essentials: false },
      inventory: { ...emptyInventory, standardPhysical: 2, standardVirtual: 18, standardKubernetesWorkers: 3 },
      addOns: { dataIngest: true, logs: false, syntheticManagedPop: false },
      ingest: { ...defaultScenario.ingest, serverlessOtelGbMonth: 3000 },
    }),
  },
  {
    id: 'self-hosted',
    title: 'Self-Hosted',
    bullets: ['inventario Standard y Essentials', 'información para sizing técnico'],
    scenario: scenarioWith({
      general: { ...defaultScenario.general, client: 'Ejemplo Self-Hosted', mode: 'Self-Hosted', region: 'No aplica / Self-Hosted' },
      editions: { standard: true, essentials: true },
      inventory: { ...emptyInventory, standardPhysical: 8, standardVirtual: 12, essentialsVirtual: 10, essentialsKubernetesWorkers: 5 },
      logs: { retentionDays: 30, tbMonth: 2, growthPercent: 0 },
      selfHostedSizing: { ...defaultScenario.selfHostedSizing, traceVolume: 500, logsTbMonth: 2, retention: '30 días', highAvailability: 'Sí', environments: 2 },
      ingest: { ...defaultScenario.ingest, serverlessOtelGbMonth: 1000 },
    }),
  },
];

function scenarioEquals(left: ScenarioInput, right: ScenarioInput): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isInitialBlankScenario(value: ScenarioInput): boolean {
  return scenarioEquals(value, defaultScenario);
}

function clearEditionInventory(inventory: InventoryInput, editions: EditionSelectionType): InventoryInput {
  return {
    ...inventory,
    standardPhysical: editions.standard ? inventory.standardPhysical : 0,
    standardVirtual: editions.standard ? inventory.standardVirtual : 0,
    standardKubernetesWorkers: editions.standard ? inventory.standardKubernetesWorkers : 0,
    essentialsPhysical: editions.essentials ? inventory.essentialsPhysical : 0,
    essentialsVirtual: editions.essentials ? inventory.essentialsVirtual : 0,
    essentialsKubernetesWorkers: editions.essentials ? inventory.essentialsKubernetesWorkers : 0,
  };
}

export default function App() {
  const [scenario, setScenario] = useState<ScenarioInput>(initialScenario);
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);
  const [exampleStatus, setExampleStatus] = useState<ExampleStatus>('none');
  const [actionStatus, setActionStatus] = useState('');

  const inventory = useMemo(() => calculateInventory(scenario.inventory), [scenario.inventory]);
  const ingest = useMemo(() => calculateIngest(scenario, inventory), [scenario, inventory]);
  const logs = useMemo(() => calculateLogs(scenario), [scenario]);
  const synthetic = useMemo(() => calculateSynthetic(scenario.synthetic, scenario.syntheticGrowthPercent, scenario.addOns.syntheticManagedPop), [scenario.synthetic, scenario.syntheticGrowthPercent, scenario.addOns.syntheticManagedPop]);
  const quoteLines = useMemo(() => buildQuoteLines(scenario, inventory, ingest, logs, synthetic), [scenario, inventory, ingest, logs, synthetic]);
  const recommendations = useMemo(() => buildRecommendations(scenario, inventory, ingest, logs, synthetic), [scenario, inventory, ingest, logs, synthetic]);
  const serverlessMinimumApplied = scenario.ingest.serverlessOnly && ingest.standardLicensed === 10 && inventory.standardRaw === 0 && scenario.general.mode === 'SaaS';

  const markManualChange = () => {
    setExampleStatus((current) => (activeExampleId && current === 'loaded' ? 'modified' : current));
  };

  const updateScenario = (next: Partial<ScenarioInput>, options: { manual?: boolean } = { manual: true }) => {
    if (options.manual !== false) markManualChange();
    setScenario((current) => {
      const merged = { ...current, ...next };
      if (merged.general.mode === 'Self-Hosted') {
        return { ...merged, addOns: { dataIngest: false, logs: false, syntheticManagedPop: false }, ingest: { ...merged.ingest, serverlessOnly: false, useFiftyMvsScenario: false, fiftyMvsConfirmed: false } };
      }
      return merged;
    });
  };

  const updateEditions = (editions: EditionSelectionType) => {
    updateScenario({ editions, inventory: clearEditionInventory(scenario.inventory, editions) });
  };

  const resetScenario = (statusMessage = 'Formulario restablecido.') => {
    setScenario(cloneScenario(defaultScenario));
    setActiveExampleId(null);
    setExampleStatus('none');
    setActionStatus(statusMessage);
  };

  const hasManualChanges = () => (activeExampleId ? exampleStatus === 'modified' : !isInitialBlankScenario(scenario));

  const confirmReplace = (message: string) => !hasManualChanges() || window.confirm(message);

  const handleExample = (example: ScenarioExample) => {
    if (activeExampleId === example.id && exampleStatus === 'loaded') return;
    if (!confirmReplace('Se reemplazarán los valores actuales por los del ejemplo seleccionado. ¿Deseas continuar?')) return;
    setScenario(cloneScenario(example.scenario));
    setActiveExampleId(example.id);
    setExampleStatus('loaded');
    setActionStatus('Ejemplo cargado.');
  };

  const handleStartBlank = () => {
    resetScenario('Cálculo en blanco listo.');
  };

  const handleClearActiveExample = () => {
    if (exampleStatus === 'modified' && !window.confirm('Se eliminarán los valores actuales y se iniciará un cálculo en blanco. ¿Deseas continuar?')) return;
    resetScenario('Ejemplo quitado.');
  };

  const payload = { scenario, inventory, ingest, logs, synthetic, quoteLines, recommendations };
  const handleExportExcel = () => {
    exportScenarioToExcel(payload);
    setActionStatus('Excel generado correctamente.');
  };
  const handleExportPdf = () => {
    exportScenarioToPdf(payload);
    setActionStatus('PDF generado correctamente.');
  };
  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(quoteSummaryText(payload));
      setActionStatus('Resumen copiado al portapapeles.');
    } catch {
      setActionStatus('No se pudo copiar el resumen. Revisa los permisos del navegador e inténtalo nuevamente.');
    }
  };
  const handleClear = () => {
    resetScenario();
  };

  return (
    <>
      <header className="commercial-hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">IBM Instana Observability</p>
            <h1>IBM Instana Observability - Calculadora comercial de licenciamiento</h1>
            <p>Aplicación para orientar el sizing referencial de IBM Instana Observability distribuido, facilitando el cálculo de MVS, consumo de ingesta, logs, Synthetic RU y componentes aplicables según la modalidad SaaS o Self-Hosted.</p>
          </div>
        </div>
      </header>

      <main className="wrap commercial-flow">
        <section className="notice" id="alcance">
          <strong>Estimación referencial.</strong> Esta herramienta entrega una estimación referencial. Los Part Numbers, cantidades, condiciones y vigencia comercial deben validarse antes de emitir la cotización.
        </section>

        <ExampleCards
          examples={examples}
          activeExampleId={activeExampleId}
          exampleStatus={exampleStatus}
          onSelect={handleExample}
          onStartBlank={handleStartBlank}
          onClearActiveExample={handleClearActiveExample}
        />

        <GeneralInfo value={scenario.general} onChange={(general) => updateScenario({ general })} />
        <DeploymentModeCards value={scenario.general} onChange={(general) => updateScenario({ general })} />
        <EditionSelection value={scenario.editions} onChange={updateEditions} />
        <MvsDefinition />
        <DistributedInventory value={scenario.inventory} result={inventory} editions={scenario.editions} serverlessMinimumApplied={serverlessMinimumApplied} onChange={(inventoryValue) => updateScenario({ inventory: inventoryValue })} />

        <section className="section-card" id="crecimiento">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Capacidad adicional</p>
              <h2>Crecimiento serverless / OpenTelemetry</h2>
              <p>Este porcentaje se aplica exclusivamente a la ingesta serverless/OpenTelemetry. Logs y Synthetic tienen campos de crecimiento independientes.</p>
            </div>
          </div>
          <div className="form-grid compact">
            <label>
              <span className="label-with-help">Crecimiento serverless / OpenTelemetry (%)<span className="help-icon" title="Porcentaje recomendado para cubrir crecimiento esperado de ingesta serverless/OpenTelemetry, variación de tráfico o incorporación de nuevas funciones. Logs y Synthetic tienen campos de crecimiento propios en sus secciones correspondientes.">?</span></span>
              <input data-testid="growth-percentage-input" type="number" min={0} value={scenario.ingest.growthPercent} onChange={(event) => updateScenario({ ingest: { ...scenario.ingest, growthPercent: Math.max(0, Number(event.target.value) || 0) } })} />
            </label>
          </div>
        </section>

        {scenario.general.mode === 'SaaS' ? <AddOnToggles scenario={scenario} ingest={ingest} logs={logs} synthetic={synthetic} onChange={(addOns) => updateScenario({ addOns })} /> : <SelfHostedSizing value={scenario.selfHostedSizing} onChange={(selfHostedSizing) => updateScenario({ selfHostedSizing })} />}
        {scenario.general.mode === 'SaaS' && scenario.addOns.dataIngest && <IngestCalculator scenario={scenario} inventory={inventory} ingest={ingest} onChange={(ingestValue) => updateScenario({ ingest: ingestValue })} />}
        {scenario.general.mode === 'SaaS' && scenario.addOns.logs && <LogsCalculator value={scenario.logs} logs={logs} onChange={(logsValue) => updateScenario({ logs: logsValue })} />}
        {scenario.general.mode === 'SaaS' && scenario.addOns.syntheticManagedPop && <SyntheticCalculator scenario={scenario} result={synthetic} onChange={(syntheticValue) => updateScenario({ synthetic: syntheticValue })} onGrowthChange={(syntheticGrowthPercent) => updateScenario({ syntheticGrowthPercent })} />}

        <ValidationPanel scenario={scenario} inventory={inventory} />
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
        <ResultOverview scenario={scenario} inventory={inventory} ingest={ingest} logs={logs} synthetic={synthetic} lines={quoteLines} />
        <QuoteSummary scenario={scenario} lines={quoteLines} />
        <ExportActions onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} onCopySummary={handleCopySummary} onClear={handleClear} statusMessage={actionStatus} />
      </main>
    </>
  );
}
