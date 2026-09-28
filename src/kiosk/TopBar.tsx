/**
 * @file TopBar.tsx
 * @description Barra Superior del entorno Kiosko SRB.
 * Contiene: Logo/Inicio, Botón Update, Buscador Unificado,
 * Acceso NotebookLM, Configuración y Estado de Sesión.
 */

import { useState, useRef, useEffect } from 'react';
import {
  RefreshCw, Search, Settings, NotebookPen,
  X, Globe, Folder, ChevronRight, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';


/** Sitios de la lista blanca para búsquedas rápidas */
const WHITELIST_SITES = [
  { name: 'Wikipedia', url: 'https://es.wikipedia.org', icon: '🌐' },
  { name: 'Google Scholar', url: 'https://scholar.google.com', icon: '🔬' },
  { name: 'Khan Academy', url: 'https://www.khanacademy.org', icon: '📐' },
  { name: 'Coursera', url: 'https://www.coursera.org', icon: '🎓' },
  { name: 'SciELO', url: 'https://www.scielo.org', icon: '📄' },
  { name: 'TED Talks', url: 'https://www.ted.com', icon: '🎤' },
  { name: 'Duolingo', url: 'https://www.duolingo.com', icon: '🦉' },
];

interface SearchResult {
  type: 'web' | 'file';
  label: string;
  sub?: string;
  url?: string;
  fileId?: string;
  icon: string;
}

interface TopBarProps {
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export default function TopBar({ onOpenSettings, onRefresh }: TopBarProps) {
  const { state, openTab, logActivity } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  /**
   * Buscador híbrido: filtra sitios de lista blanca y archivos locales
   * simultáneamente por el término de búsqueda ingresado.
   */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const q = query.toLowerCase();
    const webResults: SearchResult[] = WHITELIST_SITES
      .filter(s => s.name.toLowerCase().includes(q) || s.url.includes(q))
      .map(s => ({ type: 'web', label: s.name, sub: s.url, url: s.url, icon: s.icon }));

    const fileResults: SearchResult[] = state.uploadedFiles
      .filter(f => f.name.toLowerCase().includes(q))
      .map(f => ({ type: 'file', label: f.name, sub: 'Archivo local', fileId: f.id, icon: '📄' }));

    // Resultado de búsqueda directa en Wikipedia
    const directSearch: SearchResult = {
      type: 'web',
      label: `Buscar "${query}" en Wikipedia`,
      sub: `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
      url: `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
      icon: '🔍',
    };

    setResults([directSearch, ...webResults, ...fileResults].slice(0, 8));
    setShowResults(true);
  }, [query, state.uploadedFiles]);

  /**
   * Cierra el dropdown si se hace clic fuera del buscador.
   */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Procesa la selección de un resultado de búsqueda.
   * Abre una nueva pestaña con la URL o el archivo correspondiente.
   */
  const handleSelectResult = (result: SearchResult) => {
    if (result.url) {
      openTab({
        type: 'workspace-url',
        title: result.label,
        url: result.url,
        icon: result.icon,
      });
      logActivity({ type: 'search', label: `Búsqueda: ${query}`, detail: result.url, icon: '🔍' });
    }
    setQuery('');
    setShowResults(false);
  };

  /**
   * Abre Wikipedia como motor de búsqueda al presionar Enter.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      const url = `https://es.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
      openTab({ type: 'workspace-url', title: `Búsqueda: ${query}`, url, icon: '🔍' });
      logActivity({ type: 'search', label: `Búsqueda: ${query}`, detail: url, icon: '🔍' });
      setQuery('');
      setShowResults(false);
    }
  };

  /**
   * Abre NotebookLM en una nueva pestaña.
   */
  const handleNotebookLM = () => {
    openTab({
      type: 'workspace-url',
      title: 'NotebookLM',
      url: 'https://notebooklm.google.com',
      icon: '📓',
    });
    logActivity({ type: 'site', label: 'NotebookLM abierto', icon: '📓' });
  };

  /**
   * Recarga la pestaña activa actual.
   * En Electron real: ipcRenderer.send('reload-webview').
   */
  const handleRefresh = () => {
    onRefresh();
    logActivity({ type: 'tool', label: 'Recarga de página', icon: '🔄' });
  };

  return (
    <div className="h-14 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 flex items-center gap-3 px-3 relative z-40 flex-shrink-0">

      {/* Logo / Inicio */}
      <motion.button
        onClick={() => {
          const dashTab = { id: 'dashboard', type: 'dashboard' as const, title: 'Inicio', icon: '🏠' };
          openTab(dashTab);
        }}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors flex-shrink-0 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="text-white text-xs font-bold">SR</span>
        </div>
        <span className="text-slate-300 text-xs font-semibold group-hover:text-white transition-colors hidden sm:block">
          SRB
        </span>
      </motion.button>

      {/* Botón de Update/Reload */}
      <motion.button
        onClick={handleRefresh}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex-shrink-0"
        whileHover={{ scale: 1.1 }}
        whileTap={{ rotate: 180, scale: 0.9 }}
      >
        <RefreshCw size={16} />
      </motion.button>

      {/* Buscador Unificado */}
      <div ref={searchRef} className="flex-1 relative max-w-2xl mx-auto">
        <div
          className={`flex items-center gap-2 bg-slate-800 border rounded-xl px-3 py-2 transition-all ${
            focused ? 'border-blue-500/60 ring-1 ring-blue-500/20' : 'border-slate-700'
          }`}
        >
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar en la web académica o en tus archivos..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none min-w-0"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown de resultados */}
        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              {results.map((result, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectResult(result)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="text-lg flex-shrink-0">{result.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{result.label}</p>
                    {result.sub && (
                      <p className="text-xs text-slate-500 truncate">{result.sub}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {result.type === 'web'
                      ? <Globe size={12} className="text-slate-500" />
                      : <Folder size={12} className="text-slate-500" />
                    }
                  </div>
                  <ChevronRight size={12} className="text-slate-600" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Botón NotebookLM */}
      <motion.button
        onClick={handleNotebookLM}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all flex-shrink-0"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Abrir NotebookLM"
      >
        <NotebookPen size={15} />
        <span className="hidden md:block">NotebookLM</span>
      </motion.button>

      {/* Configuración */}
      <motion.button
        onClick={onOpenSettings}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex-shrink-0"
        whileHover={{ scale: 1.1, rotate: 45 }}
        whileTap={{ scale: 0.9 }}
        title="Configuración"
      >
        <Settings size={16} />
      </motion.button>

      {/* Estado de sesión */}
      <div className="flex-shrink-0">
        {state.session.isAuthenticated || state.session.isAnonymous ? (
          <div className="flex items-center gap-2">
            {state.session.isAnonymous ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                <User size={12} className="text-slate-400" />
                <span className="text-slate-400 text-xs">Invitado</span>
              </div>
            ) : (
              <motion.div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg cursor-pointer"
                whileHover={{ scale: 1.1 }}
                title={state.session.displayName}
              >
                {state.session.initials || 'U'}
              </motion.div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {}} 
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2"
          >
            Iniciar Sesión
          </button>
        )}
      </div>
    </div>
  );
}
