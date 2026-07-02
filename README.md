# Instana Sizing Advisor

Aplicación web para orientar el sizing referencial de **IBM Instana Observability** distribuido. Facilita el cálculo de MVS, consumo de ingesta, Logs in Context, Synthetic Managed PoP y la generación de una cotización referencial exportable a Excel.

> **Aviso**: Esta herramienta entrega estimaciones referenciales. Los valores finales deben validarse con el equipo de ventas IBM y el distribuidor autorizado correspondiente.

---

## Características

- **Modalidades SaaS y Self-Hosted** con lógica diferenciada de add-ons y part numbers
- **Inventario MVS** — Standard y Essentials (físicos, virtuales, Kubernetes workers) con mínimo comercial de 10 MVS
- **Ingesta serverless/OpenTelemetry** — modo manual o transaccional, con comparación de escenario 50 MVS
- **Logs in Context** — retención 7, 30, 60 y 90 días, bloques de 1 TB mensual
- **Synthetic Managed PoP** — API Simple, API Script y Browser Test con mínimo de 30 unidades
- **Add-ons opcionales** completamente aislados: activar/desactivar no afecta otras secciones
- **Exportación Excel** — resumen ejecutivo, inventario, ingesta, logs, synthetic y cotización en un solo archivo `.xlsx`
- **Recomendaciones automáticas** — detecta situaciones de sizing y sugiere acciones
- **Sin precios** — la herramienta entrega únicamente cantidades, unidades y part numbers de referencia

---

## Demo

La aplicación está publicada en GitHub Pages:

**[https://juan-conde-21.github.io/instana-sizing-advisor/](https://juan-conde-21.github.io/instana-sizing-advisor/)**

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Excel | ExcelJS |
| Tests unitarios | Vitest |
| Tests E2E | Playwright |
| CI/CD | GitHub Actions → GitHub Pages |

---

## Desarrollo local

### Requisitos

- Node.js 18+
- npm 9+

### Instalación y arranque

```bash
git clone https://github.com/juan-conde-21/instana-sizing-advisor.git
cd instana-sizing-advisor
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualización del build |
| `npm test` | Tests unitarios con Vitest |
| `npm run test:e2e` | Tests E2E con Playwright |
| `npm run lint` | Lint con ESLint |

---

## Despliegue

El despliegue a GitHub Pages se realiza automáticamente al hacer push a la rama `main` mediante GitHub Actions (`.github/workflows/deploy-pages.yml`).

Para configurar el despliegue en un fork:

1. En el repositorio → **Settings → Pages** → Source: **GitHub Actions**
2. Hacer push a `main`; el workflow construye y publica automáticamente

---

## Estructura del proyecto

```
src/
├── components/          # Componentes React por sección
├── rules/               # Reglas comerciales centralizadas (instanaRules.ts)
├── types/               # Tipos TypeScript del dominio
└── utils/
    ├── calculations.ts  # Motor de cálculo
    └── exportExcel.ts   # Generación Excel con ExcelJS
tests/
└── e2e/                 # Tests Playwright
```

---

## Reglas comerciales implementadas

- **Mínimo comercial**: 10 MVS licenciados cuando el inventario declarado está entre 1 y 9 MVS
- **Cuota SaaS incluida**: Standard 325 GB/MVS · mes, Essentials 50 GB/MVS · mes
- **Data Ingest**: bloques de 100 GB; se descuenta el remanente de la cuota base antes de licenciar
- **Logs in Context**: retención 7 días incluida; extensiones de 30/60/90 días en bloques de 1 TB mensual
- **Synthetic Managed PoP**: mínimo 30 unidades = 30 000 RU/mes
- **Self-Hosted**: add-ons SaaS (Data Ingest, Logs in Context, Synthetic Managed PoP) no aplican

---

## Licencia

Este proyecto es una herramienta de referencia interna. Consultar con IBM o el distribuidor autorizado antes de usar los valores generados en propuestas comerciales formales.
