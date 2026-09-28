# Safe Research Browser (SRB) - Informe Técnico Estructurado para IA

## 1. METADATOS DEL PROYECTO

```json
{
  "name": "Safe Research Browser (SRB)",
  "version": "0.0.0",
  "type": "React + TypeScript + Vite",
  "framework": "React 19.2.6",
  "buildTool": "Vite 7.3.2",
  "language": "TypeScript 5.9.3",
  "styling": "Tailwind CSS 4.1.17",
  "purpose": "Entorno académico blindado con control de tráfico de red para estudiantes",
  "projectYear": 2026,
  "institution": "TECBA"
}
```

---

## 2. ARQUITECTURA GENERAL

### 2.1 Tipo de Arquitectura
- **Patrón**: React Context API + useReducer (Redux-like)
- **Renderizado**: CSR (Client-Side Rendering)
- **Modularidad**: Componentes funcionales con hooks
- **Distribución**: SPA (Single Page Application)

### 2.2 Flujo de Datos
```
Entrada del Usuario
    ↓
Componente UI
    ↓
AppContext (useApp hook)
    ↓
appReducer (appStore.ts)
    ↓
AppState (estado global inmutable)
    ↓
Renderizado de UI
```

---

## 3. MODELO DE ESTADOS Y FASES

### 3.1 Fases de la Aplicación (AppPhase)
```typescript
// Secuencia: login → dropzone → timer-select → kiosk

1. login
   - Propósito: Autenticación de usuario
   - Componente: LoginPhase
   - Transición: Al completar login
   - Acciones: signIn() o signInAnonymous()

2. dropzone
   - Propósito: Carga de archivos locales
   - Componente: DropzonePhase
   - Transición: Al cargar archivos
   - Acciones: addFiles()
   - Estado: uploadedFiles[]

3. timer-select
   - Propósito: Seleccionar duración de sesión de estudio
   - Componente: TimerSelectPhase
   - Transición: Al seleccionar tiempo
   - Acciones: SET_SESSION_DURATION
   - Rango: 1-180 minutos (inferido)

4. kiosk
   - Propósito: Modo de trabajo restringido con timer activo
   - Componente: KioskLayout
   - Transición: Al iniciar sesión (START_KIOSK)
   - Características: Bloqueo de navegación del SO
```

### 3.2 AppState - Estructura Completa
```typescript
{
  phase: AppPhase,                          // Estado actual
  session: UserSession,                     // Información del usuario
  uploadedFiles: UploadedFile[],           // Archivos cargados en dropzone
  sessionDuration: number,                  // Duración en segundos
  timeRemaining: number,                    // Contador regresivo
  kioskActive: boolean,                     // Flag del modo kiosk
  tabs: Tab[],                              // Pestañas abiertas
  activeTabId: string,                      // Pestaña visible
  theme: ThemeSettings,                     // Configuración visual
  activityHistory: ActivityRecord[],        // Registro de acciones
  activeSidePanel: string | null            // Panel lateral expandido
}
```

---

## 4. SISTEMA DE ACCIONES (AppAction)

| Acción | Payload | Efecto | Asociado a |
|--------|---------|--------|-----------|
| SET_PHASE | AppPhase | Cambia la fase actual | Navigation entre fases |
| SET_SESSION | UserSession | Actualiza datos del usuario | Login |
| ADD_FILES | UploadedFile[] | Agrega archivos | Dropzone |
| REMOVE_FILE | string (fileId) | Elimina un archivo | Gestión de archivos |
| SET_SESSION_DURATION | number (segundos) | Establece duración del timer | Timer Select |
| START_KIOSK | void | Inicia modo kiosk y timer | Transición a kiosk |
| TICK_TIMER | void | Decrementa timeRemaining en 1 | Cada segundo (setInterval) |
| END_SESSION | void | Termina sesión, vuelve a login | Expiración de tiempo |
| ADD_TAB | Tab | Crea nueva pestaña | Kiosk workspace |
| CLOSE_TAB | string (tabId) | Cierra pestaña (excepto dashboard) | Kiosk workspace |
| SET_ACTIVE_TAB | string (tabId) | Cambia pestaña visible | Navegación dentro de kiosk |
| UPDATE_THEME | Partial<ThemeSettings> | Personaliza UI | Settings Panel |
| ADD_ACTIVITY | ActivityRecord | Registra acciones en historial | History Panel |
| SET_SIDE_PANEL | string \| null | Expande/contrae panel lateral | Sidebar |

