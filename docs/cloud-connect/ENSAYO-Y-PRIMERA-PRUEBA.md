# MYKOSPHARE Cloud Connect V1 — ensayo aislado y primera prueba

Estado: **solo cambios locales**. No se creó proyecto de ensayo remoto, no se aplicó ninguna migración a Supabase, no se desplegó Vercel, no se emitió una clave para MYKO-001 y no se cargó firmware.

## Validación de migraciones en PostgreSQL efímero

Ejecutar desde `C:\Users\antos\mykosphare-cloud-v1`:

```powershell
npm ci
npm run test:grow-db
```

El script `scripts/verify-grow-migrations.mjs` crea PostgreSQL 18.6 embebido en memoria mediante PGlite, instala **solo en esa base** un esquema `auth` y roles mínimos sintéticos, crea las seis tablas legadas por nombre, y aplica en orden el contenido exacto de ambas migraciones pendientes. Nunca abre una conexión al proyecto de producción. Después ejecuta la plantilla de alta con un correo `test.invalid` y valores de credencial deliberadamente sintéticos; el correo real y los marcadores del archivo en disco no cambian.

Resultado comprobado:

| Área | Comprobación | Resultado |
| --- | --- | --- |
| Esquema | Tablas Grow, claves externas, coexistencia con `alerts`, `devices`, `logs`, `operator_profiles`, `settings` y `telemetry` | Pasa |
| Alta | Cámara `MYKOSPHARE Prototype 01`, `MYKO-001`, dueño confirmado sintético, capacidades temperatura/humedad; segundo alta rechazada | Pasa |
| RLS | Todas las tablas Grow tienen RLS; A solo ve su cámara/dispositivo/lectura y B no ve la lectura de A | Pasa |
| Credenciales | `authenticated` no puede leer hashes ni ejecutar funciones de ingestión; `service_role` sí puede ejecutar la RPC | Pasa |
| Integridad | Lectura con dispositivo y cámara discordantes falla por FK | Pasa |
| Frecuencia | Un mismo bucket compartido acepta seis intentos/minuto y rechaza el séptimo | Pasa secuencialmente |
| Telemetría | Lectura `real`, actualización de estado, reintento idempotente, validación de rangos, asociación a cultivo activo | Pasa |
| Atomicidad | Error forzado al actualizar estado revierte también la lectura | Pasa |

Los tests HTTP existentes validan además cabeceras de dispositivo, clave incorrecta/revocada, cuerpo de hasta 2048 bytes, rechazo de campos falsificados, tiempo de muestreo, respuestas 401/403/429/503 y límite entre dos instancias simuladas del handler. El test embebido **no** sustituye Supabase local: PGlite tiene una conexión y PostgreSQL 18, mientras MYKOSPHARE usa PostgreSQL 17 y Supabase añade GoTrue, PostgREST y varias conexiones. El ensayo local siguiente cubre esas diferencias sin usar un proyecto remoto adicional.

Ensayo local posterior (27-10-2026): Docker Desktop y Supabase CLI 2.122.0 iniciaron PostgreSQL 17, Auth, PostgREST y Kong. `node scripts/verify-local-supabase.mjs` comprobó usuarios sintéticos, cámara y MYKO-001 locales, RLS, denegación de hashes y alta desde sesión de usuario, 6 aceptaciones de 12 RPC concurrentes, lectura atómica e idempotente. Con la API Next local en `http://127.0.0.1:4317`, `LOCAL_APP_URL=http://127.0.0.1:4317` y `LOCAL_BROWSER_TEST=1`, comprobó POST autenticado 201/200, rechazo 401, ruta legada 410, login hacia HOME y visualización de 20,6 °C / 80,3 % solo para el dueño. Borró los dos usuarios y el dispositivo sintéticos al terminar. La API de Next se ensayó por HTTP de loopback: la validación TLS real sigue pendiente del dominio remoto y certificado que se autoricen.

## Riesgos y correcciones locales

