import { Sparkles } from 'lucide-react';

/** Aviso cuando la IA no está disponible (modo offline o sin conexión; brief, sección 6). */
export default function AIUnavailable({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center text-center ${compact ? 'p-4' : 'h-full p-8'}`}>
      <div className="max-w-sm">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-raised mb-3">
          <Sparkles size={22} className="text-accent" />
        </div>
        <h2 className="text-ink text-base font-semibold mb-1">Disponible próximamente</h2>
        <p className="text-ink-muted text-xs">
          El asistente de IA necesita conexión. En el modo offline puedes seguir con tus fuentes, las notas, los
          editores y el Pomodoro.
        </p>
      </div>
    </div>
  );
}
