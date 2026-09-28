/**
 * @file LoginPhase.tsx
 * @description Fase 1: Pantalla de Login/Registro del SRB.
 * Soporta autenticación con Google y Facebook (simulada con Firebase Auth).
 * Incluye detección de modo offline con botón para omitir el registro.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Shield, BookOpen, Lock, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Detecta si hay conexión a internet intentando acceder a un recurso externo.
 * En entorno Electron real se usaría navigator.onLine + event listeners.
 */
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default function LoginPhase() {
  const { dispatch, signIn, signInAnonymous } = useApp();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Hook para escuchar el evento de token recibido via IPC
   */
  useEffect(() => {
    if (!window.electronAPI?.onAuthToken) return;

    const unsubscribe = window.electronAPI.onAuthToken((token: string) => {
      console.log('Token recibido del deep link:', token.slice(0, 20) + '...');
      setAuthToken(token);
      setLoading(false);
      setLoadingProvider(null);
      setSuccessMessage('¡Autenticación exitosa! Tu cuenta Google ha sido vinculada.');
    });

    return () => unsubscribe?.();
  }, []);

















  /**
   * Abre el navegador externo para autenticar con Google via Firebase.
   * El flujo: 
   * 1. Usuario presiona botón → abre Firebase Hosting en navegador externo
   * 2. Firebase autentica y redirige a deep link: project-grade-planb://auth?token=IDTOKEN
   * 3. main.js captura el deep link y envía token via IPC
   * 4. useEffect arriba recibe el token y avanza a dropzone
   */
  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    setLoading(true);
    
    const firebaseUrl = 'https://project-grade-planb.firebaseapp.com/index.html';
    
    try {
      // Abrir la URL de Firebase Hosting en el navegador externo
      if (window.electronAPI?.openExternal) {
        await window.electronAPI.openExternal(firebaseUrl);
      } else {
        // Fallback para desarrollo sin Electron (usar shell.open fallback)
        window.open(firebaseUrl, '_blank');
      }
      
      // No cerrar el loading aquí; se cierra cuando se reciba el token via IPC
    } catch (error) {
      console.error('Error al abrir navegador:', error);
      setLoading(false);
      setLoadingProvider(null);
    }
  };














  /**
   * Simula el flujo de autenticación OAuth con Facebook.
   * En producción se integra firebase.auth().signInWithPopup(facebookProvider).
   */
  const handleFacebookLogin = async () => {
    setLoadingProvider('facebook');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    signIn({
      isAuthenticated: true,
      isAnonymous: false,
      displayName: 'Estudiante Demo',
      email: 'estudiante@facebook.com',
      initials: 'ED',
    });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
    setLoading(false);
  };

  /**
   * Maneja el inicio de sesión manual con nombre y correo.
   */
  const handleManualLogin = async () => {
    if (!manualName.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const initials = manualName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    signIn({
      isAuthenticated: true,
      isAnonymous: false,
      displayName: manualName,
      email: manualEmail,
      initials,
    });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
    setLoading(false);
  };

  /**
   * Maneja el click del botón Continuar después de la autenticación exitosa.
   */
  const handleContinueAfterAuth = () => {
    signIn({
      isAuthenticated: true,
      isAnonymous: false,
      displayName: 'Estudiante Autenticado',
      email: 'usuario@gmail.com',
      initials: 'EA',
    });
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };

  /**
   * Ingresa como usuario anónimo en modo offline.
   * Omite la fase de login directamente al Dropzone.
   */
  const handleOfflineEntry = () => {
    signInAnonymous();
    dispatch({ type: 'SET_PHASE', payload: 'dropzone' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Fondo decorativo animado */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-5"
            style={{
              width: Math.random() * 300 + 50,
              height: Math.random() * 300 + 50,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 2 === 0 ? '#3b82f6' : '#06b6d4',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.03, 0.08, 0.03],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Indicador de estado de conexión */}
      <motion.div
        className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border ${
          isOnline
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isOnline ? (
          <><Wifi size={12} /> En línea</>
        ) : (
          <><WifiOff size={12} /> Sin conexión</>
        )}
      </motion.div>

      {/* Tarjeta principal de login */}
      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Header con logo */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-2xl shadow-blue-500/30"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Shield size={40} className="text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1">SRB</h1>
          <p className="text-blue-300 text-sm font-medium">Safe Research Browser</p>
          <p className="text-slate-400 text-xs mt-1">TECBA 2026 — Entorno Académico Blindado</p>
        </div>

        {/* Panel principal */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          
          {/* Pantalla de éxito de autenticación */}
          <AnimatePresence>
            {authToken && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm rounded-2xl z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="text-center px-6"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 mx-auto mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  >
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                  
                  <motion.h3
                    className="text-2xl font-bold text-white mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    ¡Autenticación Exitosa!
                  </motion.h3>
                  
                  <motion.p
                    className="text-slate-300 text-sm mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {successMessage}
                  </motion.p>
                  
                  <motion.button
                    onClick={handleContinueAfterAuth}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 mx-auto"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Continuar →
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Banner offline */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                className="mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <WifiOff size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-300">
                  <p className="font-semibold mb-1">Modo sin conexión detectado</p>
                  <p className="text-amber-400/80">Puedes acceder directamente al material offline sin registrarte.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <h2 className="text-white font-semibold text-lg mb-1">Iniciar Sesión</h2>
          <p className="text-slate-400 text-sm mb-6">
            Accede con tu cuenta para sincronizar tu progreso académico.
          </p>

          {/* Botones OAuth */}
          <div className="space-y-3 mb-4">
            {/* Google */}
            <motion.button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-gray-50 text-gray-800 font-medium text-sm transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loadingProvider === 'google' && loading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continuar con Google
            </motion.button>

            {/* Facebook */}
            <motion.button
              onClick={handleFacebookLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-medium text-sm transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loadingProvider === 'facebook' && loading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-blue-300 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              )}
              Continuar con Facebook
            </motion.button>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-xs">o</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Login manual */}
          <AnimatePresence>
            {showManual ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 mb-4"
              >
                <input
                  type="text"
                  placeholder="Tu nombre completo"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <input
                  type="email"
                  placeholder="Correo institucional (opcional)"
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <motion.button
                  onClick={handleManualLogin}
                  disabled={!manualName.trim() || loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <User size={16} />
                  Acceder
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                onClick={() => setShowManual(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white text-sm transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <BookOpen size={16} />
                Acceso con nombre manual
              </motion.button>
            )}
          </AnimatePresence>

          {/* Botón offline — solo visible si no hay conexión */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4"
              >
                <motion.button
                  onClick={handleOfflineEntry}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 font-medium text-sm transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Lock size={16} />
                  Continuar sin conexión (Modo Offline)
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Siempre visible — modo offline forzado para demo */}
          <motion.button
            onClick={handleOfflineEntry}
            className="w-full mt-3 text-xs text-slate-500 hover:text-slate-400 transition-colors py-2"
            whileHover={{ scale: 1.01 }}
          >
            Omitir registro e ingresar al material offline →
          </motion.button>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-4">
          SRB v1.0 · TECBA 2026 · Proyecto de Grado
        </p>
      </motion.div>
    </div>
  );
}
