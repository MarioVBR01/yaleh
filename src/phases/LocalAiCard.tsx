/**
 * @file LocalAiCard.tsx
 * @description Asistente sin conexión en la bienvenida del escritorio (revisión 1.8):
 * requisitos del equipo, descarga con progreso (reanudable, verificada con SHA-256) y licencia.
 * Solo se descarga con conexión y fuera de la sesión; el proceso principal lo vuelve a comprobar.
 */

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, Pause, Sparkles, Trash2 } from 'lucide-react';
import type { LocalAiStatus } from '@shared/ipc-types';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';

const GB = 1024 ** 3;
const formatGb = (bytes: number) => `${(bytes / GB).toFixed(1).replace('.', ',')} GB`;

/** Electron antepone "Error invoking remote method …: Error:" al mensaje del proceso principal. */
export function ipcErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function License({ status }: { status: LocalAiStatus }) {
  return (
    <p className="text-ink-subtle text-[10px] mt-2">
      Modelo {status.model.name} del {status.model.author}, con licencia {status.model.license} ({status.model.licenseUrl}). Se
      guarda en este equipo y funciona sin internet: tus documentos no salen de la computadora.
    </p>
  );
}

function ProgressBar({ status, label }: { status: LocalAiStatus; label: string }) {
  const percent = status.totalBytes > 0 ? Math.min(100, Math.floor((status.receivedBytes / status.totalBytes) * 100)) : 0;
  return (
    <div className="mt-2" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-2 rounded-full bg-surface-raised overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-[11px] text-ink-muted mt-1">
        {label}: {percent}% ({formatGb(status.receivedBytes)} de {formatGb(status.totalBytes)})
      </p>
    </div>
  );
}

export default function LocalAiCard() {
  const { state } = useApp();
  const api = getElectronAPI();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = state.localAi;
  if (!api || !status) return null;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(ipcErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const online = state.connection === 'online';
  const button =
    'w-full py-2 rounded-xl text-xs border border-line text-ink-soft hover:text-ink hover:border-line-strong transition-colors flex items-center justify-center gap-2 disabled:opacity-60';

  let body: React.ReactNode;
  switch (status.state) {
    case 'unsupported':
      body = (
        <div role="alert" className="text-xs text-ink-soft flex gap-2 text-left">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-ink mb-1">Este equipo no puede usar el asistente sin conexión.</p>
            {status.requirements.problems.map(p => (
              <p key={p}>{p}</p>
            ))}
            <p className="mt-1 text-ink-muted">Con conexión podrás seguir usando el asistente en línea.</p>
          </div>
        </div>
      );
      break;
    case 'installed':
      body = (
        <>
          <p className="text-xs text-ink-soft flex items-center justify-center gap-2">
            <CheckCircle2 size={14} className="text-success" /> Asistente sin conexión instalado
          </p>
          <button onClick={() => void run(() => api.localAi.removeModel())} disabled={busy} className={`${button} mt-2`}>
            <Trash2 size={13} /> Eliminar asistente sin conexión ({formatGb(status.model.sizeBytes)})
          </button>
          <License status={status} />
        </>
      );
      break;
    case 'downloading':
      body = (
        <>
          <ProgressBar status={status} label="Descargando" />
          <button onClick={() => void run(() => api.localAi.pauseDownload())} disabled={busy} className={`${button} mt-2`}>
            <Pause size={13} /> Pausar
          </button>
          <License status={status} />
        </>
      );
      break;
    case 'verifying':
      body = (
        <>
          <ProgressBar status={status} label="Verificando el archivo (SHA-256)" />
          <License status={status} />
        </>
      );
      break;
    default: {
      // not-installed, paused o error: se ofrece descargar o reanudar si hay conexión.
      const paused = status.state === 'paused';
      body = (
        <>
          {status.message && (
            <p role="alert" className="text-xs text-danger mb-2">
              {status.message}
            </p>
          )}
          {paused && <ProgressBar status={status} label="Descarga en pausa" />}
          {online ? (
            <button onClick={() => void run(() => api.localAi.startDownload())} disabled={busy} className={`${button} mt-2`}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              {paused ? 'Reanudar descarga' : `Descargar asistente sin conexión (${formatGb(status.model.sizeBytes)})`}
            </button>
          ) : (
            <p className="text-xs text-ink-muted mt-2">Conéctate a internet para descargar el asistente sin conexión.</p>
          )}
          {paused && (
            <button onClick={() => void run(() => api.localAi.removeModel())} disabled={busy} className={`${button} mt-2`}>
              <Trash2 size={13} /> Descartar la descarga
            </button>
          )}
          <License status={status} />
        </>
      );
    }
  }

  return (
    <section className="mt-6 pt-4 border-t border-line text-center" aria-label="Asistente sin conexión">
      <h2 className="text-sm font-semibold text-ink flex items-center justify-center gap-2 mb-1">
        <Sparkles size={14} className="text-accent" /> Asistente sin conexión
      </h2>
      <p className="text-[11px] text-ink-muted mb-2">Chat, resumen y tarjetas de estudio con tus documentos, sin internet.</p>
      {body}
      {error && (
        <p role="alert" className="text-xs text-danger mt-2">
          {error}
        </p>
      )}
    </section>
  );
}
