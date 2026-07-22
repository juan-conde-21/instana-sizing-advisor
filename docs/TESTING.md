# Pruebas y QA

La validación local usa npm, TypeScript, Vitest, Vite, Playwright y npm audit.

## Comandos

```bash
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

## Últimos resultados conocidos

- `npm run lint`: aprobado.
- `npm test`: aprobado, 29 pruebas unitarias.
- `npm run build`: aprobado.
- `npm run test:e2e`: aprobado, 22 pruebas E2E.
- `npm audit --omit=dev`: aprobado, 0 vulnerabilidades.

Estas cantidades corresponden a la última auditoría y pueden cambiar cuando se agreguen pruebas.

## Estructura

- Unitarias: `src/utils/calculations.test.ts`.
- E2E: `tests/e2e/instana-sizing-advisor.spec.ts`.
- Configuración Playwright: `playwright.config.ts`.

## Casos principales cubiertos

- MVS Standard y Essentials.
- Mínimo comercial de 10 MVS.
- Solo serverless con volumen cero, cubierto por cuota y con exceso.
- Agentes más serverless.
- Comparación de 50 MVS sin aplicar y con confirmación.
- Logs con 7, 30, 60 y 90 días.
- Synthetic con mínimo y sin líneas cero.
- Self-Hosted sin add-ons SaaS.
- Excel y PDF válidos.
- Copiar resumen.
- Limpiar formulario.
- Responsive desktop, tablet y móvil.

## Playwright

Si Chromium no está instalado:

```bash
npx playwright install --with-deps chromium
```

Para ejecutar E2E:

```bash
npm run test:e2e
```

Para abrir el reporte local después de una ejecución:

```bash
npx playwright show-report
```

## Artefactos no versionados

`playwright-report/` y `test-results/` no deben versionarse porque son salidas generadas por pruebas. En CI se suben como artefacto solo cuando falla una ejecución.

## Diagnóstico de fallas

- Si falla `npm ci`, revisa `package-lock.json` y conectividad al registry.
- Si falla `npm run lint`, corrige TypeScript antes de seguir.
- Si falla `npm test`, revisa la fórmula afectada en `src/utils/calculations.ts`.
- Si falla Playwright, revisa el reporte HTML local y las capturas de fallo.
- Si falla el build, revisa `vite.config.ts` y rutas de assets.
- Si `npm audit --omit=dev` reporta vulnerabilidades, aplica solo correcciones compatibles y vuelve a ejecutar toda la batería.
