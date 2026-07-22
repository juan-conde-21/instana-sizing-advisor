# Changelog

Formato inspirado en Keep a Changelog. Este archivo documenta cambios relevantes pendientes de versionar.

## Unreleased

### Added

- Nuevo flujo comercial en español para IBM Instana Observability.
- Explicación de MVS y guía de inventario por servidores físicos, servidores virtuales y worker nodes.
- Cálculo separado de Instana Standard e Instana Essentials.
- Escenario solo serverless/OpenTelemetry con base comercial mínima cuando corresponde.
- Escenario de agentes más serverless/OpenTelemetry.
- Comparación de escenario de 50 MVS con confirmación explícita.
- Cálculo de Data Ingest adicional SaaS.
- Cálculo de Logs in Context con retención incluida y extendida.
- Cálculo de Synthetic con RU, crecimiento propio, mínimo comercial y RU disponibles.
- Presentación Self-Hosted separada entre licenciamiento MVS y sizing técnico.
- Ejemplos precargados editables.
- Resultado principal ejecutivo.
- Exportación Excel XLSX profesional.
- Exportación PDF profesional.
- Copiar resumen al portapapeles.
- Limpiar formulario sin recargar la página.
- Pruebas unitarias con Vitest.
- Pruebas E2E con Playwright.
- Workflows preparados para CI y despliegue a GitHub Pages.

### Changed

- Experiencia orientada a uso comercial y didáctico.
- Navegación convertida a recorrido vertical sin barra lateral sticky.
- Lenguaje principal normalizado a español claro.
- Resultado de cotización separado del detalle técnico.
- Reglas comerciales separadas del catálogo y de los componentes visuales.
- Configuración Vite preparada para servir assets desde `/instana-sizing-advisor/` en GitHub Pages.

### Fixed

- Eliminación de líneas de cotización con cantidad cero.
- Corrección de tildes y uso de “año” en reportes visibles.
- Prevención de caracteres corruptos en exportaciones.
- Correcciones en mínimos comerciales de MVS.
- Correcciones en cálculo de Data Ingest después de cuota incluida.
- Correcciones en redondeo de Logs por bloques de 1 TB mensual.
- Correcciones en mínimo Synthetic de 30 unidades equivalentes a 30,000 RU/mes.
- Exclusión de add-ons SaaS en modalidad Self-Hosted.
- Retiro del índice Git de artefactos generados por Playwright.
