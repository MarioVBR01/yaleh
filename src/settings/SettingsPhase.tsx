/**
 * @file SettingsPhase.tsx
 * @description Configuración desde la bienvenida del escritorio (ORION #7): fuera de la sesión,
 * se puede cambiar todo.
 */

import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SettingsView from './SettingsView';

export default function SettingsPhase() {
  const { dispatch } = useApp();
  return (
    <div className="h-screen flex flex-col bg-canvas">
      <div className="px-5 pt-4">
        <button
          onClick={() => dispatch({ type: 'SET_PHASE', payload: 'desktop-start' })}
          className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"
        >
          <ArrowLeft size={14} /> Volver al inicio
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <SettingsView inSession={false} />
      </div>
    </div>
  );
}
