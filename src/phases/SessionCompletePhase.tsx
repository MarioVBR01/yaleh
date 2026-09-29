/**
 * @file SessionCompletePhase.tsx
 * @description Fase final: Pantalla de resumen cuando termina la sesión en modo kiosko.
 * Muestra métricas de la sesión (duración, sitios visitados, archivos cargados)
 * y permite cerrar la aplicación.
 */

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { markSessionFinished } from '../firebase/sessions';
import { closeApp, isElectron } from '../lib/electron';

/**
 * Formatea la fecha/hora actual en español.
 */
function formatSessionDateTime(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formatted = formatter.format(now);
  // Capitalizar la primera letra del día de la semana
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Convierte segundos a formato de minutos legible.
 */
function formatMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

export default function SessionCompletePhase() {
  const { state } = useApp();

  // Sesión online en el escritorio: se marca como terminada en Firestore.
  useEffect(() => {
    const uid = state.session.uid;
    if (isElectron() && state.sessionMode === 'online' && uid && state.workspaceId) {
      markSessionFinished(uid, state.workspaceId).catch(err => console.warn('No se pudo cerrar la sesión en Firestore:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extraer métricas del estado global
  const studyMinutes = formatMinutes(state.sessionDuration);
  const sitesVisited = state.tabs.filter(t => t.type === 'workspace-url').length;
  const filesImported = state.uploadedFiles.length;
  const sessionDateTime = formatSessionDateTime();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Blur decorativo de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="w-full max-w-lg relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Ícono de check verde animado */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="relative w-24 h-24"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 20,
              delay: 0.2,
            }}
          >
            {/* Círculo de fondo pulsante */}
            <motion.div
              className="absolute inset-0 rounded-full bg-green-500/20 border-2 border-green-500"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(34, 197, 94, 0.4)',
                  '0 0 0 12px rgba(34, 197, 94, 0)',
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
            {/* Ícono de check */}
            <div className="absolute inset-0 flex items-center justify-center">
              <CheckCircle2 size={96} className="text-green-500 drop-shadow-lg" />
            </div>
          </motion.div>
        </div>

        {/* Contenedor principal */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Título */}
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            ¡Sesión Completada!
          </h1>

          {/* Subtítulo */}
          <p className="text-slate-400 text-center mb-8">
            Has completado tu periodo de estudio blindado con éxito.
          </p>

          {/* Métricas en tarjetas */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Métrica: Minutos de estudio */}
            <motion.div
              className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {studyMinutes}
              </div>
              <div className="text-xs text-slate-400">Minutos</div>
            </motion.div>

            {/* Métrica: Sitios visitados */}
            <motion.div
              className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="text-2xl font-bold text-purple-400 mb-1">
                {sitesVisited}
              </div>
              <div className="text-xs text-slate-400">Sitios</div>
            </motion.div>

            {/* Métrica: Archivos importados */}
            <motion.div
              className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-2xl font-bold text-amber-400 mb-1">
                {filesImported}
              </div>
              <div className="text-xs text-slate-400">Archivos</div>
            </motion.div>
          </div>

          {/* Caja verde con fecha/hora y confirmación */}
          <motion.div
            className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-start gap-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
          >
            <Calendar size={18} className="text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-300 text-sm font-medium">
                Sesión registrada en tu perfil académico · {sessionDateTime}
              </p>
            </div>
          </motion.div>

          {/* Texto informativo */}
          <motion.div
            className="mb-8 p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-slate-400 text-sm leading-relaxed">
              Tu participación en el entorno de estudio YALEH ha sido
              registrada. No es posible abrir nuevas sesiones desde este punto.
            </p>
          </motion.div>

          {/* Botón de cerrar */}
          <motion.button
            onClick={closeApp}
            className="w-full py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/20 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            🔒 Cerrar Aplicación
          </motion.button>
        </div>

        {/* Footer informativo */}
        <motion.div
          className="mt-6 text-center text-slate-500 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p>YALEH v0.1</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
