# CLAUDE.md — YALEH

YALEH es un entorno de estudio para estudiantes del TECBA con problemas de concentración (proyecto de grado de Mario Víctor Brañez Rodriguez). Tiene dos aplicaciones sobre una misma base de código:

- **Web** (Firebase Hosting): login con Google, carga de materiales, asistente de IA estilo NotebookLM y preparación de la sesión.
- **Escritorio** (Electron): bloquea el sistema operativo durante la sesión (kiosko), con o sin internet.

**Fuente de verdad:** [docs/BRIEF_YALEH.md](docs/BRIEF_YALEH.md). Si el código contradice el brief, gana el brief. El análisis del MVP de partida ("Safe Research Browser") está en [docs/INFORME_ANALISIS_SRB.md](docs/INFORME_ANALISIS_SRB.md).

## Estado

Rama de trabajo: `v1-yaleh` (el MVP original está en `main`). Remoto: GitHub `MarioVBR01/yaleh`.

| Fase | Estado |
| --- | --- |
| 1. Preparación (renombre, limpieza, temporizador, tsc, Vitest) | Hecha |
| 2. Seguridad del kiosko en el proceso principal | Hecha |
| 3. Modos, plataforma y SQLite básico | Pendiente |
| 4. Firebase (Auth, Firestore, App Check, paso web → escritorio) | Pendiente |
| 5. Vista principal estilo NotebookLM y sidebar | Pendiente |
| 6. Archivos (extracción de texto) | Pendiente |
| 7. IA (Gemini + búsqueda en Wikipedia) | Pendiente |
| 8. Pestañas con WebContentsView, herramientas y YouTube | Pendiente |
| 9. Editores de ofimática con exportación | Pendiente |
| 10. Sincronización, historial y estadísticas | Pendiente |
| 11. Pruebas y empaquetado | Pendiente |

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor Vite en `http://localhost:5173` (solo la interfaz, en el navegador) |
| `npm run electron:dev` | Compila `electron/`, levanta Vite y abre Electron contra el servidor de desarrollo (`--dev-server`) |
| `npm run electron:preview` | Compila todo y abre Electron con la versión compilada (`dist/`), sin empaquetar |
| `npm run build` | Compila la interfaz (`dist/`) y el proceso principal (`dist-electron/`) |
| `npm run build:electron` | Solo el proceso principal y el preload, con esbuild |
| `npm run typecheck` | `tsc --noEmit` (interfaz, `shared/` y `electron/`) |
| `npm test` | Pruebas con Vitest (una ejecución) |
| `npm run test:watch` | Vitest en modo observación |
| `npm run smoke:electron` | Compila y abre la app sin ventana visible: comprueba que la interfaz carga con la CSP, que el preload expone `electronAPI` y que la IPC responde. No activa el kiosko |

Al cerrar cada fase deben pasar `typecheck`, `build` y `test` (y conviene `smoke:electron`).

**Problema conocido:** si `ELECTRON_RUN_AS_NODE` está definida en el entorno (la heredan, por ejemplo, los procesos lanzados por extensiones de VS Code), Electron arranca como Node y falla con `Cannot read properties of undefined (reading 'isPackaged')`. `smoke:electron` la quita automáticamente; para los demás comandos, ejecútalos desde una terminal normal.

## Estructura

```
electron/                   Proceso principal (TypeScript → esbuild → dist-electron/*.cjs)
  main.ts                   Ventana, IPC, enlaces yaleh://, guardias de red y navegación, arranque
  preload.ts                contextBridge → window.electronAPI (un único archivo CommonJS por sandbox)
  session/controller.ts     Controlador de sesión: idle → active → finished (+ resumable). Única autoridad del tiempo
  session/store.ts          Estado de la sesión y registro de eventos (JSON en userData/session/; SQLite en la fase 3)
  kiosk/window.ts           Bloqueo y liberación de la ventana, recuperación del foco
  kiosk/shortcuts.ts        Atajos bloqueados y salida de desarrollo
  ipc/validate.ts           Origen del remitente, duración, URL externas
  navigation-policy.ts      Qué páginas y marcos pueden cargarse
  deeplink.ts               Análisis de yaleh://auth y yaleh://sesion
shared/                     Usado por el proceso principal y la interfaz (sin Node ni DOM)
  config.ts                 Sitios permitidos, herramientas, límites (8 pestañas, 500 MB, 1–180 min)
  allowlist.ts              isUrlAllowed()
  ipc-types.ts              Canales IPC y tipo ElectronAPI
src/                        Interfaz React (web y escritorio). Alias: @/ → src, @shared/ → shared
  App.tsx                   Fases: login → dropzone → timer-select → confirm-session → kiosk → session-complete
                            (+ resume-offer al abrir con una sesión interrumpida)
  store/appStore.ts         Estado global y reducer
  context/AppContext.tsx    Provider + useApp (acepta `initial` para pruebas)
  lib/electron.ts           isElectron(), getElectronAPI(), closeApp()
  phases/ kiosk/ panels/    Pantallas, layout del kiosko y paneles
  index.css                 Tokens de color (@theme) y estilos globales
scripts/                    build-electron.mjs, smoke-electron.mjs
docs/                       Brief e informe del MVP
```

