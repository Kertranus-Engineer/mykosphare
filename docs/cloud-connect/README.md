# ESP32 Cloud Connect V1 — preparación local

Estado: **sin despliegue, sin migraciones ejecutadas, sin alta de dispositivo y sin firmware cargado**. La foto de Arduino IDE muestra lecturas DHT22 por USB/COM4. Eso confirma el sensor y el enlace serie en ese momento, no una lectura cloud. Esta rama prepara un solo ESP32.

El ensayo PostgreSQL efímero, el alcance del preview y los pasos físicos actualizados están en [ENSAYO-Y-PRIMERA-PRUEBA.md](ENSAYO-Y-PRIMERA-PRUEBA.md). Las migraciones se aplicaron **solo** en esa base de memoria; la frase «sin migraciones ejecutadas» se refiere a Supabase de producción.

## Punto de partida y límites

- Worktree: `C:\Users\antos\mykosphare-cloud-v1`, rama `codex/esp32-cloud-v1`. Parte del commit publicado `7366d32` e incorpora una copia de los 45 cambios locales heredados de `C:\Users\antos\mykosphare` (rama `mykosphare-v2`, HEAD `d8f95bd`). El manifiesto `inherited-work.json` permite comprobarlos. El directorio original y la versión pública no se modifican.
- Firmware confirmado por la captura: `C:\Users\antos\Desktop\mykosphare_v7\mykosphare_v7.ino`, SHA-256 `ce92c448ac857ac0438ccfecc217417035786c9e7a1bd22b3d88619afe11c571`. Se presenta como `HARDWARE TEST V8`, aunque el archivo se llama v7. DHT22 GPIO27, ventiladores 19/18, LED16, humidificador17, relé calefactor32, LCD I²C 21/22. El monitor mostraba aproximadamente 20,7 °C y 80,3 % H, con un error DHT previo. **Este firmware prueba hardware; no contiene un controlador ambiental autónomo.** La conexión cloud conserva sus pruebas locales, pero no puede garantizar una automatización que aún no existe.
- Supabase `ecvdcsgsiorisszotyew` estaba `ACTIVE_HEALTHY` en la lectura de auditoría. El esquema real tenía solo `alerts`, `devices`, `logs`, `operator_profiles`, `settings`, `telemetry`; todas esas tablas tenían RLS activada. `grow_chambers`, `grow_devices`, `grow_readings`, `grow_device_credentials` y demás tablas Grow no estaban aplicadas. `list_migrations` devolvió una lista vacía. Hay que revisar y aplicar, con aprobación futura, las migraciones locales `202609300001_grow_data_platform.sql` y `202610010001_grow_cultivation_loop.sql` antes de intentar el piloto.
- La cuenta `kertranus@gmail.com` **sí existe** en `auth.users`, tiene correo confirmado y una identidad de tipo `email`. Su UUID se comprobó en modo lectura y se conserva fuera de este documento: el procedimiento de alta lo resuelve por correo confirmado en el momento de ejecución. No hay relación Grow todavía porque ninguna tabla Grow existe en la base activa. No se creó ni modificó ningún usuario.
- El acceso a HOME usa el formulario `/auth/login` y `signInWithPassword` de Supabase Auth. La sesión se refresca en `lib/supabase/middleware.ts`; `/api/v2/home` exige `getUser()` y consulta cámara/lecturas del dueño. El destino `next` se valida ahora como ruta interna en el formulario, acción y callback. HOME visual publicado sigue intacto.

## Arquitectura y reutilización

```
ESP32 (DHT22 + control local de pruebas)
  └─ Wi-Fi saliente → HTTPS POST /api/v2/device/readings
                         └─ autenticación por dispositivo → grow_readings (real)
                                                            └─ GET /api/v2/home
                                                                  (sesión del usuario + RLS)
                                                               → HOME V2 /home y /home/conectar
```

No hay puertos entrantes en el router ni un servidor local permanente. HOME consulta cada 30 segundos; Realtime no participa en V1. La red del firmware se ejecuta en una tarea separada: el bucle DHT/LCD/actuadores sigue iterando si falta Wi‑Fi, NTP o HTTPS. El envío es solo de temperatura/humedad; no hay comandos remotos.

