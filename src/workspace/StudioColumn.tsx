/**
 * @file StudioColumn.tsx
 * @description Columna "Estudio" (brief, sección 5.2): resultados de la IA y notas.
 * Los resultados de la IA llegan en la fase 7.
 */

import { useModeFlags } from '../lib/mode';
import AIUnavailable from './AIUnavailable';
import NotesBox from './NotesBox';

export default function StudioColumn() {
  const { ai } = useModeFlags();
  return (
    <div className="h-full flex flex-col gap-3 min-h-0 overflow-y-auto">
      <h2 className="text-ink font-semibold text-sm">Estudio</h2>
      {ai ? (
        <p className="text-ink-muted text-xs">Resumen, cuestionario, tarjetas e informe: fase 7.</p>
      ) : (
        <AIUnavailable compact />
      )}
      <NotesBox />
    </div>
  );
}
