/**
 * @file HistoryPanel.tsx
 * @description Historial de sesiones del escritorio (fase 10), leído de SQLite:
 * fecha, duración, modo, estado, pérdidas de foco, cortes de red e interrupciones.
 * "Exportar PDF" (ORION #8): lo genera el proceso principal en Documentos\\YALEH.
 */

import { useState } from 'react';
import { Clock, FileDown, RefreshCw } from 'lucide-react';
import { getElectronAPI } from '@/lib/electron';
import { useSessionHistory } from '@/lib/useSessionHistory';
import SessionTable from './SessionTable';

export default function HistoryPanel() {
  const { available, entries, loading, error, reload } = useSessionHistory();
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ ok: boolean; text: string } | null>(null);

  const exportPdf = async () => {
    const api = getElectronAPI();
    if (!api) return;
    setExporting(true);
    setExportResult(null);
    try {
      const result = await api.exportSessionHistoryPdf();
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

  return (
    <div className="h-full flex flex-col bg-canvas">
      <div className="p-5 border-b border-line flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-ink mb-1">📋 Historial de sesiones</h1>
          <p className="text-ink-muted text-sm">
            {available ? `${entries.length} sesiones guardadas en este equipo` : 'Disponible en la aplicación de escritorio'}
          </p>
        </div>
        {available && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => void exportPdf()}
              disabled={exporting || entries.length === 0}
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
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-ink-subtle">
            <Clock size={40} className="opacity-30" />
            <p className="text-sm">{empty}</p>
          </div>
        ) : (
          <SessionTable entries={entries} />
        )}
      </div>
    </div>
  );
}