- La migración 1 tenía políticas amplias de escritura para cámaras y eventos; la migración 2 pendiente limita la cámara a lectura del dueño, corrige la política de capturas y reserva credenciales/RPC al servidor. Ambas deben aplicarse juntas y en orden.
- El límite solo en memoria no servía entre instancias. La migración 2 añade un contador atómico por dispositivo autenticado en PostgreSQL. Se eliminó el bucket global previo a la autenticación para que intentos anónimos no agoten el cupo de MYKO-001.
- Lectura y estado se guardaban en peticiones separadas. La RPC los trata como una operación atómica; el ensayo verificó rollback ante fallo del estado.
- El firmware heredado podía activar salidas con comandos serie. La copia preparada fija `MYKO_SENSOR_ONLY=true`, fuerza las salidas a apagado y omite secuencias, PWM y LCD. Se debe **desconectar físicamente la alimentación de ventiladores, humidificador y relé/calefactor** durante la primera prueba; el software no elimina transitorios eléctricos de arranque.
- La configuración cloud de ejemplo usa un marcador de host de preview y permanece deshabilitada. Sin host HTTPS y certificado raíz válidos no inicia la tarea de red.
- La auditoría npm encontró avisos críticos en el Next.js heredado 16.2.6, incluido un bypass de Proxy. En esta copia se actualizó Next.js y `eslint-config-next` a 16.4.2, se movió la CLI `shadcn` (sin imports de runtime) a dependencias de desarrollo y se actualizaron transitivas compatibles del lockfile. Tras `npm ci`, `npm audit --omit=dev` devolvió **0 avisos**. El árbol completo conserva ocho avisos **altos**, ninguno crítico, en herramientas de desarrollo que requieren revisión separada antes de automatizar su ejecución en CI.

## Ensayo local y preview posterior, aún sin desplegar

El plan Free ya tiene dos proyectos Supabase activos: **no crear un tercero ni pausar otro**. El ensayo con usuarios y credenciales sintéticos se hace exclusivamente en Supabase local (Docker + CLI), con PostgreSQL 17, Auth y PostgREST. No enlazar la CLI local al proyecto remoto ni enviarle lecturas de prueba.

El CSS y la estructura de HOME publicados se conservan. Tras superar el ensayo local y recibir autorización expresa para migrar la base real, se puede crear un despliegue **Preview del proyecto Vercel existente** con `CLOUD_CONNECT_PREVIEW_ONLY=1`; no hace falta comprar ni crear otro proyecto. Ese preview usará el Supabase existente **solo después** de aplicar y verificar las migraciones, con la cuenta propietaria y MYKO-001 reales. No enviarle datos sintéticos. Variables necesarias: URL y clave pública Supabase (ya presentes para Preview), `SUPABASE_SERVICE_ROLE_KEY` **solo de servidor y solo para Preview**, y `CLOUD_CONNECT_PREVIEW_ONLY=1` solo para Preview; restringir ambas variables a la rama del piloto si Vercel lo permite para este despliegue. Actualmente esas dos últimas no están configuradas en Vercel. La clave individual del ESP32 no va en Vercel ni en `NEXT_PUBLIC_*`.

El proyecto Vercel tiene `ssoProtection` activo para los dominios de preview. El ESP32 no puede completar ese login. Tras aprobar el despliegue, asignar una URL de preview estable al piloto y añadir **solo ese dominio** a Deployment Protection Exceptions, ahora disponible en todos los planes según la documentación vigente. El dominio quedará públicamente accesible; la lectura HOME sigue exigiendo sesión Supabase/RLS y la ingestión exige la clave individual. Comprobar desde un cliente HTTPS sin sesión Vercel que `POST /api/v2/device/readings` alcanza el handler y responde 401 sin clave, y que HOME pide login Supabase. No colocar un bypass general de Vercel en el firmware: ese secreto evita también controles del firewall. Al cerrar el ensayo, quitar la excepción. La excepción, variables y despliegue requieren autorización específica.

El proxy de preview sirve HOME, login, lectura privada V2, GET de Grow y POST de lectura de dispositivo. Las rutas de ingestión, configuración, comandos, demo y diagnóstico legadas devuelven 410; otras escrituras y registro de usuarios no forman parte del preview. Las rutas `/dashboard/**` y `/debug-network` redirigen al sitio **ya publicado** para que los enlaces de HOME no abran pantallas rotas en el preview. Son sitios distintos y puede requerirse un nuevo inicio de sesión allí.
El login abierto directamente en el preview vuelve a `/home/conectar?view=real`, evitando saltar por defecto al dashboard publicado.
La pantalla «Conectar» de este piloto muestra el dispositivo asociado, su estado y lecturas; el alta de MYKO-001 aún se hace por un operador mediante la plantilla. El emparejamiento autoservicio dentro de HOME queda como trabajo posterior y requiere un flujo de reclamación física del dispositivo para impedir que otro usuario lo vincule.

Se encontraron dependencias reales del dashboard avanzado: `lib/useTelemetry.ts` llama `/api/data`, `lib/automation/use-automation.ts` llama `/api/command`, y pantallas de configuración, protocolo, ingestión, demo y diagnóstico llaman otras rutas cerradas. `features/home-v2/data/device-seen.ts` conserva un sondeo legado de `/api/data`, pero el proveedor HOME actual no lo monta; HOME real usa `/api/v2/home`. **No publicar este cambio como reemplazo de toda la aplicación** hasta migrar o retirar esas dependencias. El preview limitado permite probar HOME sin alterar el dashboard que ya funciona en producción.

