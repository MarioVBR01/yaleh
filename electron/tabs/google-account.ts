/**
 * @file google-account.ts
 * @description Cuenta de Google en las herramientas (ORION #26).
 * - El .yaleh solo lleva el correo de la cuenta de la web (nunca contraseñas, cookies ni tokens).
 * - Las pestañas usan una partición propia en memoria (`TABS_PARTITION`): el estudiante inicia
 *   sesión una vez y Docs, Hojas, Presentaciones, Drive y Classroom la comparten durante la sesión.
 * - Cuando Google pide la cuenta, se agrega el correo a la página de inicio de sesión
 *   (`login_hint` y `Email`) para que aparezca ya completado. Probado con Docs, Hojas,
 *   Presentaciones, Drive y Classroom (ORION #41).
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
 * Ajusta la página de inicio de sesión de Google en las pestañas; devuelve la URL nueva o null si no
 * hay que redirigir (así no hay bucles: la URL nueva ya no cumple las condiciones).
 * - Classroom (ORION #41): sin sesión, Google lo manda a un inicio "pasivo" (`service=classroom`) que
 *   termina en una página comercial (edu.google.com, bloqueada en el kiosko). Se cambia por el inicio
 *   de sesión genérico con el mismo destino, que sí pide la cuenta. Aplica aunque no haya correo.
 * - Con el correo del .yaleh, se agrega `login_hint` y `Email` para que aparezca ya escrito.
 */
export function googleSignInRedirect(url: string, email: string | null): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'accounts.google.com') return null;
  if (!SIGN_IN_PATHS.some(re => re.test(parsed.pathname))) return null;
  let changed = false;
  if (/^\/ServiceLogin/i.test(parsed.pathname) && parsed.searchParams.get('service') === 'classroom') {
    parsed.searchParams.delete('service');
    parsed.searchParams.delete('passive');
    changed = true;
  }
  if (isUsableEmail(email) && !parsed.searchParams.has('login_hint') && !parsed.searchParams.has('Email')) {
    parsed.searchParams.set('login_hint', email);
    parsed.searchParams.set('Email', email);
    changed = true;
  }
  return changed ? parsed.toString() : null;
}
