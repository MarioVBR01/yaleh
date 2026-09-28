// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { displayHost, isUrlAllowed } from './allowlist';
import { TECBA_MOODLE_URL } from './config';

describe('isUrlAllowed', () => {
  it.each([
    'https://yaleh-fbe1c.web.app/',
    'https://yaleh-fbe1c.firebaseapp.com/__/auth/iframe',
    'https://docs.google.com/document/d/abc/edit',
    'https://classroom.google.com/c/123',
    'https://accounts.google.com/signin',
    'https://www.canva.com/design/xyz',
    'https://canva.com/',
    'https://gamma.app/docs/abc',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://www.google.com/recaptcha/enterprise/anchor?k=x',
    TECBA_MOODLE_URL,
  ])('permite %s', url => {
    expect(isUrlAllowed(url)).toBe(true);
  });

  it.each([
    ['otro dominio', 'https://es.wikipedia.org/wiki/Tortuga'],
    ['HTTP sin cifrar', 'http://docs.google.com/'],
    ['subdominio no autorizado de Google', 'https://mail.google.com/'],
    ['google.com fuera de reCAPTCHA', 'https://www.google.com/search?q=x'],
    ['youtube.com', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['dominio que solo termina igual', 'https://evilcanva.com/'],
    ['dominio con sufijo engañoso', 'https://docs.google.com.evil.io/'],
    ['credenciales incrustadas', 'https://user@docs.google.com/'],
    ['puerto no estándar', 'https://docs.google.com:8443/'],
    ['esquema javascript', 'javascript:alert(1)'],
    ['esquema file', 'file:///C:/Windows/System32'],
    ['URL inválida', 'no es una url'],
    ['servidor de desarrollo sin habilitar', 'http://localhost:5173/'],
  ])('bloquea %s', (_name, url) => {
    expect(isUrlAllowed(url)).toBe(false);
  });

  it('permite el servidor de desarrollo solo si se habilita', () => {
    expect(isUrlAllowed('http://localhost:5173/', { allowDevServer: true })).toBe(true);
    expect(isUrlAllowed('http://localhost:5174/', { allowDevServer: true })).toBe(false);
  });

  it('ignora mayúsculas en el host', () => {
    expect(isUrlAllowed('https://DOCS.Google.com/')).toBe(true);
  });
});

describe('displayHost', () => {
  it('quita www. y devuelve el host', () => {
    expect(displayHost('https://www.canva.com/x')).toBe('canva.com');
  });
});