Se reutilizan `lib/grow/application/ingestion.ts`, autenticación por credencial individual y `grow_readings`, así como la UI HOME V2. La nueva consulta HOME selecciona la cámara por dueño, el controlador de esa cámara y sus 120 lecturas reales más recientes, incluso si no hay cultivo activo. La sesión Supabase, la política RLS y el filtro de dueño se aplican a la lectura; ninguna clave administrativa llega al navegador. La ingestión usa la credencial individual `x-device-id` + `x-device-key`, almacena su hash SHA-256 solo en `grow_device_credentials`, y resuelve la cámara desde el registro del dispositivo, nunca desde el cuerpo enviado.

La demostración es una elección explícita e independiente. La vista real no monta el hook antiguo `/api/data` con simulador oculto. Si el backend responde con datos autenticados pero el ESP32 deja de enviar, las lecturas caducadas permanecen marcadas como antiguas (90 s sin señal = «Sin señal reciente», 5 min = «Desconectado»). Si falla la consulta al backend, se vacía la caché visible porque ya no se puede comprobar qué usuario es el dueño. Las gráficas reales muestran lecturas persistidas. La fuente de fotos heredada no está ligada al dueño y se oculta de la vista real hasta corregir ese alcance. El dashboard avanzado no es requisito de HOME.

## Seguridad y comportamiento de fallos

- Ingestión: JSON con límite real de 2048 bytes, temperatura numérica entre -50 y 100 °C, humedad entre 0 y 100 %, al menos una métrica, rechazo de campos inesperados, identidad del cuerpo concordante, hora UTC de muestreo obligatoria, hasta 120 s de antigüedad y 30 s de adelanto. El origen se fija en `real`; la restricción única `(device_id, observed_at, origin)` permite responder a un reintento como duplicado.
- El firmware invalida la muestra tras un error DHT y descarta la muestra fallida sin convertirla en una lectura nueva. Tras pérdida de red intenta con otra lectura válida reciente; no envía NaN. Requiere hora NTP antes de usar HTTPS y certificado raíz verificado. Errores de red/servidor reintentan después de 60 s; credencial rechazada (401/403) detiene envíos hasta reinicio. El modo de primer ensayo fija `MYKO_SENSOR_ONLY=true`: salidas apagadas, comandos de actuadores, secuencias, PWM y LCD omitidos. El host HTTPS de ejemplo es un marcador de preview, no producción. El archivo local de configuración está ignorado por Git y todavía no existe. Nunca colocar `service_role`, contraseña Wi‑Fi ni secretos administrativos en el ejemplo, el navegador o un commit.
- Tras autenticar al dispositivo, un filtro local y un contador atómico de PostgreSQL limitan a 6 peticiones/minuto por dispositivo entre instancias de Vercel. Las claves incorrectas no consumen el cupo de MYKO-001. Se bloquean las peticiones si falla la consulta del límite. Antes de ampliar el piloto, valorar una regla WAF por IP para reducir la carga de intentos anónimos; no hay ninguna regla aplicada ni cargos autorizados. Las rutas legadas `/api/data`, `/api/raw`, `/api/config`, `/api/command`, `/api/demo`, `/api/ingest/*`, `/api/debug/*`, `/api/network-info` y `/api/protocol/sources` se cierran con 410 **solo en el preview aislado**. El dashboard publicado todavía depende de ellas y no se altera en esta fase; HOME real usa Grow V2.
- La segunda migración pendiente añade `grow_record_device_reading`: deriva cámara y cultivo activo del dispositivo, valida de nuevo los valores, escribe lectura real y actualiza el estado en una transacción de base de datos; los reintentos no duplican filas. El SQL fija `search_path`, reduce la política de cámaras a lectura del dueño y restringe las funciones/tabla de credenciales a `service_role`. Se verificó en PostgreSQL efímero y previamente en Supabase local con Auth y PostgREST; el ajuste posterior del bucket se volvió a ensayar en PostgreSQL efímero. La autenticación v2 depende de una credencial de alta entropía, rotación y revocación; el ESP32 lleva solo su propia clave de dispositivo.
- El esquema Grow aún no existe en la base activa. El SQL local da lectura de `grow_readings` solo al dueño vía RLS; la tabla de hashes no tiene política de lectura para usuarios. Las políticas antiguas de las otras seis tablas conservan permisos amplios y requieren auditoría antes de exponer otras rutas.
- El asesor de seguridad Supabase detectó `public.handle_updated_at` con `search_path` mutable; la segunda migración prepara su corrección local. También indicó que la protección contra contraseñas filtradas está desactivada en Auth: habilitarla requiere una acción de configuración posterior y aprobación. No se cambiaron ajustes de Auth.

