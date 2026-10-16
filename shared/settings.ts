/**
 * @file settings.ts
 * @description Configuración del escritorio (ORION #7). La guarda el proceso principal en SQLite
 * (tabla `settings`). Regla: la configuración nunca afloja el kiosko. Lo que afecta a la sesión
 * solo se cambia fuera de ella (bienvenida); dentro del kiosko, solo lo inofensivo.
 */

import { LIMITS } from './config';

export type TextScale = 'normal' | 'large' | 'xlarge';
export type AlarmSound = 'campana' | 'suave' | 'digital';

export interface AppSettings {
  /** Duración que se propone al elegir el tiempo (minutos); null = sin predeterminada. */
  defaultSessionMinutes: number | null;
  /** Aviso "Te quedan N minutos" antes de que termine la sesión (minutos, 0–60); 0 = desactivado (ORION #13 y #19). */
  endWarningMinutes: number;
  /** Ofrecer "Extender la sesión" al terminar (ORION #2). */
  allowExtend: boolean;
  /** Asistente sin conexión: tarjeta gráfica si hay ('auto') o solo el procesador ('cpu'). */
  localAiGpu: 'auto' | 'cpu';
  /** Carpeta de las exportaciones; null = Documentos\YALEH. */
  exportDir: string | null;
  textScale: TextScale;
  reduceMotion: boolean;
  /** Accesibilidad (ORION #19): más contraste y tipografía para dislexia (OpenDyslexic). */
  highContrast: boolean;
  dyslexiaFont: boolean;
  /** Alarmas del Pomodoro y del aviso de fin de sesión (ORION #19): volumen 0–100 y sonido. */
  alarmVolume: number;
  alarmSound: AlarmSound;
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
  highContrast: false,
  dyslexiaFont: false,
  alarmVolume: 70,
  alarmSound: 'campana',
  darkMode: true,
};

/** El aviso de fin se elige libremente (como el aviso de batería baja): de 1 a 60 minutos, o 0 = desactivado. */
export const END_WARNING_MAX_MINUTES = 60;

export const ALARM_SOUNDS: Record<AlarmSound, string> = { campana: 'Campana', suave: 'Suave', digital: 'Digital' };

export const TEXT_SCALES: Record<TextScale, { label: string; percent: number }> = {
  normal: { label: 'Normal', percent: 100 },
  large: { label: 'Grande', percent: 112.5 },
  xlarge: { label: 'Muy grande', percent: 125 },
};

/**
 * Lo que se puede cambiar durante una sesión (no afloja el kiosko: no toca el tiempo, los sitios
 * permitidos ni el acceso al sistema). ORION #19 suma accesibilidad, alarmas y el aviso de fin.
 */
export const KIOSK_SAFE_SETTINGS: readonly (keyof AppSettings)[] = [
  'textScale',
  'reduceMotion',
  'highContrast',
  'dyslexiaFont',
  'alarmVolume',
  'alarmSound',
  'endWarningMinutes',
];

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
 * `exportDir` no se acepta aquí: se elige con el selector de carpetas propio (`settings:set-export-dir`, validado en el proceso principal).
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
        if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > END_WARNING_MAX_MINUTES) {
          throw new Error(`El aviso de fin debe estar entre 1 y ${END_WARNING_MAX_MINUTES} minutos (0 para desactivarlo).`);
        }
        patch.endWarningMinutes = v as number;
        break;
      case 'alarmVolume':
        if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 100) throw new Error('Volumen no válido.');
        patch.alarmVolume = v as number;
        break;
      case 'alarmSound':
        if (typeof v !== 'string' || !(v in ALARM_SOUNDS)) throw new Error('Sonido no válido.');
        patch.alarmSound = v as AlarmSound;
        break;
      case 'allowExtend':
      case 'reduceMotion':
      case 'highContrast':
      case 'dyslexiaFont':
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
