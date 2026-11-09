/**
 * @file SessionsHomePhase.tsx
 * @description "Mis sesiones": la pantalla principal de la web después de ingresar.
 */

import { useApp } from '../context/AppContext';
import { createDraftSession } from '../firebase/sessions';

export default function SessionsHomePhase() {
  const { state, dispatch } = useApp();
  const create = async () => {
    dispatch({ type: 'SET_WORKSPACE', payload: await createDraftSession(state.session.uid!) });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };
  return (
    <div className="min-h-full bg-canvas px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold text-ink">Mis sesiones</h1>
      <button onClick={() => void create()} className="mt-4 h-11 px-5 rounded-[14px] bg-accent text-on-accent font-medium">
        + Nueva sesión
      </button>
    </div>
  );
}
