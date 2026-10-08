/**
 * BUG-002 (reabierto): la web no recuerda la sesión de Google entre aperturas.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

const initializeAuth = vi.fn(() => ({ name: 'auth' }));
const getAuth = vi.fn(() => ({ name: 'auth-default' }));

vi.mock('firebase/auth', async importOriginal => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return { ...actual, initializeAuth, getAuth };
});
vi.mock('firebase/app-check', () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaEnterpriseProvider: vi.fn(),
  CustomProvider: vi.fn(),
}));

const { inMemoryPersistence, browserPopupRedirectResolver } = await import('firebase/auth');
const { clearStoredAuthSession, getFirebaseAuth, isFirebaseConfigured } = await import('./app');

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('clearStoredAuthSession', () => {
  it('borra la base de Auth en IndexedDB y las claves firebase:authUser de localStorage', () => {
    const deleteDatabase = vi.fn();
    vi.stubGlobal('indexedDB', { deleteDatabase });
    localStorage.setItem('firebase:authUser:KEY:[DEFAULT]', '{}');
    localStorage.setItem('otra-clave', 'se queda');
    clearStoredAuthSession();
    expect(deleteDatabase).toHaveBeenCalledWith('firebaseLocalStorageDb');
    expect(localStorage.getItem('firebase:authUser:KEY:[DEFAULT]')).toBeNull();
    expect(localStorage.getItem('otra-clave')).toBe('se queda');
  });

  it('no falla si el navegador no tiene IndexedDB', () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(() => clearStoredAuthSession()).not.toThrow();
  });
});

describe('getFirebaseAuth en la web', () => {
  it.skipIf(!isFirebaseConfigured)('usa persistencia en memoria (siempre pide la cuenta al abrir o recargar)', () => {
    getFirebaseAuth();
    expect(initializeAuth).toHaveBeenCalledWith(expect.anything(), {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    expect(getAuth).not.toHaveBeenCalled();
  });
});
