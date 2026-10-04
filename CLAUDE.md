# CLAUDE.md — YALEH

YALEH es un entorno de estudio para estudiantes del TECBA con problemas de concentración (proyecto de grado de Mario Víctor Brañez Rodriguez). Tiene dos aplicaciones sobre una misma base de código:

- **Web** (Firebase Hosting): login con Google, carga de materiales (se extrae el texto) y preparación de la sesión, que termina con la descarga de un **archivo de sesión `.yaleh`**. Sin IA (revisión 1.6).
- **Escritorio** (Electron): bloquea el sistema operativo durante la sesión (kiosko), con o sin internet. No inicia sesión con Google: abre el `.yaleh` o empieza una sesión local. Dentro del kiosko: espacio de trabajo con IA (Gemini con conexión; modelo local sin conexión, revisión 1.8), pestañas internas, ofimática, historial y estadísticas.

Las dos aplicaciones funcionan por separado y se unen solo con el archivo `.yaleh` (como Safe Exam Browser; brief, revisión 1.5). El diseño anterior (enlaces `yaleh://`) queda en el tag de git `demo-antes-archivo`.

**Fuente de verdad:** [docs/BRIEF_YALEH.md](docs/BRIEF_YALEH.md). Si el código contradice el brief, gana el brief. El análisis del MVP de partida ("Safe Research Browser") está en [docs/INFORME_ANALISIS_SRB.md](docs/INFORME_ANALISIS_SRB.md).

## Estado

Rama de trabajo: `v1-yaleh` (el MVP original está en `main`). Remoto: GitHub `MarioVBR01/yaleh`.

| Fase | Estado |
| --- | --- |
| 1. Preparación (renombre, limpieza, temporizador, tsc, Vitest) | Hecha |
| 2. Seguridad del kiosko en el proceso principal | Hecha |
| 3. Modos, plataforma y SQLite básico | Hecha |
| 4. Firebase (Auth, Firestore, App Check, paso web → escritorio) | Hecha |
| 5. Vista principal estilo NotebookLM y sidebar | Hecha |
| 6. Archivos (extracción de texto) | Hecha |
| 7. IA (Gemini + búsqueda en Wikipedia) | Hecha |
| 8. Pestañas con WebContentsView, herramientas y YouTube | Hecha |
| 9. Editores de ofimática con exportación | Hecha |
| 10. Historial y estadísticas (SQLite; la sincronización pasa a v2) | Hecha |
| 10b. IA sin conexión (Qwen3.5-4B con node-llama-cpp, FTS5; revisión 1.8) | Hecha |
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
| `npm test` | Pruebas con Vitest (una ejecución), **con el Node de Electron** (`scripts/test.mjs`): el SQLite de Node 22 no tiene FTS5 |
| `npm run test:watch` | Vitest en modo observación (también con el Node de Electron) |
| `npm run bench:local-ai` | Mide el asistente sin conexión con el modelo real (chat, resumen, tarjetas) y escribe `docs/mediciones/ia-local-{gpu,cpu}.md` (`BENCH_GPU=off` o `auto`). Necesita el modelo descargado en `%APPDATA%\yaleh\models` |
| `npm run smoke:electron` | Compila y abre la app sin ventana visible, con una carpeta de datos temporal: comprueba que la interfaz carga con la CSP, que el preload expone `electronAPI`, que la IPC responde y que SQLite se crea con sus migraciones. No activa el kiosko ni toca la base real |
| `firebase deploy --only hosting --project yaleh-fbe1c` | Publica `dist/` en `https://yaleh-fbe1c.web.app` (ejecutar `npm run build` antes). Incluye `youtube.html`, el reproductor que usan las pestañas del escritorio |
| `firebase deploy --only firestore:rules --project yaleh-fbe1c` | Publica `firestore.rules` |
| `npm run db:inspect` | Muestra las últimas sesiones y eventos de la base local (solo lectura; funciona con la app abierta). Opciones: `-- --sessions 20 --events 50 --db <ruta>` |

Al cerrar cada fase deben pasar `typecheck`, `build` y `test` (y conviene `smoke:electron`).

