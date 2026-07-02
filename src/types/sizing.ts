export type DeploymentMode = 'SaaS' | 'Self-Hosted';
export type EnvironmentType = 'Producción' | 'Producción + No Producción' | 'Desarrollo / Prueba';
export type Region = 'US' | 'EU' | 'No aplica / Self-Hosted';
export type LogRetention = 7 | 30 | 60 | 90;
export type ServerlessWorkloadType = 'AWS Lambda' | 'Cloud Run' | 'Azure Functions' | 'Azure Web Apps' | 'OpenTelemetry' | 'Otro';

export interface GeneralInfo {
  client: string;
  mode: DeploymentMode;
  environment: EnvironmentType;
  region: Region;
  notes: string;
}

export interface InventoryInput {
  standardPhysical: number;
  standardVirtual: number;
  standardKubernetesWorkers: number;
  essentialsPhysical: number;
  essentialsVirtual: number;
  essentialsKubernetesWorkers: number;
}

export interface AddOns {
  dataIngest: boolean;
  logs: boolean;
  syntheticManagedPop: boolean;
}

export interface ServerlessWorkloadInput {
  id: string;
  name: string;
  type: ServerlessWorkloadType;
  averageTps: number;
  spansPerTransaction: number;
  averageSpanKb: number;
}

export interface ServerlessWorkloadResult extends ServerlessWorkloadInput {
  gbMonth: number;
  projectedGbMonth: number;
}

export interface IngestInput {
  agentConsumptionPercent: number;
  growthPercent: number;
  serverlessOtelGbMonth: number;
  useTransactionalMode: boolean;
  transactionalWorkloads: ServerlessWorkloadInput[];
  useFiftyMvsScenario: boolean;
}

export interface LogsInput {
  retentionDays: LogRetention;
  tbMonth: number;
  growthPercent: number;
}

export interface SyntheticRowInput {
  id: 'apiSimple' | 'apiScript' | 'browserTest';
  label: string;
  tests: number;
  frequencyMinutes: number;
  locations: number;
  ruPerExecution: number;
}

export interface ScenarioInput {
  general: GeneralInfo;
  inventory: InventoryInput;
  addOns: AddOns;
  ingest: IngestInput;
  logs: LogsInput;
  synthetic: SyntheticRowInput[];
  syntheticGrowthPercent: number;
}

export interface SavedScenario extends ScenarioInput {
  savedAt: string;
}

export interface InventoryResult {
  standardRaw: number;
  essentialsRaw: number;
  standardConsidered: number;
  essentialsConsidered: number;
  standardLicensed: number;
  essentialsLicensed: number;
  standardMinimumApplied: boolean;
  essentialsMinimumApplied: boolean;
}

export interface IngestScenarioComparison {
  label: string;
  standardLicensed: number;
  essentialsLicensed: number;
  baseIncludedGb: number;
  agentAverageGb: number;
  remainingGb: number;
  projectedServerlessOtelGb: number;
  gbToLicense: number;
  dataIngestUnits: number;
}

export interface IngestResult extends IngestScenarioComparison {
  manualProjectedServerlessOtelGb: number;
  transactionalWorkloads: ServerlessWorkloadResult[];
  transactionalProjectedServerlessOtelGb: number;
  selectedScenario: 'current' | 'fifty-mvs';
  currentScenario: IngestScenarioComparison;
  fiftyMvsScenario: IngestScenarioComparison | null;
}

export interface LogsResult {
  projectedTbMonth: number;
  units: number;
  retentionPartNumber: string;
  retentionLabel: string;
  isExtendedRetention: boolean;
}

export interface SyntheticRowResult extends SyntheticRowInput {
  monthlyExecutions: number;
  monthlyRu: number;
  projectedRu: number;
}

export interface SyntheticResult {
  rows: SyntheticRowResult[];
  totalRu: number;
  projectedRu: number;
  calculatedUnits: number;
  consideredUnits: number;
  licensedRu: number;
  consideredRu: number;
  availableRu: number;
  minimumApplied: boolean;
}

export interface QuoteLine {
  component: string;
  partNumber: string;
  quantity: number;
  unit: string;
  explanation: string;
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning';
  action?: 'dataIngest' | 'logs' | 'synthetic' | 'fiftyMvs';
}