---

## 5. TIPOS DE DATOS PRINCIPALES

### 5.1 UserSession
```typescript
{
  isAuthenticated: boolean,    // Usuario autenticado
  isAnonymous: boolean,        // Modo offline/anónimo
  displayName?: string,        // Nombre visible
  email?: string,              // Email (si autenticado)
  avatar?: string,             // URL de avatar
  initials?: string            // Iniciales para avatar genérico
}
```

### 5.2 Tab (Pestaña del Kiosk)
```typescript
{
  id: string,                           // ID único (timestamp + random)
  type: TabType,                        // Tipo de contenido
  title: string,                        // Título mostrado
  url?: string,                         // URL (para webview)
  icon?: string,                        // Emoji/icon
  editorType?: 'docs'|'sheets'|'slides',// Para offline editor
  encartaCategory?: string              // Categoría enciclopedia
}
```

### 5.3 TabType - 9 Tipos de Pestañas
```
1. dashboard      → Dashboard/Inicio
2. workspace-url  → WebView (sitios externos)
3. offline-editor → Editor de documentos local
4. encarta        → Enciclopedia offline
5. ai-work        → Panel de trabajo con IA
6. history        → Historial de actividades
7. pomodoro       → Timer Pomodoro
8. downloads      → Gestor de descargas
9. stats          → Estadísticas de sesión
```

### 5.4 UploadedFile
```typescript
{
  id: string,           // Identificador único
  name: string,         // Nombre del archivo
  size: number,         // Tamaño en bytes
  type: string,         // MIME type
  uploadedAt: Date,     // Timestamp
  dataUrl?: string      // Data URL para previsualización
}
```

### 5.5 ActivityRecord
```typescript
{
  id: string,          // ID único
  type: 'file'|'tool'|'site'|'search', // Categoría
  label: string,       // Etiqueta descriptiva
  detail?: string,     // Información adicional
  timestamp: Date,     // Cuándo ocurrió
  icon?: string        // Emoji/icono
}
```

### 5.6 ThemeSettings
```typescript
{
  accentColor: string,              // Color principal (hex)
  fontSize: 'sm'|'md'|'lg',        // Tamaño de texto
  sidebarCollapsed: boolean,        // Estado sidebar
  darkMode: boolean                 // Tema oscuro/claro
}
```

---

## 6. ESTRUCTURA DE COMPONENTES

### 6.1 Árbol de Componentes
```
App
├── AppProvider (Context)
│   └── AppContent
│       ├── LoginPhase (Fase 1)
│       ├── DropzonePhase (Fase 2)
│       ├── TimerSelectPhase (Fase 3)
│       └── KioskLayout (Fase 4) [PRINCIPAL]
│           ├── TopBar
│           ├── SideBar
│           │   ├── Dashboard Link
│           │   ├── AIWorkPanel Link
│           │   ├── OfflineEditorPanel Link
│           │   ├── EncartaPanel Link
│           │   ├── DownloadsPanel Link
│           │   ├── HistoryPanel Link
│           │   ├── StatsPanel Link
│           │   └── SettingsPanel Link
│           ├── [TabContent - Renderizado dinámico]
│           │   ├── Dashboard
│           │   ├── WebViewPanel
│           │   ├── OfflineEditorPanel
│           │   ├── EncartaPanel
│           │   ├── AIWorkPanel
│           │   ├── HistoryPanel
│           │   ├── PomodoroPanel
│           │   ├── DownloadsPanel
│           │   ├── StatsPanel
│           │   └── SettingsPanel
│           └── BottomBar
│               └── Timer Countdown
```