**Node del sistema:** `npm test`, `db:inspect` y `bench:local-ai` usan el Node de Electron 42 (Node 24.19), así que no dependen del Node instalado (hoy 22.12, cuyo SQLite no trae FTS5). Ejecutar `npx vitest` directamente con Node 22 hace fallar las pruebas de FTS5.

**Problema conocido:** si `ELECTRON_RUN_AS_NODE` está definida en el entorno (la heredan, por ejemplo, los procesos lanzados por extensiones de VS Code), Electron arranca como Node y falla con `Cannot read properties of undefined (reading 'isPackaged')`. `smoke:electron` la quita automáticamente; para los demás comandos, ejecútalos desde una terminal normal.

## Estructura

```
electron/                   Proceso principal (TypeScript → esbuild → dist-electron/*.cjs)
  main.ts                   Ventana, IPC, apertura de .yaleh, guardias de red y navegación, arranque
  preload.ts                contextBridge → window.electronAPI (un único archivo CommonJS por sandbox)
  connectivity.ts           Detección del modo online/offline (net.isOnline + petición HTTPS a la web de YALEH)
  session/controller.ts     Controlador de sesión: idle → active → finished (+ resumable). Única autoridad del tiempo
  session/store.ts          Interfaz SessionStore + implementaciones JSON (solo para importar la fase 2) y en memoria
  db/database.ts            Apertura de yaleh.db (WAL), settings y perfil local
  db/migrations.ts          Migraciones versionadas (schema_migrations)
  db/sqlite-session-store.ts  SessionStore sobre SQLite (el que se usa)
  db/import-json.ts         Importación única de session.json / events.json de la fase 2
  kiosk/window.ts           Bloqueo y liberación de la ventana, recuperación del foco
  kiosk/shortcuts.ts        Atajos bloqueados y salida de desarrollo
  ipc/validate.ts           Origen del remitente, duración, ids, fuentes y notas
  navigation-policy.ts      Qué páginas y marcos pueden cargarse
  session-file-service.ts   Abrir un .yaleh: validar, uso único, guardar fuentes en SQLite, empezar la sesión
  db/workspace-repository.ts  Fuentes (texto en partes) y notas del modo offline
  db/history.ts             Historial de sesiones con contadores de eventos (fase 10)
  local-ai/service.ts       Asistente sin conexión: estado, requisitos, descarga, worker y generación (revisión 1.8)
  local-ai/worker.ts        utilityProcess con node-llama-cpp (→ dist-electron/ai-worker.mjs, ESM)
  local-ai/downloader.ts    Descarga reanudable (Range) con verificación SHA-256
  local-ai/retrieval.ts     Fragmentos relevantes con FTS5 (chat) o repartidos (resumen y tarjetas)
  local-ai/prompts.ts       Instrucciones y esquemas JSON del modelo local
  local-ai/requirements.ts  RAM mínima y espacio en disco
  local-ai/bench.ts         Medición (npm run bench:local-ai)
  tabs/tab-manager.ts       Pestañas internas con WebContentsView (máximo 8, ventanas nuevas → pestañas)
  tabs/resolve.ts           URL de una pestaña: sitio permitido, reproductor de YouTube o rechazo
  office/export.ts          .docx / .xlsx / .pptx en Documentos\YALEH (docx, ExcelJS, PptxGenJS)
  smoke.ts                  Prueba de humo (extracción, .yaleh, pestañas, ofimática, historial)
shared/                     Usado por el proceso principal y la interfaz (sin Node ni DOM)
  config.ts                 Sitios permitidos, herramientas, límites (8 pestañas, 500 MB, 1–180 min)
  allowlist.ts              isUrlAllowed()
  ipc-types.ts              Canales IPC y tipo ElectronAPI
  text.ts                   splitText(): partes de 200 000 caracteres (límite de 1 MiB de Firestore)
  session-file.ts           Formato .yaleh: creación (web), checksum y validación (escritorio)
  youtube.ts                extractYouTubeId() y URL del reproductor propio
src/                        Interfaz React (web y escritorio). Alias: @/ → src, @shared/ → shared
  App.tsx                   Fases. Web: login → dropzone → timer-select → confirm-session (descarga .yaleh; luego "Descargar otro archivo" o "Preparar una nueva sesión").
                            Escritorio: desktop-start (bienvenida) → dropzone → timer-select → confirm-session → kiosk → session-complete,
                            o desktop-start → .yaleh → kiosk. Nunca login. + resume-offer con una sesión interrumpida
  lib/session-file.ts       Web: generar y descargar el .yaleh. Escritorio: aplicar al estado un .yaleh abierto
  lib/mode.ts               useModeFlags(): qué se muestra según plataforma y modo (herramientas online, IA, aviso)
  firebase/                 app.ts (inicialización + App Check), auth.ts (Google), sessions.ts (users/{uid}/sessions)
  data/                     workspace.ts (Firestore / SQLite por IPC / memoria), sources.ts (Firestore),
                            file-types.ts + extract.ts + useIngest.ts (validación y extracción de PDF/DOCX/TXT)
  ai/                       provider.ts (proveedor común: Gemini y modelo local, selectAssistant),
                            gemini.ts (AI Logic, respaldo de modelos), search.ts (Wikipedia, SearchProvider),
                            study-items.ts (esquemas y validación), errors.ts (429, App Check, red)
  workspace/                WorkspaceView (Fuentes · Chat · Estudio), columnas, NotesBox, Markdown
  store/appStore.ts         Estado global y reducer
  context/AppContext.tsx    Provider + useApp (acepta `initial` para pruebas)
  lib/electron.ts           isElectron(), getElectronAPI(), closeApp()
  lib/stats.ts              computeStats(): minutos por día/semana, completadas, interrumpidas, foco
  lib/useSessionHistory.ts  Historial por IPC (vacío en el navegador)
  kiosk/useExternalTabs.ts  Abrir pestañas externas y sincronizar su visibilidad con el proceso principal
  panels/ExternalTabPanel.tsx  Hueco donde se dibuja la WebContentsView (informa sus límites)
  panels/OfflineEditorPanel.tsx  Documento (TipTap), hoja y presentación con exportación
  panels/HistoryPanel.tsx, StatsPanel.tsx  Historial y estadísticas desde SQLite (recharts)
  youtube/main.ts           Página del reproductor (youtube.html, entrada propia de Vite)
  test/electron-mock.ts     window.electronAPI simulada para las pruebas de la interfaz
  phases/ kiosk/ panels/    Pantallas, layout del kiosko y paneles (phases/LocalAiCard.tsx: descarga del modelo en la bienvenida)
  index.css                 Tokens de color (@theme) y estilos globales
scripts/                    build-electron.mjs, smoke-electron.mjs, db-inspect.mjs, test.mjs, bench-local-ai.mjs
docs/                       Brief, informe del MVP y BUGS.md (registro de errores con plantilla)
```

