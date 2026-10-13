/**
 * @file PomodoroPanel.tsx
 * @description Vista del temporizador Pomodoro.
 * Modos: Trabajo, Descanso corto y Descanso largo, con los minutos que elige el estudiante
 * (por defecto 25, 5 y 15). El estado vive en PomodoroContext (ORION #4): sigue corriendo
 * fuera de esta vista y se ve en la barra inferior del kiosko.
 */

import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatPomodoroTime,
  isValidPomodoroMinutes,
  POMODORO_LABELS,
  POMODORO_LIMITS,
  usePomodoro,
  type PomodoroMode,
} from '../pomodoro/PomodoroContext';

type IconProps = {
  size?: number;
  className?: string;
};

const Play = ({ size = 20, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21" />
  </svg>
);

const Pause = ({ size = 20, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const RotateCcw = ({ size = 20, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 0 1 14.7-7.6" />
    <polyline points="3 6 3 12 9 12" />
  </svg>
);

const Volume2 = ({ size = 20, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a9 9 0 0 1 0 14.14" />
  </svg>
);

const VolumeX = ({ size = 20, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="16" y1="8" x2="22" y2="14" />
    <line x1="22" y1="8" x2="16" y2="14" />
  </svg>
);

const Coffee = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3h8a4 4 0 0 1 0 8H8V3z" />
    <path d="M5 11h14" />
    <path d="M18 7h1a3 3 0 0 1 0 6h-1" />
  </svg>
);

const Brain = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V9z" />
    <path d="M6 9a6 6 0 0 1 12 0v6a6 6 0 0 1-12 0V9z" />
  </svg>
);

const Moon = ({ size = 16, className }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/** Aspecto de cada modo (los minutos los elige el estudiante). */
const MODES: Record<PomodoroMode, { color: string; icon: ReactNode; bg: string }> = {
  'work': {
    color: 'text-red-400',
    bg: 'from-red-950 to-orange-950',
    icon: <Brain size={16} />,
  },
  'short-break': {
    color: 'text-emerald-400',
    bg: 'from-emerald-950 to-teal-950',
    icon: <Coffee size={16} />,
  },
  'long-break': {
    color: 'text-blue-400',
    bg: 'from-blue-950 to-indigo-950',
    icon: <Moon size={16} />,
  },
};

const MODE_ORDER: PomodoroMode[] = ['work', 'short-break', 'long-break'];

/** Minutos de un modo, editables (se aplican al salir del campo o con Enter). */
function MinutesInput({ mode }: { mode: PomodoroMode }) {
  const pomodoro = usePomodoro();
  const [value, setValue] = useState(String(pomodoro.minutes[mode]));
  const [invalid, setInvalid] = useState(false);
  const { min, max } = POMODORO_LIMITS[mode];

  const apply = () => {
    const minutes = Number(value);
    if (isValidPomodoroMinutes(mode, minutes)) {
      pomodoro.setMinutes(mode, minutes);
      setInvalid(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <label className="flex flex-col items-center gap-1 text-[11px] text-slate-400">
      {POMODORO_LABELS[mode]}
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        aria-label={`Minutos de ${POMODORO_LABELS[mode]}`}
        onChange={e => setValue(e.target.value)}
        onBlur={apply}
        onKeyDown={e => {
          if (e.key === 'Enter') apply();
        }}
        className={`w-16 bg-white/5 border rounded-lg px-2 py-1 text-center text-sm text-white focus:outline-none ${
          invalid ? 'border-red-400' : 'border-white/10 focus:border-white/30'
        }`}
      />
      {invalid && <span className="text-red-400">{min}–{max} min</span>}
    </label>
  );
}

export default function PomodoroPanel() {
  const pomodoro = usePomodoro();
  const { mode, secondsLeft, cycles, soundEnabled } = pomodoro;
  const isRunning = pomodoro.running;
  const totalWorkTime = pomodoro.workSeconds;
  const modeData = MODES[mode];
  const progress = (secondsLeft / pomodoro.totalSeconds) * 100;
  const formatTime = formatPomodoroTime;

  // Calcular el ángulo del arco SVG para el progreso circular
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <div className={`h-full flex flex-col items-center justify-center bg-gradient-to-br ${modeData.bg} transition-all duration-1000 p-6`}>

      {/* Selector de modo */}
      <div className="flex gap-2 mb-8">
        {MODE_ORDER.map(m => (
          <motion.button
            key={m}
            onClick={() => pomodoro.setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
              mode === m
                ? 'bg-white/15 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {MODES[m].icon}
            {POMODORO_LABELS[m]}
          </motion.button>
        ))}
      </div>

      {/* Temporizador circular */}
      <div className="relative mb-8">
        <svg width="240" height="240" className="transform -rotate-90">
          {/* Círculo de fondo */}
          <circle
            cx="120" cy="120" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Arco de progreso */}
          <motion.circle
            cx="120" cy="120" r={radius}
            fill="none"
            stroke={
              mode === 'work' ? '#ef4444' :
              mode === 'short-break' ? '#10b981' : '#3b82f6'
            }
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>

        {/* Contenido central */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={formatTime(secondsLeft)}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-6xl font-bold font-mono ${modeData.color} tabular-nums`}
            >
              {formatTime(secondsLeft)}
            </motion.div>
          </AnimatePresence>
          <p className="text-slate-400 text-sm mt-2 flex items-center gap-1.5">
            {modeData.icon}
            {POMODORO_LABELS[mode]}
          </p>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-4 mb-8">
        {/* Reset */}
        <motion.button
          onClick={pomodoro.reset}
          title="Reiniciar"
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <RotateCcw size={20} />
        </motion.button>

        {/* Play/Pause */}
        <motion.button
          onClick={pomodoro.toggle}
          title={isRunning ? 'Pausar' : 'Iniciar'}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all border-2 ${
            isRunning
              ? 'bg-white/20 border-white/40 hover:bg-white/30'
              : `bg-gradient-to-br ${
                mode === 'work' ? 'from-red-500 to-orange-500 border-red-400/50' :
                mode === 'short-break' ? 'from-emerald-500 to-teal-500 border-emerald-400/50' :
                'from-blue-500 to-indigo-500 border-blue-400/50'
              }`
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </motion.button>

        {/* Sonido */}
        <motion.button
          onClick={() => pomodoro.setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
          className={`p-3 rounded-full border transition-colors ${
            soundEnabled
              ? 'bg-white/10 border-white/10 text-white hover:bg-white/20'
              : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </motion.button>
      </div>

      {/* Estadísticas de la sesión Pomodoro */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
        <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold text-white">{cycles}</p>
          <p className="text-slate-400 text-xs mt-1">Ciclos</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold text-white">{Math.floor(totalWorkTime / 60)}</p>
          <p className="text-slate-400 text-xs mt-1">Min trabajo</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="text-2xl font-bold text-white">{cycles >= 4 ? Math.floor(cycles / 4) : 0}</p>
          <p className="text-slate-400 text-xs mt-1">Rondas</p>
        </div>
      </div>

      {/* Siguiente evento */}
      {isRunning && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-slate-500 text-xs text-center"
        >
          Próximo: {POMODORO_LABELS[pomodoro.nextMode]} ({pomodoro.minutes[pomodoro.nextMode]} min)
        </motion.p>
      )}

      {/* Minutos de cada modo, elegidos por el estudiante (ORION #4) */}
      <div className="mt-6 w-full max-w-xs">
        <p className="text-slate-400 text-xs text-center mb-2">Personalizar minutos</p>
        <div className="flex justify-center gap-3">
          {MODE_ORDER.map(m => (
            <MinutesInput key={m} mode={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
