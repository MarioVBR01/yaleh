/**
 * @file SettingsPanel.tsx
 * @description Panel de Configuración visual de la interfaz SRB.
 * Permite modificar: color de acento, tamaño de fuente, modo oscuro/claro.
 */

import { motion } from 'framer-motion';
import { Palette, Type, Moon, Sun, Shield, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ACCENT_COLORS = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Cian', value: '#06b6d4' },
  { name: 'Violeta', value: '#8b5cf6' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Ámbar', value: '#f59e0b' },
  { name: 'Rosa', value: '#ec4899' },
];

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { state, updateTheme } = useApp();
  const { theme } = state;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-white font-bold">Configuración SRB</h2>
            <p className="text-slate-500 text-xs">Personaliza la interfaz del entorno</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <div className="space-y-6">
          {/* Color de acento */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette size={15} className="text-slate-400" />
              <span className="text-white text-sm font-medium">Color de Acento</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(color => (
                <motion.button
                  key={color.value}
                  onClick={() => updateTheme({ accentColor: color.value })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    theme.accentColor === color.value ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>
          </div>

          {/* Tamaño de fuente */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Type size={15} className="text-slate-400" />
              <span className="text-white text-sm font-medium">Tamaño de Fuente</span>
            </div>
            <div className="flex gap-2">
              {(['sm', 'md', 'lg'] as const).map(size => (
                <motion.button
                  key={size}
                  onClick={() => updateTheme({ fontSize: size })}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                    theme.fontSize === size
                      ? 'border-blue-500 bg-blue-500/15 text-blue-300'
                      : 'border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {size === 'sm' ? 'Pequeño' : size === 'md' ? 'Normal' : 'Grande'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Modo oscuro */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {theme.darkMode ? <Moon size={15} className="text-slate-400" /> : <Sun size={15} className="text-yellow-400" />}
              <span className="text-white text-sm font-medium">Modo de Interfaz</span>
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={() => updateTheme({ darkMode: true })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all ${
                  theme.darkMode ? 'border-blue-500 bg-blue-500/15 text-blue-300' : 'border-slate-700 text-slate-400'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <Moon size={14} /> Oscuro
              </motion.button>
              <motion.button
                onClick={() => updateTheme({ darkMode: false })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all ${
                  !theme.darkMode ? 'border-amber-500 bg-amber-500/15 text-amber-300' : 'border-slate-700 text-slate-400'
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <Sun size={14} /> Claro
              </motion.button>
            </div>
          </div>

          {/* Información del sistema */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-start gap-2 text-xs text-slate-500">
              <Info size={13} className="mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-slate-400">SRB v1.0</strong> — Safe Research Browser.
                Proyecto de Grado TECBA 2026. Entorno de estudio blindado con control de red.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