Una sola compilación de la interfaz (`dist/`, `base: './'`, entradas `index.html` y `youtube.html`) sirve para Firebase Hosting y para `file://` en Electron.

## Archivo de sesión .yaleh (revisión 1.5)

- **Web** (independiente; `npm run dev` o Hosting): login con Google → dropzone → tiempo → confirmación → **"Descargar archivo de sesión"** → instrucciones (revisión 1.6). La web nunca bloquea nada ni abre el escritorio.
- **Formato** (`shared/session-file.ts`): JSON con `format` "yaleh-session", `version` 1, `sessionId` (nuevo en cada descarga), `createdAt`, `expiresAt` (24 h), `createdBy`, `durationSeconds`, `sources` [{id, name, type, size, text}] y `checksum` SHA-256 de `canonicalPayload()` (orden de campos fijo; solo integridad). Máximo 50 MB (`LIMITS`).
- **Escritorio:** bienvenida con "Iniciar" (flujo local) y "Abrir archivo de sesión (.yaleh)". El archivo también se abre arrastrándolo a la bienvenida, por los argumentos de arranque o por `second-instance`. `openSessionFile` (proceso principal) valida, rechaza si hay sesión en curso o si el `sessionId` ya está en SQLite (uso único), guarda las fuentes en SQLite y llama a `controller.start`: **bloquea y empieza el tiempo de inmediato**. Los rechazos se registran como `session-file-rejected`.
- **Modo:** lo decide el proceso principal según la conexión al empezar (archivo o flujo local). En el escritorio los datos van siempre a SQLite.
- **Pendiente (fase 11):** asociar `.yaleh` con la app en el instalador (doble clic).

