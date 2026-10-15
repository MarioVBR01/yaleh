/**
 * @file settings.ts
 * @description Configuración del escritorio (ORION #7). La guarda el proceso principal en SQLite
 * (tabla `settings`). Regla: la configuración nunca afloja el kiosko. Lo que afecta a la sesión
 * solo se cambia fuera de ella (bienvenida); dentro del kiosko, solo lo inofensivo.
 */

import { LIMITS } from './config';

export type TextScale = 'normal' | 'large' | 'xlarge';

export interface AppSettings {
  /** Duración que se propone al elegir el tiempo (minutos); null = sin predeterminada. */
  defaultSessionMinutes: number | null;
  /** Aviso "Te quedan N minutos" antes de que termine la sesión (minutos); 0 = desactivado (ORION #13). */
  endWarningMinutes: number;
  /** Ofrecer "Extender la sesión" al terminar (ORION #2). */
  allowExtend: boolean;
  /** Asistente sin conexión: tarjeta gráfica si hay ('auto') o solo el procesador ('cpu'). */
  localAiGpu: 'auto' | 'cpu';
  /** Carpeta de las exportaciones; null = Documentos\YALEH. */
  exportDir: string | null;
  textScale: TextScale;
  reduceMotion: boolean;
  /** Modo nocturno: el interruptor existe, pero se activa en la fase de diseño (hoy no hace nada). */
  darkMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultSessionMinutes: null,
  endWarningMinutes: 5,
  allowExtend: true,
  localAiGpu: 'auto',
  exportDir: null,
  textScale: 'normal',
  reduceMotion: false,
  darkMode: true,
};

export const END_WARNING_OPTIONS = [0, 1, 5, 10, 15] as const;

export const TEXT_SCALES: Record<TextScale, { label: string; percent: number }> = {
  normal: { label: 'Normal', percent: 100 },
  large: { label: 'Grande', percent: 112.5 },
  xlarge: { label: 'Muy grande', percent: 125 },
};

/** Lo único que se puede cambiar durante una sesión (no afloja el kiosko). */
export const KIOSK_SAFE_SETTINGS: readonly (keyof AppSettings)[] = ['textScale', 'reduceMotion'];

export const PROFILE_NAME_MAX = 60;

/** Lo que el proceso principal entrega a la vista de Configuración. */
export interface SettingsSnapshot {
  settings: AppSettings;
  /** Nombre del estudiante (tabla local_profile); null si no lo cargó. */
  profileName: string | null;
  /** Carpeta efectiva de las exportaciones. */
  exportDirResolved: string;
  /** Hay una sesión en curso: solo se puede cambiar lo inofensivo. */
  sessionActive: boolean;
}

export type SettingsPatch = Partial<AppSettings>;

/**
 * Valida un cambio. Lanza un Error con un mensaje para la interfaz si algo no es válido.
 * `exportDir` no se acepta desde la interfaz: se elige con el diálogo del proceso principal.
 */
export function validateSettingsPatch(value: unknown): SettingsPatch {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuración no válida.');
  const input = value as Record<string, unknown>;
  const patch: SettingsPatch = {};
  for (const [key, v] of Object.entries(input)) {
    switch (key) {
      case 'defaultSessionMinutes':
        if (v !== null && (!Number.isInteger(v) || (v as number) < LIMITS.minSessionMinutes || (v as number) > LIMITS.maxSessionMinutes)) {
          throw new Error(`La duración predeterminada debe estar entre ${LIMITS.minSessionMinutes} y ${LIMITS.maxSessionMinutes} minutos.`);
        }
        patch.defaultSessionMinutes = v as number | null;
        break;
      case 'endWarningMinutes':
        if (!(END_WARNING_OPTIONS as readonly unknown[]).includes(v)) throw new Error('Aviso de fin no válido.');
        patch.endWarningMinutes = v as number;
        break;
      case 'allowExtend':
      case 'reduceMotion':
      case 'darkMode':
        if (typeof v !== 'boolean') throw new Error('Valor no válido.');
        patch[key] = v;
        break;
      case 'localAiGpu':
        if (v !== 'auto' && v !== 'cpu') throw new Error('Opción de procesamiento no válida.');
        patch.localAiGpu = v;
        break;
      case 'textScale':
        if (typeof v !== 'string' || !(v in TEXT_SCALES)) throw new Error('Tamaño de texto no válido.');
        patch.textScale = v as TextScale;
        break;
      default:
        throw new Error(`Opción desconocida: ${key}.`);
    }
  }
  return patch;
}

/** true si el cambio solo toca opciones permitidas durante la sesión. */
export function isKioskSafePatch(patch: SettingsPatch): boolean {
  return Object.keys(patch).every(key => KIOSK_SAFE_SETTINGS.includes(key as keyof AppSettings));
}

export function normalizeProfileName(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('Nombre no válido.');
  const name = value.replace(/\s+/g, ' ').trim();
  if (name.length > PROFILE_NAME_MAX) throw new Error(`El nombre puede tener hasta ${PROFILE_NAME_MAX} caracteres.`);
  return name.length > 0 ? name : null;
}
