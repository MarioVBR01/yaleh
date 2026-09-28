# Informe de análisis — Safe Research Browser (SRB)

**Proyecto:** Safe Research Browser (SRB) — Proyecto de Grado TECBA 2026
**Ruta analizada:** `C:\Users\usser\Desktop\starting-new-project-assistance`
**Fecha del análisis:** 26/09/2026
**Alcance:** revisión completa del código fuente, configuración, compilación, seguridad y funcionalidad.

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Descripción de la aplicación](#2-descripción-de-la-aplicación)
3. [Stack tecnológico](#3-stack-tecnológico)
4. [Estructura del proyecto](#4-estructura-del-proyecto)
5. [Arquitectura](#5-arquitectura)
6. [Análisis por módulo](#6-análisis-por-módulo)
7. [Verificación de compilación y tipos](#7-verificación-de-compilación-y-tipos)
8. [Errores funcionales](#8-errores-funcionales)
9. [Análisis de seguridad](#9-análisis-de-seguridad)
10. [Funcionalidades simuladas o incompletas](#10-funcionalidades-simuladas-o-incompletas)
11. [Calidad de código y mantenibilidad](#11-calidad-de-código-y-mantenibilidad)
12. [Rendimiento](#12-rendimiento)
13. [Recomendaciones y hoja de ruta](#13-recomendaciones-y-hoja-de-ruta)
14. [Conclusión](#14-conclusión)

---

## 1. Resumen ejecutivo

SRB es una aplicación de escritorio construida con **Electron + React 19 + TypeScript + Vite + Tailwind CSS**. Su propósito es ofrecer un entorno de estudio "blindado": el estudiante inicia sesión, carga sus documentos, elige la duración de la sesión y la aplicación entra en **modo kiosko**, en el que solo puede navegar por sitios académicos de una lista blanca y usar herramientas internas (enciclopedia offline, editor ofimático, Pomodoro, asistente IA, estadísticas).

| Aspecto | Valoración | Comentario |
|---|---|---|
| Interfaz de usuario | ⭐⭐⭐⭐⭐ | Muy completa, moderna y consistente; animaciones cuidadas |
| Organización del código | ⭐⭐⭐⭐ | Separación clara por fases, paneles y layout; JSDoc en español |
| Gestión de estado | ⭐⭐⭐⭐ | Context + `useReducer` tipado y predecible |
| Funcionalidad real | ⭐⭐ | IA, login social y parte de los datos son simulados |
| Seguridad / "blindaje" | ⭐ | El bloqueo puede evadirse con facilidad (ver sección 9) |
| Infraestructura (tests, lint, empaquetado, Git) | ⭐ | Inexistente |

**Hallazgos más importantes:**

- 🔴 **El temporizador de sesión corre al doble de velocidad** (dos intervalos simultáneos).
- 🔴 **La pantalla de "Sesión completada" nunca llega a verse**: la aplicación se cierra al llegar a cero.
- 🔴 **La lista blanca solo se aplica a la barra de direcciones**; la navegación dentro del iframe, los pop-ups y el botón "abrir en ventana nueva" la evaden.
- 🔴 **El renderer puede desactivar el kiosko o abrir cualquier URL externa** en cualquier momento.
- 🟠 **El token de autenticación del deep link no se verifica** y ni siquiera se usa.
- 🟠 **`tsc` falla**: configuración inválida en `tsconfig.json` y 6 errores de tipos.
- 🟡 La configuración de tema (color, fuente, modo claro) **no tiene efecto visual**.

---

## 2. Descripción de la aplicación

### 2.1 Flujo de usuario

```
┌─────────┐   ┌──────────┐   ┌──────────────┐   ┌────────┐   ┌──────────────────┐
│  Login  │──▶│ Dropzone │──▶│ Timer select │──▶│ Kiosko │──▶│ Sesión completada│
└─────────┘   └──────────┘   └──────────────┘   └────────┘   └──────────────────┘
 Google /       Carga de        25/50/90 min       Entorno        Métricas y
 Facebook /     PDF, DOCX,      o manual           bloqueado      cierre
 manual /       PPTX, XLSX,     (1–480 min)        con pestañas
 invitado       CSV, MP4
                (máx. 500 MB)
```

### 2.2 Funcionalidades dentro del kiosko

| Módulo | Descripción |
|---|---|
| **Dashboard** | Accesos rápidos a sitios educativos, material offline, videos, imágenes y trabajo con IA |
| **Navegador (WebView)** | Iframe con barra de direcciones y validación por lista blanca |
| **Enciclopedia offline ("Encarta")** | 6 áreas del conocimiento con materias, temas y artículos locales |
| **Ofimática offline** | Editor de texto (TextMaker), hoja de cálculo (PlanMaker) y presentaciones; exporta a TXT/HTML/CSV |
| **Trabajo con IA** | Chat tipo tutor y generación de resumen, flashcards, quiz y feedback (inspirado en NotebookLM) |
| **Historial** | Registro de archivos, herramientas, sitios y búsquedas con filtros |
| **Pomodoro** | Temporizador 25/5/15 con alerta sonora (Web Audio API) |
| **Descargas** | Explorador de los archivos cargados en el Dropzone |
| **Estadísticas** | Gráficas con Recharts sobre la actividad de la sesión |
| **Configuración** | Color de acento, tamaño de fuente, modo oscuro/claro |

---

## 3. Stack tecnológico

| Categoría | Tecnología | Versión |
|---|---|---|
| Escritorio | Electron | ^42.4.1 |
| UI | React / React DOM | 19.2.6 |
| Lenguaje | TypeScript | 5.9.3 |
| Bundler | Vite | 7.3.2 |
| Estilos | Tailwind CSS (+ `@tailwindcss/vite`) | 4.1.17 |
| Animaciones | framer-motion | ^12.40.0 |
| Iconos | lucide-react | ^1.18.0 |
| Gráficas | recharts | ^3.8.1 |
| Utilidades CSS | clsx, tailwind-merge | 2.1.1 / 3.4.0 |
| Backend (declarado) | firebase | ^12.15.0 — **instalado pero no importado en ningún archivo** |
| Build auxiliar | vite-plugin-singlefile | 2.3.0 |
| Desarrollo | concurrently, wait-on | ^10 / ^9 |

**Scripts disponibles** (`package.json`):

| Script | Acción |
|---|---|
| `npm run dev` | Servidor Vite en `localhost:5173` |
| `npm run build` | Build de producción a `dist/` |
| `npm run preview` | Previsualización del build |
| `npm run electron:dev` | Vite + Electron en paralelo |

No existen scripts de `lint`, `typecheck`, `test` ni de empaquetado (`electron-builder` / `electron-forge`).

---

## 4. Estructura del proyecto

```
starting-new-project-assistance/
├── main.js                  # Proceso principal de Electron (ventana, kiosko, IPC, deep links)
├── preload.cjs              # Puente seguro (contextBridge) → window.electronAPI
├── index.html               # Entrada HTML de Vite
├── vite.config.ts           # React + Tailwind + singlefile, alias "@"
├── tsconfig.json            # TS estricto (con una opción inválida, ver §7)
├── package.json
├── AI_APPLICATION_REPORT.md / .json   # Documentación previa (parcialmente desactualizada)
├── public/                  # Imágenes: banners, logo, tarjetas de Encarta
├── dist/                    # Build generado (index.html de ~959 KB)
└── src/
    ├── main.tsx             # Punto de entrada React
    ├── App.tsx              # Enrutado por fases con AnimatePresence
    ├── index.css
    ├── context/AppContext.tsx   # Provider + hook useApp y acciones de alto nivel
    ├── store/appStore.ts        # Tipos, estado inicial y reducer
    ├── lib/electron.ts          # Wrappers de window.electronAPI
    ├── types/electron.d.ts      # Tipado global de electronAPI
    ├── utils/cn.ts              # clsx + tailwind-merge
    ├── phases/                  # Login, Dropzone, TimerSelect, SessionComplete
    ├── kiosk/                   # KioskLayout, TopBar, SideBar, BottomBar
    └── panels/                  # 10 paneles funcionales
```

**Tamaño:** 29 archivos fuente, aproximadamente **6.200 líneas** de TypeScript/TSX. Los archivos más grandes son `OfflineEditorPanel.tsx` (494), `LoginPhase.tsx` (482), `AIWorkPanel.tsx` (481) y `PomodoroPanel.tsx` (475).

---

## 5. Arquitectura

### 5.1 Procesos de Electron

```
┌──────────────────────── Proceso principal (main.js) ─────────────────────────┐
│ BrowserWindow (contextIsolation: true, nodeIntegration: false)               │
│ IPC handlers: activate-kiosk · deactivate-kiosk · close-app · open-external │
│ Protocolo personalizado: project-grade-planb://auth?token=...                │
│ Single instance lock + second-instance / open-url                            │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ preload.cjs (contextBridge)
┌──────────────────────────────▼───────────────────────────────────────────────┐
│ Renderer (React): window.electronAPI.{activateKiosk, deactivateKiosk,        │
│                   closeApp, openExternal, onAuthToken}                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

✅ **Correcto:** `contextIsolation: true`, `nodeIntegration: false` y exposición de una API mínima mediante `contextBridge`.

### 5.2 Gestión de estado

Patrón tipo Redux con `useReducer` y un Context global:

- **`AppState`**: `phase`, `session`, `uploadedFiles`, `sessionDuration`, `timeRemaining`, `kioskActive`, `tabs`, `activeTabId`, `theme`, `activityHistory` (máx. 200), `activeSidePanel`.
- **14 acciones**: `SET_PHASE`, `SET_SESSION`, `ADD_FILES`, `REMOVE_FILE`, `SET_SESSION_DURATION`, `START_KIOSK`, `TICK_TIMER`, `END_SESSION`, `ADD_TAB`, `CLOSE_TAB`, `SET_ACTIVE_TAB`, `UPDATE_THEME`, `ADD_ACTIVITY`, `SET_SIDE_PANEL`.
- **Helpers en el contexto**: `openTab`, `closeTab`, `logActivity`, `signIn`, `signInAnonymous`, `updateTheme`, `addFiles`, `removeFile`.

El estado **es solo en memoria**: no se guarda nada entre ejecuciones.

### 5.3 Flujo de autenticación con Google (diseñado)

1. El usuario pulsa "Google", y la aplicación abre `https://project-grade-planb.firebaseapp.com/index.html` en el navegador del sistema.
2. Firebase autentica y redirige a `project-grade-planb://auth?token=<ID_TOKEN>`.
3. Windows lanza una segunda instancia; `main.js` captura el enlace en `second-instance` y reenvía el token por IPC (`auth:token-received`).
4. `LoginPhase` recibe el token y muestra "¡Autenticación exitosa!".
5. Al pulsar continuar, se registra un usuario con **datos fijos** (`Estudiante Autenticado`, `usuario@gmail.com`). **El token no se valida ni se decodifica.**

---

## 6. Análisis por módulo

### 6.1 Proceso principal — `main.js` / `preload.cjs`

| Punto | Estado |
|---|---|
| Configuración segura de `webPreferences` | ✅ |
| Carga de `dist/index.html` en producción y de `localhost:5173` en desarrollo | ✅ |
| Modo kiosko (`setKiosk`, `setFullScreen`, `setAlwaysOnTop('screen-saver')`) | ✅ Implementado |
| `activate-kiosk` recibe `durationSeconds` pero **no la usa** (el tiempo lo controla el renderer) | ⚠️ |
| `deactivate-kiosk` y `close-app` sin ninguna condición | 🔴 |
| `open-external` acepta **cualquier** URL | 🔴 |
| Deep link sin validar origen, `state` ni `nonce` | 🔴 |
| `requestSingleInstanceLock()` se ejecuta después de registrar `whenReady` | ⚠️ Conviene hacerlo antes |
| No hay `setWindowOpenHandler`, `will-navigate` ni `webRequest.onBeforeRequest` | 🔴 |
| No se usa `globalShortcut` pese a que el código lo menciona | ⚠️ |
| DevTools disponibles también en producción | 🔴 |
| Comentario residual `/***************************  */` al final del archivo | 🟡 |

### 6.2 Fases

| Fase | Observaciones |
|---|---|
| **LoginPhase** | Detecta si hay conexión (`navigator.onLine`). Google usa deep link, pero el token se ignora. Facebook y el login manual son **simulados** con `setTimeout` y marcan `isAuthenticated: true` sin ninguna verificación. Contiene decenas de líneas en blanco sobrantes. |
| **DropzonePhase** | Valida tipo MIME y un límite total de 500 MB. **No lee el contenido** de los archivos (`dataUrl` nunca se rellena). En Windows, algunos archivos (`.csv`, en ocasiones `.docx`) llegan con `file.type` vacío o distinto, así que se rechazan erróneamente. |
| **TimerSelectPhase** | Opciones de 25/50/90 minutos o manual (1–480). `parseInt` sin radix; acepta valores como `"10abc"`. |
| **SessionCompletePhase** | Muestra métricas, pero en la práctica **no se llega a ver** (ver §8.2). Usa `(window as any).electronAPI` en lugar del helper tipado. |

### 6.3 Layout del kiosko

| Componente | Observaciones |
|---|---|
| **KioskLayout** | Orquesta las barras y las pestañas. Bloquea Alt+Tab, F11 y Escape con `keydown`, lo que **no tiene efecto a nivel del sistema operativo**. Contiene uno de los dos intervalos del temporizador. |
| **TopBar** | Buscador unificado, acceso a NotebookLM y configuración. El botón "Iniciar Sesión" tiene `onClick={() => {}}` (no hace nada). La lista `WHITELIST_SITES` está duplicada respecto a `WebViewPanel` y `KioskLayout`. |
| **SideBar** | Accesos a Google Workspace, ofimática offline, historial, Pomodoro, descargas y estadísticas. Los accesos a Google Docs/Sheets/Slides/Drive cargan en iframe, algo que **Google bloquea** (`X-Frame-Options`). |
| **BottomBar** | Pestañas y barra de progreso del tiempo. Contiene el **segundo intervalo** del temporizador y llama a `closeApp()` al llegar a cero. |

### 6.4 Paneles

| Panel | Observaciones |
|---|---|
| **Dashboard** | Bien estructurado en 5 secciones. |
| **WebViewPanel** | Lista blanca de 24 dominios. El iframe tiene `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"`: combinar `allow-scripts` con `allow-same-origin` anula el sandbox, y `allow-popups-to-escape-sandbox` permite salir de la lista blanca. Usa `alert()` para los bloqueos. |
| **EncartaPanel** | Contenido local y buena navegación (atrás, adelante, migas de pan). Renderiza con `dangerouslySetInnerHTML`. Variable `isHeader` sin usar. |
| **OfflineEditorPanel** | Usa `document.execCommand`, que está **obsoleto**. Exporta a TXT/HTML/CSV, no a DOCX/XLSX/PPTX reales. Import `AnimatePresence` sin usar. |
| **AIWorkPanel** | **Respuestas simuladas** por palabras clave con retardo aleatorio. Formateo "markdown" casero con `dangerouslySetInnerHTML` que incluye texto del usuario sin escapar (XSS). |
| **HistoryPanel** | Funciona correctamente. Import `Filter` sin usar. |
| **PomodoroPanel** | Alerta sonora con Web Audio API. Crea un `AudioContext` nuevo en cada alerta y no lo cierra. Import `ReactNode` sin usar. |
| **DownloadsPanel** | Promete previsualizar PDF y texto, pero sin `dataUrl` no hay contenido que mostrar. |
| **StatsPanel** | Gráficas con Recharts basadas en `activityHistory`. Correcto, aunque los datos se pierden al cerrar. |
| **SettingsPanel** | Modifica `state.theme`, pero **ningún otro componente lee** `theme.accentColor`, `theme.fontSize` ni `theme.darkMode`: los cambios no tienen efecto visual. |

---

## 7. Verificación de compilación y tipos

### 7.1 `npx vite build` — ✅ correcto

```
dist/index.html  958.70 kB │ gzip: 274.85 kB
✓ built in 13.66s
```

### 7.2 `npx tsc --noEmit` — ❌ falla

**Primer error (bloqueante):**

```
tsconfig.json(3,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```

`"ignoreDeprecations": "6.0"` no es válido en TypeScript 5.9 (acepta `"5.0"`). Mientras este error exista, el chequeo de tipos se detiene aquí y oculta el resto.

**Errores al corregir lo anterior:**

| Archivo | Error |
|---|---|
| `src/lib/electron.ts:12-13` | `deactivateKiosk` no existe en el tipo de `electronAPI` (falta en `src/types/electron.d.ts`) |
| `src/panels/EncartaPanel.tsx:239` | `isHeader` declarado y no usado |
| `src/panels/HistoryPanel.tsx:10` | `Filter` importado y no usado |
| `src/panels/OfflineEditorPanel.tsx:10` | `AnimatePresence` importado y no usado |
| `src/panels/PomodoroPanel.tsx:9` | `ReactNode` importado y no usado |

Vite no comprueba tipos, por eso el build funciona a pesar de estos errores.

---

## 8. Errores funcionales

### 8.1 🔴 El temporizador corre al doble de velocidad

Dos componentes montados al mismo tiempo envían `TICK_TIMER` cada segundo:

- `src/kiosk/KioskLayout.tsx`: `useEffect` con `setInterval(() => dispatch({ type: 'TICK_TIMER' }), 1000)`
- `src/kiosk/BottomBar.tsx` (líneas 48–62): otro `setInterval` idéntico

**Consecuencia:** una sesión de 50 minutos termina en unos 25.
**Corrección:** eliminar uno de los dos. Lo ideal es que el proceso principal controle el tiempo (§9.3).

### 8.2 🔴 La pantalla de "Sesión completada" nunca se muestra

Cuando `timeRemaining` llega a `0`:

- `KioskLayout` desactiva el kiosko y cambia a la fase `session-complete`.
- `BottomBar` (líneas 68–76) llama a `closeApp()`, que ejecuta `app.quit()`.

La aplicación se cierra antes de que el usuario vea su resumen.
**Corrección:** eliminar el efecto de `closeApp()` en `BottomBar`.

### 8.3 🟠 La acción `END_SESSION` nunca se usa

El reducer define `END_SESSION`, pero el fin de sesión se gestiona con `SET_PHASE` y con `TICK_TIMER`, que además cambia `kioskActive`. Conviene centralizar el fin de sesión en una sola acción.

### 8.4 🟠 Los archivos cargados no son utilizables

Solo se guardan los metadatos (nombre, tamaño y tipo). Ni el panel de IA, ni Descargas, ni ningún otro módulo puede acceder al contenido.

### 8.5 🟡 La validación del Dropzone depende solo del MIME

En Windows `file.type` puede venir vacío o ser distinto (por ejemplo, `application/vnd.ms-excel` para `.csv`). Conviene validar también por extensión.

### 8.6 🟡 Configuración de tema sin efecto

Ver §6.4, SettingsPanel.

### 8.7 🟡 Sitios de la lista blanca que no cargan

Google Docs, Sheets, Slides, Drive, Classroom, Scholar y NotebookLM envían cabeceras `X-Frame-Options` / `frame-ancestors`, así que el iframe queda en blanco o da error. Un `<webview>` o `WebContentsView` de Electron no tiene esta limitación.

### 8.8 🟡 Botón "Iniciar Sesión" sin acción

`TopBar.tsx`: `onClick={() => {}}`.

---

## 9. Análisis de seguridad

Dado que el propósito del producto es ser un **entorno blindado**, estos puntos son los más importantes del informe.

### 9.1 🔴 La lista blanca se puede evadir

- Solo se valida la URL escrita en la barra de direcciones.
- **La navegación dentro del iframe** (hacer clic en enlaces) no se controla.
- `allow-popups-to-escape-sandbox` y el botón `<a target="_blank">` abren ventanas fuera de cualquier control.
- `allow-scripts` + `allow-same-origin` juntos anulan el sandbox.

**Recomendación:** aplicar el filtrado en el **proceso principal**, donde el renderer no puede eludirlo:

```js
// main.js (esquema)
const ALLOWED = ['wikipedia.org', 'khanacademy.org', /* ... */];
const isAllowed = (u) => {
  try {
    const h = new URL(u).hostname.replace(/^www\./, '');
    return ALLOWED.some(d => h === d || h.endsWith('.' + d));
  } catch { return false; }
};

session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
  const internal = details.url.startsWith('file://') || details.url.startsWith('devtools://')
    || (!app.isPackaged && details.url.startsWith('http://localhost:5173'));
  cb({ cancel: !(internal || isAllowed(details.url)) });
});

app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('will-navigate', (e, url) => { if (!isAllowed(url)) e.preventDefault(); });
});
```

Además, sustituir el `<iframe>` por `WebContentsView` o `<webview>`.

### 9.2 🔴 `open-external` sin restricciones

`shell.openExternal(url)` acepta cualquier cadena: se puede abrir el navegador del sistema (y salir del kiosko) o esquemas peligrosos (`file:`, `ms-settings:`, etc.).

**Recomendación:** permitir solo la URL exacta de Firebase Hosting.

```js
ipcMain.handle('open-external', async (_e, url) => {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.hostname !== 'project-grade-planb.firebaseapp.com') return false;
  await shell.openExternal(u.toString());
  return true;
});
```

### 9.3 🔴 El renderer puede salir del kiosko cuando quiera

`deactivate-kiosk` y `close-app` se aceptan en cualquier momento, y la duración que llega en `activate-kiosk` se ignora. Desde DevTools (activas en producción) o desde cualquier script inyectado se puede ejecutar `window.electronAPI.deactivateKiosk()`.

**Recomendación:**

- Guardar en `main.js` la hora de fin (`sessionEndsAt = Date.now() + durationSeconds * 1000`).
- Rechazar `deactivate-kiosk` / `close-app` si `Date.now() < sessionEndsAt`.
- Emitir los ticks desde el proceso principal (`webContents.send('session:tick', remaining)`).
- Bloquear el cierre de la ventana (`mainWindow.on('close', e => { if (activo) e.preventDefault(); })`).
- Desactivar DevTools en producción: `webPreferences: { devTools: !app.isPackaged }`.

### 9.4 🟠 El bloqueo de teclas no es real

El manejador `keydown` de React no puede interceptar Alt+Tab, la tecla Windows ni Ctrl+Esc. El kiosko de Electron atenúa esto, pero **Windows nunca permite bloquear Ctrl+Alt+Supr** desde una aplicación.

**Recomendación:** usar `globalShortcut` para lo que sí se pueda interceptar, y **documentar el límite** en la tesis. Para un bloqueo total existe el **Acceso asignado de Windows (Assigned Access)** o políticas de grupo.

### 9.5 🟠 Autenticación sin verificación

- El token del deep link no se verifica ni se utiliza.
- Cualquier enlace `project-grade-planb://auth?token=cualquiercosa` produce "¡Autenticación exitosa!".
- Facebook y el login manual marcan `isAuthenticated: true` sin comprobar nada.

**Recomendación:**

- Generar un `nonce`/`state` aleatorio en `main.js` antes de abrir el navegador y exigir que vuelva en el deep link.
- Usar el SDK de Firebase ya instalado: `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`, o validar el token en un backend (Cloud Functions).
- Tomar el nombre y el correo del token verificado, no de valores fijos.

### 9.6 🟠 XSS por `dangerouslySetInnerHTML`

- `AIWorkPanel.tsx` (líneas 109–122): el mensaje del usuario (`userMessage.slice(0, 30)`) se inserta en HTML sin escapar.
- `EncartaPanel.tsx:449`: el contenido se renderiza como HTML.

Aunque el contenido actual sea local, el riesgo crecerá al conectar una IA real (sus respuestas son texto no confiable).

**Recomendación:** usar `react-markdown` (que no renderiza HTML crudo por defecto), o escapar `<`, `>`, `&`, `"` antes de aplicar el formato.

### 9.7 🟡 Falta de Content-Security-Policy

`index.html` no define CSP. Se recomienda añadir una política restrictiva (`default-src 'self'; img-src 'self' data: https:; ...`). El plugin `vite-plugin-singlefile` incrusta todo el JS en línea, lo que obliga a permitir `'unsafe-inline'`; otro motivo para retirarlo (§12).

### Resumen de seguridad

| # | Riesgo | Severidad | Dónde se corrige |
|---|---|---|---|
| 9.1 | Evasión de la lista blanca | Crítica | `main.js` |
| 9.2 | `openExternal` arbitrario | Crítica | `main.js` |
| 9.3 | Salida del kiosko desde el renderer / DevTools | Crítica | `main.js` |
| 9.4 | Atajos del SO no bloqueados | Alta | `main.js` + documentación |
| 9.5 | Autenticación sin verificar | Alta | `main.js`, `LoginPhase.tsx`, Firebase |
| 9.6 | XSS en renderizado de HTML | Media | `AIWorkPanel.tsx`, `EncartaPanel.tsx` |
| 9.7 | Sin CSP | Media | `index.html`, `vite.config.ts` |

---

## 10. Funcionalidades simuladas o incompletas

| Funcionalidad | Estado actual | Para hacerla real |
|---|---|---|
| Asistente IA | Respuestas fijas elegidas por palabras clave | Llamada a un modelo de lenguaje **desde el proceso principal** (la API key nunca en el renderer), expuesta por IPC; enviar como contexto el texto extraído de los documentos |
| Resumen / flashcards / quiz de documentos | Plantillas genéricas | Extraer texto (p. ej. `pdfjs-dist` para PDF, `mammoth` para DOCX) y enviarlo al modelo |
| Login con Google | Flujo de deep link sin validar | Ver §9.5 |
| Login con Facebook | Simulado con `setTimeout` | Implementar con Firebase o retirar el botón |
| Firebase | Dependencia sin usar | Usar para auth/Firestore o eliminarla |
| Persistencia | Ninguna | `electron-store` o archivo JSON en `app.getPath('userData')`, o Firestore para sincronizar |
| Tema | Sin efecto | Aplicar `accentColor`/`fontSize` mediante variables CSS en `<html>` y la clase `dark` |
| Exportar ofimática | Solo TXT/HTML/CSV | `docx`, `exceljs`, `pptxgenjs` si se quieren formatos Office reales |
| Previsualizar archivos | Sin contenido disponible | Guardar la ruta o el `ArrayBuffer` y previsualizar con un `object URL` |

---

## 11. Calidad de código y mantenibilidad

### 11.1 Aspectos positivos

- Estructura clara: `phases/`, `kiosk/`, `panels/`, `store/`, `context/`, `lib/`.
- TypeScript en modo `strict` con `noUnusedLocals` y `noUnusedParameters`.
- Tipos bien definidos para el estado y las acciones (unión discriminada).
- Comentarios JSDoc descriptivos en español y consistentes.
- Reducer inmutable y fácil de probar.
- Hooks con limpieza correcta de listeners e intervalos.

### 11.2 Aspectos a mejorar

| Problema | Recomendación |
|---|---|
| `package.json` con `name: "react-vite-tailwind"` y `version: "0.0.0"` | Renombrar a `safe-research-browser`, versión `0.1.0`, añadir `description` y `author` |
| No hay repositorio Git | `git init` + `.gitignore` (`node_modules/`, `dist/`, `release/`, `.env`) |
| Sin linter | ESLint con `typescript-eslint` y `eslint-plugin-react-hooks` |
| Sin tests | Vitest para `appReducer`, `isUrlAllowed` y la validación del Dropzone; Playwright para pruebas E2E con Electron |
| Sin empaquetado | `electron-builder` (NSIS para Windows), registrando el protocolo `project-grade-planb` en su configuración |
| `tsconfig.json` inválido | Cambiar `"ignoreDeprecations"` a `"5.0"` o eliminarlo |
| Listas de sitios duplicadas en `TopBar`, `KioskLayout`, `WebViewPanel` y `Dashboard` | Un único módulo `src/config/sites.ts` (compartido también con `main.js`) |
| Bloque `motion.div` repetido 5 veces en `App.tsx` | Mapa `phase → componente` y un único `motion.div` |
| El `value` del contexto se recrea en cada render | Envolverlo en `useMemo` |
| `generateId` usa `substr` (obsoleto) | `crypto.randomUUID()` |
| `(window as any).electronAPI` en `SessionCompletePhase` | Usar `closeApp()` de `src/lib/electron.ts` |
| `document.execCommand` (obsoleto) | Editor como TipTap o Lexical |
| `alert()` en WebViewPanel | Notificación (toast) integrada en la UI |
| `parseInt` sin radix y sin validación estricta | `Number()` + `Number.isInteger()` |
| `AudioContext` nuevo por cada alerta | Reutilizar una instancia o cerrarla tras sonar |
| Líneas en blanco sobrantes en `LoginPhase.tsx` y comentario suelto en `main.js` | Limpieza |
| `AI_APPLICATION_REPORT.md/.json` duplican información y tienen errores (p. ej. dicen que `END_SESSION` vuelve al login) | Unificar en un `README.md` actualizado |

---

## 12. Rendimiento

| Punto | Observación | Recomendación |
|---|---|---|
| Bundle de un solo archivo (~959 KB, 275 KB gzip) | `vite-plugin-singlefile` es innecesario en Electron (los archivos son locales) y obliga a usar scripts en línea | Quitar el plugin y usar `base: './'` en Vite |
| Todos los paneles se importan de forma estática | Recharts y framer-motion aumentan el tamaño inicial | `React.lazy` + `Suspense` para los paneles |
| Fondo animado del login con 20 `motion.div` y `Math.random()` en el render | Posiciones distintas en cada re-render | Calcular las posiciones una sola vez con `useMemo` |
| Contexto global único | Cada `TICK_TIMER` (cada segundo) re-renderiza todos los consumidores de `useApp` | Separar el temporizador en su propio contexto o usar selectores |

---

## 13. Recomendaciones y hoja de ruta

### Fase 1 — Correcciones críticas (1–2 días)

- [ ] Eliminar el intervalo duplicado del temporizador (`BottomBar.tsx`).
- [ ] Eliminar el `closeApp()` automático de `BottomBar.tsx`.
- [ ] Centralizar el fin de sesión en `END_SESSION`.
- [ ] Corregir `tsconfig.json` y los 6 errores de tipos (añadir `deactivateKiosk` a `electron.d.ts`).
- [ ] `git init` + `.gitignore` + primer commit.
- [ ] Añadir scripts `typecheck` y `lint`.

### Fase 2 — Seguridad real del kiosko (prioridad para la defensa del proyecto)

- [ ] Filtrado de la lista blanca en `main.js` (`webRequest`, `setWindowOpenHandler`, `will-navigate`).
- [ ] Sustituir el iframe por `WebContentsView` / `<webview>`.
- [ ] Controlar la sesión y el temporizador desde el proceso principal; rechazar salidas anticipadas.
- [ ] Desactivar DevTools en producción.
- [ ] Restringir `open-external` a la URL de Firebase.
- [ ] `globalShortcut` para atajos interceptables y documentación de los límites del SO.
- [ ] Verificar el token de Firebase con `nonce`/`state`.
- [ ] Añadir CSP y eliminar HTML sin escapar.

### Fase 3 — Funcionalidad

- [ ] Leer el contenido real de los archivos cargados.
- [ ] Integrar un modelo de IA real vía IPC desde el proceso principal.
- [ ] Persistir historial, estadísticas y configuración.
- [ ] Hacer efectiva la configuración de tema.
- [ ] Implementar o retirar el login con Facebook y el botón "Iniciar Sesión" del TopBar.

### Fase 4 — Calidad y distribución

- [ ] Tests unitarios (Vitest) del reducer y de la validación de URL/archivos.
- [ ] Pruebas E2E del flujo completo con Playwright + Electron.
- [ ] Empaquetado con `electron-builder` e instalador para Windows (idealmente firmado).
- [ ] `README.md` con arquitectura, instalación, uso y **limitaciones conocidas**.
- [ ] Carga diferida de paneles y retirada de `vite-plugin-singlefile`.

---

## 14. Conclusión

SRB tiene una **base de interfaz y de arquitectura de front-end sólida**: el flujo por fases, el estado centralizado y el conjunto de herramientas del kiosko muestran un producto bien pensado y visualmente muy logrado.

Sin embargo, la **propuesta central —un entorno académico blindado— todavía no se cumple técnicamente**. Todo el control (lista blanca, temporizador, bloqueo) vive en el renderer, que es la capa que un usuario puede manipular. Además, dos errores (temporizador al doble de velocidad y cierre prematuro) afectan directamente a la experiencia principal.

La prioridad recomendada es:

1. **Corregir los errores del temporizador y del fin de sesión** (esfuerzo bajo, impacto alto).
2. **Mover la seguridad al proceso principal de Electron** (lo que más valor aporta al proyecto de grado).
3. **Sustituir las funciones simuladas** o presentarlas claramente como prototipo en la documentación.

Con estas mejoras, el proyecto pasaría de ser un prototipo visual convincente a una herramienta que cumple de verdad lo que promete.
