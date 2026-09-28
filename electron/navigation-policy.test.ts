// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isFrameUrlAllowed, isMainWindowNavigationAllowed, type NavigationContext } from './navigation-policy';

const APP = 'file:///C:/YALEH/resources/app/dist/index.html';

const packaged: NavigationContext = {
  isAppUrl: url => url.split('#')[0] === APP,
  allowDevServer: false,
};

describe('isFrameUrlAllowed', () => {
  it('permite la interfaz propia, about:blank y sitios de la lista', () => {
    expect(isFrameUrlAllowed(APP, packaged)).toBe(true);
    expect(isFrameUrlAllowed('about:blank', packaged)).toBe(true);
    expect(isFrameUrlAllowed('https://classroom.google.com/', packaged)).toBe(true);
  });

  it('bloquea sitios fuera de la lista, otros archivos y esquemas de datos', () => {
    expect(isFrameUrlAllowed('https://www.youtube.com/', packaged)).toBe(false);
    expect(isFrameUrlAllowed('file:///C:/Users/x/pagina.html', packaged)).toBe(false);
    expect(isFrameUrlAllowed('data:text/html,<h1>x</h1>', packaged)).toBe(false);
    expect(isFrameUrlAllowed('http://localhost:5173/', packaged)).toBe(false);
  });

  it('permite el servidor de Vite solo en desarrollo', () => {
    expect(isFrameUrlAllowed('http://localhost:5173/', { ...packaged, allowDevServer: true })).toBe(true);
  });
});

describe('isMainWindowNavigationAllowed', () => {
  it('la ventana principal solo puede mostrar la interfaz de YALEH', () => {
    expect(isMainWindowNavigationAllowed(`${APP}#inicio`, packaged)).toBe(true);
    expect(isMainWindowNavigationAllowed('https://classroom.google.com/', packaged)).toBe(false);
  });
});
