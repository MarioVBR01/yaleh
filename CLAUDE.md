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
| 2. Seguridad del kiosko en el proceso principal | Pendiente |
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
| `npm run dev` | Servidor Vite en `http://localhost:5173` |
| `npm run electron:dev` | Vite + Electron en modo desarrollo |
| `npm run build` | Compila la interfaz en `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Pruebas con Vitest (una ejecución) |
| `npm run test:watch` | Vitest en modo observación |

Al cerrar cada fase deben pasar `typecheck`, `build` y `test`.

## Estructura actual

```
main.js / preload.cjs     Proceso principal y preload de Electron (pasan a electron/*.ts en la fase 2)
index.html                Entrada de Vite
src/
  App.tsx                 Enrutado por fases (login → dropzone → timer-select → kiosk → session-complete)
  store/appStore.ts       Estado global: tipos, estado inicial y reducer
  context/AppContext.tsx  Provider + hook useApp (acepta `initial` para pruebas)
  lib/electron.ts         Envoltorios de window.electronAPI
  types/electron.d.ts     Tipos de window.electronAPI
  phases/                 Pantallas de cada fase
  kiosk/                  KioskLayout (temporizador), SideBar, BottomBar
  panels/                 Paneles de las pestañas
  index.css               Tokens de color (@theme) y estilos globales
  test/setup.ts           Configuración de Vitest (jsdom)
docs/                     Brief e informe del MVP
```

**Estructura objetivo** (brief, sección 3): un solo paquete; `src/` (interfaz compartida web/escritorio, una sola compilación en `dist/` con `base: './'`), `electron/` (proceso principal y preload en TypeScript, empaquetados con esbuild en `dist-electron/`), `shared/` (configuración única e IPC, usada por ambos).

## Reglas de trabajo

- **Una fase a la vez.** Al terminar: ejecutar `typecheck`, `build` y `test`; resumir lo hecho y lo pendiente; estimar la duración de las fases siguientes; hacer commit con un mensaje claro; **esperar la aprobación** antes de seguir.
- **No rediseñar la interfaz.** Mantener los estilos actuales. Los colores viven en los tokens de `src/index.css` (`bg-canvas`, `text-ink`, `border-line`, `bg-accent`, …); cada componente migra a los tokens cuando se modifica en su fase.
- **Solo servicios gratuitos.** Firebase plan Spark: Authentication, Firestore, Hosting, AI Logic y App Check. **Nunca** Cloud Storage ni Cloud Functions. Sin servidores propios.
- **Nada de secretos en el código.** Configuración de Firebase en variables de entorno de Vite (`.env`, con `.env.example` versionado). Modelos de Gemini, proveedor de App Check, sitios permitidos y límites (8 pestañas, 500 MB) en un único módulo: `shared/config.ts`.
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

- URL del Moodle del TECBA: hoy se usa `moodle.org` como marcador (`TODO(fase 2)` en `KioskLayout.tsx`, `Dashboard.tsx` y `WebViewPanel.tsx`).
- La URL de login de Google en `LoginPhase.tsx` apunta a `yaleh-fbe1c.web.app`, que aún no existe; la página se crea en la fase 4 (`TODO(fase 4)`).
- `AIWorkPanel.tsx` sigue siendo simulado (fase 7) y contiene un XSS conocido (`dangerouslySetInnerHTML`).
- `public/ai-banner.jpg` no se usa en ningún componente.
