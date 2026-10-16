# HOME V2 · Experiencia premium unificada

Una sola experiencia móvil (Inicio · Cultivo · Ambiente · Historial · Más) montada en `/design-lab/home-v2`, aislada de HOME actual (`/home`) y del dashboard avanzado. **Solo lectura**: no controla actuadores, no escribe en Supabase, no llama a servicios externos ni a IA.

Capturas: [`docs/home-v2-screenshots/`](home-v2-screenshots/) (nuevas) y [`before/`](home-v2-screenshots/before/) (la versión anterior, para comparar).

## Rutas

| Ruta | Contenido |
| --- | --- |
| `/design-lab/home-v2` | Inicio |
| `/design-lab/home-v2/cultivo` | Cultivo |
| `/design-lab/home-v2/ambiente` | Ambiente |
| `/design-lab/home-v2/historial` | Historial (Actividad · Gráficos · Fotos) |
| `/design-lab/home-v2/mas` | Más: tema, **Modo demostración**, otras vistas |

La app funciona **sin parámetros de URL**. Compatibilidad interna: `?chamber=ID` muestra un cultivo real (requiere sesión, `/api/v2/grow` y el modo demostración apagado); `?mode=simulation&scenario=x` equivale a encender la demostración con ese escenario. Ninguno viaja en la navegación normal.

## Modo demostración (activado por defecto, solo durante el desarrollo)

- **Sin preferencia guardada** HOME V2 abre en modo demostración (`features/home-v2/config.ts`).
- **Se guarda la elección** (`localStorage["mykosphare-demo-mode"]`): si la persona lo apaga en Más, esa decisión se respeta en visitas futuras; si lo enciende, también. Solo se guarda "quiero ver simulación" y el escenario; nunca datos simulados.
- **Indicador:** una línea fija bajo el encabezado ("DEMOSTRACIÓN · datos simulados", con "Salir") en todas las pantallas, además del chip "Simulación" del encabezado.
- **Apagar el inicio automático antes de lanzar** (cualquiera de las dos):
  - variable de entorno `NEXT_PUBLIC_HOME_V2_DEMO_DEFAULT=off` (sin tocar código; en Vercel, Settings → Environment Variables), o
  - `DEMO_ON_BY_DEFAULT = false` en `features/home-v2/config.ts`.
  Con el valor por defecto en "off", quien nunca eligió ve el estado real (sin dispositivo: "Desconectado", sin mediciones); quien ya eligió conserva su elección.
- No afecta a `/home` ni al resto de rutas: la preferencia y el motor viven solo en `features/home-v2`.
- Encendida la demostración **no se montan** los hooks de telemetría, actividad ni capturas (`/api/data`, Supabase): no hay sondeo ni simulador silencioso. Verificado: 0 peticiones en 6 s de reposo.

## Demo Data Engine (`features/home-v2/data/demo/`)

Un único "mundo" determinista alimenta **todas** las pantallas; ningún componente inventa datos.

| Archivo | Papel |
| --- | --- |
| `crop.ts` | El cultivo de ejemplo y su historia: *Pleurotus ostreatus* (hongo ostra), cultivo activo, **etapa Colonización, día 11**; inoculación día 1, etapa confirmada día 3, fotos los días 1·3·5·7·9·11 y observaciones fechadas. |
| `world.ts` | `buildDemoWorld(escenario, minuto)` → ambiente, dispositivo y actuadores, cultivo y bitácora, fotos, historial (alertas + eventos + registro del cultivo) e Insight de ejemplo. |
| `frames.ts` + `assets.ts` | Generador procedural de las ilustraciones y rutas de los WebP estáticos ya renderizados en `public/demo/oyster/` (≈20–30 KB cada una, miniaturas ≈5 KB). |
| `clock.ts` | Reloj de un minuto: nulo en servidor (nada dependiente de la hora se renderiza ahí), **se pausa con la pestaña oculta** y no consume nada sin suscriptores. |

Garantías (cubiertas por `__tests__/demo-engine.test.ts`):

