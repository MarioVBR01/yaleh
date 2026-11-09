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
  it('en un canal de vista previa de Hosting usa el dominio de la página (BUG-004)', () => {
    expect(resolveAuthDomain('https://yaleh-fbe1c--prueba-ab12cd34.web.app', 'yaleh-fbe1c.firebaseapp.com')).toBe(
      'yaleh-fbe1c--prueba-ab12cd34.web.app'
    );
  });
  it('no confunde otros dominios parecidos con un canal de vista previa', () => {
    const fallback = 'yaleh-fbe1c.firebaseapp.com';
    expect(resolveAuthDomain('http://yaleh-fbe1c--prueba.web.app', fallback)).toBe(fallback);
    expect(resolveAuthDomain('https://otro--prueba.web.app', fallback)).toBe(fallback);
    expect(resolveAuthDomain('https://yaleh-fbe1c--prueba.web.app.evil.com', fallback)).toBe(fallback);
    expect(resolveAuthDomain('http://192.168.1.20:5173', fallback)).toBe(fallback);
  });
});

describe('describeAuthError', () => {
  it('muestra el código cuando el error no es uno de los conocidos', () => {
    expect(describeAuthError({ code: 'auth/internal-error' })).toBe('No se pudo ingresar con Google (auth/internal-error). Inténtalo de nuevo.');
    expect(describeAuthError(new Error('x'))).toBe('No se pudo ingresar con Google. Inténtalo de nuevo.');
  });
  it('con un dominio no autorizado dice cuál es (BUG-004)', () => {
    expect(describeAuthError({ code: 'auth/unauthorized-domain' }, '192.168.1.20:5173')).toBe(
      'Este dominio (192.168.1.20:5173) no está autorizado para ingresar. Avisa al administrador de YALEH.'
    );
    expect(describeAuthError({ code: 'auth/unauthorized-domain' }, '')).toBe(
      'Este dominio no está autorizado para ingresar. Avisa al administrador de YALEH.'
    );
  });
  it('por defecto toma la dirección de la página actual', () => {
    expect(describeAuthError({ code: 'auth/unauthorized-domain' })).toContain(`(${window.location.host})`);
  });
});
