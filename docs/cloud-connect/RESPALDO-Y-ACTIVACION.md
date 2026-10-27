# Cloud Connect V1 — respaldo remoto y plan de activación de MYKO-001

Estado (27-10-2026): **nada remoto se ha tocado**. Sin migraciones, sin despliegue, sin push, sin firmware, sin cambios de credenciales. El respaldo del proyecto `ecvdcsgsiorisszotyew` **todavía no existe**: falta acceso de lectura a su PostgreSQL (ver «Qué necesito de ti»). El procedimiento ya está construido y ensayado contra Supabase local.

## Respaldo (Fase A)

Herramienta: `scripts/backup/supabase-backup.mjs` (+ `inventory.sql`). No requiere instalar PostgreSQL: usa `pg_dump 17.11` dentro de la imagen `public.ecr.aws/supabase/postgres:17.11.0.006` (la misma que el Supabase local y la versión mayor de producción, PG 17).

Qué hace `dump --source remote`:
- Pide la contraseña con entrada oculta (o lee `MYKO_DB_PASSWORD` de tu sesión). Nunca la escribe en disco, manifiesto, logs ni argumentos; viaja a Docker por variable de entorno.
- Solo lectura: `default_transaction_read_only=on` y la instantánea de `pg_dump`. Se niega a ejecutarse si ni el host ni el usuario contienen `ecvdcsgsiorisszotyew`, si el servidor no es PG 17 o si el destino está dentro del repositorio.
- Escribe en `C:\Users\antos\mykosphare-backups\supabase-ecvdcsgsiorisszotyew\<fecha>\` (fuera de Git y de Next.js, permisos solo para tu usuario):
  - `full.dump` — formato custom, todos los esquemas (public, auth, storage…): tablas, columnas, claves externas, índices, RLS, políticas, funciones, triggers, permisos y datos.
  - `roles.sql` (sin contraseñas de roles), `schema-public.sql`, `data-public-auth-storage.sql` (copias legibles).
  - `inventory-source.json` (conteos y hashes de definiciones, sin contenido de filas), `manifest.json` (versiones, tamaños, SHA-256, conteos), `full.dump.toc.txt`.

Qué **no** cubre (no afirmar «respaldo completo» sin estas salvedades):
- Los **archivos** de Storage (solo las filas de metadatos de `storage.objects`). Si hay buckets con contenido, hay que bajarlos aparte.
- Contraseñas de roles de base de datos, ajustes de Auth del panel (SMTP, proveedores, protección de contraseñas), Edge Functions y secretos, configuración de Realtime, variables de Vercel.
- Los hashes de contraseña de usuarios **sí** están (`auth.users`): el archivo es sensible, no lo subas ni lo compartas.

Qué hace `verify <carpeta>`: comprueba SHA-256; crea un contenedor PostgreSQL 17 desechable **sin puertos publicados**, crea los roles, restaura `full.dump` en una base nueva y compara con el inventario de origen: filas por tabla, hash de columnas, RLS, políticas, funciones, triggers, índices, restricciones, permisos de `public`, extensiones. Elimina el contenedor al terminar. Los errores de `pg_restore` quedan en `restore-errors.log`.

Ensayo con el Supabase local (origen sintético, **no** el respaldo real): dump + restauración + 55 comprobaciones aprobadas, `pg_restore` con 0 errores. Diferencia conocida y documentada: en 22 tablas de `auth`/`storage` los permisos para `postgres`/`dashboard_user` no se reproducen en el destino (los reaplican los servicios de Supabase); se informa como nota, no como fallo. Es un ensayo de procedimiento: las tablas locales casi no tienen filas, así que la prueba de conteos solo será significativa con el respaldo real.

## Resultado real (27-10-2026)

Respaldo remoto generado (PostgreSQL 17.6, solo lectura) en `C:\Users\antos\mykosphare-backups\supabase-ecvdcsgsiorisszotyew\2026-10-27T18-42-22-388Z\` y **restauración verificada** en PostgreSQL 17.11 desechable: `pg_restore` con 0 errores y 48 comprobaciones aprobadas. Filas idénticas: `auth.users` 4, `auth.identities` 4, `public.logs` 16 119, `public.telemetry` 10 724, `public.settings` 1, `storage.buckets` 1, `storage.objects` 116 (metadatos); 16 políticas, 1 función, 3 triggers, 17 índices y 10 restricciones de `public` idénticos.

Correcciones a la auditoría previa: las tablas legadas **no están vacías** (`logs`, `telemetry`, `settings` tienen datos) y Storage tiene 1 bucket con 116 objetos cuyos **archivos no están en este respaldo**. No existe ningún objeto Grow ni historial de migraciones (`supabase_migrations` ausente), como se esperaba.

## Qué necesito de ti (desbloquear A) — resuelto

La ejecución real se hizo con `scripts/backup/run-remote-backup.ps1` (contraseña oculta con `Read-Host -AsSecureString`, no queda en disco).

Hoy no hay CLI vinculada, ni token (`~/.supabase/access-token` no existe), ni contraseña, ni variable de conexión. Solo hace falta **una** cosa: la contraseña de la base de datos de `ecvdcsgsiorisszotyew` (Dashboard → Project Settings → Database). Si no la tienes guardada, restablecerla es un cambio en producción: avísame antes y decides tú.

El plan Free solo ofrece conexión directa por IPv6. Si tu red no la tiene, copia del panel (Connect → Session pooler) el host `aws-0-<región>.pooler.supabase.com` y el usuario `postgres.ecvdcsgsiorisszotyew`, y expórtalos en **tu** terminal:

```powershell
$env:MYKO_DB_HOST = "aws-0-REGION.pooler.supabase.com"
$env:MYKO_DB_USER = "postgres.ecvdcsgsiorisszotyew"
```

Después, en una terminal tuya (la contraseña se teclea oculta, nunca en el chat):

```powershell
cd C:\Users\antos\mykosphare-cloud-v1
node scripts/backup/supabase-backup.mjs dump --source remote
node scripts/backup/supabase-backup.mjs verify "<carpeta que imprime el paso anterior>"
```

## Fase B — pruebas locales posteriores al ajuste del límite

Con `supabase db reset` (esquema reconstruido solo desde las dos migraciones) y un servidor Next local en `127.0.0.1:4317` contra el Supabase local:
- `npm test`: 30 archivos, 312 pruebas aprobadas. `npm run test:grow-db` (PGlite): aprobado.
- `scripts/verify-local-supabase.mjs` (con HTTP y navegador): Auth, PostgREST, RLS entre dueños, hashes ilegibles, alta denegada desde el navegador, 6 de 12 RPC concurrentes aceptadas, lectura atómica e idempotente, POST autenticado 201 / duplicado 200 / clave errónea 401 / HOME sin sesión 401 / ruta legada 410, login → HOME Connect, el dueño ve 20,6 °C y 80,3 % y la otra cuenta no. Todo PASS.
- **Nuevo** `scripts/verify-local-rate-limit.mjs` (límite por dispositivo sobre HTTP): 20 claves erróneas → 401 y no consumen cupo; 12 peticiones válidas concurrentes → exactamente 6 aceptadas y 6 con 429; el dispositivo A sigue limitado en el mismo minuto; el dispositivo B no se ve afectado; solo se persisten las aceptadas. PASS.
- Limitación: el Supabase local no tiene las seis tablas legadas; su coexistencia con las migraciones la cubre `test:grow-db`. El contador por minuto puede partirse si la prueba cruza un límite de minuto (repetir en ese caso).

## Fase C — qué cambiarán exactamente las migraciones

Base remota (confirmada con el inventario del respaldo del 27-10-2026): seis tablas legadas con RLS (`logs` 16 119 filas, `telemetry` 10 724, `settings` 1, el resto vacías), 4 usuarios en `auth.users`, ningún objeto Grow, sin historial de migraciones, extensiones `pgcrypto`, `uuid-ossp`, `supabase_vault`, `pg_stat_statements`.

**Ensayo sobre la copia restaurada de los datos reales** (`scripts/backup/rehearse-migrations.mjs`, en un contenedor desechable; producción no se contacta): ambas migraciones se aplican en **una sola transacción**; las 41 tablas preexistentes (filas, columnas, RLS, permisos) y las 16 políticas legadas quedan idénticas; se crean 11 tablas Grow, todas con RLS; `handle_updated_at` conserva su cuerpo y solo fija `search_path`; `anon`/`authenticated` no pueden ejecutar las funciones privilegiadas ni leer los hashes; la plantilla de alta de MYKO-001 funciona con tu cuenta real (con hash sintético, solo en la copia) y rechaza una segunda alta; `service_role` registra una lectura, el dueño la ve y otra cuenta real no ve nada; un usuario autenticado no puede crear cámaras. Todo PASS. Esa copia no se usa en producción: el alta real emitirá otra clave.

**Hallazgo preexistente, no causado por las migraciones:** las tablas legadas tienen 5 políticas que permiten a `anon` insertar/actualizar (`alerts_anon_insert`, `devices_anon_insert`, `devices_anon_update`, `logs_anon_insert`, `telemetry_anon_insert`). Presumiblemente las usa el dashboard publicado; cualquiera con la clave pública podría escribir en esas tablas. Las migraciones no las tocan. Conviene revisarlas aparte, cuando el dashboard deje de depender de ellas.

`202609300001_grow_data_platform.sql` (aditiva): 6 tipos enum; tablas `grow_chambers`, `grow_devices`, `grow_device_state`, `grow_species_profiles`, `grow_cultivation_runs`, `grow_stage_events`, `grow_readings`, `grow_run_events`, `grow_captures`; 6 índices; función de trigger `grow_set_updated_at` y 3 triggers; RLS activada en todas; políticas para `authenticated` limitadas al dueño (cámaras y varias tablas con `for all`, lectura de perfiles de especie para todos los autenticados). No toca las seis tablas legadas.

`202610010001_grow_cultivation_loop.sql` (endurece la 1.ª): etapa pasa de enum a texto con comprobación de forma; columnas nuevas en perfiles y dispositivos; tabla `grow_device_credentials` (solo hashes SHA-256), tabla `grow_ingestion_rate_limits`; restricciones de tipo/origen de eventos; **elimina** las políticas amplias de escritura (`grow_captures_owner`, `grow_runs_owner`, `grow_stage_events_owner`, `grow_run_events_owner`, `grow_chambers_owner`) y las sustituye por lectura del dueño; revoca insert/update/delete de `anon`/`authenticated` sobre cámaras; funciones privilegiadas `grow_consume_ingestion_limit` y `grow_record_device_reading` (ejecutables solo por `service_role`, `search_path` fijado); FK compuesta lectura↔(dispositivo, cámara); fija `search_path=''` en `grow_set_updated_at` y en `public.handle_updated_at()` (única modificación de un objeto existente; su cuerpo solo asigna `NEW.updated_at`).

Riesgos y condiciones:
- **Aplicar ambas en una sola ventana y en orden.** Entre una y otra existen políticas `for all` (solo sobre filas propias; las tablas están vacías, riesgo bajo pero evitable).
- `grow_record_device_reading` y la tabla de credenciales son el único camino de escritura de telemetría; la clave `service_role` debe vivir solo en el servidor (Vercel Preview), nunca en el ESP32 ni en `NEXT_PUBLIC_*`.
- Dependencias: `auth.users` (FK de dueño), `auth.uid()`, roles `anon`/`authenticated`/`service_role`; `gen_random_uuid()` es nativa de PostgreSQL 17, sin extensiones nuevas.
- Incompatibilidad conocida: ninguna con las tablas legadas; el dashboard publicado sigue usando rutas `/api/*` que el preview cierra con 410, por lo que no se debe desplegar este código como producción completa.
- Reversión: sin lecturas reales, restaurar desde el respaldo verificado (con autorización aparte); con lecturas, una migración correctiva, nunca borrar tablas.

## Fase D — plan de activación (nada ejecutado; cada paso exige tu autorización)

1. **Respaldo remoto y verificación** (arriba). Re-comprobar que no aparecieron objetos Grow.
2. **Migraciones**: `supabase db push --linked --dry-run`, revisar, y aplicar `202609300001` y `202610010001` seguidas. Comprobar historial, RLS, grants, funciones, FK y conteos legados.
3. **Alta de MYKO-001** con `docs/cloud-connect/provision-myko-001.sql.template` (cuenta `kertranus@gmail.com`, cámara `MYKOSPHARE Prototype 01`).
4. **Credencial individual**: generarla con `issueDeviceKey()`, guardarla en tu gestor de contraseñas **antes** de insertar su hash; solo la usará el `CloudConfig.local.h` ignorado por Git.
5. **Variables de Vercel (solo Preview)**: `SUPABASE_SERVICE_ROLE_KEY` y `CLOUD_CONNECT_PREVIEW_ONLY=1`.
6. **Preview** (sin `--prod`), dominio estable y excepción de Deployment Protection solo para ese dominio.
7. **HTTPS/TLS**: desde un cliente externo, `POST` sin clave → 401, HOME pide login; extraer el certificado raíz de la cadena.
8. **ESP32**: `CloudConfig.local.h` (Wi-Fi, `MYKO-001`, clave, URL, certificado), `MYKO_SENSOR_ONLY=true`, cargas físicamente desconectadas.
9. **Cargar firmware** por USB (modo solo sensor). Se necesita `arduino-cli` (hoy no está en el PATH; Codex compiló con él).
10. **Verificación**: 201 en el monitor serie, fila `origin='real'`, HOME desde un teléfono con datos móviles, corte de Wi-Fi (el sensor local sigue, HOME marca señal antigua) y recuperación.

Cloud Connect no está completo hasta el paso 10.
