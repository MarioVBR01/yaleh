/**
 * @file SettingsView.tsx
 * @description Configuración del escritorio (ORION #7): Sesión, Modo nocturno, IA sin conexión,
 * Datos, Apariencia y accesibilidad, Perfil y Acerca de.
 * Regla: nunca afloja el kiosko. Con `inSession`, lo que afecta a la sesión se muestra
 * deshabilitado (se cambia desde la pantalla de inicio); el proceso principal lo vuelve a comprobar.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Database, Info, Moon, Sparkles, Timer, Type, User } from 'lucide-react';
import { LIMITS, LOCAL_AI } from '@shared/config';
import {
  END_WARNING_OPTIONS,
  PROFILE_NAME_MAX,
  TEXT_SCALES,
  type SettingsPatch,
  type SettingsSnapshot,
  type TextScale,
} from '@shared/settings';
import { useApp } from '../context/AppContext';
import { getElectronAPI } from '../lib/electron';
import LocalAiCard, { ipcErrorMessage } from '../phases/LocalAiCard';
import { usePomodoroOptional } from '../pomodoro/PomodoroContext';

const LOCKED_NOTE = 'Se cambia desde la pantalla de inicio, fuera de la sesión.';

function Section({ icon, title, children, locked }: { icon: ReactNode; title: string; children: ReactNode; locked?: boolean }) {
  return (
    <section className="p-4 rounded-2xl bg-surface border border-line" aria-label={title}>
      <h2 className="text-ink font-semibold text-sm flex items-center gap-2 mb-3">
        <span className="text-accent">{icon}</span> {title}
      </h2>
      {locked && <p className="text-ink-subtle text-[11px] mb-3">{LOCKED_NOTE}</p>}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-ink-soft text-sm">{label}</p>
        {hint && <p className="text-ink-subtle text-[11px]">{hint}</p>}
      </div>
      <div className="flex-shrink-0 flex items-center gap-2">{children}</div>
    </div>
  );
}

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full border transition-colors disabled:opacity-50 ${
        checked ? 'bg-accent-strong border-accent' : 'bg-surface-raised border-line'
      }`}
    >
      <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-ink transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
    </button>
  );
}

const button =
  'px-3 py-1.5 rounded-lg text-xs border border-line text-ink-soft hover:text-ink hover:border-line-strong disabled:opacity-50';

export default function SettingsView({ inSession }: { inSession: boolean }) {
  const { state, dispatch } = useApp();
  const api = getElectronAPI();
  const pomodoro = usePomodoroOptional();
  const snapshot = state.settings;
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [minutesDraft, setMinutesDraft] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!api) return;
    void api.settings.get().then(s => dispatch({ type: 'SET_SETTINGS', payload: s }));
    void api.getAppInfo().then(info => setVersion(info.version));
  }, [api, dispatch]);

  useEffect(() => {
    if (!snapshot) return;
    setNameDraft(snapshot.profileName ?? '');
    setMinutesDraft(snapshot.settings.defaultSessionMinutes?.toString() ?? '');
  }, [snapshot]);

  if (!api || !snapshot) {
    return <p className="p-6 text-sm text-ink-subtle">La configuración está disponible en la aplicación de escritorio.</p>;
  }
  const { settings } = snapshot;

  const run = async (action: () => Promise<SettingsSnapshot | void>, success?: string) => {
    setMessage(null);
    try {
      const next = await action();
      if (next) dispatch({ type: 'SET_SETTINGS', payload: next });
      if (success) setMessage({ ok: true, text: success });
    } catch (error) {
      setMessage({ ok: false, text: ipcErrorMessage(error) });
    }
  };
  const update = (patch: SettingsPatch) => run(() => api.settings.update(patch));

  const saveMinutes = () => {
    const trimmed = minutesDraft.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && (!Number.isInteger(value) || value < LIMITS.minSessionMinutes || value > LIMITS.maxSessionMinutes)) {
      setMessage({ ok: false, text: `La duración predeterminada debe estar entre ${LIMITS.minSessionMinutes} y ${LIMITS.maxSessionMinutes} minutos.` });
      return;
    }
    if (value !== settings.defaultSessionMinutes) void update({ defaultSessionMinutes: value });
  };

  return (
    <div className="h-full overflow-y-auto bg-canvas p-5">
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold text-ink mb-1">⚙️ Configuración</h1>
          <p className="text-ink-muted text-sm">
            {inSession
              ? 'Durante la sesión solo se cambia lo que no afecta al bloqueo: el tamaño del texto, las animaciones y el sonido del Pomodoro.'
              : 'Los cambios se guardan en este equipo.'}
          </p>
        </div>

        {message && (
          <p
            role={message.ok ? 'status' : 'alert'}
            className={`p-3 rounded-xl border text-sm ${message.ok ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'} text-ink-soft`}
          >
            {message.text}
          </p>
        )}

        <Section icon={<Timer size={16} />} title="Sesión" locked={inSession}>
          <Row label="Duración predeterminada" hint={`Se propone al elegir el tiempo (${LIMITS.minSessionMinutes}–${LIMITS.maxSessionMinutes} min). Vacío: sin predeterminada.`}>
            <input
              type="number"
              min={LIMITS.minSessionMinutes}
              max={LIMITS.maxSessionMinutes}
              value={minutesDraft}
              disabled={inSession}
              aria-label="Duración predeterminada en minutos"
              onChange={e => setMinutesDraft(e.target.value)}
              onBlur={saveMinutes}
              onKeyDown={e => {
                if (e.key === 'Enter') saveMinutes();
              }}
              placeholder="—"
              className="w-20 bg-canvas border border-line focus:border-accent rounded-lg px-2 py-1 text-sm text-ink text-center focus:outline-none disabled:opacity-50"
            />
            <span className="text-ink-subtle text-xs">min</span>
          </Row>
          <Row label="Aviso antes de que termine" hint="Un aviso dentro del kiosko cuando queda poco tiempo.">
            <select
              value={settings.endWarningMinutes}
              disabled={inSession}
              aria-label="Aviso antes de que termine"
              onChange={e => void update({ endWarningMinutes: Number(e.target.value) })}
              className="bg-canvas border border-line rounded-lg px-2 py-1 text-sm text-ink disabled:opacity-50"
            >
              {END_WARNING_OPTIONS.map(m => (
                <option key={m} value={m}>
                  {m === 0 ? 'Sin aviso' : `${m} min antes`}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Permitir extender la sesión" hint="Al terminar, ofrecer +15, +25 o +50 minutos.">
            <Switch
              label="Permitir extender la sesión"
              checked={settings.allowExtend}
              disabled={inSession}
              onChange={v => void update({ allowExtend: v })}
            />
          </Row>
        </Section>

        <Section icon={<Moon size={16} />} title="Modo nocturno">
          <Row label="Modo oscuro" hint="Elegir entre el modo claro y el oscuro. Se activa en la fase de diseño.">
            <Switch label="Modo oscuro" checked={settings.darkMode} disabled onChange={() => {}} />
          </Row>
        </Section>

        <Section icon={<Sparkles size={16} />} title="IA sin conexión" locked={inSession}>
          {inSession ? (
            <p className="text-ink-soft text-sm">
              Estado: {state.localAi?.state === 'installed' ? 'instalado' : state.localAi?.state === 'unsupported' ? 'este equipo no cumple los requisitos' : 'no instalado'}
            </p>
          ) : (
            <div className="-mt-6">
              <LocalAiCard />
            </div>
          )}
          <Row label="Procesamiento" hint="La tarjeta gráfica suele empezar a responder antes; el procesador funciona en cualquier equipo.">
            <select
              value={settings.localAiGpu}
              disabled={inSession}
              aria-label="Procesamiento del asistente sin conexión"
              onChange={e => void update({ localAiGpu: e.target.value as 'auto' | 'cpu' })}
              className="bg-canvas border border-line rounded-lg px-2 py-1 text-sm text-ink disabled:opacity-50"
            >
              <option value="auto">Tarjeta gráfica si hay</option>
              <option value="cpu">Solo el procesador</option>
            </select>
          </Row>
        </Section>

        <Section icon={<Database size={16} />} title="Datos">
          <Row label="Carpeta de exportaciones" hint={snapshot.exportDirResolved}>
            <button className={button} disabled={inSession} onClick={() => void run(() => api.settings.chooseExportDir())}>
              Cambiar
            </button>
            {settings.exportDir && (
              <button className={button} disabled={inSession} onClick={() => void run(() => api.settings.resetExportDir(), 'La carpeta volvió a Documentos\\YALEH.')}>
                Restablecer
              </button>
            )}
          </Row>
          <Row label="Exportar historial" hint="PDF con todas las sesiones, en la carpeta de exportaciones.">
            <button
              className={button}
              onClick={() =>
                void (async () => {
                  setMessage(null);
                  const result = await api.exportSessionHistoryPdf();
                  setMessage(result.ok ? { ok: true, text: `Guardado en ${result.path}` } : { ok: false, text: result.message });
                })()
              }
            >
              Exportar PDF
            </button>
          </Row>
          <Row label="Borrar historial y estadísticas" hint="Borra las sesiones guardadas en este equipo. No se puede deshacer.">
            {confirmClear ? (
              <>
                <button
                  className={`${button} border-danger text-danger`}
                  onClick={() => {
                    setConfirmClear(false);
                    void run(async () => {
                      const deleted = await api.clearSessionHistory();
                      setMessage({ ok: true, text: `Se borraron ${deleted} sesiones del historial.` });
                    });
                  }}
                >
                  Sí, borrar
                </button>
                <button className={button} onClick={() => setConfirmClear(false)}>
                  Cancelar
                </button>
              </>
            ) : (
              <button className={button} disabled={inSession} onClick={() => setConfirmClear(true)}>
                Borrar
              </button>
            )}
          </Row>
          {inSession && <p className="text-ink-subtle text-[11px]">La carpeta y el borrado {LOCKED_NOTE.charAt(0).toLowerCase() + LOCKED_NOTE.slice(1)}</p>}
        </Section>

        <Section icon={<Type size={16} />} title="Apariencia y accesibilidad">
          <Row label="Tamaño del texto">
            {(Object.keys(TEXT_SCALES) as TextScale[]).map(scale => (
              <button
                key={scale}
                onClick={() => void update({ textScale: scale })}
                aria-pressed={settings.textScale === scale}
                className={`${button} ${settings.textScale === scale ? 'border-accent text-ink bg-accent/10' : ''}`}
              >
                {TEXT_SCALES[scale].label}
              </button>
            ))}
          </Row>
          <Row label="Reducir animaciones" hint="Menos movimiento en pantalla, para concentrarse mejor.">
            <Switch label="Reducir animaciones" checked={settings.reduceMotion} onChange={v => void update({ reduceMotion: v })} />
          </Row>
          {pomodoro && (
            <Row label="Sonido del Pomodoro" hint="Alerta al terminar cada ciclo.">
              <Switch label="Sonido del Pomodoro" checked={pomodoro.soundEnabled} onChange={pomodoro.setSoundEnabled} />
            </Row>
          )}
        </Section>

        <Section icon={<User size={16} />} title="Perfil" locked={inSession}>
          <Row label="Nombre del estudiante" hint="Para los saludos y el historial exportado.">
            <input
              value={nameDraft}
              maxLength={PROFILE_NAME_MAX}
              disabled={inSession}
              aria-label="Nombre del estudiante"
              onChange={e => setNameDraft(e.target.value)}
              placeholder="Tu nombre"
              className="w-44 bg-canvas border border-line focus:border-accent rounded-lg px-2 py-1 text-sm text-ink focus:outline-none disabled:opacity-50"
            />
            <button
              className={button}
              disabled={inSession || nameDraft.trim() === (snapshot.profileName ?? '')}
              onClick={() => void run(() => api.settings.setProfileName(nameDraft.trim() || null), 'Nombre guardado.')}
            >
              Guardar
            </button>
          </Row>
        </Section>

        <Section icon={<Info size={16} />} title="Acerca de">
          <div className="text-sm text-ink-soft space-y-2">
            <p>
              <strong className="text-ink">YALEH</strong> {version ? `v${version}` : ''} — entorno de estudio para estudiantes del TECBA
              con problemas de concentración.
            </p>
            <p className="text-ink-muted text-xs">
              Proyecto de grado de Mario Víctor Brañez Rodriguez · TECBA, Cochabamba · 2026.
            </p>
            <div className="text-ink-muted text-xs">
              <p className="text-ink-soft font-medium mb-1">Licencias</p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>
                  Asistente sin conexión: {LOCAL_AI.displayName}, del {LOCAL_AI.author}, licencia {LOCAL_AI.license} ({LOCAL_AI.licenseUrl}).
                </li>
                <li>llama.cpp y node-llama-cpp (MIT) · Electron, React y Vite (MIT) · Firebase SDK (Apache 2.0).</li>
                <li>docx, ExcelJS y PptxGenJS (MIT) · pdf.js (Apache 2.0) · mammoth (BSD-2) · TipTap (MIT) · Recharts (MIT).</li>
              </ul>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