- **Puro y reproducible:** sin `Math.random` ni `Date.now` (los tests los prohíben); mismo (escenario, minuto) → mismo mundo.
- **Suave:** valores = baselines + senoidales lentas + deriva del escenario (rampa de una hora). Entre minutos consecutivos ningún valor salta (≤ 0,4 °C / ≤ 1,6 %), y un cultivo estable no sale del rango de ejemplo en todo el día.
- **Coherente:** los eventos ("Humedad baja", "Humedad en nivel crítico") se estampan donde la **curva** cruza el límite del perfil; alertas, actuadores, estado general e Insight salen de los mismos valores. Cada fotografía tiene su entrada de bitácora en la misma fecha y día; el día de cada registro es el día de calendario real del cultivo.
- **Escenarios:** Estable, Humedad baja/alta, Temperatura baja/alta, Crítico, Lectura parcial, Datos atrasados, Sin conexión, Sin datos. Cambiar de escenario actualiza juntos sensores, estado, alertas, eventos, actuadores e Insight. La historia de cada escenario se reinicia cada 2 h para poder inspeccionarlo en cualquier momento.
- **Honesto:** todo es `simulated`; el estado estable nunca usa el tono "saludable real"; el Insight dice "Insight de demostración … no es un diagnóstico"; sin CO₂, energía ni porcentajes de crecimiento; el cultivo sigue en colonización (nunca se muestran cuerpos fructíferos). La estimación por días ("podría estar entrando en consolidación") sigue siendo solo una estimación.
- Nada de lo simulado se guarda ni se mezcla con datos reales: el proveedor **sustituye** la fuente, no la fusiona.

### Fotografías

No hay fotografías reales de hongos ostra con licencia clara en el repositorio (las imágenes de `public/test-growth/` son de otro tema y no se usan). Por eso se mantienen **ilustraciones propias** (sin licencia de terceros): un mismo bloque de sustrato fotografiado seis días distintos, con los mismos puntos de inoculación creciendo de día en día (no seis variaciones de una imagen). Siempre llevan la etiqueta "Ilustración demo" y nunca se presentan como documentación real.
Para sustituirlas por fotografías reales con licencia: colocar los archivos con los mismos nombres (`day-01.webp` … `day-11.webp`, `day-NN-sm.webp`, `hero-day-11.webp`) en `public/demo/oyster/` o cambiar `assets.ts`; el test `ships every picture as a small static file` vigila que existan y pesen poco.
Cómo se produjeron: `frames.ts` genera SVG y se exportaron con un script de desarrollo de un solo uso (canvas → WebP). No se ejecuta en la app.

## Arquitectura de datos

```
Más → preferencia (config.ts por defecto)           useMobileData · useLiveSnapshots · useGrowView
              │                                                       │ (solo con demostración APAGADA)
        HomeV2Provider ── demostración ON ──▶ DemoSource (demo engine)│
              └────────── demostración OFF ─▶ LiveSource ◀───────────┘
                                  │
                   resolve.ts → REAL | SIMULATED | UNAVAILABLE | LOADING | ERROR
                                  │
              view models (EnvironmentModel, DeviceModel, CultivationModel, PhotosModel,
                           HistoryEntryModel, InsightModel) ──▶ componentes (solo presentan)
```

- `data/resolve.ts`: clasifica cada dominio en cinco estados. Fuera de la demostración **nunca** resuelve `SIMULATED` (el simulador silencioso de telemetría pasa a `UNAVAILABLE`); el proveedor lo comprueba en desarrollo.
- Cambiar de fuente (activar/desactivar la demostración) remonta las pantallas; el aviso (toast) y las animaciones viven por encima del proveedor para sobrevivir.
- `features/mobile/use-mobile-activity.ts` recibió antes un campo opcional `simulated` (HOME actual lo ignora); es el único cambio a código de V1.

## Qué hace cada pantalla

- **Inicio:** hero con la fotografía como protagonista (entrada con zoom suave, parallax ligero solo con `animation-timeline` y sin movimiento reducido, insignia **Día N**), resumen ambiental (temperatura y humedad con mini gráfica, estado y tendencia), **Estado general** (Estable · Optimización · Prealerta · Alerta · Sin datos, con la línea del dispositivo), **MYKO Insight** (símbolo propio; ejemplos coherentes con los sensores en demostración, vacío honesto fuera de ella) y **Registrar fotografía** (estado "Próximamente": no sube nada, solo explica).
- **Cultivo:** fotografía principal (swipe, flechas, teclado) con el **día** y lo que muestra, línea temporal cronológica de miniaturas con fecha y punto de selección, etapas en carrusel con estado escrito (Completada / Actual / Pendiente / Estimación), bitácora con tipo, día, fecha, descripción y procedencia (con miniatura en las fotos).
- **Ambiente:** lecturas, estado, tendencia interactiva con **rango de ejemplo sombreado**, etiquetas de límites y burbuja táctil, alertas, **tarjeta compacta del ESP32** (conexión, última lectura, sensores que reportan, actuadores reportados) y lo que no se mide (CO₂, energía). Actuadores en **solo lectura** también en la demostración: no hay controles simulados.
- **Historial:** línea temporal por fecha ("Hoy · Día 11"), iconos por tipo, miniaturas en las fotos, filtros Todo/Alertas/Ambiente/Cultivo, gráficos y una galería con la última foto destacada, rejilla y estructura vacía "Comparar fotografías · Próximamente" (no compara nada).
- **Más:** tema, Modo demostración con escenarios, enlaces a HOME actual, vista avanzada y ajustes avanzados.

