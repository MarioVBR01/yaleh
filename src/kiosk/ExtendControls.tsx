/**
 * @file ExtendControls.tsx
 * @description Extender la sesión (ORION #2 y #10): +15, +25, +50 min o minutos propios.
 * Se usa en la pantalla de sesión completada (en la barra inferior, QuickExtend, ORION #32).
 * Quien lo usa llama al proceso principal (que decide y vuelve a bloquear).
 */

import { useState } from 'react';
import { EXTEND_SESSION_MINUTES, LIMITS } from '@shared/config';

export default function ExtendControls({
  onExtend,
}: {
  /** Debe resolver cuando terminó (con éxito o no). */
  onExtend: (minutes: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [invalid, setInvalid] = useState(false);

  const extend = async (minutes: number) => {
    setBusy(minutes);
    try {
      await onExtend(minutes);
    } finally {
      setBusy(null);
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

  const chip = 'py-2 rounded-xl text-sm border border-line text-ink-soft hover:text-ink hover:border-accent disabled:opacity-50';

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {EXTEND_SESSION_MINUTES.map(minutes => (
          <button key={minutes} onClick={() => void extend(minutes)} disabled={busy !== null} className={chip}>
            {busy === minutes ? 'Extendiendo…' : `+${minutes} min`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={LIMITS.minSessionMinutes}
          max={LIMITS.maxSessionMinutes}
          value={custom}
          placeholder="Otros minutos"
          aria-label="Minutos para extender"
          onChange={e => {
            setCustom(e.target.value);
            setInvalid(false);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') extendCustom();
          }}
          className={`flex-1 px-3 py-2 text-sm bg-canvas border rounded-lg text-ink focus:outline-none ${
            invalid ? 'border-danger' : 'border-line focus:border-accent'
          }`}
        />
        <button onClick={extendCustom} disabled={busy !== null || custom.trim() === ''} className={`${chip} px-4`}>
          {busy !== null && !(EXTEND_SESSION_MINUTES as readonly number[]).includes(busy) ? 'Extendiendo…' : 'Extender'}
        </button>
      </div>
      {invalid && (
        <p role="alert" className="text-[11px] text-danger">
          Entre {LIMITS.minSessionMinutes} y {LIMITS.maxSessionMinutes} minutos.
        </p>
      )}
    </div>
  );
}