### 6.2 Componentes de Fase (Fase 1-3)
| Componente | Archivo | Responsabilidad |
|-----------|---------|-----------------|
| LoginPhase | phases/LoginPhase.tsx | Formulario login/anónimo |
| DropzonePhase | phases/DropzonePhase.tsx | Carga de archivos |
| TimerSelectPhase | phases/TimerSelectPhase.tsx | Selector duración |

### 6.3 Componentes de Layout del Kiosk (Fase 4)
| Componente | Archivo | Responsabilidad |
|-----------|---------|-----------------|
| TopBar | kiosk/TopBar.tsx | Barra superior: búsqueda, + tab |
| SideBar | kiosk/SideBar.tsx | Navegación: links a paneles |
| BottomBar | kiosk/BottomBar.tsx | Barra inferior: timer, info sesión |
| KioskLayout | kiosk/KioskLayout.tsx | Orquestador principal |

### 6.4 Componentes de Panel (Content)
| Panel | Archivo | Tipo | Función |
|------|---------|------|---------|
| Dashboard | panels/Dashboard.tsx | Panel | Inicio/resumen |
| WebViewPanel | panels/WebViewPanel.tsx | Panel | iFrame para URLs externas |
| OfflineEditorPanel | panels/OfflineEditorPanel.tsx | Panel | Editor de docs/sheets/slides |
| EncartaPanel | panels/EncartaPanel.tsx | Panel | Enciclopedia offline |
| AIWorkPanel | panels/AIWorkPanel.tsx | Panel | Chat/trabajo con IA |
| HistoryPanel | panels/HistoryPanel.tsx | Panel | Registro de actividades |
| PomodoroPanel | panels/PomodoroPanel.tsx | Panel | Timer Pomodoro secundario |
| DownloadsPanel | panels/DownloadsPanel.tsx | Panel | Gestor de descargas |
| StatsPanel | panels/StatsPanel.tsx | Panel | Estadísticas sesión |
| SettingsPanel | panels/SettingsPanel.tsx | Panel | Preferencias tema/idioma |

---

## 7. DEPENDENCIAS

### 7.1 Dependencias de Producción
```json
{
  "react": "19.2.6",              // Framework UI
  "react-dom": "19.2.6",          // Renderizador DOM
  "framer-motion": "^12.40.0",    // Animaciones
  "tailwind-merge": "3.4.0",      // Utilidad Tailwind
  "clsx": "2.1.1",                // Condicionales CSS
  "lucide-react": "^1.18.0",      // Iconos (30+ ícones)
  "recharts": "^3.8.1"            // Gráficos (para StatsPanel)
}
```

### 7.2 Dependencias de Desarrollo
```json
{
  "typescript": "5.9.3",                 // Tipado estático
  "@types/react": "19.2.7",              // Tipado React
  "@types/react-dom": "19.2.3",          // Tipado ReactDOM
  "@types/node": "22.19.17",             // Tipado Node.js
  "vite": "7.3.2",                       // Bundler
  "@vitejs/plugin-react": "5.1.1",       // Plugin React para Vite
  "tailwindcss": "4.1.17",               // Framework CSS
  "@tailwindcss/vite": "4.1.17",         // Plugin Tailwind
  "vite-plugin-singlefile": "2.3.0"      // Bundle único (deployment)
}
```

### 7.3 Características de Dependencias
- **React 19**: Funcionalidades modernas, server components ready
- **Vite 7**: Hot reload, bundling ultra-rápido
- **TypeScript 5.9**: Tipado estricto, enums, interfaces
- **Tailwind CSS 4**: Utility-first CSS, 4x más rápido
- **Framer Motion**: Animaciones smooth (transiciones de fase)
- **Recharts**: Gráficos declarativos para estadísticas