Una sola compilación de la interfaz (`dist/`, `base: './'`) sirve para Firebase Hosting y para `file://` en Electron.

## Seguridad del kiosko (fase 2)

Todo el bloqueo vive en el proceso principal. La interfaz pide iniciar la sesión (`startSession`) pero **no puede terminarla**: no existe canal para desactivar el kiosko.

- **Sesión:** `SessionController` guarda `sessionEndsAt`, envía `session:tick` cada segundo y `session:ended` al terminar. El tiempo se calcula con el reloj, no contando ticks. En Electron la interfaz no tiene temporizador propio; en el navegador queda uno de vista previa (no bloquea nada).
- **Mientras la sesión está activa:** se rechaza `app:close`, se cancela el evento `close` de la ventana (salvo cuando Windows se apaga o cierra la sesión), se bloquean atajos con `before-input-event` y `globalShortcut`, y la ventana está en kiosko, pantalla completa, sin menú y siempre al frente (`screen-saver`). Si pierde el foco, lo recupera y registra la pérdida.
- **Sin salida anticipada:** no hay código ni salida de emergencia (brief, revisión 1.2).
- **Sesión interrumpida:** al arrancar, `controller.recover()` detecta una sesión `active` guardada; la registra como interrumpida y, si queda tiempo, la interfaz ofrece retomarla (`resume-offer`).
- **Red:** `webRequest.onBeforeRequest` bloquea `mainFrame` y `subFrame` fuera de `ALLOWED_SITES`. `will-navigate`: la ventana principal solo puede mostrar la interfaz propia. `setWindowOpenHandler` deniega todas las ventanas nuevas (en la fase 8 serán pestañas). Permisos: solo `fullscreen` y `clipboard-sanitized-write`.
- **IPC:** cada handler comprueba que el mensaje venga del marco principal de la ventana con la interfaz propia (`dist/index.html` o `localhost:5173` con `--dev-server`). En la fase 4 se agregará la web de YALEH (`trustedWebOrigins`).
- **Externo:** `shell.openExternal` solo acepta `https://yaleh-fbe1c.web.app` y `https://yaleh-fbe1c.firebaseapp.com`.
- **yaleh://:** `requestSingleInstanceLock` antes de `whenReady`; solo `yaleh://auth?token=…[&state=…]` y `yaleh://sesion?id=…`; lo demás se ignora y se registra (sin el token). La validación del `state` llega en la fase 4.
- **Electron:** `contextIsolation`, `sandbox`, `webSecurity` activados; `nodeIntegration` desactivado; DevTools deshabilitadas cuando la app está empaquetada.
- **CSP:** se inyecta en `index.html` solo al compilar (`vite.config.ts`), sin `'unsafe-inline'` para scripts; `frame-src` se genera desde `ALLOWED_SITES`. El servidor de desarrollo no tiene CSP porque Vite necesita un script en línea para la recarga en caliente.

### Limitaciones (Windows)

- **Alt+Tab, la tecla Windows y Ctrl+Alt+Supr no se pueden bloquear** desde una aplicación. Mitigación: ventana siempre al frente en nivel `screen-saver`, recuperación inmediata del foco y registro de cada pérdida.
- Desde Ctrl+Alt+Supr se puede abrir el Administrador de tareas y forzar el cierre, cerrar la sesión de Windows o apagar. Al reabrir YALEH la sesión aparece como **interrumpida**.
- Algunos atajos pueden no registrarse con `globalShortcut` si otra aplicación ya los tiene; se avisa en la consola y `before-input-event` los sigue bloqueando mientras YALEH tiene el foco.

