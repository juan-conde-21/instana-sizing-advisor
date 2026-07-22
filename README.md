# IBM Instana Observability – Calculadora comercial de licenciamiento

[![CI](https://github.com/juan-conde-21/instana-sizing-advisor/actions/workflows/ci.yml/badge.svg)](https://github.com/juan-conde-21/instana-sizing-advisor/actions/workflows/ci.yml)
[![Deploy GitHub Pages](https://github.com/juan-conde-21/instana-sizing-advisor/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/juan-conde-21/instana-sizing-advisor/actions/workflows/deploy-pages.yml)

## Descripción

Aplicación web para orientar el sizing referencial de IBM Instana Observability distribuido. Permite estimar escenarios de IBM Instana SaaS e IBM Instana Self-Hosted, separando Standard, Essentials, MVS, Data Ingest, Logs in Context, Synthetic, escenarios exclusivamente serverless/OpenTelemetry y escenarios mixtos con agentes más serverless.

Esta herramienta entrega una estimación referencial. Los Part Numbers, cantidades, unidades comerciales, condiciones y vigencia deben validarse contra CPQ antes de emitir una cotización.

## Demo

URL prevista de GitHub Pages:

https://juan-conde-21.github.io/instana-sizing-advisor/

Disponible después de habilitar GitHub Pages y completar el primer despliegue mediante GitHub Actions.

## Capturas

Las capturas de documentación deben mantenerse en `docs/images/` y no deben contener datos reales de clientes. La carpeta `docs/` debe estar escribible por el usuario de trabajo antes de generar esas imágenes.

## Principales funcionalidades

- Flujo comercial en español.
- Explicación de MVS y de qué infraestructura se debe contar.
- Inventario por servidores físicos, servidores virtuales y worker nodes.
- Ediciones Standard y Essentials calculadas por separado.
- Aplicación del mínimo comercial configurado.
- Escenario solo serverless/OpenTelemetry.
- Escenario con agentes más serverless/OpenTelemetry.
- Comparación opcional de escenario de 50 MVS.
- Cálculo de Data Ingest adicional SaaS.
- Logs in Context con retención incluida y extendida.
- Synthetic con RU, mínimo comercial y unidades a cotizar.
- Self-Hosted con licenciamiento MVS y datos para sizing técnico separado.
- Ejemplos precargados editables.
- Resultado principal ejecutivo.
- Exportación Excel XLSX.
- Exportación PDF.
- Copiar resumen al portapapeles.
- Limpiar formulario.
- Diseño responsive para desktop, tablet y móvil.

## Reglas básicas

- Servidor físico = 1 MVS.
- Servidor virtual = 1 MVS.
- Worker node = 1 MVS.
- Pods y contenedores no se cuentan como MVS.
- Standard y Essentials se calculan por separado.
- La misma infraestructura no debe duplicarse entre Standard y Essentials.
- No se generan líneas de cotización con cantidad cero.
- El escenario solo serverless utiliza la base comercial configurada cuando corresponde.
- Los excesos de ingesta se calculan después de considerar la cuota incluida.
- Self-Hosted no cotiza add-ons SaaS de Data Ingest, Logs in Context ni Synthetic Managed PoP.

La fuente operativa de reglas, Part Numbers, cuotas, mínimos y unidades comerciales está en `src/rules/instanaRules.ts`.

## Tecnologías

Según `package.json`, el proyecto utiliza:

- React 19.
- TypeScript 5.
- Vite 6.
- ExcelJS.
- Vitest.
- Playwright.
- `@vitejs/plugin-react`.

## Requisitos

El repositorio no define actualmente un campo `engines` en `package.json`. Las pruebas y build se validaron con el stack actual y los workflows usan Node.js 20. Se recomienda usar Node.js 20 LTS o una versión LTS compatible, y validar cualquier cambio de versión ejecutando la batería completa de QA.

## Instalación local

```bash
npm ci
npm run dev
```

La aplicación queda disponible en el puerto configurado por Vite, normalmente `http://localhost:5173`.

## Validación

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

## Vista de producción local

```bash
npm run build
npm run preview
```

## Estructura del proyecto

```text
src/
  components/        Componentes React por sección del flujo comercial.
  rules/             Catálogo comercial y reglas configuradas.
  types/             Tipos TypeScript del dominio de sizing.
  utils/             Motor de cálculo, reporting, Excel y PDF.
tests/e2e/           Pruebas end-to-end con Playwright.
.github/workflows/   Workflows de CI y despliegue a GitHub Pages.
docs/                Documentación funcional, técnica y de despliegue.
```

## Documentación adicional

- [Maqueta de referencia aprobada](docs/Maqueta_IBM_Instana_Calculadora_Comercial_v2.html)
- [Changelog](CHANGELOG.md)

Los documentos `docs/USER_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/COMMERCIAL_RULES.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md` y `docs/MAINTENANCE.md` están pendientes de creación cuando la carpeta `docs/` tenga permisos de escritura para el usuario de trabajo.

## Advertencia comercial

Esta herramienta entrega una estimación referencial. Los Part Numbers, cantidades, unidades comerciales, condiciones y vigencia deben validarse contra CPQ antes de emitir una cotización.

## Estado del proyecto

Última auditoría local registrada:

- `npm run lint`: aprobado.
- `npm test`: aprobado, 29 pruebas unitarias.
- `npm run build`: aprobado.
- `npm run test:e2e`: aprobado, 22 pruebas E2E.
- `npm audit --omit=dev`: aprobado, 0 vulnerabilidades.

Pendientes comerciales conocidos:

- Validar vigencia de Part Numbers contra CPQ.
- Validar unidades comerciales Self-Hosted.
- Validar condiciones comerciales antes de emitir cotización.

## Licencia

Licencia de uso pendiente de definición por el propietario del repositorio.