## Firebase (fase 4)

- Configuración en `.env` (no versionado; plantilla en `.env.example`). Proyecto `yaleh-fbe1c`. Reglas: `firestore.rules` (cada usuario solo `users/{su uid}/**`). Firestore solo lo usa la web.
- Web: login solo con Google (`signInWithPopup`). El escritorio no inicia sesión.
- **App Check:** AI Logic lo exige. Web publicada: reCAPTCHA Enterprise (clave en `.env`). Escritorio y localhost: token de depuración `VITE_APPCHECK_DEBUG_TOKEN`, registrado en la consola como "YALEH escritorio demo (borrar)". `VITE_APPCHECK_DEBUG_ON_WEB=false`.

## Espacio de trabajo, fuentes e IA (fases 5 a 7)

- `WorkspaceView` reemplaza al Dashboard: Fuentes · Chat · Estudio (pestañas en pantallas angostas). **Solo en el kiosko del escritorio** (revisión 1.6). `state.workspaceId` es el id de la sesión (local o el `sessionId` del `.yaleh`) en SQLite; en la web es un borrador en Firestore donde se guardan las fuentes extraídas antes de descargar el `.yaleh`.
- **Fuentes:** PDF/DOCX/TXT validados por extensión + MIME + firma; texto extraído en el cliente (pdf.js 6, mammoth) y guardado en partes: Firestore `sources/{id}/chunks/{n}` (web) o SQLite `source_chunks` (escritorio, migración 2). En el escritorio no se agregan fuentes dentro del kiosko.
- **IA:** `AI.models` en `shared/config.ts` (`gemini-3.5-flash-lite` → `gemini-3.8-flash` si hay 429/500/503). Chat con streaming basado en las fuentes; Wikipedia opcional (fuentes como texto). Resumen/cuestionario/tarjetas con esquema JSON validado; informe en markdown (`react-markdown`, sin HTML, enlaces como texto). En Firestore se guardan como `studyItems`.
- Sin conexión: responde el modelo local si está instalado (ver abajo); si no, "Disponible próximamente" con la indicación para descargarlo. Las notas funcionan siempre.

## Asistente sin conexión (revisión 1.8)

- **Modelo:** Qwen3.5-4B, GGUF Q4_K_M (2,74 GB), Apache 2.0, solo texto (sin `mmproj`). URL con revisión fija y SHA-256 en `LOCAL_AI` (`shared/config.ts`). Se guarda en `userData/models` (desarrollo: `%APPDATA%\yaleh\models`). **No va en el instalador.**
- **Motor:** node-llama-cpp 3.22 (binarios precompilados para Windows; **primer módulo nativo del proyecto**) en un `utilityProcess` (`dist-electron/ai-worker.mjs`, ESM, `node-llama-cpp` externo en esbuild). Se crea con el primer pedido y se cierra al terminar la sesión (libera ~4 GB). `QwenChatWrapper({ variation: '3.5', thoughts: 'discourage' })`: sin "pensamiento". GPU automática (`LOCAL_AI.gpu = 'auto'`: Vulkan en la Iris Xe, CPU si no hay); tras una caída del proceso, solo CPU.
- **Descarga:** solo desde la bienvenida, con conexión y fuera de la sesión (`LocalAiService` lo vuelve a comprobar); al empezar una sesión se pausa (`lock` del controlador). `.part` + Range para reanudar; SHA-256 al terminar; si no coincide, se borra. Al arrancar se considera instalado si el archivo final tiene el tamaño exacto (no se vuelve a calcular el hash).
- **Requisitos:** RAM ≥ 7,5 GiB (equipos de "8 GB") y espacio libre ≥ lo que falta descargar + 512 MB. Si no, estado `unsupported` con el motivo y sin botón.
- **Recuperación:** migración 3: `source_passages` (fragmentos de 1 000 caracteres de cada fuente) + `source_passages_fts` (FTS5, `unicode61 remove_diacritics 2`, con triggers). `WorkspaceRepository` los mantiene; `indexMissingPassages()` indexa al arrancar las fuentes anteriores. Chat: consulta con prefijos de las palabras de la pregunta, ranking bm25; resumen y tarjetas: fragmentos repartidos. Presupuesto: `LOCAL_AI.sourceBudgetChars`.
- **Proveedor común** (`src/ai/provider.ts`): `selectAssistant` → web o sesión online con conexión: Gemini; si no, local si está instalado; si no, ninguno (`needs-download` / `unsupported`). Local: chat, resumen y tarjetas (JSON con gramática de llama.cpp). Cuestionario, informe y Wikipedia: solo en línea (botones deshabilitados).
- **Respuestas breves:** chat de 160 tokens (500 si la pregunta pide detalle: `wantsDetail`), resumen de 4 ideas clave, 5 tarjetas (`LOCAL_AI.maxTokens`, `LOCAL_SCHEMAS`). Aviso fijo `LOCAL_SLOW_NOTICE` en el chat y en Estudio.
- **Interfaz:** etiqueta "Asistente en línea" / "Asistente sin conexión"; el chat muestra el texto a medida que se genera y tiene botón para detener; Estudio muestra los tokens generados.
- **Tiempos medidos:** `docs/MEDICIONES_IA_LOCAL.md` (resumen y decisión CPU/GPU) y `docs/mediciones/` (cada corrida). Presupuesto de fragmentos: 6 000 caracteres (leer el contexto es lo más lento).

