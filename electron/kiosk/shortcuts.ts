/**
 * @file shortcuts.ts
 * @description Atajos de teclado que se bloquean durante la sesión.
 *
 * Windows NO permite interceptar Alt+Tab, la tecla Windows ni Ctrl+Alt+Supr
 * desde una aplicación: ver la sección de limitaciones en CLAUDE.md.
 */

/** Aceleradores que se registran con globalShortcut mientras la sesión está activa. */
export const BLOCKED_ACCELERATORS = [
  'CommandOrControl+W',
  'CommandOrControl+Shift+W',
  'CommandOrControl+R',
  'CommandOrControl+Shift+R',
  'CommandOrControl+N',
  'CommandOrControl+Shift+N',
  'CommandOrControl+T',
  'CommandOrControl+Q',
  'CommandOrControl+Shift+I',
  'CommandOrControl+Shift+J',
  'CommandOrControl+Shift+C',
  'F5',
  'F11',
  'F12',
  'Alt+F4',
] as const;

/** Salida de desarrollo. Solo existe cuando la app NO está empaquetada. */
export const DEV_ESCAPE_ACCELERATOR = 'CommandOrControl+Shift+F12';

/** Forma mínima de `Electron.Input` que necesitamos (facilita las pruebas). */
export interface KeyInput {
  type: string;
  key: string;
  control: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
}

const CTRL_KEYS = new Set(['w', 'r', 'n', 't', 'q']);
const CTRL_SHIFT_KEYS = new Set(['w', 'r', 'n', 'i', 'j', 'c']);
const PLAIN_KEYS = new Set(['f5', 'f11', 'f12']);

/** Decide si una pulsación (before-input-event) debe bloquearse durante la sesión. */
export function isBlockedInput(input: KeyInput): boolean {
  if (input.type !== 'keyDown') return false;
  const key = input.key.toLowerCase();
  const ctrl = input.control || input.meta;

  if (PLAIN_KEYS.has(key)) return true;
  if (input.alt && key === 'f4') return true;
  if (ctrl && input.shift && CTRL_SHIFT_KEYS.has(key)) return true;
  if (ctrl && !input.shift && CTRL_KEYS.has(key)) return true;
  return false;
}

/** Decide si la pulsación es la salida de desarrollo (Ctrl+Shift+F12). */
export function isDevEscapeInput(input: KeyInput): boolean {
  return (
    input.type === 'keyDown' &&
    (input.control || input.meta) &&
    input.shift &&
    input.key.toLowerCase() === 'f12'
  );
}
