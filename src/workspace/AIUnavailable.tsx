import { Sparkles } from 'lucide-react';
import type { NoAssistantReason } from '../ai/provider';

const DETAILS: Record<NoAssistantReason, string> = {
  'needs-download':
    'Sin conexión, solo responde la IA Local, y hay que descargarla primero. Se descarga desde la página de YALEH (por ahora, en Configuración → IA Local, con internet y antes de empezar la sesión). Mientras tanto puedes seguir con tus fuentes, las notas y el Pomodoro.',
  unsupported:
    'Este equipo no cumple los requisitos de la IA Local (al menos 8 GB de RAM y espacio en disco). Con conexión puedes usar el asistente en línea. Mientras tanto puedes seguir con tus fuentes, las notas y el Pomodoro.',
  'quick-needs-download':
    'En el módulo IA Local responde la IA de tu computadora. Descárgala desde Configuración antes de empezar, o prepara tu sesión en la web para usar Gemini. Mientras tanto puedes seguir con tus fuentes, las notas y el Pomodoro.',
  'quick-unsupported':
    'Este equipo no cumple los requisitos de la IA Local (al menos 8 GB de RAM y espacio en disco). Prepara tu sesión en la web para usar Gemini. Mientras tanto puedes seguir con tus fuentes, las notas y el Pomodoro.',
};

/** Aviso cuando no hay asistente de IA (sin conexión y sin el modelo local; revisión 1.8). */
export default function AIUnavailable({ compact = false, reason = 'needs-download' }: { compact?: boolean; reason?: NoAssistantReason }) {
  return (
    <div className={`flex items-center justify-center text-center ${compact ? 'p-4' : 'h-full p-8'}`}>
      <div className="max-w-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-raised mb-3">
          <Sparkles size={22} className="text-accent" />
        </div>
        <h2 className="text-ink text-base font-semibold mb-1">Disponible próximamente</h2>
        <p className="text-ink-muted text-xs">{DETAILS[reason]}</p>
      </div>
    </div>
  );
}

/** Aviso fijo de la IA Local (revisión 1.8). */
export const LOCAL_SLOW_NOTICE = 'La IA Local es más lenta; puede tardar hasta un minuto.';

export function LocalSlowNotice() {
  return (
    <p className="text-[11px] text-warning bg-warning/10 border border-warning/30 rounded-lg px-2 py-1" role="note">
      {LOCAL_SLOW_NOTICE}
    </p>
  );
}

/** Etiqueta con el asistente que responde ("Asistente en línea" / "IA Local"). */
export function AssistantBadge({ label, local }: { label: string; local: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${
        local ? 'border-warning/40 text-warning bg-warning/10' : 'border-accent/40 text-accent-soft bg-accent/10'
      }`}
      data-testid="assistant-badge"
    >
      <Sparkles size={10} /> {label}
    </span>
  );
}