Antes del preview remoto: crear y verificar una copia de seguridad de la base real; autorizar y aplicar ambas migraciones; registrar la cámara, MYKO-001 y su credencial real; revisar variables y destino; comprobar HOME, login, rutas legadas 410 y redirección del dashboard. Ninguno de esos pasos remotos se ha ejecutado. El contador SQL limita seis peticiones por minuto **después** de autenticar el dispositivo. Una [regla WAF por IP](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) reduciría la carga de intentos anónimos, pero el plan Hobby muestra un diálogo de precios y no se activará sin autorización expresa.

Para revertir una prueba remota fallida: detener el envío en el ESP32, revocar su credencial o deshabilitar MYKO-001, retirar el preview y restaurar el despliegue estable de Vercel. Conservar las tablas Grow si ya contienen lecturas; cualquier eliminación de esquema exige copia de seguridad verificada y autorización separada.

## Punto A: respaldo remoto obligatorio antes de migrar

La base activa tiene seis tablas legadas vacías (`alerts`, `devices`, `logs`, `operator_profiles`, `settings`, `telemetry`), `auth.users` y ninguna tabla/función/tipo Grow. `public.handle_updated_at()` solo asigna `NEW.updated_at`, por lo que fijar su `search_path` es compatible. La cuenta propietaria está confirmada. Las dos migraciones son aditivas a las tablas legadas y deben aplicarse juntas, en orden, dentro de una ventana de mantenimiento. La segunda restringe políticas de la primera y elimina el bucket global de ingestión. La lista remota de migraciones Grow está vacía.

Antes de autorizar A, obtener acceso de solo lectura a PostgreSQL con la contraseña de base mediante un canal local seguro. En un directorio **fuera de Git**, con permisos exclusivos del propietario, ejecutar un `pg_dump` de PostgreSQL 17 en formato custom de la base remota completa, sin poner contraseña en argumentos ni transcripciones; usar prompt interactivo o gestor de secretos. Guardar además un manifiesto de tamaño, SHA-256, `pg_restore --list`, versiones, conteo de tablas públicas y de `auth.users`. Restaurar el archivo en una base PostgreSQL 17/Supabase local desechable y cotejar esquema y conteos; si falla alguna extensión administrada, documentar el error y obtener al menos restauración verificada de `public` y extracción verificada de `auth.users` antes de tocar producción. El archivo contiene datos y hashes de Auth: cifrarlo, limitar acceso y nunca subirlo a Git ni enviarlo por chat. **Hoy no existe un respaldo remoto nuevo verificado; no aplicar migraciones hasta completarlo.** Supabase Free recomienda exportación manual con CLI/pg_dump y no garantiza los respaldos diarios de planes superiores.

Tras verificar el respaldo: comprobar de nuevo que no aparecieron objetos Grow; aplicar `202609300001` y `202610010001` en una única ejecución ordenada del mecanismo de migraciones aprobado, comprobar historial, RLS, grants, funciones, FK y conteos legados. Si falla una transacción, detenerse y verificar que no quedaron objetos parciales. Si los cambios ya quedaron confirmados y no hay lecturas reales, valorar restauración **solo** con revisión del respaldo y autorización separada; si existen lecturas, conservar datos y preparar una migración correctiva en vez de borrar tablas.

## Registro posterior de MYKO-001

La plantilla `docs/cloud-connect/provision-myko-001.sql.template` resuelve al momento de ejecución el UUID de `kertranus@gmail.com` confirmado. En una transacción crea la cámara `MYKOSPHARE Prototype 01`, el controlador con identificador visible/hardware `MYKO-001`, capacidades `temperature` y `humidity`, e inserta **solo** el SHA-256 y una pista de una clave individual. Rechaza una segunda alta con el mismo identificador. No contiene UUID de prueba ni clave real.

Secuencia tras autorización: validar de nuevo cuenta y esquema; designar un gestor de contraseñas del propietario para conservar la clave del dispositivo y un archivo `CloudConfig.local.h` temporal con permisos limitados al usuario que compila; emitir la clave una sola vez; ejecutar la plantilla con hash/pista; comprobar las filas y la revocación posible; copiarla a la configuración local ignorada del sketch solo para compilar/cargar y retirar ese archivo cuando ya no sea necesario. La clave persistirá dentro del firmware de la placa y debe poder revocarse en la base. No enviar la clave por chat, ticket, commit ni log. La clave `service_role` jamás va al ESP32.

