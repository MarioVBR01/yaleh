/**
 * @file LoginPhase.tsx
 * @description Inicio de sesión de la web con Google (brief, sección 5.1).
 * Solo existe en la web: el escritorio no tiene login propio (brief, sección 4.2).
 * Al iniciar sesión, App.tsx sincroniza el usuario y pasa a la dropzone.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { isFirebaseConfigured } from '../firebase/app';
import { describeAuthError, signInWithGoogle } from '../firebase/auth';

export default function LoginPhase() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // App.tsx recibe el usuario (onAuthStateChanged) y cambia de pantalla.
    } catch (err) {
      console.error('Error al iniciar sesión con Google:', err);
      setError(describeAuthError(err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-2xl shadow-blue-500/30">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">YALEH</h1>
          <p className="text-blue-300 text-sm font-medium">Entorno de estudio</p>
          <p className="text-slate-400 text-xs mt-1">TECBA 2026</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-white font-semibold text-lg mb-1">Iniciar Sesión</h2>
          <p className="text-slate-400 text-sm mb-6">
            Accede con tu cuenta de Google para cargar tus materiales y trabajar con el asistente.
          </p>

          <motion.button
            onClick={handleGoogleLogin}
            disabled={loading || !isFirebaseConfigured}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <motion.div
                className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continuar con Google
          </motion.button>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-400 text-center">
              {error}
            </p>
          )}
          {!isFirebaseConfigured && (
            <p className="mt-4 text-xs text-amber-400 text-center">Falta la configuración de Firebase (.env).</p>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">YALEH v0.1 · TECBA 2026 · Proyecto de Grado</p>
      </motion.div>
    </div>
  );
}
