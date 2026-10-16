import { describe, expect, it } from 'vitest';
import { isUsableEmail, withGoogleLoginHint } from './google-account';

const EMAIL = 'ana@tecba.edu.bo';

describe('Cuenta de Google en las herramientas (ORION #26)', () => {
  it('agrega el correo a la página de inicio de sesión de Google', () => {
    const url = 'https://accounts.google.com/ServiceLogin?service=writely&continue=https://docs.google.com/';
    const hinted = new URL(withGoogleLoginHint(url, EMAIL)!);
    expect(hinted.searchParams.get('login_hint')).toBe(EMAIL);
    expect(hinted.searchParams.get('Email')).toBe(EMAIL);
    expect(hinted.searchParams.get('continue')).toBe('https://docs.google.com/');
    expect(withGoogleLoginHint('https://accounts.google.com/v3/signin/identifier?flowName=GlifWebSignIn', EMAIL)).toContain('login_hint=');
    expect(withGoogleLoginHint('https://accounts.google.com/AccountChooser?continue=x', EMAIL)).toContain('Email=');
  });

  it('no redirige si ya trae el correo (sin bucles), si no es el inicio de sesión o sin correo', () => {
    expect(withGoogleLoginHint(`https://accounts.google.com/ServiceLogin?login_hint=${EMAIL}`, EMAIL)).toBeNull();
    expect(withGoogleLoginHint('https://accounts.google.com/ServiceLogin?Email=otro@x.com', EMAIL)).toBeNull();
    expect(withGoogleLoginHint('https://accounts.google.com/CheckCookie?continue=x', EMAIL)).toBeNull();
    expect(withGoogleLoginHint('https://docs.google.com/ServiceLogin', EMAIL)).toBeNull();
    expect(withGoogleLoginHint('http://accounts.google.com/ServiceLogin', EMAIL)).toBeNull();
    expect(withGoogleLoginHint('https://accounts.google.com/ServiceLogin', null)).toBeNull();
    expect(withGoogleLoginHint('https://accounts.google.com/ServiceLogin', '')).toBeNull();
    expect(withGoogleLoginHint('no es una url', EMAIL)).toBeNull();
  });

  it('solo acepta correos razonables', () => {
    expect(isUsableEmail(EMAIL)).toBe(true);
    expect(isUsableEmail('sin-arroba')).toBe(false);
    expect(isUsableEmail('a b@c.com')).toBe(false);
    expect(isUsableEmail(42)).toBe(false);
  });
});
