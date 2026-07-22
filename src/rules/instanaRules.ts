import type { LogRetention } from '../types/sizing';

export type CatalogEntry = {
  id: string;
  modality: 'SaaS' | 'Self-Hosted';
  edition?: 'Standard' | 'Essentials';
  description: string;
  partNumber: string;
  commercialUnit: string;
  blockSize?: string;
  minimum?: string;
  quota?: string;
  effectiveDate: string;
  source: string;
  validationStatus: string;
};

const pending = 'Pendiente de validación comercial';

export const INSTANA_RULES = {
  commercialMinimumMvs: 10,
  monthlyMinutes: 43200,
  catalogDate: pending,
  catalogSource: 'Catálogo comercial configurado en la aplicación',
  saasQuotaGb: {
    standard: 325,
    essentials: 50,
  },
  dataIngest: {
    partNumber: 'D0N7BZX',
    unitGb: 100,
    unitLabel: 'bloques de 100 GB/mes',
  },
  logs: {
    unitGb: 1000,
    unitLabel: 'bloques de 1 TB mensual',
    retentionPartNumbers: {
      7: '',
      30: 'D0RL4ZX',
      60: 'D0RL8ZX',
      90: 'D0RLCZX',
    } satisfies Record<LogRetention, string>,
  },
  synthetic: {
    managedPopPartNumber: 'D0I5PZX',
    unitRu: 1000,
    minimumUnits: 30,
    unitLabel: 'unidades de 1,000 RU/mes',
    privatePopReference: 'Mínimo de prueba: 4 vCPU, 16 GB RAM y k3s. Para producción debe validarse sizing del PoP.',
  },
  partNumbers: {
    saasStandard: 'D0N79ZX',
    saasEssentials: 'D0N77ZX',
    selfHostedStandard: 'D29RTLL',
    selfHostedEssentials: 'D29RRLL',
  },
  commercialUnits: {
    saasStandard: 'MVS / mes',
    saasEssentials: 'MVS / mes',
    selfHostedStandard: 'Unidad pendiente de validación comercial',
    selfHostedEssentials: 'Unidad pendiente de validación comercial',
  },
  catalog: [
    { id: 'saas-standard', modality: 'SaaS', edition: 'Standard', description: 'IBM Instana Observability Standard SaaS', partNumber: 'D0N79ZX', commercialUnit: 'MVS / mes', minimum: '10 MVS cuando aplica mínimo comercial', quota: '325 GB/MVS/mes', effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'saas-essentials', modality: 'SaaS', edition: 'Essentials', description: 'IBM Instana Observability Essentials SaaS', partNumber: 'D0N77ZX', commercialUnit: 'MVS / mes', minimum: '10 MVS cuando aplica mínimo comercial', quota: '50 GB/MVS/mes', effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'self-hosted-standard', modality: 'Self-Hosted', edition: 'Standard', description: 'IBM Instana Observability Standard Self-Hosted', partNumber: 'D29RTLL', commercialUnit: 'Unidad pendiente de validación comercial', minimum: '10 MVS cuando aplica mínimo comercial', quota: pending, effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'self-hosted-essentials', modality: 'Self-Hosted', edition: 'Essentials', description: 'IBM Instana Observability Essentials Self-Hosted', partNumber: 'D29RRLL', commercialUnit: 'Unidad pendiente de validación comercial', minimum: '10 MVS cuando aplica mínimo comercial', quota: pending, effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'data-ingest-saas', modality: 'SaaS', description: 'Data Ingest adicional SaaS', partNumber: 'D0N7BZX', commercialUnit: 'bloques de 100 GB/mes', blockSize: '100 GB/mes', effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'logs-30-saas', modality: 'SaaS', description: 'Logs in Context 30 días', partNumber: 'D0RL4ZX', commercialUnit: 'bloques de 1 TB mensual', blockSize: '1 TB mensual', effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'logs-60-saas', modality: 'SaaS', description: 'Logs in Context 60 días', partNumber: 'D0RL8ZX', commercialUnit: 'bloques de 1 TB mensual', blockSize: '1 TB mensual', effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'logs-90-saas', modality: 'SaaS', description: 'Logs in Context 90 días', partNumber: 'D0RLCZX', commercialUnit: 'bloques de 1 TB mensual', blockSize: '1 TB mensual', effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
    { id: 'synthetic-managed-pop-saas', modality: 'SaaS', description: 'Synthetic Managed PoP', partNumber: 'D0I5PZX', commercialUnit: 'unidades de 1,000 RU/mes', blockSize: '1,000 RU/mes', minimum: '30 unidades', effectiveDate: pending, source: 'Catálogo comercial configurado en la aplicación', validationStatus: pending },
  ] satisfies CatalogEntry[],
} as const;
