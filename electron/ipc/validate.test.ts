// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl, isTrustedSenderUrl, parseDurationSeconds, type SenderTrust } from './validate';

const packaged: SenderTrust = {
  appIndexUrl: 'file:///C:/Program%20Files/YALEH/resources/app/dist/index.html',
  devServerOrigin: null,
  trustedWebOrigins: [],
};

const dev: SenderTrust = { ...packaged, devServerOrigin: 'http://localhost:5173' };

describe('isTrustedSenderUrl', () => {
  it('acepta el index.html propio (con hash o consulta)', () => {
    expect(isTrustedSenderUrl(packaged.appIndexUrl, packaged)).toBe(true);
    expect(isTrustedSenderUrl(`${packaged.appIndexUrl}#/kiosk`, packaged)).toBe(true);
    expect(isTrustedSenderUrl('file:///c:/Program%20Files/YALEH/resources/app/dist/index.html', packaged)).toBe(true);
  });

  it('rechaza otros archivos locales', () => {
    expect(isTrustedSenderUrl('file:///C:/Users/x/Downloads/malicioso.html', packaged)).toBe(false);
    expect(isTrustedSenderUrl('file:///C:/Program%20Files/YALEH/resources/app/dist/otra.html', packaged)).toBe(false);
  });

  it('acepta el servidor de Vite solo en desarrollo', () => {
    expect(isTrustedSenderUrl('http://localhost:5173/', dev)).toBe(true);
    expect(isTrustedSenderUrl('http://localhost:5173/', packaged)).toBe(false);
    expect(isTrustedSenderUrl('http://localhost:5174/', dev)).toBe(false);
  });

  it('rechaza sitios externos, aunque estén en la lista de sitios permitidos', () => {
    expect(isTrustedSenderUrl('https://docs.google.com/', packaged)).toBe(false);
    expect(isTrustedSenderUrl('https://yaleh-fbe1c.web.app/', packaged)).toBe(false);
  });

  it('acepta la web de YALEH cuando se habilita (fase 4)', () => {
    const withWeb = { ...packaged, trustedWebOrigins: ['https://yaleh-fbe1c.web.app'] };
    expect(isTrustedSenderUrl('https://yaleh-fbe1c.web.app/kiosko', withWeb)).toBe(true);
  });

  it('rechaza valores vacíos o inválidos', () => {
    expect(isTrustedSenderUrl(undefined, packaged)).toBe(false);
    expect(isTrustedSenderUrl('', packaged)).toBe(false);
    expect(isTrustedSenderUrl('no es url', packaged)).toBe(false);
  });
});

describe('parseDurationSeconds', () => {
  it('acepta enteros dentro del rango', () => {
    expect(parseDurationSeconds(1500, 60, 10800)).toBe(1500);
    expect(parseDurationSeconds(60, 60, 10800)).toBe(60);
    expect(parseDurationSeconds(10800, 60, 10800)).toBe(10800);
  });

  it.each([['texto', '1500'], ['decimal', 90.5], ['NaN', Number.NaN], ['null', null], ['objeto', {}]])(
    'rechaza %s',
    (_name, value) => {
      expect(() => parseDurationSeconds(value, 60, 10800)).toThrow();
    }
  );

  it('rechaza valores fuera del rango', () => {
    expect(() => parseDurationSeconds(59, 60, 10800)).toThrow('fuera del rango');
    expect(() => parseDurationSeconds(10801, 60, 10800)).toThrow('fuera del rango');
  });
});

describe('isAllowedExternalUrl', () => {
  it('acepta solo la web de YALEH por HTTPS', () => {
    expect(isAllowedExternalUrl('https://yaleh-fbe1c.web.app/')).toBe(true);
    expect(isAllowedExternalUrl('https://yaleh-fbe1c.firebaseapp.com/auth-desktop.html?state=x')).toBe(true);
  });

  it.each([
    'http://yaleh-fbe1c.web.app/',
    'https://docs.google.com/',
    'https://yaleh-fbe1c.web.app.evil.io/',
    'https://user@yaleh-fbe1c.web.app/',
    'file:///C:/Windows/System32/cmd.exe',
    'ms-settings:',
    'mailto:x@y.z',
    'javascript:alert(1)',
  ])('rechaza %s', url => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });

  it('rechaza valores que no son texto', () => {
    expect(isAllowedExternalUrl(42)).toBe(false);
    expect(isAllowedExternalUrl(undefined)).toBe(false);
  });
});
