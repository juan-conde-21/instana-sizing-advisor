import type { LogRetention } from '../types/sizing';

export const INSTANA_RULES = {
  commercialMinimumMvs: 10,
  monthlyMinutes: 43200,
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
} as const;