## Pestañas, ofimática, historial (fases 8 a 10)

- **Pestañas (`TabManager`):** cada página externa es una `WebContentsView` con sandbox, dibujada encima del hueco de `ExternalTabPanel` (la interfaz informa los límites; se oculta mientras hay un diálogo). Máximo `LIMITS.maxTabs` (8): al llegar, aviso en la interfaz. Ventanas nuevas de sitios permitidos → `tabs:open-request` → pestaña nueva. Los enlaces de YouTube se convierten en `YOUTUBE_PLAYER_URL?v=<id>` (página propia en Hosting con `youtube-nocookie` y `referrerpolicy`); youtube.com sigue bloqueado. Al terminar la sesión se cierran todas.
- **Ofimática:** la interfaz envía el contenido (JSON de TipTap, filas o diapositivas) por `office:export`; el proceso principal valida (`parseOfficeRequest`) y guarda en `Documentos\YALEH` como `Título AAAA-MM-DD HH-mm-ss.ext`, sin sobrescribir. Sin diálogo. Funciona sin conexión. `docx`, `exceljs` y `pptxgenjs` son externos en esbuild (se cargan de `node_modules`).
- **Historial y estadísticas:** `history:list` → `listSessionHistory(db)` (contadores de `focus-lost`, `connection-lost`, `session-interrupted` y motivo del fin). `computeStats` en la interfaz. Solo suman minutos las sesiones completadas (no se registra cuánto duró una interrumpida). En el navegador: "Disponible en la aplicación de escritorio".
- **Sincronización con Firestore:** versión 2 (revisión 1.7).

## Modos online / offline (fase 3)

- **Detección (proceso principal, `connectivity.ts`):** online si `net.isOnline()` y la web de YALEH responde una petición HEAD en menos de 5 s (cualquier código HTTP cuenta). Se repite cada 30 s, al volver de la suspensión (`powerMonitor`) y cuando la interfaz ve eventos `online`/`offline` (solo piden una nueva comprobación; decide el proceso principal). Parámetros en `CONNECTIVITY` (`shared/config.ts`).
- **Escritorio sin login:** arranca en la bienvenida (`desktop-start`), que indica si hay conexión.
- **Modo de la sesión** (`sessionMode`, guardado en `sessions.mode`): online si hay conexión al empezar, offline si no. Lo decide el proceso principal.
- **Qué se muestra (`useModeFlags`):** en la web, todo. En el escritorio, las herramientas online y la IA solo en una sesión online con conexión. Si se corta la red en una sesión online: aviso "Sin conexión: puedes seguir con los módulos locales"; el kiosko y el tiempo no cambian; el proceso principal registra `connection-lost` / `connection-restored`.

