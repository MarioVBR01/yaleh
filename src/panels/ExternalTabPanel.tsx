/**
 * @file ExternalTabPanel.tsx
 * @description Espacio de una pestaña interna (herramienta o reproductor de YouTube).
 * La página la dibuja el proceso principal con WebContentsView encima de este
 * espacio; aquí solo se informa su posición y tamaño (brief, sección 10).
 * Reemplaza al WebViewPanel con iframes del MVP.
 * Barra superior con ⟳ (ORION #24): recarga la página actual sin cerrar la pestaña. Solo existe en
 * las pestañas externas (las vistas propias de YALEH no usan este panel).
 */

import { useEffect, useRef } from 'react';
import { AlertTriangle, Globe, RotateCw } from 'lucide-react';
import { displayHost } from '@shared/allowlist';
import { getElectronAPI } from '../lib/electron';
import { useModeFlags } from '../lib/mode';
import type { Tab } from '../store/appStore';

export default function ExternalTabPanel({ tab }: { tab: Tab }) {
  const ref = useRef<HTMLDivElement>(null);
  const { onlineTools } = useModeFlags();

  useEffect(() => {
    const el = ref.current;
    const api = getElectronAPI();
    if (!el || !api) return;
    const report = () => {
      const r = el.getBoundingClientRect();
      // Las pestañas inactivas están ocultas (tamaño 0): no se informa.
      if (r.width > 0 && r.height > 0) {
        void api.tabs.setBounds(tab.id, { x: r.left, y: r.top, width: r.width, height: r.height });
      }
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    window.addEventListener('resize', report);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', report);
    };
  }, [tab.id]);

  return (
    <div className="h-full w-full flex flex-col bg-canvas">
      <div className="flex-shrink-0 h-8 px-2 flex items-center gap-2 border-b border-line bg-surface text-xs text-ink-muted">
        <button
          onClick={() => void getElectronAPI()?.tabs.reload(tab.id)}
          disabled={!onlineTools}
          className="p-1 rounded hover:bg-surface-raised hover:text-ink disabled:opacity-40"
          title="Recargar la página"
          aria-label="Recargar la página"
        >
          <RotateCw size={14} />
        </button>
        <span className="truncate">{tab.url ? displayHost(tab.url) : tab.title}</span>
      </div>
      <div ref={ref} className="flex-1 min-h-0 w-full bg-canvas flex items-center justify-center">
        {/* Solo se ve mientras la vista está oculta (sin conexión, diálogo abierto o error). */}
        <div className="text-center max-w-sm p-6">
          {!onlineTools ? (
            <p role="status" className="text-ink-muted text-sm">
              Sin conexión: esta herramienta no está disponible. Puedes seguir con los módulos locales.
            </p>
          ) : tab.error ? (
            <p role="alert" className="text-ink-muted text-sm flex flex-col items-center gap-2">
              <AlertTriangle size={20} className="text-warning" /> {tab.error}
            </p>
          ) : (
            <p className="text-ink-subtle text-xs flex flex-col items-center gap-2">
              <Globe size={20} /> Cargando {tab.title}…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
