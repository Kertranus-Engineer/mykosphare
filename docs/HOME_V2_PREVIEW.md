# HOME V2 · Cómo revisarlo en un teléfono Android

Nada de esto toca producción ni `/home`. El laboratorio vive en `/design-lab/home-v2` y es solo lectura.

## Opción A — Sin desplegar (la más rápida)

Mismo Wi-Fi para PC y teléfono.

```bash
npm run build
npx next start -H 0.0.0.0 -p 3000
```

1. En la PC: `ipconfig` → anota la IPv4 (p. ej. `192.168.1.20`). Permite Node en el firewall de Windows (red privada) si lo pide.
2. En Android (Chrome): `http://192.168.1.20:3000/design-lab/home-v2`
3. Para ver todos los estados con datos simulados: `…/design-lab/home-v2?mode=simulation&scenario=stable&photos=demo`

Alternativa por USB (sin Wi-Fi): activa depuración USB, abre `chrome://inspect` en la PC, y ejecuta `adb reverse tcp:3000 tcp:3000`; en el teléfono abre `http://localhost:3000/design-lab/home-v2`.

Requisito local: `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (el middleware falla sin ellas). Pueden ser ficticias; entonces las fotos reales mostrarán el estado de error.

## Opción B — Preview aislada en Vercel (requiere autorización para el push)

Un push a una rama que **no** sea la de producción crea un *Preview Deployment* con URL propia; la URL de producción no cambia.

Antes de empezar, en Vercel → Project → Settings:

- **Git → Production Branch:** confirma que es `main` (el remoto `origin` es `Kertranus-Engineer/mykosphare`).
- **Environment Variables:** define, **solo en el entorno *Preview***, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sin ellas toda ruta devuelve 500. No hace falta `SUPABASE_SERVICE_ROLE_KEY` ni los secretos de ingestión: el laboratorio no escribe. Si usas las mismas claves públicas que producción, el laboratorio solo *lee* (fotos del bucket `snapshots`).
- **Deployment Protection:** por defecto las previews exigen sesión de Vercel. En el teléfono inicia sesión con la misma cuenta, o genera un *Shareable Link* (Deployments → ⋯ → Share). No desactives la protección del proyecto.

Rama y remoto propuestos (no ejecutado):

```bash
git push -u origin claude/mykosphare-home-v2-redesign-18c352
```

Si prefieres una URL más legible, empuja a una rama con otro nombre sin renombrar la local:

```bash
git push -u origin claude/mykosphare-home-v2-redesign-18c352:preview/home-v2-lab
```

El push solo añade los commits propios del laboratorio: la base (`93b69eb`) ya está en `origin/mykosphare-v2`.

Cuando termine el build (Vercel → Deployments → la rama), abre:

```
https://<url-del-preview>/design-lab/home-v2
https://<url-del-preview>/design-lab/home-v2?mode=simulation&scenario=stable&photos=demo
```

Qué esperar en la preview: el ESP32 envía a la URL que tenga configurada; si apunta a producción, la preview no recibirá sus datos y mostrará **"Simulación"** de forma explícita (no se pudo verificar a qué URL apunta el firmware). Para validar telemetría real habría que apuntar un dispositivo a la preview, y eso queda fuera de esta fase.

## Opción C — CLI de Vercel (sin push)

No está instalada aquí. `npx vercel` (sin `--prod`) crea una preview desde la carpeta local; pide iniciar sesión y vincular el proyecto. Nunca uses `--prod`.

## Limpieza

Borrar la rama remota o la preview no afecta a producción: `git push origin --delete <rama>` y/o eliminar el deployment desde el panel.

## Checklist en el teléfono

- [ ] Los tres temas (⚙ Configuración → Tema) y el modo oscuro del sistema.
- [ ] Giro a horizontal y teclado/gestos de la barra inferior (área segura inferior).
- [ ] Swipe en la foto de Cultivo, arrastre sobre la gráfica de Ambiente.
- [ ] Ajustes de Android → Accesibilidad → *Quitar animaciones* y comprobar que casi nada se mueve.
- [ ] Ninguna pantalla debe decir "Datos reales" mientras el encabezado diga "Simulación".