---

## 8. CONTEXTO Y HOOKS PERSONALIZADOS

### 8.1 Proveedor: AppProvider
```typescript
// Ubicación: src/context/AppContext.tsx

<AppProvider>
  <App />
</AppProvider>

// Proporciona AppContextValue:
{
  state: AppState,              // Estado actual
  dispatch: React.Dispatch,     // Dispatcher de acciones
  openTab(config): void,        // Helper para crear pestañas
  closeTab(id): void,           // Helper para cerrar pestañas
  logActivity(record): void,    // Helper para registrar actividad
  signIn(user): void,           // Helper para autenticarse
  signInAnonymous(): void,      // Helper para modo offline
  updateTheme(settings): void,  // Helper para cambiar tema
  addFiles(files): void,        // Helper para cargar archivos
  removeFile(id): void          // Helper para eliminar archivo
}
```

### 8.2 Hook Personalizado: useApp
```typescript
// Ubicación: src/context/AppContext.tsx

const { 
  state,           // Lectura del estado global
  dispatch,        // Acceso directo al reducer
  openTab,         // Crear pestaña
  closeTab,        // Cerrar pestaña
  logActivity,     // Registrar actividad
  signIn,          // Autenticarse
  signInAnonymous, // Entrar anónimo
  updateTheme,     // Cambiar tema
  addFiles,        // Cargar archivos
  removeFile       // Eliminar archivo
} = useApp();

// Uso en componentes:
// const { state } = useApp(); // Acceso lectura
// const { dispatch } = useApp(); // Acceso directo
// const { openTab } = useApp(); // Usar helper
```

---

## 9. CONFIGURACIÓN Y BUILD

### 9.1 Scripts NPM
```bash
npm run dev      # Inicia Vite dev server (localhost:5173)
npm run build    # Compila TypeScript + empaqueta con Vite
npm run preview  # Visualiza build de producción
```

### 9.2 Configuración TypeScript
- **Target**: ES2020 (ES13)
- **Module**: ESNext (moderno)
- **JSX**: react-jsx (nuevo)
- **Strict Mode**: Habilitado
- **skipLibCheck**: true (más rápido)
- **baseUrl**: "." (DEPRECATED en TS 7.0 - requiere migración)

### 9.3 Configuración Vite
- **Plugin React**: React 19 compatible
- **Plugin Tailwind Vite**: Compilación integrada
- **Plugin SingleFile**: Genera bundle único para deployment

---

## 10. FLUJO DE NAVEGACIÓN Y LÓGICA

### 10.1 Secuencia de Fases
```
1. LOGIN PHASE
   ├─ Usuario ingresa credenciales O elige modo anónimo
   ├─ Action: signIn(user) o signInAnonymous()
   ├─ Trigger: SET_PHASE → 'dropzone'
   └─ Validaciones: Email format, password strength

2. DROPZONE PHASE
   ├─ Usuario selecciona archivos locales
   ├─ Action: addFiles(files[])
   ├─ Upload: File reading (DataURL opcional)
   ├─ Trigger: User clicks "Continuar" → SET_PHASE → 'timer-select'
   └─ Storage: uploadedFiles[] en state

3. TIMER SELECT PHASE
   ├─ Usuario elige duración de sesión (rango: 1-180 min)
   ├─ Action: SET_SESSION_DURATION (segundos)
   ├─ Trigger: User confirms → START_KIOSK
   ├─ Effect: kioskActive = true, timer inicia
   └─ Side Effect: setInterval(TICK_TIMER, 1000)

4. KIOSK PHASE (Modo Principal)
   ├─ Interfaz bloqueada (simulado en web)
   ├─ Timer activo contando hacia atrás
   ├─ Sidebar: Links a 9 paneles
   ├─ TopBar: Búsqueda + botón + nueva pestaña
   ├─ BottomBar: Timer countdown + info sesión
   ├─ Contenido Central: Renderizado dinámico de Tab actual
   ├─ Opciones:
   │   ├─ Abrir pestaña: openTab(config)
   │   ├─ Cambiar pestaña: SET_ACTIVE_TAB
   │   ├─ Cerrar pestaña: closeTab(id)
   │   ├─ Acceder a panel: SET_SIDE_PANEL
   │   └─ Cambiar tema: updateTheme(settings)
   ├─ Timer expira: TICK_TIMER llega a 0
   └─ Fin de sesión: END_SESSION → SET_PHASE → 'login'
```

