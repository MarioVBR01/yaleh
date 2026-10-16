/**
 * @file HistoryPanel.tsx
 * @description Historial de sesiones del escritorio (fase 10), leído de SQLite:
 * fecha, duración, modo, estado, pérdidas de foco, cortes de red e interrupciones.
 * "Exportar PDF" (ORION #8): lo genera el proceso principal en la carpeta de exportaciones.
 * Filtros (ORION #23 y #36): atajos de un clic (Todo, Hoy, 7 días, Este mes, Elegir fechas), estado,
 * modo y cantidad; se aplican apenas se eligen (sin "Buscar") y debajo va el resumen de lo filtrado.
 * Exportar usa lo filtrado. La carpeta se elige con el selector propio de YALEH (ORION #22), nunca
 * con la ventana de Windows.
 */

import { useState } from 'react';
import { CalendarRange, Clock, FileDown, RefreshCw, X } from 'lucide-react';
import {
  DEFAULT_HISTORY_LIMIT,
  filterSessions,
  HISTORY_PAGE_SIZES,
  presetRange,
  summarizeSessions,
  type DatePreset,
  type HistoryFilter,
  type HistoryStatus,
} from '@shared/history-filter';
import type { SessionMode } from '@shared/ipc-types';
import { getElectronAPI } from '@/lib/electron';
import { useSessionHistory } from '@/lib/useSessionHistory';
import FolderPicker from './FolderPicker';
import SessionTable from './SessionTable';

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'today', label: 'Hoy' },
  { id: '7d', label: '7 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'custom', label: 'Elegir fechas' },
];

const select = 'bg-canvas border border-line rounded-lg px-2 py-1 text-ink';

export default function HistoryPanel() {
  const { available, entries, loading, error, reload } = useSessionHistory();
  const [exporting, setExporting] = useState(false);
  const [choosingFolder, setChoosingFolder] = useState(false);
  const [exportResult, setExportResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [preset, setPreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [status, setStatus] = useState<HistoryStatus | null>(null);
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [limit, setLimit] = useState<number | null>(DEFAULT_HISTORY_LIMIT);

  const range = preset === 'custom' ? { from: customFrom || null, to: customTo || null } : presetRange(preset);
  const filter: HistoryFilter = { ...range, status, mode, limit };
  const visible = filterSessions(entries, filter);
  const summary = summarizeSessions(visible);
  const filtered = Boolean(range.from || range.to || status || mode);

  const clearCustom = () => {
    setCustomFrom('');
    setCustomTo('');
    setPreset('all');
  };

  const exportPdf = async (folder: string) => {
    const api = getElectronAPI();
    if (!api) return;
    setChoosingFolder(false);
    setExporting(true);
    setExportResult(null);
    try {
      const result = await api.exportSessionHistoryPdf(filter, folder);
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
  else if (entries.length > 0 && filtered) empty = 'No hay sesiones con esos filtros';

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
              onClick={() => {
                setExportResult(null);
                setChoosingFolder(true);
              }}
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
        <div className="px-5 py-3 border-b border-line space-y-2.5 text-xs" aria-label="Filtros del historial">
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Fechas" className="flex flex-wrap items-center gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  aria-pressed={preset === p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3 py-1.5 rounded-full border font-medium ${
                    preset === p.id ? 'bg-accent border-accent text-on-accent' : 'border-line text-ink-muted hover:text-ink hover:border-line-strong'
                  }`}
                >
                  {p.id === 'custom' && <CalendarRange size={12} className="inline -mt-0.5 mr-1" />}
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <select
                value={status ?? ''}
                onChange={e => setStatus((e.target.value || null) as HistoryStatus | null)}
                className={select}
                aria-label="Estado"
              >
                <option value="">Todos los estados</option>
                <option value="completed">Completada</option>
                <option value="interrupted">Interrumpida</option>
                <option value="active">En curso</option>
              </select>
              <select
                value={mode ?? ''}
                onChange={e => setMode((e.target.value || null) as SessionMode | null)}
                className={select}
                aria-label="Modo"
              >
                <option value="">Todos los modos</option>
                <option value="online">Con conexión</option>
                <option value="offline">Sin conexión</option>
              </select>
              <label className="flex items-center gap-1.5 text-ink-muted">
                Mostrar
                <select
                  value={limit ?? 'all'}
                  onChange={e => setLimit(e.target.value === 'all' ? null : Number(e.target.value))}
                  className={select}
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
          </div>

          {preset === 'custom' && (
            <div data-testid="custom-range" className="inline-flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl border-2 border-accent bg-accent/10">
              <label className="flex items-center gap-1.5 text-ink-soft">
                Desde
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={select} />
              </label>
              <label className="flex items-center gap-1.5 text-ink-soft">
                Hasta
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={select} />
              </label>
              <button onClick={clearCustom} className="p-1 rounded text-ink-muted hover:text-ink" title="Quitar fechas" aria-label="Quitar fechas">
                <X size={14} />
              </button>
            </div>
          )}

          {visible.length > 0 && (
            <p data-testid="history-summary" className="text-ink-muted">
              <strong className="text-ink">{summary.sessions}</strong> {summary.sessions === 1 ? 'sesión' : 'sesiones'} ·{' '}
              <strong className="text-ink">{summary.studiedMinutes}</strong> min estudiados ·{' '}
              <strong className="text-ink">{summary.completedPercent} %</strong> completadas
            </p>
          )}
        </div>
      )}

      {choosingFolder && (
        <FolderPicker
          title="¿Dónde guardar el historial (PDF)?"
          onSelect={folder => void exportPdf(folder)}
          onCancel={() => setChoosingFolder(false)}
        />
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
