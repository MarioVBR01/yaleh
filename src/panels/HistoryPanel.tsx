/**
 * @file HistoryPanel.tsx
 * @description Historial de sesiones del escritorio (fase 10), leído de SQLite:
 * fecha, duración, modo, estado, pérdidas de foco, cortes de red e interrupciones.
 * "Exportar PDF" (ORION #8): lo genera el proceso principal en la carpeta de exportaciones.
 * Filtros (ORION #23): rango de fechas con "Buscar" y cantidad (10, 20, 30, 50 o todas). Exportar
 * usa lo filtrado.
 */

import { useState } from 'react';
import { Clock, FileDown, RefreshCw, Search } from 'lucide-react';
import { DEFAULT_HISTORY_LIMIT, filterSessions, HISTORY_PAGE_SIZES, type HistoryFilter } from '@shared/history-filter';
import { getElectronAPI } from '@/lib/electron';
import { useSessionHistory } from '@/lib/useSessionHistory';
import SessionTable from './SessionTable';

export default function HistoryPanel() {
  const { available, entries, loading, error, reload } = useSessionHistory();
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ ok: boolean; text: string } | null>(null);
  // Fechas que se están escribiendo y las aplicadas con "Buscar"; la cantidad se aplica al elegirla.
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [range, setRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [limit, setLimit] = useState<number | null>(DEFAULT_HISTORY_LIMIT);
  const filter: HistoryFilter = { ...range, limit };
  const visible = filterSessions(entries, filter);
  const filteredByDate = Boolean(range.from || range.to);

  const exportPdf = async () => {
    const api = getElectronAPI();
    if (!api) return;
    setExporting(true);
    setExportResult(null);
    try {
      const result = await api.exportSessionHistoryPdf(filter);
      setExportResult(result.ok ? { ok: true, text: `Guardado en ${result.path}` } : { ok: false, text: result.message });
    } catch {
      setExportResult({ ok: false, text: 'No se pudo exportar el historial a PDF.' });
    } finally {
      setExporting(false);
    }
  };

  let empty = 'Todavía no hay sesiones.';
  if (!available) empty = 'El historial se guarda en la aplicación de escritorio.';
  else if (loading) empty = 'Cargando…';
  else if (entries.length > 0 && filteredByDate) empty = 'No hay sesiones en esas fechas';

  return (
    <div className="h-full flex flex-col bg-canvas">
      <div className="p-5 border-b border-line flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink mb-1">📋 Historial de sesiones</h1>
          <p className="text-ink-muted text-sm">
            {available
              ? `${entries.length} sesiones guardadas en este equipo${entries.length > 0 ? ` · mostrando ${visible.length}` : ''}`
              : 'Disponible en la aplicación de escritorio'}
          </p>
        </div>
        {available && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => void exportPdf()}
              disabled={exporting || visible.length === 0}
              title="Exporta las sesiones que se ven en la tabla"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-surface-raised border-line text-ink-muted hover:text-ink disabled:opacity-50"
            >
              <FileDown size={13} />
              {exporting ? 'Exportando…' : 'Exportar PDF'}
            </button>
            <button
              onClick={() => void reload()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-surface-raised border-line text-ink-muted hover:text-ink"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>
          </div>
        )}
      </div>

      {available && (
        <div className="px-5 py-3 border-b border-line flex flex-wrap items-end gap-3 text-xs" aria-label="Filtros del historial">
          <label className="flex flex-col gap-1 text-ink-muted">
            Desde
            <input
              type="date"
              value={fromDraft}
              onChange={e => setFromDraft(e.target.value)}
              className="bg-canvas border border-line rounded-lg px-2 py-1 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-ink-muted">
            Hasta
            <input
              type="date"
              value={toDraft}
              onChange={e => setToDraft(e.target.value)}
              className="bg-canvas border border-line rounded-lg px-2 py-1 text-ink"
            />
          </label>
          <button
            onClick={() => setRange({ from: fromDraft || null, to: toDraft || null })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent bg-accent/10 text-ink"
          >
            <Search size={12} /> Buscar
          </button>
          {filteredByDate && (
            <button
              onClick={() => {
                setFromDraft('');
                setToDraft('');
                setRange({ from: null, to: null });
              }}
              className="px-2 py-1.5 text-ink-muted hover:text-ink underline"
            >
              Quitar fechas
            </button>
          )}
          <label className="flex flex-col gap-1 text-ink-muted ml-auto">
            Mostrar
            <select
              value={limit ?? 'all'}
              onChange={e => setLimit(e.target.value === 'all' ? null : Number(e.target.value))}
              className="bg-canvas border border-line rounded-lg px-2 py-1 text-ink"
              aria-label="Cantidad de sesiones"
            >
              {HISTORY_PAGE_SIZES.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value="all">Todos</option>
            </select>
          </label>
        </div>
      )}

      {exportResult && (
        <div
          role={exportResult.ok ? 'status' : 'alert'}
          className={`flex items-center gap-2 px-5 py-2 text-xs border-b ${
            exportResult.ok ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'
          } text-ink-soft`}
        >
          <span className="flex-1 break-all">{exportResult.text}</span>
          <button onClick={() => setExportResult(null)} className="underline text-ink-muted hover:text-ink">
            Cerrar
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-subtle">
            <Clock size={40} className="opacity-30" />
            <p className="text-sm">{empty}</p>
          </div>
        ) : (
          <SessionTable entries={visible} />
        )}
      </div>
    </div>
  );
}
