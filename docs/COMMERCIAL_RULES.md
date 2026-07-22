# Reglas comerciales configuradas

Este documento describe las reglas actuales implementadas en el código. No reemplaza CPQ ni las condiciones comerciales vigentes.

Fuente principal: `src/rules/instanaRules.ts`. Fórmulas: `src/utils/calculations.ts`.

| Capacidad | Descripción | Fórmula | Archivo fuente | Ejemplo | Estado |
|---|---|---|---|---|---|
| MVS | Unidad para contar infraestructura monitoreada. Servidor físico, servidor virtual y worker node cuentan como 1 MVS. Pods y contenedores no se cuentan. | MVS = físicos + virtuales + worker nodes. | `calculations.ts`, `instanaRules.ts` | 2 físicos + 18 virtuales + 3 workers = 23 MVS. | Configurado en la aplicación; validar interpretación comercial. |
| Standard | Edición para APM y observabilidad completa. | Standard declarado = físicos Standard + VMs Standard + workers Standard. | `calculations.ts` | 23 MVS declarados = 23 a licenciar si supera mínimo. | Configurado; validar CPQ. |
| Essentials | Edición para monitoreo de infraestructura. | Essentials declarado = físicos Essentials + VMs Essentials + workers Essentials. | `calculations.ts` | 5 MVS Essentials aplica mínimo de 10. | Configurado; validar CPQ. |
| Mínimo comercial | Si una edición tiene más de 0 y menos de 10 MVS, licencia 10. | raw = 0 → 0; raw < 10 → 10; raw >= 10 → raw. | `INSTANA_RULES.commercialMinimumMvs` | 5 declarados → 10 licenciados. | Configurado; vigencia pendiente. |
| Solo serverless | SaaS con Data Ingest activo, sin MVS declarados y telemetría mayor a 0 aplica base mínima Standard. | Standard licenciado = 10; agentes = 0; exceso = max(0, telemetría proyectada - cuota incluida). | `calculateIngest`, `buildQuoteLines` | 5,000 GB con base 10 Standard descuenta cuota incluida antes de Data Ingest. | Configurado; validar CPQ. |
| Agentes + serverless | Usa cuota incluida por MVS licenciados y descuenta consumo estimado de agentes reales. | remanente = cuota incluida - consumo agentes. | `calculateIngest` | 5 Standard declarados licencian 10; consumo agentes se calcula sobre 5. | Configurado; validar supuestos. |
| Cuota incluida SaaS | Standard y Essentials aportan cuota base de ingesta. | Standard licenciado × 325 GB + Essentials licenciado × 50 GB. | `INSTANA_RULES.saasQuotaGb` | 10 Standard = 3,250 GB. | Configurado; vigencia pendiente. |
| Cuota usada por agentes | Estimación de consumo de agentes tradicionales. | Standard declarado × 325 × % + Essentials declarado × 50 × %. | `calculateIngest` | 5 Standard al 80% = 1,300 GB. | Configurado; porcentaje ajustable. |
| Data Ingest | Add-on SaaS para exceso de ingesta. | unidades = ceil(exceso / 100 GB). | `INSTANA_RULES.dataIngest` | 1,050 GB exceso = 11 unidades. | Configurado; validar CPQ. |
| Redondeos | Data Ingest, Logs y Synthetic redondean hacia arriba según bloque. | ceil(valor / bloque). | `calculations.ts` | 2.2 TB logs = 3 unidades. | Configurado. |
| Escenario 50 MVS | Alternativa comparativa para incrementar licencias base y cuota. | Compara escenario actual vs 50 MVS Standard; solo aplica con confirmación. | `calculateIngest`, `IngestCalculator.tsx` | No cambia cotización hasta confirmar. | Configurado; validar comercialmente. |
| Logs | Retención 7 días incluida; 30/60/90 días con Part Number. | unidades = ceil(TB considerados) si retención extendida. | `calculateLogs`, `INSTANA_RULES.logs` | 2.2 TB a 30 días = 3 unidades. | Configurado; validar CPQ. |
| Synthetic | Calcula RU mensuales por tipo de prueba. | ejecuciones = tests × ubicaciones × (43,200 / frecuencia); RU = ejecuciones × tasa. | `calculateSynthetic`, `INSTANA_RULES.synthetic` | RU menor a 30,000 aplica 30 unidades. | Configurado; validar CPQ. |
| Self-Hosted | Solo cotiza MVS; add-ons SaaS no aplican. | Líneas Standard/Essentials Self-Hosted según MVS licenciados. | `buildQuoteLines`, `QuoteSummary.tsx` | Data Ingest, Logs y D0I5PZX no aparecen. | Configurado; unidad Self-Hosted pendiente. |
| Líneas cero | No se muestran componentes con cantidad 0. | Solo se agregan líneas si quantity > 0. | `buildQuoteLines` | Logs 7 días no genera línea. | Configurado. |
| Part Numbers | Part Numbers centralizados. | Se seleccionan según modalidad/capacidad. | `INSTANA_RULES.partNumbers`, `catalog` | Standard SaaS usa `D0N79ZX`. | Configurado; validar CPQ y vigencia. |
| Unidad comercial | Unidad por catálogo. | `commercialUnit` o `commercialUnits`. | `instanaRules.ts` | Self-Hosted: Unidad pendiente de validación comercial. | Pendiente para Self-Hosted. |

## Part Numbers configurados

- Standard SaaS: `D0N79ZX`.
- Essentials SaaS: `D0N77ZX`.
- Standard Self-Hosted: `D29RTLL`.
- Essentials Self-Hosted: `D29RRLL`.
- Data Ingest adicional SaaS: `D0N7BZX`.
- Logs 30 días: `D0RL4ZX`.
- Logs 60 días: `D0RL8ZX`.
- Logs 90 días: `D0RLCZX`.
- Synthetic Managed PoP: `D0I5PZX`.

## Datos pendientes

- Fecha de vigencia del catálogo: pendiente de validación comercial.
- Fuente comercial definitiva: pendiente de confirmación.
- Unidad comercial Self-Hosted: pendiente de validación comercial.
