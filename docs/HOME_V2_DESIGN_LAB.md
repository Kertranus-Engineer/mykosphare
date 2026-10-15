# HOME V2 · Experiencia unificada

Una sola experiencia móvil (Inicio · Cultivo · Ambiente · Historial · Más) montada en `/design-lab/home-v2`, aislada de HOME actual (`/home`) y del dashboard avanzado. **Solo lectura**: no controla actuadores, no escribe en Supabase, no llama a servicios externos ni a IA.

Capturas de referencia: [`docs/home-v2-screenshots/`](home-v2-screenshots/).

## Rutas

| Ruta | Contenido |
| --- | --- |
| `/design-lab/home-v2` | Inicio |
| `/design-lab/home-v2/cultivo` | Cultivo |
| `/design-lab/home-v2/ambiente` | Ambiente |
| `/design-lab/home-v2/historial` | Historial (Actividad · Gráficos · Fotos) |
| `/design-lab/home-v2/mas` | Más: tema, **Modo demostración**, otras vistas |

La app funciona **sin parámetros de URL**. Compatibilidad interna: `?chamber=ID` muestra un cultivo real (requiere sesión y `/api/v2/grow`); `?mode=simulation&scenario=x` equivale a encender el modo demostración. Ninguno viaja en la navegación normal.

## Auditoría inicial (qué existe de verdad)

| Capacidad | Estado real |
| --- | --- |
| Telemetría ESP32 | Real vía `useMobileTelemetry` (`/api/data`). **Cae a un simulador silencioso** cuando no hay dispositivo. |
| Cultivo real | Solo lectura: `GET /api/v2/grow/[chamberId]` (sesión + cámara). No hay crear/editar ni listar cámaras. |
| Cultivo simulado | `lib/grow/demo` (`buildDemoGrowComposition`), solo con petición explícita. |
| Fotografías | Lectura del bucket público `snapshots` (`useLiveSnapshots`); no están vinculadas a un cultivo. `VisualUpload` **no sube nada** (solo memoria). |
| Bitácora | Solo hitos del registro del cultivo (inicio, etapa confirmada) + eventos simulados. No hay escritura. |
| Registrar fotografía / crear cultivo / añadir observación | **No existen** (eran avisos en V2 anteriores). |
| Historial persistente | **No existe**: actividad y gráficas son de la sesión. |
| Esquema Supabase | Ya tiene `grow_cultivation_runs.name`, `grow_run_events`, `grow_captures`, `grow_stage_events`, `grow_readings`; el código solo lee cámara, corrida, perfil y última lectura. |
| Duplicados | HOME actual (`features/mobile`) y V2 comparten datos; V2 reutiliza `useMobileData`, `useLiveSnapshots`, `lib/grow`. |

## Arquitectura de datos unificada

```
useMobileData (telemetría + actividad)   useLiveSnapshots   useGrowView(request)
            └──────────────┬───────────────────┴──────────────────┘
                 HomeV2Provider  ── demo-mode (preferencia) ──┐
                           │                                  │
                  resolve.ts  → REAL | SIMULATED | UNAVAILABLE | LOADING | ERROR
                           │
                  adapters.ts → view models (EnvironmentModel, DeviceModel, CultivationModel, PhotosModel, HistoryEntryModel)
                           │
                  componentes (solo presentan)
```

- `data/resolve.ts`: clasifica cada dominio en uno de cinco estados. Fuera del modo demostración **nunca** resuelve `SIMULATED` (el simulador silencioso de telemetría pasa a `UNAVAILABLE`); el provider lo comprueba en desarrollo (`assertNoSimulationOutsideDemo`).
- `data/demo-mode.ts`: el modo demostración es una preferencia (`localStorage["mykosphare-demo-mode"]`, **apagada por defecto**). Solo guarda "quiero ver simulación"; no guarda datos de demostración. Con él activo: cultivo simulado, ilustraciones etiquetadas (nunca fotos reales), eventos simulados. Un banner fijo con "Salir" lo recuerda en todas las pantallas.
- Sin mezclas: en demostración no se muestran capturas reales ni un cultivo real; con telemetría real conectada, las lecturas siguen siendo `REAL`.
- `features/mobile/use-mobile-activity.ts` recibió un campo opcional `simulated` (HOME actual lo ignora) para filtrar alertas y cambios de estado derivados de simulación.

## Qué hace cada pantalla

- **Inicio:** tarjeta del cultivo (nombre, especie, etapa registrada, día, foto si existe; sin cultivo → presentación del primer cultivo con nota honesta y acceso a la demostración), resumen compacto de ambiente (temperatura, humedad, estado), una línea de dispositivo (conexión, última lectura, detalles), espacio de MYKO Insight (vacío, sin IA) y una nota informativa de fotografías (sin botón engañoso).
- **Cultivo:** foto principal (swipe, flechas, teclado), línea temporal y galería, distinción explícita **captura real / ilustración demo**, etapas en carrusel con snap, desvanecido solo del lado con más contenido, indicación "Desliza…", selección de etapa y barra compacta por número de etapas (no porcentaje), bitácora del cultivo. Sin cultivo: estado vacío; sin fotos, cargando, error real y almacenamiento no configurado se distinguen.
- **Ambiente:** lecturas, tendencia interactiva de la sesión (escala mínima conservadora 2 °C / 8 %), **actuadores en solo lectura con protagonismo**, alertas, detalles del dispositivo y lo que no se mide (CO₂, energía).
- **Historial:** actividad de la sesión (alertas y eventos), gráficos y fotos. El seguimiento de un cultivo vive solo en Cultivo. Advierte que no es persistente.
- **Más:** tema, Modo demostración (con escenarios), enlaces a HOME actual, vista avanzada y ajustes avanzados.

## Migración a `/home` (cuando se autorice)

1. `HOME_V2_BASE` en `features/home-v2/data/lab-request.ts` es el único sitio que conoce el prefijo; cambiarlo a `/home`.
2. Mover los 7 archivos finos de `app/design-lab/home-v2/` (`layout`, `template`, 5 `page`) a `app/home/` (HOME actual pasa a `/home-v1` o se retira) y conservar el import de `home-v2.css`.
3. No hay lógica ni componentes que duplicar: todo está en `features/home-v2/`.

## Preparación para datos reales (sin implementarlos)

Contratos ya separados de la presentación (`model.ts`), así que cada fuente futura es un adaptador:

| Futuro | Dónde engancha |
| --- | --- |
| Cultivos reales | `GrowRequest` → `toCultivationModel`. Falta endpoint de listado de cámaras y `name` en `CultivationRun`. |
| Fotos persistentes | Sustituir `toPhotosModel` por lectura de `grow_captures` (ligada a la corrida). |
| Bitácora persistente | `grow_run_events` → `toLog` ya tiene la forma `LogEntryModel`. |
| Telemetría histórica | `grow_readings` → `MetricModel.series/times` (hoy solo sesión). |
| Análisis visual / IA | `PlaceholderCard` ya reserva el espacio; no hay llamadas. |

## Limitaciones conocidas

- Crear cultivos, registrar fotos y escribir observaciones no están disponibles.
- Actividad y gráficas son de sesión; las fotos no se vinculan a un cultivo concreto.
- Test previo `features/grow/__tests__/myko-identity.test.tsx` falla en Windows (CRLF vs `"\n}\n"`); pasa con LF (git/Vercel).
- 39 errores de ESLint anteriores en `lib/` y `features/` ajenos a V2.
- No probado en dispositivo físico ni iOS; `prefers-reduced-motion` verificado aplicando las reglas del bloque `@media` y por código, no con el ajuste del sistema.
