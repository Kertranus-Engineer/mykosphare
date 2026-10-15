# HOME V2 · Laboratorio de diseño (Fase 1)

Ruta experimental, aislada de HOME actual y del dashboard avanzado. **Solo lectura**: no controla actuadores, no escribe en Supabase, no llama a servicios externos ni a IA.

## Cómo abrirlo

```bash
npm run dev
```

| URL | Qué muestra |
| --- | --- |
| `/design-lab` | Índice del laboratorio |
| `/design-lab/home-v2` | Inicio V2 (sin parámetros → estado vacío de cultivo) |
| `/design-lab/home-v2/cultivo` | Cultivo V2 |
| `/design-lab/home-v2/ambiente` | Ambiente V2 |
| `/design-lab/home-v2/historial` | Historial V2 (Actividad · Gráficos · Fotos) |
| `…?mode=simulation&scenario=stable` | Cultivo **simulado** (el demo que ya existía en `lib/grow/demo`) |
| `…&photos=demo` | Ilustraciones de demostración etiquetadas (solo con simulación) |
| `…?chamber=<id>` | Cultivo real vía `/api/v2/grow/<id>` (requiere sesión y Supabase) |

Escenarios disponibles: `stable, dry, humid, cold, hot, critical, partial, stale, offline, no-data`. También se cambian desde ⚙ Configuración dentro del laboratorio. Móvil: viewport 360–430 px.

> En local, el middleware (`proxy.ts`) exige `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Se usó un `.env.local` con valores ficticios (ignorado por git). Con ese Supabase inexistente, las fotos reales muestran el estado de error con "Reintentar".

## Qué reutiliza (no se duplicó lógica)

| Necesidad | Sistema existente |
| --- | --- |
| Telemetría real / simulada / sin datos, conexión, tendencias de sesión | `features/mobile` (`MobileDataProvider`, `useMobileTelemetry`) |
| Actividad y alertas | `useMobileActivity` |
| Fotos reales (solo lectura) | `useMobileCaptures` → bucket `snapshots` |
| Cultivo, etapas, día, simulación explícita, eventos | `lib/grow` + `features/grow/data` (`GrowProvider`) |
| Animación | `framer-motion` (ya instalado) con `LazyMotion` + `domAnimation` |
| Hojas modales | `components/ui/sheet` |

No se reutilizó `VisualUpload`: **no sube nada** (solo guarda en memoria del navegador).

## Arquitectura

```
app/design-lab/                      rutas (layout con noindex, template con transición)
features/home-v2/
  data/model.ts                      view models (presentación)
  data/adapters.ts                   funciones puras: sistemas existentes → view models
  data/lab-request.ts                parseo de URL, escenarios, tema del lab
  data/home-v2-provider.tsx          composición única (telemetría + cultivo + fotos + tema)
  data/demo-frames.ts                ilustraciones de demostración (no son fotos)
  components/{shell,home,cultivo,ambiente,historial,ui,shared}
  screens/{home,cultivo,environment,history}-screen.tsx
  styles/home-v2.css                 tokens de 3 temas + componentes + animaciones
  __tests__/adapters.test.ts         30 tests
```

Datos y presentación están separados: los componentes solo reciben view models.

## Estado de cada parte

**Ambiente V2:** lecturas actuales (mismas reglas de procedencia), tendencia interactiva de la sesión (deslizar o flechas del teclado; temperatura/humedad), alertas activas del motor ambiental compartido, dispositivo con actuadores en solo lectura y lista explícita de lo que *no* se mide (CO₂, energía). No hay controles de actuadores ni perfiles: no existen funciones reales que reutilizar.

**Historial V2:** Actividad (alertas activas, eventos y cambios de estado de la sesión + bitácora del cultivo, filtrable), Gráficos (las dos magnitudes) y Fotos (cuadrícula cronológica con visor). La actividad **no se persiste entre sesiones** y se dice en pantalla; no se presenta como un histórico guardado.

**Funcional (datos reales cuando existen):** encabezado y estado de conexión, métricas de temperatura/humedad con tendencia y sparkline de la sesión, estado ambiental del motor compartido, estado del dispositivo y actuadores reportados (solo lectura), foto del cultivo y línea temporal con las capturas del bucket, notificaciones, cambio de tema, navegación entre Inicio y Cultivo.

**Funcional solo con simulación explícita:** cultivo (nombre/especie/etapa/día/bitácora) vía `?mode=simulation`; todo se etiqueta "Simulado".

**Solo visual (honesto en pantalla):** "Registrar fotografía", "Comenzar un cultivo", "Añadir observación" (muestran un aviso: aún no conectado); MYKO Insight y Análisis visual (estado vacío "Próximamente").

**Depende de datos futuros:** nombre propio del cultivo (hoy se muestra la especie), vincular capturas a un cultivo concreto, eventos reales de bitácora (hoy solo hitos del registro del cultivo), análisis por IA, CO₂/energía (no hay sensor: no se muestran).

## Decisiones y límites

- **Sin porcentajes de progreso.** Se muestra día, etapa registrada y tiempo. La sugerencia por días transcurridos se marca "Estimación" y nunca reemplaza la etapa registrada (y solo se sugiere una etapa posterior).
- **Etapas adaptables:** salen del perfil de la especie (etapas con objetivos definidos); si el perfil define menos de dos, se usa el ciclo completo. La etapa registrada siempre está incluida. El perfil de muestra define 6 etapas (la imagen de referencia mostraba 4).
- **Datos simulados nunca parecen sanos-reales:** el estado ambiental simulado usa tono propio (violeta), no verde.
- **Un valor ausente es `null`**, nunca 0. Los actuadores pasan a "Sin dato" si la lectura no es fresca.
- **Sin mascota:** el copy de `grow` usa voz en primera persona de MYKO; aquí se escribió copy neutro.
- **Temas:** Negro, Verde y Blanco con tokens propios (`[data-hv2-theme]`). Blanco está diseñado (papel, sombras, tinta esmeralda), no es una inversión. La preferencia vive en `localStorage["mykosphare-lab-theme"]` (por defecto Negro) y **no cambia el tema global** de la app. Un script inline la aplica antes del primer pintado.
- **Navegación:** Inicio, Cultivo, Ambiente e Historial viven en el laboratorio. Solo *Más* abre la pantalla actual de `/home/more` (V2 pendiente); se indica en su `aria-label`.
- **Gráficas honestas:** no se dibuja una tendencia con menos de 3 lecturas, y la escala nunca se acerca más de 2 °C / 8 % para que el ruido del sensor no parezca una oscilación.
- **Movimiento:** entradas y pulsaciones en CSS (120–300 ms); Motion solo para swipe/transición de fotos, números animados y avisos. `prefers-reduced-motion` desactiva animaciones CSS y `MotionConfig reducedMotion="user"` las de Motion. Únicas animaciones continuas: el skeleton de carga y 3 pulsos del punto "En vivo".

## Pendiente / conocido

- Reduced-motion verificado por revisión de código, no emulando la preferencia del SO.
- Test visual solo en el navegador integrado (Chromium); no probado en iOS Safari ni dispositivo físico.
- El indicador de desarrollo de Next ("N") se superpone a la barra inferior solo en `next dev`.
- Historial y Ambiente solo muestran lo recibido en la sesión actual: aún no hay histórico persistente de telemetría que reutilizar.
- Un test previo falla en el repo (`features/grow/__tests__/myko-identity.test.tsx`, "infinite animation inside reduced-motion"); falla igual sin estos cambios.
- ESLint global: 39 errores previos en el repo (sin cambios); los archivos nuevos tienen 0 problemas.