## Archivos principales

- Firmware preparado: `firmware/esp32-cloud-v1/esp32-cloud-v1.ino`, `CloudTransport.cpp`, `CloudConfig.example.h`.
- API de ingestión: `app/api/v2/device/readings/route.ts`, `lib/grow/application/reading-handler.ts`, `ingestion.ts`, `validation.ts`, `device-auth.ts`.
- Consulta privada HOME: `app/api/v2/home/route.ts`, `lib/grow/application/home-read.ts`, `home-repository.ts`.
- UI y datos: `features/home-v2/data/cloud-home.ts`, `use-cloud-home.ts`, `home-v2-provider.tsx`, `features/home-v2/screens/connect-screen.tsx`, `app/home/conectar/page.tsx`.
- Cierre de puente antiguo: `proxy.ts`.
- Esquema pendiente: `supabase/migrations/202609300001_grow_data_platform.sql`, `202610010001_grow_cultivation_loop.sql`.
- Alta revisable, **no ejecutada**: `docs/cloud-connect/provision-myko-001.sql.template`. Resuelve la cuenta confirmada por correo, crea la cámara `MYKOSPHARE Prototype 01` y el controlador `MYKO-001`, y exige un hash/pista de clave nuevos. No contiene UUID ficticio ni secreto en claro; falla si el identificador ya existe.
- Ensayo repetible: `scripts/verify-grow-migrations.mjs` y `npm run test:grow-db`. Preview limitado: `lib/cloud-connect/preview-scope.ts` y `CLOUD_CONNECT_PREVIEW_ONLY=1`.

## Verificación local

- `arduino-cli compile --fqbn esp32:esp32:esp32`: correcto para la copia preparada (391 071 bytes de programa, 30 000 bytes de RAM global). La librería LCD instalada avisa que declara compatibilidad AVR; el sketch compiló para ESP32, pero la pantalla solo podrá verificarse en la placa.
- TypeScript y `next build`: correctos con URL Supabase ficticia apuntando al loopback y claves ficticias solo en variables del proceso. El build incluye `/api/v2/device/readings`, `/api/v2/home` y `/home/conectar`.
- `npm test`: 30 archivos y 312 pruebas correctas con Next.js 16.4.2, incluidas autenticación fallida, validación, duplicados, bloqueo real del Proxy de preview, límites entre instancias simuladas, permisos y caída de red. `npm run test:grow-db` pasa con PostgreSQL efímero tras eliminar el bucket global. TypeScript, lint dirigido y build con alcance de preview habían pasado; TypeScript se repitió con el cambio de seguridad. `npm audit --omit=dev` devolvió 0 avisos; la auditoría completa conservaba ocho avisos altos de herramientas de desarrollo. `npm run lint` de todo el repositorio falló anteriormente por 39 errores y 142 advertencias en código legado fuera del piloto; deberá limpiarse si se exige lint global como barrera de CI.
- La revisión automática bloqueó iniciar un servidor HTTP local («blocked by policy», sin causa más concreta). Por tanto, no hay una prueba navegador → servidor local; tampoco hay una lectura ESP32 → Supabase real. Las pruebas aisladas de API/UI, el build y la compilación del firmware son la evidencia disponible.

## Orden de primera prueba real

Usar el procedimiento actualizado en [ENSAYO-Y-PRIMERA-PRUEBA.md](ENSAYO-Y-PRIMERA-PRUEBA.md). La primera conexión se ensayará en un entorno aislado y con actuadores físicamente desconectados. El alta de MYKO-001 bajo la cuenta confirmada de producción es una fase posterior y requiere autorización separada.

## Información pendiente del propietario

La cuenta dueña provisional y el identificador `MYKO-001` ya están definidos. Faltan la confirmación de que se puede iniciar sesión con esa cuenta, la lógica ambiental realmente cargada si difiere del sketch mostrado, y autorizaciones específicas para migraciones, alta de cámara/dispositivo y clave, configuración WAF/Auth, despliegue y carga física. La contraseña Wi‑Fi ya fue comunicada en la conversación; no se reproduce aquí ni se guarda en el proyecto.