La emisión usa `issueDeviceKey()` (32 bytes aleatorios) en el equipo de preparación. Guardar el texto completo **antes** de insertar su SHA-256 en la base, en el gestor de contraseñas aprobado; no imprimirlo en logs ni pasarlo como argumento de comandos. La tabla admite varias claves activas para rotación. Para revocar una credencial concreta, un operador autorizado ejecuta `update public.grow_device_credentials set status='revoked', revoked_at=now() where device_id=<uuid verificado> and key_hash=<hash verificado> and status='active'` y comprueba exactamente una fila afectada. Para cortar todo el dispositivo, establece `grow_devices.enabled=false` y revoca todas sus claves. No reutilizar una clave revocada.

## Wi-Fi y primera prueba física, después de autorizarla

1. En el banco de pruebas, alimentar solo ESP32 y DHT22 en GPIO27. Desconectar físicamente cargas y alimentación de actuadores. Conservar el sketch actual intacto como referencia y verificar el puerto USB presente; COM4 fue solo el puerto de la captura anterior.
2. En `firmware/esp32-cloud-v1`, copiar `CloudConfig.example.h` a `CloudConfig.local.h` (ignorado por Git). Completar SSID y contraseña en ese archivo **local**, `CLOUD_DEVICE_ID="MYKO-001"`, clave individual después del alta, URL HTTPS del preview autorizado y certificado raíz de la cadena TLS verificada. Cambiar `CLOUD_ENABLED` a `true` solo cuando el backend remoto esté listo. La contraseña recibida anteriormente no se reproduce ni almacena en el repositorio.
3. Compilar para `ESP32 Dev Module` y revisar que `MYKO_SENSOR_ONLY` siga en `true`. Solo con autorización específica cargar por USB. No habilitar control remoto.
4. En monitor serie a 115200 baudios, verificar DHT22 válido y respuesta `[CLOUD] HTTPS status: 201` (o 200 en reintento duplicado). Un 401/403 indica credencial/dispositivo, 429 límite, 503 backend, y código negativo Wi-Fi/TLS/HTTP. No imprimir la clave.
5. Verificar en la base MYKOSPHARE una fila `grow_readings` con `origin='real'`, dueño/cámara/dispositivo esperados, temperatura/humedad y hora coherente. Abrir `/home/conectar?view=real` del preview desde un teléfono con la cuenta propietaria y cotejar los valores. Confirmar mediante las pruebas RLS locales que otra cuenta no puede verlos.
6. Cortar Wi-Fi temporalmente: la lectura local DHT y el bucle principal deben continuar, HOME debe marcar lectura antigua/desconectada, y al volver la red debe aparecer una lectura nueva. No probar actuadores ni calefactor en esta fase.

La primera conexión de la cuenta real y MYKO-001 requerirá autorizaciones distintas para migraciones, alta/clave, preview y carga física, después de superar el ensayo local completo. El computador no participa en la operación definitiva.

## Orden de activación A–F (cada punto requiere su autorización)

1. **A. Respaldo y migraciones:** obtener acceso de lectura a PostgreSQL por canal seguro, exportar/restaurar/verificar el respaldo anterior, presentar manifiesto y compatibilidad; solo tras aprobación específica aplicar ambas migraciones y validar RLS, grants, RPC y conteos. Ante error, detener cambios y revisar el estado antes de restaurar.
2. **B. Alta y credencial:** confirmar de nuevo `kertranus@gmail.com`, preparar almacenamiento local seguro, emitir una clave individual, insertar cámara/dispositivo/hash con la plantilla en una transacción y comprobar propiedad. Ante error, revocar la clave y deshabilitar el dispositivo; no enviar la clave por chat.
3. **C. Preview:** configurar variables de servidor solo para el piloto, desplegar desde esta copia sin `--prod`, asignar un dominio de preview estable y aprobar una excepción de protección para ese dominio. Verificar HOME/login y redirección del dashboard; si falla, retirar excepción y preview sin tocar el despliegue publicado.
4. **D. HTTPS:** desde un cliente externo sin sesión Vercel, comprobar TLS y que el endpoint responde 401 sin clave, sin escribir datos. Inspeccionar la cadena TLS del dominio y cargar el certificado raíz en la configuración local ignorada. El primer 201 autenticado debe proceder del ESP32 físico en F; no enviar telemetría sintética a la base remota.
5. **E. Firmware:** mantener las cargas físicamente sin alimentación, confirmar COM4/puerto actual, compilar modo sensor, configurar Wi-Fi/clave/certificado fuera de Git y cargar por USB solo tras autorización de la prueba física.
6. **F. Lectura y reconexión:** comprobar `origin='real'`, hora y valores del DHT22 en Supabase y en HOME desde un teléfono con datos móviles; cortar Wi-Fi, comprobar que el sensor local sigue midiendo y HOME indica señal antigua, restaurar Wi-Fi y verificar una lectura nueva. Solo entonces considerar completado el piloto.