### 10.2 Lógica de Pestañas
```
// Búsqueda de sitios predefinidos (NEW_TAB_SITES)
const NEW_TAB_SITES = [
  { name: 'Wikipedia', url: 'https://es.wikipedia.org' },
  { name: 'Google Scholar', url: 'https://www.scholar.google.com' },
  { name: 'Khan Academy', url: 'https://www.khanacademy.org' },
  { name: 'Coursera', url: 'https://www.coursera.org' },
  { name: 'SciELO', url: 'https://www.scielo.org' },
  { name: 'TED Talks', url: 'https://www.ted.com' },
  { name: 'Duolingo', url: 'https://www.duolingo.com' },
  { name: 'Moodle', url: 'https://www.moodle.org' },
  { name: 'NotebookLM', url: 'https://www.notebooklm.google.com' },
  { name: 'Pexels', url: 'https://www.pexels.com' },
]

// Dashboard siempre está abierto (no se puede cerrar)
// Máximo de pestañas: Sin límite explícito (inf)
// Criterio de duplicados: URL idéntica en workspace-url
```

### 10.3 Timer Logic
```
// En BottomBar / KioskLayout
useEffect(() => {
  if (kioskActive && timeRemaining > 0) {
    const interval = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' })
    }, 1000)
    
    return () => clearInterval(interval)
  } else if (timeRemaining === 0 && kioskActive) {
    dispatch({ type: 'END_SESSION' })
    // Vuelve a login
  }
}, [kioskActive, timeRemaining])
```

---

## 11. ANIMACIONES Y UX

### 11.1 Transiciones Principales (Framer Motion)
```typescript
// Transiciones de Fase (fade + scale)
const fadeIn = { opacity: 1, scale: 1 }
const fadeOut = { opacity: 0, scale: 0.97 }
const transition = { duration: 0.3 }
// Aplicado en: <AnimatePresence mode="wait">
```

### 11.2 Uso de Framer Motion
- `<AnimatePresence>`: Gestiona entrada/salida de componentes
- `<motion.div>`: Envuelve elementos con animación
- `mode="wait"`: Espera a que salga un elemento antes de entrar otro
- **Easing**: Default Framer Motion (ease-out)

---

## 12. UTILIDADES Y HELPERS

### 12.1 Funciones Utilitarias
```typescript
// src/utils/cn.ts
export const cn = (classNames: string[]): string
// Combina clases Tailwind de forma segura

// src/store/appStore.ts
export const generateId = (): string
// Genera ID único: `${Date.now()}-${Math.random()}`
```

---

## 13. PUNTOS DE ENTRADA

### 13.1 Fichero HTML
- **Ubicación**: `index.html`
- **Root Element**: `<div id="root">`
- **Script**: `/src/main.tsx` (módulo ES)

### 13.2 main.tsx (Punto de entrada)
```typescript
// src/main.tsx
import App from './App.tsx'
import { AppProvider } from './context/AppContext'

// Renderiza:
<AppProvider>
  <App />
</AppProvider>

// En: document.getElementById('root')
```

### 13.3 App.tsx (Raíz)
```typescript
// src/App.tsx
function App() {
  return <AppProvider><AppContent /></AppProvider>
}

function AppContent() {
  const { state } = useApp()
  // Renderiza fase según state.phase
}
```

---

## 14. DECISIONES ARQUITECTÓNICAS

