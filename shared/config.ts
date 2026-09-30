/**
 * @file config.ts
 * @description Módulo de configuración único de YALEH (brief, secciones 3 y 9).
 * Lo usan el proceso principal de Electron y la interfaz. No debe importar
 * nada de Node ni del DOM: solo datos y tipos.
 */

// ─── Sitios permitidos ───────────────────────────────────────────────────────

export interface AllowedSite {
  /** Nombre de host exacto, sin esquema ni puerto. */
  host: string;
  /** Acepta también cualquier subdominio de `host`. */
  includeSubdomains?: boolean;
  /** Si se indica, solo se permiten rutas que empiecen por este prefijo. */
  pathPrefix?: string;
  /** Motivo por el que está en la lista (documentación). */
  reason: string;
}

/** Moodle del TECBA (página de inicio de sesión). */
export const TECBA_MOODLE_URL = 'https://moodle-108854-0.cloudclusters.net/login/';

const moodleHost = new URL(TECBA_MOODLE_URL).hostname;

/** Orígenes de la web de YALEH (Firebase Hosting). */
export const YALEH_WEB_ORIGINS = [
  'https://yaleh-fbe1c.web.app',
  'https://yaleh-fbe1c.firebaseapp.com',
] as const;

/**
 * Lista de sitios que pueden cargarse como página o marco (brief, sección 9).
 * Todo lo demás se bloquea. Solo HTTPS.
 */
export const ALLOWED_SITES: readonly AllowedSite[] = [
  { host: 'yaleh-fbe1c.web.app', reason: 'Web de YALEH' },
  { host: 'yaleh-fbe1c.firebaseapp.com', reason: 'Web de YALEH y marco de Firebase Auth' },

  { host: 'workspace.google.com', reason: 'Google Workspace' },
  { host: 'docs.google.com', reason: 'Documentos, Hojas y Presentaciones de Google' },
  { host: 'sheets.google.com', reason: 'Redirige a docs.google.com' },
  { host: 'slides.google.com', reason: 'Redirige a docs.google.com' },
  { host: 'drive.google.com', reason: 'Google Drive' },
  { host: 'classroom.google.com', reason: 'Google Classroom' },
  { host: 'accounts.google.com', reason: 'Inicio de sesión de Google' },
  { host: 'accounts.youtube.com', reason: 'Paso del inicio de sesión de Google que fija la sesión' },
  { host: 'www.google.com', pathPrefix: '/recaptcha/', reason: 'App Check (Fraud Defense) en la fase 4' },

  { host: 'canva.com', includeSubdomains: true, reason: 'Canva' },
  { host: 'gamma.app', includeSubdomains: true, reason: 'Gamma' },
  { host: moodleHost, reason: 'Moodle del TECBA' },
  { host: 'www.youtube-nocookie.com', reason: 'Reproductor de YouTube embebido (fase 8)' },
];

/** Servidor de desarrollo de Vite. Solo se permite cuando la app no está empaquetada. */
export const DEV_SERVER_ORIGIN = 'http://localhost:5173';

// ─── Herramientas visibles en la interfaz ────────────────────────────────────

export interface ToolLink {
  id: string;
  name: string;
  url: string;
  icon: string;
}

/** Herramientas autorizadas (brief, secciones 5.3 y 9). */
export const TOOL_LINKS: readonly ToolLink[] = [
  { id: 'classroom', name: 'Google Classroom', url: 'https://classroom.google.com', icon: '🖥️' },
  { id: 'moodle', name: 'Moodle', url: TECBA_MOODLE_URL, icon: '🏫' },
  { id: 'canva', name: 'Canva', url: 'https://www.canva.com', icon: '🎨' },
  { id: 'gamma', name: 'Gamma', url: 'https://gamma.app', icon: '📊' },
];

/** Aplicaciones de Google Workspace del sidebar. */
export const WORKSPACE_LINKS: readonly ToolLink[] = [
  { id: 'docs', name: 'Google Docs', url: 'https://docs.google.com', icon: '📝' },
  { id: 'sheets', name: 'Google Sheets', url: 'https://sheets.google.com', icon: '📊' },
  { id: 'slides', name: 'Google Slides', url: 'https://slides.google.com', icon: '🖥️' },
];

// ─── Límites ─────────────────────────────────────────────────────────────────

export const LIMITS = {
  /** Pestañas internas abiertas a la vez (brief, sección 10). */
  maxTabs: 8,
  /** Tamaño total de los archivos de la dropzone (brief, sección 8.4). */
  maxUploadBytes: 500 * 1024 * 1024,
  /** Duración mínima de una sesión de concentración, en minutos. */
  minSessionMinutes: 1,
  /** Duración máxima de una sesión de concentración, en minutos. */
  maxSessionMinutes: 180,
  /** Tamaño máximo de un archivo de sesión .yaleh (incluye el texto de las fuentes). */
  maxSessionFileBytes: 50 * 1024 * 1024,
  /** Validez de un archivo de sesión .yaleh desde que se crea, en horas. */
  sessionFileTtlHours: 24,
} as const;

// ─── Conexión ────────────────────────────────────────────────────────────────

/**
 * Detección del modo en el escritorio (brief, sección 4): online si el sistema
 * tiene red y la web de YALEH responde (cualquier respuesta HTTP) a tiempo.
 */
export const CONNECTIVITY = {
  probeUrl: `${YALEH_WEB_ORIGINS[0]}/`,
  probeTimeoutMs: 5000,
  recheckIntervalMs: 30_000,
} as const;

/** Opciones rápidas de la pantalla de selección de tiempo, en minutos. */
export const QUICK_SESSION_MINUTES = [25, 50, 90] as const;

// ─── Inteligencia artificial (brief, sección 7) ──────────────────────────────

export const AI = {
  /**
   * Gemini vía Firebase AI Logic (API de desarrollador, nivel gratuito). Se usa en orden:
   * si un modelo está saturado o sin cuota (429/500/503), se prueba el siguiente.
   * gemini-3.5-flash-lite es el más disponible en el nivel gratuito (verificado el 29/09/2026).
   */
  models: ['gemini-3.5-flash-lite', 'gemini-3.8-flash'],
  /** Proveedor de App Check de la web publicada (Google Cloud Fraud Defense). */
  appCheckProvider: 'recaptcha-enterprise',
  /**
   * Máximo de caracteres de las fuentes que se envían como contexto
   * (~100 000 tokens; el modelo admite mucho más, pero cuida la cuota gratuita).
   */
  maxSourceChars: 400_000,
} as const;

/** Búsqueda de información (brief, sección 7.2): API pública de Wikipedia en español. */
export const WIKIPEDIA = {
  apiUrl: 'https://es.wikipedia.org/w/api.php',
  maxResults: 3,
  /** Wikimedia pide identificar a los clientes con Api-User-Agent. */
  userAgent: 'YALEH/0.1 (proyecto de grado TECBA; https://yaleh-fbe1c.web.app)',
} as const;
