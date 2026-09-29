/**
 * @file ChatColumn.tsx
 * @description Columna "Chat" (brief, sección 5.2). La conversación con Gemini llega en la fase 7.
 */

import { useModeFlags } from '../lib/mode';
import AIUnavailable from './AIUnavailable';

export default function ChatColumn() {
  const { ai } = useModeFlags();
  if (!ai) return <AIUnavailable />;
  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-ink-muted text-sm">El asistente se conecta en la fase 7.</p>
    </div>
  );
}