### 14.1 Por qué Context API + useReducer
✓ No requiere Redux (overhead innecesario)
✓ Suficiente para aplicación de mediano tamaño
✓ Fácil de debuggear con React DevTools
✓ Integrado en React (sin dependencias)

### 14.2 Por qué Vite
✓ Dev server ultra-rápido (HMR en <100ms)
✓ Bundling optimizado para producción
✓ Plugin ecosystem robusto
✓ Moderno y mantenido activamente

### 14.3 Por qué Tailwind CSS
✓ Utility-first (composición visual clara)
✓ SPA-friendly (tree-shaking automático)
✓ Tema personalizable (via tailwind.config)
✓ Performance: 4x más rápido que v3

---

## 15. LIMITACIONES CONOCIDAS

1. **TypeScript 7.0 Migration**: `baseUrl` es deprecated, requiere migración
2. **SPA State Loss**: Recarga de página pierde estado (no persiste en localStorage)
3. **iFrame CORS**: WebViewPanel puede tener limitaciones de origen cruzado
4. **OS Lock Simulation**: El bloqueo del SO es simulado en web (no es verdadero)
5. **No Offline Storage**: uploadedFiles no persisten (no IndexedDB/Service Worker)

---

## 16. EXTENSIONES FUTURAS SUGERIDAS

1. **Persistencia**: localStorage/IndexedDB para uploadedFiles
2. **Service Worker**: Soporte real de offline
3. **PWA**: Installable, con icon/splash screens
4. **Analytics**: Integración con Mixpanel/GA4
5. **Authentication Backend**: API REST para login real
6. **Real OS Lock**: Desktop app (Electron/Tauri)
7. **Collaboration**: WebSockets para múltiples usuarios
8. **Database**: Supabase/Firebase para sesiones

---

## 17. MATRIZ DE DEPENDENCIAS ENTRE COMPONENTES

```
AppProvider
  ├─ Login Phase
  │  └─ signIn() / signInAnonymous()
  │
  ├─ Dropzone Phase
  │  └─ addFiles()
  │
  ├─ Timer Select Phase
  │  └─ SET_SESSION_DURATION
  │
  └─ Kiosk Layout
     ├─ TopBar
     │  └─ openTab()
     │
     ├─ Sidebar
     │  └─ SET_SIDE_PANEL
     │
     ├─ Tab Content [Dynamic]
     │  ├─ Dashboard (displayName, activityHistory)
     │  ├─ WebViewPanel (tabs[].url)
     │  ├─ OfflineEditorPanel (tabs[].editorType)
     │  ├─ EncartaPanel (tabs[].encartaCategory)
     │  ├─ AIWorkPanel (activityHistory)
     │  ├─ HistoryPanel (activityHistory)
     │  ├─ PomodoroPanel (timer secundario)
     │  ├─ DownloadsPanel (uploadedFiles)
     │  ├─ StatsPanel (recharts, sessionDuration, timeRemaining)
     │  └─ SettingsPanel (updateTheme)
     │
     └─ BottomBar
        └─ Timer (timeRemaining, TICK_TIMER)
```

---

## 18. RESUMEN EJECUTIVO

**Safe Research Browser** es una aplicación web React moderna diseñada como entorno académico seguro. Implementa un flujo de 4 fases (login → dropzone → timer → kiosk) con estado global gestionado mediante Context API. Construida con tecnología moderna (React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4), la aplicación ofrece 9 paneles funcionales, soporte para múltiples tipos de contenido (WebView, Editor offline, Enciclopedia, IA, Estadísticas) y un timer de sesión configurable.

**Stack Principal**: React + TypeScript + Vite + Tailwind + Framer Motion  
**Patrón Estado**: Context + useReducer + Hooks  
**Componentes**: 20+ funcionales, 4 de layout, 9 de contenido  
**Tamaño Estimado**: ~500-1000 LOC (React/TSX) + ~300 LOC (Config/Store)