## Rendimiento y movimiento

- Imágenes estáticas WebP con miniaturas dedicadas, `loading="lazy"`/`decoding="async"` y `fetchPriority="high"` solo en el hero. No se usa `next/image`: las capturas reales vienen de Supabase (sin loader configurado) y las de demostración ya son archivos pequeños.
- Una sola suscripción por minuto en la demostración y ninguna en segundo plano; sin timers adicionales ni fugas (el reloj retira el listener de visibilidad al desmontar).
- Animaciones de una sola vez (entrada, selección de etapa, cambio de foto); pulso del estado solo 2–3 repeticiones; nada se mueve en bucle. `prefers-reduced-motion` desactiva entradas, parallax, pulsos y transiciones (verificado aplicando el bloque `@media` y contando animaciones activas: queda solo el `theme-switch-fade` global de la app).
- Solo se animan `transform` y `opacity`; los números tienen reserva de espacio (sin saltos de layout).

## Migración a `/home` (cuando se autorice)

1. `HOME_V2_BASE` en `features/home-v2/data/lab-request.ts` es el único sitio que conoce el prefijo; cambiarlo a `/home`.
2. Mover los 7 archivos finos de `app/design-lab/home-v2/` (`layout`, `template`, 5 `page`) a `app/home/` (HOME actual pasa a `/home-v1` o se retira) y conservar el import de `home-v2.css`.
3. Antes del lanzamiento a usuarios reales: `NEXT_PUBLIC_HOME_V2_DEMO_DEFAULT=off`.

## Preparación para datos reales (sin implementarlos)

| Futuro | Dónde engancha |
| --- | --- |
| Cultivos reales | `GrowRequest` → `toCultivationModel`. Falta endpoint de listado de cámaras y `name` en `CultivationRun`. |
| Fotos persistentes | Sustituir `toPhotosModel` por lectura de `grow_captures` (ligada a la corrida). |
| Bitácora persistente | `grow_run_events` → `toLog` ya tiene la forma `LogEntryModel` (con `kind`, `detail`, `day`). |
| Telemetría histórica | `grow_readings` → `MetricModel.series/times` (+ `target` desde el perfil de la especie). |
| Análisis visual / IA | `InsightModel` ya distingue `none` de `demo`; un tercer estado `analysis` podría añadirse sin tocar las pantallas. |

## Limitaciones conocidas

- **No se incorporaron fotografías reales** (no hay imágenes con licencia clara disponibles en el proyecto y no se descargó ninguna sin autorización); se usan ilustraciones propias etiquetadas.
- No se vio la imagen conceptual adjunta ni el video: el rediseño sigue la descripción textual (paleta, jerarquía, tarjetas, galería, animaciones). Conviene una pasada de comparación visual con el concepto.
- Crear cultivos, registrar fotos y escribir observaciones siguen sin existir; no hay controles de actuadores (ni simulados).
- La actividad real y las gráficas reales son de sesión (no persisten); la serie de demostración (3 h) se rotula como tal.
- Al apagar la demostración tras un primer render con el valor por defecto, quien eligió "apagado" puede ver un instante el banner de demostración (el servidor no conoce la preferencia); no se muestra ningún dato simulado en ese instante (el motor espera su primer tick en el cliente).
- Las tareas en segundo plano de HOME actual y del dashboard (telemetría real, simulador de `lib/useTelemetry`) siguen siendo las de V1; solo se evita montarlas durante la demostración.
- `features/grow/__tests__/myko-identity.test.tsx` falla en Windows (CRLF vs `"\n}\n"`); pasa con LF (git/Vercel). 39 errores de ESLint preexistentes en `lib/` y `features/` ajenos a V2.
- `public/test-growth/*.jpg` son imágenes de otro origen (ajenas al proyecto) y no tienen que usarse ni publicarse; conviene revisarlas fuera de esta tarea.
- No probado en dispositivo físico ni en iOS.
