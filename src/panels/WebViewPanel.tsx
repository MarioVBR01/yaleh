/**
 * @file WebViewPanel.tsx
 * @description Panel de visualización web para sitios de la Lista Blanca.
 * Simula el renderizado de una URL dentro del entorno SRB usando un iframe
 * con atributos de seguridad. En Electron real se usaría <webview> con
 * preload y sandbox. Incluye barra de navegación interna y estado de carga.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ExternalLink, Shield, AlertTriangle, Lock } from 'lucide-react';

/**
 * Lista blanca de dominios permitidos.
 * Se valida antes de cargar cualquier URL en el panel.
 */
const WHITELIST_DOMAINS = [
  'wikipedia.org', 'scholar.google.com', 'moodle.org', 'classroom.google.com',
  'duolingo.com', 'khanacademy.org', 'coursera.org', 'scielo.org', 'educatina.com',
  'ted.com', 'nibble.org', 'seekho.com', 'curiositystream.com', 'studytok.com',
  'pexels.com', 'pixabay.com', 'freepik.com', 'pics4learning.com',
  'workspace.google.com', 'notebooklm.google.com', 'docs.google.com',
  'sheets.google.com', 'slides.google.com', 'drive.google.com',
];

/**
 * Verifica si una URL pertenece a la lista blanca de dominios permitidos.
 * @param url URL a validar
 * @returns true si el dominio está permitido
 */
function isUrlAllowed(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return WHITELIST_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

/**
 * Obtiene el nombre limpio del dominio para mostrar en la UI.
 */
function getDomainName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

interface WebViewPanelProps {
  url: string;
  title: string;
}

export default function WebViewPanel({ url, title }: WebViewPanelProps) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [addressBar, setAddressBar] = useState(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isAllowed = isUrlAllowed(currentUrl);

  /**
   * Recarga el iframe o fuerza una nueva carga de la URL actual.
   */
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setLoadError(false);
    if (iframeRef.current) {
      // Resetear src para forzar recarga
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = currentSrc;
      }, 100);
    }
  }, []);

  /**
   * Navega a una nueva URL si pertenece a la lista blanca.
   * Bloquea cualquier URL fuera del dominio permitido.
   */
  const handleNavigate = (newUrl: string) => {
    let processedUrl = newUrl.trim();
    if (!processedUrl.startsWith('http')) {
      processedUrl = `https://${processedUrl}`;
    }

    if (!isUrlAllowed(processedUrl)) {
      alert(`⛔ Acceso bloqueado: "${getDomainName(processedUrl)}" no está en la lista de sitios académicos permitidos.`);
      return;
    }

    setCurrentUrl(processedUrl);
    setAddressBar(processedUrl);
    setIsLoading(true);
    setLoadError(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleNavigate(addressBar);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Barra de navegación interna */}
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center gap-2">

        {/* Indicador de seguridad */}
        <div className={`flex-shrink-0 p-1.5 rounded-lg ${isAllowed ? 'text-emerald-400' : 'text-red-400'}`}>
          {isAllowed ? <Lock size={14} /> : <AlertTriangle size={14} />}
        </div>

        {/* Barra de URL */}
        <div className="flex-1 flex items-center bg-slate-800 border border-slate-700 focus-within:border-blue-500/60 rounded-xl px-3 py-1.5 gap-2">
          <span className="text-slate-500 text-xs">{isAllowed ? '🔒' : '⚠️'}</span>
          <input
            type="text"
            value={addressBar}
            onChange={e => setAddressBar(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white focus:outline-none"
          />
        </div>

        {/* Botón de recarga */}
        <motion.button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          whileTap={{ rotate: 360, transition: { duration: 0.3 } }}
        >
          <RefreshCw size={14} />
        </motion.button>

        {/* Abrir en nueva ventana */}
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          title="Abrir en nueva ventana"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Contenedor del iframe */}
      <div className="flex-1 relative overflow-hidden">

        {/* Indicador de carga */}
        <AnimatePresence>
          {isLoading && !loadError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10"
            >
              <motion.div
                className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-slate-400 text-sm">Cargando {getDomainName(currentUrl)}...</p>
              <p className="text-slate-600 text-xs mt-1">Verificando lista blanca de sitios académicos</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error de carga — común en modo web por CORS */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-10 p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-amber-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">Vista previa no disponible</h2>
              <p className="text-slate-400 text-sm mb-4">
                El sitio <strong className="text-white">{getDomainName(currentUrl)}</strong> bloquea
                la carga en marcos embebidos (política X-Frame-Options). Esto es normal en modo web.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                En la versión Electron de escritorio, esto se soluciona con el componente &lt;webview&gt;
                que tiene acceso completo al proceso nativo del navegador.
              </p>
              <div className="flex gap-3 justify-center">
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                >
                  <ExternalLink size={15} /> Abrir en nueva pestaña
                </a>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  <RefreshCw size={15} /> Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vista de sitio bloqueado */}
        {!isAllowed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield size={28} className="text-red-400" />
              </div>
              <h2 className="text-white font-bold text-lg mb-2">⛔ Acceso Bloqueado</h2>
              <p className="text-slate-400 text-sm mb-2">
                <strong className="text-red-400">{getDomainName(currentUrl)}</strong> no está
                en la lista de sitios académicos permitidos por el SRB.
              </p>
              <p className="text-slate-500 text-xs">
                El control de tráfico de red del modo kiosko bloquea el acceso
                a este dominio para mantener el enfoque académico.
              </p>
            </div>
          </div>
        )}

        {/* Iframe del sitio web */}
        {isAllowed && (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        )}
      </div>
    </div>
  );
}