## SQLite (fase 3)

- `userData/yaleh.db` (en desarrollo: `%APPDATA%\yaleh\yaleh.db`), WAL, `node:sqlite`. Solo el proceso principal la abre; la interfaz usa IPC.
- Tablas: `sessions`, `session_events`, `local_profile`, `settings` y `schema_migrations` (esquema en el brief, sección 8.5).
- **Migraciones:** `electron/db/migrations.ts`. Nunca editar una migración publicada; agregar una nueva con la versión siguiente. `runMigrations` es idempotente y cada migración va en una transacción.
- **Pruebas de contrato** (`electron/db/store-contract.test.ts`): las mismas pruebas corren contra JSON, memoria y SQLite. Toda implementación nueva de `SessionStore` debe pasarlas.

## Seguridad del kiosko (fase 2)

Todo el bloqueo vive en el proceso principal. La interfaz pide iniciar la sesión (`startSession`) pero **no puede terminarla**: no existe canal para desactivar el kiosko.

- **Sesión:** `SessionController` guarda `sessionEndsAt`, envía `session:tick` cada segundo y `session:ended` al terminar. El tiempo se calcula con el reloj, no contando ticks. En Electron la interfaz no tiene temporizador propio; en el navegador queda uno de vista previa (no bloquea nada).
- **Mientras la sesión está activa:** se rechaza `app:close`, se cancela el evento `close` de la ventana (salvo cuando Windows se apaga o cierra la sesión), se bloquean atajos con `before-input-event` y `globalShortcut`, y la ventana está en kiosko, pantalla completa, sin menú y siempre al frente (`screen-saver`). Si pierde el foco, lo recupera y registra la pérdida.
- **Sin salida anticipada:** no hay código ni salida de emergencia (brief, revisión 1.2).
- **Sesión interrumpida:** al arrancar, `controller.recover()` detecta una sesión `active` guardada; la registra como interrumpida y, si queda tiempo, la interfaz ofrece retomarla (`resume-offer`).
- **Red:** `webRequest.onBeforeRequest` bloquea `mainFrame` y `subFrame` fuera de `ALLOWED_SITES`. `will-navigate`: la ventana principal solo puede mostrar la interfaz propia. `setWindowOpenHandler` deniega todas las ventanas nuevas; en las pestañas, las de sitios permitidos se convierten en pestañas internas. Permisos: solo `fullscreen` y `clipboard-sanitized-write`.
- **IPC:** cada handler comprueba que el mensaje venga del marco principal de la ventana con la interfaz propia (`dist/index.html` o `localhost:5173` con `--dev-server`).
- **Sin salidas al exterior:** no hay `shell.openExternal` ni protocolo `yaleh://` (revisión 1.5). `requestSingleInstanceLock` antes de `whenReady`: una segunda instancia solo entrega su archivo `.yaleh`.
- **Diálogo de archivos:** solo el de "Abrir archivo de sesión", desde el proceso principal y solo fuera de la sesión.
- **Electron:** `contextIsolation`, `sandbox`, `webSecurity` activados; `nodeIntegration` desactivado; DevTools deshabilitadas cuando la app está empaquetada.
- **CSP:** se inyecta en `index.html` solo al compilar (`vite.config.ts`), sin `'unsafe-inline'` para scripts; `frame-src` se genera desde `ALLOWED_SITES`. El servidor de desarrollo no tiene CSP porque Vite necesita un script en línea para la recarga en caliente.

### Limitaciones (Windows)

- **Alt+Tab, la tecla Windows y Ctrl+Alt+Supr no se pueden bloquear** desde una aplicación. Mitigación: ventana siempre al frente en nivel `screen-saver`, recuperación inmediata del foco y registro de cada pérdida.
- Desde Ctrl+Alt+Supr se puede abrir el Administrador de tareas y forzar el cierre, cerrar la sesión de Windows o apagar. Al reabrir YALEH la sesión aparece como **interrumpida**.
- Algunos atajos pueden no registrarse con `globalShortcut` si otra aplicación ya los tiene; se avisa en la consola y `before-input-event` los sigue bloqueando mientras YALEH tiene el foco.