### Salida de desarrollo

**Ctrl+Shift+F12** libera el kiosko de inmediato y lo registra (`dev-release`). Solo existe cuando la app **no** está empaquetada (`electron:dev` y `electron:preview`). En la versión empaquetada no se registra el atajo.

### Registro de eventos

`%APPDATA%\yaleh\session\` (en desarrollo): `session.json` (última sesión) y `events.json` (inicio, fin, retomada, interrumpida, pérdidas de foco, salida de desarrollo y enlaces inválidos, con fecha y hora). Si quedas en un estado raro durante el desarrollo, cierra la app y borra `session.json` para empezar de cero.

## Reglas de trabajo

- **Una fase a la vez.** Al terminar: ejecutar `typecheck`, `build` y `test`; resumir lo hecho y lo pendiente; estimar la duración de las fases siguientes; hacer commit con un mensaje claro; **esperar la aprobación** antes de seguir.
- **No rediseñar la interfaz.** Mantener los estilos actuales. Los colores viven en los tokens de `src/index.css` (`bg-canvas`, `text-ink`, `border-line`, `bg-accent`, …); cada componente migra a los tokens cuando se modifica en su fase. Los componentes nuevos usan tokens.
- **Solo servicios gratuitos.** Firebase plan Spark: Authentication, Firestore, Hosting, AI Logic y App Check. **Nunca** Cloud Storage ni Cloud Functions. Sin servidores propios.
- **Nada de secretos en el código.** Configuración de Firebase en variables de entorno de Vite (`.env`, con `.env.example` versionado). Modelos de Gemini, proveedor de App Check, sitios permitidos y límites en un único módulo: `shared/config.ts`.
- **Todo el bloqueo vive en el proceso principal.** La interfaz nunca decide si el kiosko se abre o se cierra.
- **Textos de la interfaz en español.** Código, variables y commits pueden ir en inglés.
- Si una librería o API no funciona como dice el brief, **detenerse y avisar** con alternativas en lugar de improvisar un cambio de alcance.
- Antes de eliminar o reescribir un archivo grande que el brief no menciona, **preguntar**.
- Mantener este archivo actualizado al cerrar cada fase.

## Datos clave

- Firebase: proyecto `Yaleh`, ID `yaleh-fbe1c`, plan Spark.
- Protocolo del escritorio: `yaleh://` (`yaleh://auth?...`, `yaleh://sesion?id=...`).
- IA: `gemini-3.8-flash` vía Firebase AI Logic (API de desarrollador). Búsqueda: API de Wikipedia en español detrás de `SearchProvider`. App Check con Fraud Defense (`ReCaptchaEnterpriseProvider`), obligatorio desde el 2/11/2026.
- SQLite: `node:sqlite` en el proceso principal (Electron 42, Node 24).

## Pendientes conocidos

- **URL del Moodle del TECBA:** `TECBA_MOODLE_URL` en `shared/config.ts` usa `https://moodle.org` como marcador (`TODO`). Es el único lugar que hay que cambiar.
- La URL de login de Google en `LoginPhase.tsx` apunta a `yaleh-fbe1c.web.app`, que aún no existe; la página se crea en la fase 4 (`TODO(fase 4)`).
- `yaleh://sesion` se analiza y se reenvía a la interfaz (`onSessionLink`), pero nadie lo usa todavía (fase 4).
- `WebViewPanel` sigue usando iframes (fase 8: `WebContentsView`). Muchos sitios de Google no se dejan mostrar en iframes.
- El límite de 8 pestañas está en `shared/config.ts`, pero se aplica en la fase 8.
- `AIWorkPanel.tsx` sigue siendo simulado (fase 7) y contiene un XSS conocido (`dangerouslySetInnerHTML`); la CSP impide ejecutar scripts inyectados en línea.
- El bundle de la interfaz pesa ~900 KB (Vite avisa); dividirlo con carga diferida queda para más adelante.
- `public/ai-banner.jpg` no se usa en ningún componente.
