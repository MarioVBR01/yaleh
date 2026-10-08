import { describe, expect, it } from 'vitest';
import { resolveAuthDomain } from './app';
import { describeAuthError } from './auth';

describe('resolveAuthDomain (BUG-001)', () => {
  it('en la web publicada usa el dominio de la página', () => {
    expect(resolveAuthDomain('https://yaleh-fbe1c.web.app', 'yaleh-fbe1c.firebaseapp.com')).toBe('yaleh-fbe1c.web.app');
    expect(resolveAuthDomain('https://yaleh-fbe1c.firebaseapp.com', 'x')).toBe('yaleh-fbe1c.firebaseapp.com');
  });
  it('en localhost y en el escritorio usa el de .env', () => {
    expect(resolveAuthDomain('http://localhost:5173', 'yaleh-fbe1c.firebaseapp.com')).toBe('yaleh-fbe1c.firebaseapp.com');
    expect(resolveAuthDomain('file://', 'yaleh-fbe1c.firebaseapp.com')).toBe('yaleh-fbe1c.firebaseapp.com');
    expect(resolveAuthDomain(undefined, 'a')).toBe('a');
  });
});

describe('describeAuthError', () => {
  it('muestra el código cuando el error no es uno de los conocidos', () => {
    expect(describeAuthError({ code: 'auth/internal-error' })).toBe('No se pudo iniciar sesión con Google (auth/internal-error). Inténtalo de nuevo.');
    expect(describeAuthError(new Error('x'))).toBe('No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
  });
});
