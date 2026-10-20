import { describe, expect, it } from 'vitest';
import { googleSignInRedirect, isUsableEmail } from './google-account';

const EMAIL = 'ana@tecba.edu.bo';

describe('Cuenta de Google en las herramientas (ORION #26 y #41)', () => {
  it('agrega el correo a la página de inicio de sesión de Google', () => {
    const url = 'https://accounts.google.com/ServiceLogin?service=writely&continue=https://docs.google.com/';
    const hinted = new URL(googleSignInRedirect(url, EMAIL)!);
    expect(hinted.searchParams.get('login_hint')).toBe(EMAIL);
    expect(hinted.searchParams.get('Email')).toBe(EMAIL);
    expect(hinted.searchParams.get('continue')).toBe('https://docs.google.com/');
    expect(googleSignInRedirect('https://accounts.google.com/v3/signin/identifier?flowName=GlifWebSignIn', EMAIL)).toContain('login_hint=');
    expect(googleSignInRedirect('https://accounts.google.com/AccountChooser?continue=x', EMAIL)).toContain('Email=');
  });

  it('Classroom: cambia el inicio "pasivo" (que termina en una página comercial) por el genérico, con o sin correo', () => {
    const url = 'https://accounts.google.com/ServiceLogin?service=classroom&passive=1209600&continue=https://classroom.google.com/u/0/h';
    const withEmail = new URL(googleSignInRedirect(url, EMAIL)!);
    expect(withEmail.searchParams.has('service')).toBe(false);
    expect(withEmail.searchParams.has('passive')).toBe(false);
    expect(withEmail.searchParams.get('continue')).toBe('https://classroom.google.com/u/0/h');
    expect(withEmail.searchParams.get('Email')).toBe(EMAIL);
    // Sin correo (flujo local) también, para que no termine en una página bloqueada.
    const local = new URL(googleSignInRedirect(url, null)!);
    expect(local.searchParams.has('service')).toBe(false);
    expect(local.searchParams.has('Email')).toBe(false);
    // Sin bucles: la URL nueva ya no se vuelve a cambiar.
    expect(googleSignInRedirect(withEmail.toString(), EMAIL)).toBeNull();
    expect(googleSignInRedirect(local.toString(), null)).toBeNull();
  });

  it('no redirige si ya trae el correo (sin bucles), si no es el inicio de sesión o sin correo', () => {
    expect(googleSignInRedirect(`https://accounts.google.com/ServiceLogin?login_hint=${EMAIL}`, EMAIL)).toBeNull();
    expect(googleSignInRedirect('https://accounts.google.com/ServiceLogin?Email=otro@x.com', EMAIL)).toBeNull();
    expect(googleSignInRedirect('https://accounts.google.com/CheckCookie?continue=x', EMAIL)).toBeNull();
    expect(googleSignInRedirect('https://docs.google.com/ServiceLogin', EMAIL)).toBeNull();
    expect(googleSignInRedirect('http://accounts.google.com/ServiceLogin', EMAIL)).toBeNull();
    expect(googleSignInRedirect('https://accounts.google.com/ServiceLogin?service=wise', null)).toBeNull();
    expect(googleSignInRedirect('https://accounts.google.com/ServiceLogin', '')).toBeNull();
    expect(googleSignInRedirect('no es una url', EMAIL)).toBeNull();
  });

  it('solo acepta correos razonables', () => {
    expect(isUsableEmail(EMAIL)).toBe(true);
    expect(isUsableEmail('sin-arroba')).toBe(false);
    expect(isUsableEmail('a b@c.com')).toBe(false);
    expect(isUsableEmail(42)).toBe(false);
  });
});
