export const SELF_HOSTED_PROFILES = [
  {
    id: 'base',
    name: 'Single-node production base',
    type: 'Self-Hosted Standard Edition - Single-node production',
    cpu: 28,
    ramGb: 112,
    storageTb: 3.7,
    iops: 3000,
    throughputMibS: 250,
    note: 'Usar como referencia inicial para ambientes productivos base. No representa sizing final para cargas altas, alto volumen de trazas, Kubernetes intensivo, logging extendido o uso intensivo de features opcionales.',
  },
  {
    id: 'large',
    name: 'Single-node production large',
    type: 'Self-Hosted Standard Edition - Single-node production large',
    cpu: 56,
    ramGb: 224,
    storageTb: 7.4,
    iops: 3000,
    throughputMibS: 250,
    note: 'Referencia para escenarios de crecimiento o mayor carga. No representa sizing final para Custom Edition, multinode o ambientes de alta criticidad.',
  },
] as const;

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