### Salida de desarrollo

**Ctrl+Shift+F12** libera el kiosko de inmediato y lo registra (`dev-release`). Solo existe cuando la app **no** está empaquetada (`electron:dev` y `electron:preview`). En la versión empaquetada no se registra el atajo.

### Registro de eventos

Tabla `session_events` de `yaleh.db`: inicio, fin, retomada, interrumpida, pérdidas de foco, cortes y vueltas de la conexión, salida de desarrollo y enlaces inválidos, con fecha y hora. Consúltalos con `npm run db:inspect`. Si quedas en un estado raro durante el desarrollo, cierra la app y borra `%APPDATA%\yaleh\yaleh.db*` (se vuelve a crear vacía). Los JSON de la fase 2 quedan como `%APPDATA%\yaleh\session\*.json.migrated`.

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
- Unión web → escritorio: archivo de sesión `.yaleh` (24 h, uso único, máximo 50 MB).
- IA: `gemini-3.5-flash-lite` (respaldo `gemini-3.8-flash`) vía Firebase AI Logic (API de desarrollador). Búsqueda: API de Wikipedia en español detrás de `SearchProvider`. App Check obligatorio para AI Logic: Fraud Defense (`ReCaptchaEnterpriseProvider`) en la web y token de depuración en el escritorio.
- IA sin conexión: Qwen3.5-4B Q4_K_M (Apache 2.0) con node-llama-cpp en un `utilityProcess`; descarga aparte (2,74 GB) desde la bienvenida; FTS5 para los fragmentos (migración 3). Requisito: 8 GB de RAM.
- SQLite: `node:sqlite` en el proceso principal (Electron 42, Node 24).

## Pendientes conocidos

- **Token de depuración de App Check** en el escritorio: provisional (se puede extraer del instalador). Borrarlo de la consola cuando exista una alternativa.
- **Asociación de `.yaleh`** con la app (doble clic): en el instalador, fase 11.
- **Sincronización:** pasa a la versión 2 (el escritorio no tiene cuenta de Google).
- **Empaquetado del asistente sin conexión (fase 11):** `node-llama-cpp` y `@node-llama-cpp/win-x64` deben quedar fuera del asar (`asarUnpack`); incluir solo los binarios de Windows x64 (no CUDA ni ARM) para no inflar el instalador.
- **Asistente sin conexión:** responde más lento que Gemini (ver mediciones); con documentos largos solo lee una parte (presupuesto de fragmentos); el historial del chat local también vive en memoria.
- **Exportación a PDF** de documentos: versión 2.
- **Errores encontrados al probar:** en [docs/BUGS.md](docs/BUGS.md); se corrigen antes de la fase 11.
- `npm audit`: quedan avisos sin uso explotable (`@grpc/grpc-js` del SDK de Firestore para Node, `image-size` de PptxGenJS, que solo afecta a imágenes y no se usan). `uuid` se fuerza a ^11.1.1 con `overrides`.
- El reproductor de YouTube vive en Hosting: sin conexión o sin publicar `youtube.html`, la pestaña muestra un error.
- Iniciar sesión de Google dentro de una pestaña (Classroom, Drive) puede abrir ventanas emergentes que se descartan si no son de sitios permitidos.
- El registro de Windows puede conservar el protocolo `yaleh://` de ejecuciones anteriores (apunta a Electron en desarrollo); ya no se usa.
- El historial del chat vive en memoria.
- Las estadísticas solo cuentan minutos de las sesiones completadas.
- Sin pruebas de reglas con el emulador ni del login de Google.
- `local_profile` y `settings` existen, pero todavía nadie las lee (serán la cuenta de destino de la sincronización, versión 2).
- `state.activityHistory` (registro de actividad del MVP) sigue en el reducer pero ya no se muestra.
- El bundle de la interfaz pesa ~900 KB (Vite avisa); dividirlo con carga diferida queda para más adelante.
- `public/ai-banner.jpg` no se usa en ningún componente.
