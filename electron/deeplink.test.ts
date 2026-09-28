// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { describeDeepLinkForLog, findDeepLinkInArgv, parseDeepLink } from './deeplink';

describe('parseDeepLink', () => {
  it('acepta yaleh://auth con token y state', () => {
    expect(parseDeepLink('yaleh://auth?token=eyJ.abc-_1&state=Abc_123')).toEqual({
      kind: 'auth',
      token: 'eyJ.abc-_1',
      state: 'Abc_123',
    });
  });

  it('acepta yaleh://auth sin state (se valida en la fase 4)', () => {
    expect(parseDeepLink('yaleh://auth?token=abc')).toEqual({ kind: 'auth', token: 'abc', state: null });
  });

  it('acepta la barra final que agrega Windows', () => {
    expect(parseDeepLink('yaleh://auth/?token=abc')).toMatchObject({ kind: 'auth' });
    expect(parseDeepLink('yaleh://sesion/?id=s-1')).toEqual({ kind: 'session', sessionId: 's-1' });
  });

  it('acepta yaleh://sesion con id', () => {
    expect(parseDeepLink('yaleh://sesion?id=Ab_c-9')).toEqual({ kind: 'session', sessionId: 'Ab_c-9' });
  });

  it('ignora mayúsculas en el esquema y el host', () => {
    expect(parseDeepLink('YALEH://SESION?id=s1')).toEqual({ kind: 'session', sessionId: 's1' });
  });

  it.each([
    ['otro host', 'yaleh://ajustes?x=1'],
    ['auth sin token', 'yaleh://auth'],
    ['token vacío', 'yaleh://auth?token='],
    ['token con caracteres raros', 'yaleh://auth?token=<script>'],
    ['state inválido', 'yaleh://auth?token=abc&state=a%20b'],
    ['sesion sin id', 'yaleh://sesion'],
    ['id inválido', 'yaleh://sesion?id=../../etc'],
    ['ruta adicional', 'yaleh://auth/extra?token=abc'],
    ['otro esquema', 'https://yaleh-fbe1c.web.app/?token=abc'],
    ['credenciales', 'yaleh://user:pass@auth?token=abc'],
    ['no es URL', 'yaleh auth token'],
  ])('rechaza %s', (_name, raw) => {
    expect(parseDeepLink(raw)).toBeNull();
  });

  it('rechaza enlaces demasiado largos', () => {
    expect(parseDeepLink(`yaleh://auth?token=${'a'.repeat(20000)}`)).toBeNull();
  });
});

describe('findDeepLinkInArgv', () => {
  it('encuentra el enlace entre los argumentos de Windows', () => {
    const argv = ['C:\\YALEH\\YALEH.exe', '--allow-file-access', 'yaleh://sesion?id=s1'];
    expect(findDeepLinkInArgv(argv)).toBe('yaleh://sesion?id=s1');
  });

  it('devuelve undefined si no hay enlace', () => {
    expect(findDeepLinkInArgv(['C:\\YALEH\\YALEH.exe', '.'])).toBeUndefined();
  });
});

describe('describeDeepLinkForLog', () => {
  it('nunca incluye el token ni los parámetros', () => {
    const text = describeDeepLinkForLog('yaleh://otro?token=SECRETO#x');
    expect(text).toBe('yaleh://otro');
    expect(text).not.toContain('SECRETO');
  });
});
