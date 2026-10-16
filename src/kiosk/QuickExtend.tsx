/**
 * @file QuickExtend.tsx
 * @description Grupo naranja "Extender" de la barra inferior (ORION #32): +15, +25 y +50 a la
 * vista (un clic extiende, sin abrir otro menú) y "…" para escribir otros minutos.
 * Quien lo usa llama al proceso principal, que suma el tiempo sin liberar el kiosko.
 */

import { useState } from 'react';
import { EXTEND_SESSION_MINUTES, LIMITS } from '@shared/config';

export default function QuickExtend({ onExtend }: { onExtend: (minutes: number) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [invalid, setInvalid] = useState(false);

  const extend = async (minutes: number) => {
    setBusy(true);
    try {
      await onExtend(minutes);
      setCustomOpen(false);
      setCustom('');
    } finally {
      setBusy(false);
    }
  };

  const extendCustom = () => {
    const minutes = Number(custom.trim());
    if (!Number.isInteger(minutes) || minutes < LIMITS.minSessionMinutes || minutes > LIMITS.maxSessionMinutes) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    void extend(minutes);
  };

  const chip = 'h-8 px-2.5 rounded-lg bg-black/85 text-brand text-xs font-bold hover:bg-black disabled:opacity-60';

  return (
    <div role="group" aria-label="Extender" className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-xl bg-brand text-black flex-shrink-0">
      <span className="text-xs font-bold mr-0.5">Extender</span>
      {EXTEND_SESSION_MINUTES.map(minutes => (
        <button key={minutes} onClick={() => void extend(minutes)} disabled={busy} className={chip}>
          +{minutes}
        </button>
      ))}
      {customOpen ? (
        <>
          <input
            type="number"
            autoFocus
            min={LIMITS.minSessionMinutes}
            max={LIMITS.maxSessionMinutes}
            value={custom}
            placeholder="min"
            aria-label="Minutos para extender"
            onChange={e => {
              setCustom(e.target.value);
              setInvalid(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') extendCustom();
              if (e.key === 'Escape') setCustomOpen(false);
            }}
            className={`w-16 h-8 px-2 rounded-lg bg-white text-black text-xs focus:outline-none border-2 ${invalid ? 'border-danger' : 'border-transparent focus:border-black'}`}
          />
          <button onClick={extendCustom} disabled={busy || custom.trim() === ''} className={chip}>
            OK
          </button>
          {invalid && (
            <span role="alert" className="text-[11px] font-semibold">
              {LIMITS.minSessionMinutes}–{LIMITS.maxSessionMinutes} min
            </span>
          )}
        </>
      ) : (
        <button onClick={() => setCustomOpen(true)} disabled={busy} className={chip} title="Otros minutos" aria-label="Otros minutos">
          …
        </button>
      )}
    </div>
  );
}
