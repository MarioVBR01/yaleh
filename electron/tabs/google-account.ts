/**
 * @file google-account.ts
 * @description Cuenta de Google en las herramientas (ORION #26).
 * - El .yaleh solo lleva el correo de la cuenta de la web (nunca contraseñas, cookies ni tokens).
 * - Las pestañas usan una partición propia en memoria (`TABS_PARTITION`): el estudiante inicia
 *   sesión una vez y Docs, Hojas, Presentaciones y Classroom la comparten durante la sesión.
 * - Cuando Google pide la cuenta, se agrega el correo a la página de inicio de sesión
 *   (`login_hint` y `Email`) para que aparezca ya completado.
 * - Al terminar la sesión del kiosko se borra todo lo de la partición (se cierra la cuenta).
 */

/** Partición de las pestañas: sin "persist:", vive solo en memoria. */
export const TABS_PARTITION = 'yaleh-tabs';

const SIGN_IN_PATHS = [/^\/ServiceLogin/i, /^\/AccountChooser/i, /^\/InteractiveLogin/i, /^\/(v3\/)?signin\/(v2\/)?identifier/i, /^\/v3\/signin\/accountchooser/i];

/** Correo razonable para usar como pista (el .yaleh ya se validó; esto es solo defensa). */
export function isUsableEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Si `url` es la página de inicio de sesión de Google y todavía no trae el correo, devuelve la
 * misma URL con el correo agregado; si no, null (no hay que redirigir, así no hay bucles).
 */
export function withGoogleLoginHint(url: string, email: string | null): string | null {
  if (!isUsableEmail(email)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'accounts.google.com') return null;
  if (!SIGN_IN_PATHS.some(re => re.test(parsed.pathname))) return null;
  if (parsed.searchParams.has('login_hint') || parsed.searchParams.has('Email')) return null;
  parsed.searchParams.set('login_hint', email);
  parsed.searchParams.set('Email', email);
  return parsed.toString();
}
