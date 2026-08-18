import type { SelfHostedScenario } from '../types/sizing';

export const DEFAULT_SELF_HOSTED_SCENARIO: SelfHostedScenario = 'base';

export const PRODUCTION_BASE_PROFILE = {
  id: 'base',
  scenarioKey: 'base' as const,
  name: 'Single-node production base',
  label: 'Production base',
  type: 'Self-Hosted Standard Edition - Single-node production',
  cpu: 28,
  ramGb: 112,
  storageTb: 3.7,
  iops: 3000,
  throughputMibS: 250,
  referenceHosts: 100,
  referenceWorkloadType: 'VMs/servidores tradicionales' as const,
  referenceTracesVolume: 50,
  referenceTracesUnit: 'GB/día' as const,
  referenceLogsTbMonthly: 1,
  referenceRetentionDays: 30,
  referenceEnvironments: 1,
  referenceGrowthPercent: 20,
  note: 'Referencia inicial para ambientes productivos base o cargas controladas. Requiere validación si existen muchos pods, alta trazabilidad, logs intensivos o múltiples ambientes.',
} as const;

export const PRODUCTION_LARGE_PROFILE = {
  id: 'large',
  scenarioKey: 'large' as const,
  name: 'Single-node production large',
  label: 'Production large',
  type: 'Self-Hosted Standard Edition - Single-node production large',
  cpu: 56,
  ramGb: 224,
  storageTb: 7.4,
  iops: 3000,
  throughputMibS: 250,
  referenceHosts: 250,
  referenceWorkloadType: 'Mixto' as const,
  referenceTracesVolume: 150,
  referenceTracesUnit: 'GB/día' as const,
  referenceLogsTbMonthly: 3,
  referenceRetentionDays: 30,
  referenceEnvironments: 2,
  referenceGrowthPercent: 20,
  note: 'Referencia para mayor volumen, crecimiento o escenarios mixtos. No reemplaza un sizing final para alta disponibilidad, multinodo o Custom Edition.',
} as const;

export const CUSTOM_PROFILE_DEFAULTS = {
  referenceHosts: 0,
  referenceWorkloadType: 'Mixto' as const,
  referenceTracesVolume: 0,
  referenceTracesUnit: 'GB/día' as const,
  referenceLogsTbMonthly: 0,
  referenceEnvironments: 1,
  referenceGrowthPercent: 20,
} as const;

export const SELF_HOSTED_PROFILES = [PRODUCTION_BASE_PROFILE, PRODUCTION_LARGE_PROFILE] as const;

export const LOGS_CAPACITY_IMPACT = {
  cpuVcpu: 4,
  ramGb: 12,
  storageTb: 3.688,
} as const;

export const SYNTHETIC_CAPACITY_IMPACT = {
  cpuVcpu: 2,
  ramGb: 9,
} as const;

export const SELF_HOSTED_CAPACITY_IMPACTS = [
  {
    component: 'Logs / Analyze Logs',
    impact: 'Alto en storage y procesamiento',
    additionalCapacity: '+4 vCPU / +12 GB RAM / +3.688 TB storage',
    note: 'Validar según volumen mensual, retención y severidades incluidas.',
  },
  {
    component: 'Synthetic Monitoring Self-Hosted',
    impact: 'CPU y memoria para componentes Synthetic',
    additionalCapacity: '+2 vCPU / +9 GB RAM / storage base incluido',
    note: 'Si se usa PoP privado, dimensionar infraestructura del PoP por separado.',
  },
  {
    component: 'Serverless / OpenTelemetry',
    impact: 'Incremento de ingesta, trazas y almacenamiento',
    additionalCapacity: 'Requiere estimación por TPS, spans, peso promedio de span y retención.',
    note: 'No usar como add-on SaaS. Debe alimentar el sizing técnico de backend y storage.',
  },
  {
    component: 'Kubernetes intensivo',
    impact: 'Mayor volumen de métricas, entidades y cardinalidad',
    additionalCapacity: 'Requiere ajuste según cantidad de worker nodes, pods, contenedores, namespaces y tecnologías monitoreadas.',
    note: 'Un worker node Kubernetes con muchos pods puede generar más carga que una VM tradicional.',
  },
  {
    component: 'Alta disponibilidad',
    impact: 'Requiere validación de arquitectura multinodo o diseño específico',
    additionalCapacity: 'Consultar con IBM preventa para diseño de alta disponibilidad.',
    note: 'No calcular automáticamente. Requiere validación de arquitectura.',
  },
  {
    component: 'EUM / alta trazabilidad',
    impact: 'Mayor ingesta y almacenamiento',
    additionalCapacity: 'Evaluar según tráfico, sesiones, aplicaciones y traces.',
    note: 'Considerar como parte del dimensionamiento técnico.',
  },
] as const;

export const SELF_HOSTED_SIZING_WARNINGS = [
  'Kubernetes suele generar mayor volumen de métricas que VMs tradicionales, especialmente cuando existen muchos pods, contenedores, namespaces o workloads dinámicos.',
  'La carga de trazas depende del tráfico entrante y del tráfico interno entre servicios.',
  'Microservicios de alto tráfico pueden generar más spans que aplicaciones monolíticas.',
  'Logs, Synthetic, EUM, serverless y OpenTelemetry incrementan la necesidad de CPU, memoria, storage e I/O.',
  'El storage debe revisarse con especial cuidado por retención, volumen de logs, métricas, trazas y crecimiento esperado.',
  'Para ambientes críticos, multinodo o Custom Edition, se debe validar el diseño con IBM preventa antes de presentar sizing final al cliente.',
] as const;
