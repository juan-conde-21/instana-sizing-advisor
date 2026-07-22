# Mantenimiento

Las reglas comerciales deben mantenerse centralizadas. No dupliques Part Numbers, cuotas, mínimos, bloques ni fórmulas dentro de componentes visuales.

## Actualizar Part Numbers

1. Editar `src/rules/instanaRules.ts`.
2. Actualizar la entrada correspondiente en `partNumbers` y `catalog`.
3. Marcar estado de validación y vigencia.
4. Ejecutar pruebas completas.

## Actualizar cuotas

Las cuotas SaaS están en `INSTANA_RULES.saasQuotaGb`.

Después de cambiarlas, revisar pruebas de Data Ingest, solo serverless y agentes más serverless.

## Actualizar mínimos

El mínimo MVS está en `INSTANA_RULES.commercialMinimumMvs`. El mínimo Synthetic está en `INSTANA_RULES.synthetic.minimumUnits`.

Actualizar pruebas unitarias y E2E si cambia la regla.

## Actualizar bloques

- Data Ingest: `INSTANA_RULES.dataIngest.unitGb`.
- Logs: unidad comercial en `INSTANA_RULES.logs.unitLabel`.
- Synthetic: `INSTANA_RULES.synthetic.unitRu`.

Los redondeos están en `src/utils/calculations.ts`.

## Actualizar vigencia

Actualizar `catalogDate`, `effectiveDate`, `source` y `validationStatus` en `src/rules/instanaRules.ts`. No presentes datos pendientes como oficiales.

## Agregar una modalidad

1. Extender tipos en `src/types/sizing.ts`.
2. Agregar entradas de catálogo.
3. Ajustar cálculos en `src/utils/calculations.ts`.
4. Agregar componentes o mensajes UI.
5. Crear pruebas unitarias y E2E.

## Agregar un ejemplo

Editar los ejemplos en `src/App.tsx`. Usa datos ficticios y evita nombres reales de clientes.

## Agregar una validación

Agregar la regla en `src/components/ValidationPanel.tsx` o en `buildRecommendations` si afecta recomendaciones calculadas.

## Agregar una prueba

- Fórmulas: `src/utils/calculations.test.ts`.
- Flujo navegador: `tests/e2e/instana-sizing-advisor.spec.ts`.

## Comprobar Excel

Revisar `src/utils/exportExcel.ts`. Validar que no se generen hojas vacías, filas con cantidad cero ni Part Numbers no aplicables.

## Comprobar PDF

Revisar `src/utils/exportPdf.ts`. Validar que no se muestren secciones vacías, datos reales ni textos comerciales pendientes como oficiales.

## Revisar workflows

Revisar `.github/workflows/ci.yml` y `.github/workflows/deploy-pages.yml`. Mantener permisos mínimos, `GITHUB_TOKEN`, Pages artifact y despliegue sin PAT.

## Crear una nueva versión

1. Crear rama desde `main`.
2. Aplicar cambios.
3. Actualizar `CHANGELOG.md`.
4. Ejecutar pruebas.
5. Crear Pull Request.
6. Fusionar solo después de CI y revisión.
