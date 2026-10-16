/**
 * @file battery.tsx
 * @description Batería en portátiles (ORION #40): el kiosko tapa el ícono de Windows, así que
 * YALEH muestra el nivel en la barra inferior y avisa antes de que el equipo se apague.
 * - Datos: `navigator.getBattery()` de Chromium (sin permisos).
 * - Equipos de escritorio: Chromium informa "cargando, 100 %, sin tiempo de descarga"; con esa
 *   firma no se muestra nada hasta ver otro valor (una portátil al 100 % enchufada se ve igual,
 *   y aparece en cuanto se desenchufa o baja del 100 %).
 * - Aviso: una vez al llegar al 20 % sin cargar y otra al 10 %; se cierra solo al conectar el
 *   cargador (y se vuelve a armar). Ocupa su lugar arriba del área de trabajo, como el de tiempo.
 * - Si el equipo se apaga igual, la sesión queda interrumpida y se ofrece retomarla al volver
 *   (`controller.recover()`), como cualquier cierre forzado.
 */

import { useEffect, useRef, useState } from 'react';
import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, BatteryCharging, X } from 'lucide-react';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { useApp } from '../context/AppContext';
import { playAlarm } from '../lib/alarm';

/** Umbrales del aviso (porcentaje). */
export const BATTERY_LOW = 20;
export const BATTERY_CRITICAL = 10;

export interface BatteryInfo {
  /** 0–100. */
  percent: number;
  charging: boolean;
}

/** Lo que expone Chromium (no está en los tipos de TypeScript del DOM). */
interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

export type BatteryLevel = 'normal' | 'low' | 'critical';

export function batteryLevel(info: BatteryInfo): BatteryLevel {
  if (info.charging) return 'normal';
  if (info.percent <= BATTERY_CRITICAL) return 'critical';
  if (info.percent <= BATTERY_LOW) return 'low';
  return 'normal';
}

/** Firma que Chromium da cuando el equipo no tiene batería. */
function looksLikeNoBattery(b: BatteryManagerLike): boolean {
  return b.charging && b.level >= 1 && b.chargingTime === 0 && b.dischargingTime === Infinity;
}

/** Estado de la batería, o null si no hay (equipo de escritorio o navegador sin la API). */
export function useBattery(): BatteryInfo | null {
  const [info, setInfo] = useState<BatteryInfo | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (typeof nav.getBattery !== 'function') return;
    let manager: BatteryManagerLike | null = null;
    let seenBattery = false;
    let cancelled = false;
    const update = () => {
      if (!manager || cancelled) return;
      if (!seenBattery && looksLikeNoBattery(manager)) return;
      seenBattery = true;
      setInfo({ percent: Math.round(manager.level * 100), charging: manager.charging });
    };
    nav
      .getBattery()
      .then(b => {
        manager = b;
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
        b.addEventListener('dischargingtimechange', update);
        update();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      manager?.removeEventListener('levelchange', update);
      manager?.removeEventListener('chargingchange', update);
      manager?.removeEventListener('dischargingtimechange', update);
    };
  }, []);

  return info;
}

/** Ícono y porcentaje en la barra inferior. */
export function BatteryIndicator() {
  const info = useBattery();
  if (!info) return null;
  const level = batteryLevel(info);
  const Icon = info.charging
    ? BatteryCharging
    : level === 'critical'
      ? BatteryWarning
      : level === 'low'
        ? BatteryLow
        : info.percent >= 80
          ? BatteryFull
          : BatteryMedium;
  const color =
    level === 'critical'
      ? 'bg-danger/15 border-danger/40 text-danger'
      : level === 'low'
        ? 'bg-warning/15 border-warning/40 text-warning'
        : 'bg-slate-800/60 border-slate-700 text-slate-300';
  return (
    <div
      data-testid="battery"
      data-level={level}
      title={info.charging ? 'Cargando' : 'Batería'}
      className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium flex-shrink-0 ${color}`}
    >
      <Icon size={13} />
      <span>{info.percent} %</span>
    </div>
  );
}

/** Aviso de batería baja, con el estilo del aviso de tiempo (TimeWarningToast). */
export function BatteryWarningToast() {
  const { state } = useApp();
  const info = useBattery();
  const [visiblePercent, setVisiblePercent] = useState<number | null>(null);
  /** Umbral más bajo ya avisado desde la última vez que se cargó. */
  const warned = useRef<BatteryLevel>('normal');

  const level = info ? batteryLevel(info) : 'normal';
  const charging = info?.charging ?? false;

  useEffect(() => {
    if (!info) return;
    if (charging) {
      warned.current = 'normal';
      setVisiblePercent(null);
      return;
    }
    if (level === 'normal' || level === warned.current || (level === 'low' && warned.current === 'critical')) return;
    warned.current = level;
    setVisiblePercent(info.percent);
    const s = state.settings?.settings;
    playAlarm(s?.alarmSound ?? DEFAULT_SETTINGS.alarmSound, s?.alarmVolume ?? DEFAULT_SETTINGS.alarmVolume, 'end');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, charging]);

  if (visiblePercent === null) return null;
  const critical = level === 'critical';
  return (
    <div className="flex-shrink-0 px-3 pt-3" data-testid="battery-warning">
      <div
        role="alert"
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-surface shadow-lg text-sm text-ink ${critical ? 'border-danger/50' : 'border-warning/40'}`}
      >
        <BatteryWarning size={18} className={`flex-shrink-0 ${critical ? 'text-danger' : 'text-warning'}`} />
        <p className="flex-1">
          <strong>Batería baja ({visiblePercent} %).</strong> Conectá el cargador para no perder la sesión.
        </p>
        <button onClick={() => setVisiblePercent(null)} className="p-1 rounded text-ink-muted hover:text-ink" title="Cerrar aviso">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
