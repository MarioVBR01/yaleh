/**
 * @file HistoryPanel.tsx
 * @description Panel de Historial de actividad del usuario de YALEH.
 * Muestra registros de: archivos importados, herramientas utilizadas,
 * sitios visitados y búsquedas realizadas durante la sesión.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Clock, Globe, File, Wrench, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ActivityRecord } from '../store/appStore';

/** Tipos de filtro disponibles para el historial */
type FilterType = 'all' | 'file' | 'tool' | 'site' | 'search';

const FILTER_OPTIONS: { value: FilterType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'Todo', icon: <Clock size={13} />, color: 'text-slate-400' },
  { value: 'site', label: 'Sitios', icon: <Globe size={13} />, color: 'text-blue-400' },
  { value: 'file', label: 'Archivos', icon: <File size={13} />, color: 'text-emerald-400' },
  { value: 'tool', label: 'Herramientas', icon: <Wrench size={13} />, color: 'text-amber-400' },
  { value: 'search', label: 'Búsquedas', icon: <Search size={13} />, color: 'text-purple-400' },
];

/**
 * Formatea una fecha al formato legible relativo ("hace X minutos").
 */
function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Hace un momento';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString('es');
}

/**
 * Retorna la clase de color de fondo según el tipo de actividad.
 */
function getTypeStyle(type: ActivityRecord['type']): string {
  switch (type) {
    case 'file': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
    case 'tool': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    case 'site': return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    case 'search': return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
    default: return 'bg-slate-500/10 border-slate-500/20 text-slate-400';
  }
}

export default function HistoryPanel() {
  const { state } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');

  /**
   * Filtra los registros de actividad según el tipo y el término de búsqueda.
   */
  const filteredHistory = state.activityHistory.filter(record => {
    const matchesType = filter === 'all' || record.type === filter;
    const matchesSearch = !search ||
      record.label.toLowerCase().includes(search.toLowerCase()) ||
      (record.detail?.toLowerCase().includes(search.toLowerCase()) ?? false);
    return matchesType && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="p-5 border-b border-slate-800">
        <h1 className="text-lg font-bold text-white mb-1">📋 Historial de Sesión</h1>
        <p className="text-slate-400 text-sm">
          {state.activityHistory.length} registros en esta sesión
        </p>
      </div>

      {/* Controles de filtro */}
      <div className="p-4 border-b border-slate-800 space-y-3">
        {/* Buscador */}
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
          <Search size={14} className="text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar en el historial..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filtros de tipo */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                filter === opt.value
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <span className={filter === opt.value ? 'text-blue-400' : opt.color}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de actividades */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {filteredHistory.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-3 text-slate-600"
            >
              <Clock size={40} className="opacity-30" />
              <p className="text-sm">
                {state.activityHistory.length === 0
                  ? 'No hay actividad registrada aún'
                  : 'No se encontraron resultados para el filtro aplicado'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((record, i) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  {/* Ícono de actividad */}
                  <div className="text-lg flex-shrink-0 mt-0.5">
                    {record.icon || '📌'}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{record.label}</p>
                    {record.detail && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{record.detail}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      {/* Badge de tipo */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] ${getTypeStyle(record.type)}`}>
                        {record.type === 'file' && <File size={9} />}
                        {record.type === 'tool' && <Wrench size={9} />}
                        {record.type === 'site' && <Globe size={9} />}
                        {record.type === 'search' && <Search size={9} />}
                        {record.type}
                      </span>
                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-600">
                        {formatRelativeTime(new Date(record.timestamp))}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
