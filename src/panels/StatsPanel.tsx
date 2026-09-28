/**
 * @file StatsPanel.tsx
 * @description Dashboard Analítico de Estadísticas de la sesión SRB.
 * Muestra gráficas de uso de tiempo, actividades y herramientas utilizadas.
 * Utiliza Recharts para visualizaciones interactivas.
 */

import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { Clock, Target, FileText, Globe, Brain, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Formatea segundos a formato HH:MM:SS.
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Colores para gráficas */
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

/** Tooltip personalizado para las gráficas */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function StatsPanel() {
  const { state } = useApp();

  const timeElapsed = state.sessionDuration - state.timeRemaining;
  const progressPercent = state.sessionDuration > 0
    ? Math.round((timeElapsed / state.sessionDuration) * 100)
    : 0;

  /**
   * Calcula las estadísticas de actividad por tipo.
   */
  const activityStats = useMemo(() => {
    const counts = { file: 0, tool: 0, site: 0, search: 0 };
    state.activityHistory.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return [
      { name: 'Sitios web', value: counts.site, color: '#3b82f6', icon: '🌐' },
      { name: 'Herramientas', value: counts.tool, color: '#10b981', icon: '🔧' },
      { name: 'Archivos', value: counts.file, color: '#f59e0b', icon: '📄' },
      { name: 'Búsquedas', value: counts.search, color: '#8b5cf6', icon: '🔍' },
    ].filter(s => s.value > 0);
  }, [state.activityHistory]);

  /**
   * Genera datos de timeline de actividad por grupos de 5 minutos.
   */
  const timelineData = useMemo(() => {
    const data: { time: string; actividades: number }[] = [];
    const now = Date.now();
    const sessionStart = now - timeElapsed * 1000;

    // Generar 12 puntos de datos cada 5 minutos
    for (let i = 0; i < 12; i++) {
      const windowStart = sessionStart + i * 5 * 60 * 1000;
      const windowEnd = windowStart + 5 * 60 * 1000;
      const count = state.activityHistory.filter(r => {
        const t = new Date(r.timestamp).getTime();
        return t >= windowStart && t < windowEnd;
      }).length;

      const minuteLabel = `${i * 5}m`;
      data.push({ time: minuteLabel, actividades: count });
    }
    return data;
  }, [state.activityHistory, timeElapsed]);

  /**
   * Identifica las herramientas más utilizadas.
   */
  const topTools = useMemo(() => {
    const toolCounts: Record<string, number> = {};
    state.activityHistory
      .filter(r => r.type === 'tool' || r.type === 'site')
      .forEach(r => {
        const key = r.label.split(':')[0].trim();
        toolCounts[key] = (toolCounts[key] || 0) + 1;
      });
    return Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '...' : name, value }));
  }, [state.activityHistory]);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-5">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white mb-1">📊 Estadísticas de Sesión</h1>
          <p className="text-slate-400 text-sm">
            Análisis detallado del tiempo efectivo de estudio y uso de recursos
          </p>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Tiempo activo',
              value: formatTime(timeElapsed),
              icon: <Clock size={18} />,
              color: 'from-blue-500 to-blue-600',
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
            },
            {
              label: 'Progreso',
              value: `${progressPercent}%`,
              icon: <Target size={18} />,
              color: 'from-emerald-500 to-emerald-600',
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/20',
            },
            {
              label: 'Archivos',
              value: state.uploadedFiles.length,
              icon: <FileText size={18} />,
              color: 'from-amber-500 to-amber-600',
              bg: 'bg-amber-500/10',
              border: 'border-amber-500/20',
            },
            {
              label: 'Actividades',
              value: state.activityHistory.length,
              icon: <Brain size={18} />,
              color: 'from-purple-500 to-purple-600',
              bg: 'bg-purple-500/10',
              border: 'border-purple-500/20',
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-2xl border ${kpi.bg} ${kpi.border}`}
            >
              <div className={`inline-flex p-2 rounded-xl bg-gradient-to-br ${kpi.color} text-white mb-3`}>
                {kpi.icon}
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{kpi.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Barra de progreso de sesión */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800"
        >
          <div className="flex justify-between text-sm mb-3">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <TrendingUp size={14} className="text-blue-400" />
              Progreso de sesión
            </span>
            <span className="text-blue-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Inicio</span>
            <span>{formatTime(state.timeRemaining)} restante</span>
            <span>{formatTime(state.sessionDuration)} total</span>
          </div>
        </motion.div>

        {/* Gráfica de actividad en el tiempo */}
        {timelineData.some(d => d.actividades > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800"
          >
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Globe size={15} className="text-blue-400" />
              Actividad a lo largo de la sesión
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="actividades"
                  name="Actividades"
                  stroke="#3b82f6"
                  fill="url(#actGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Distribución de actividades */}
        {activityStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pie chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-2xl bg-slate-900 border border-slate-800"
            >
              <h3 className="text-white font-semibold text-sm mb-4">Distribución por tipo</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={activityStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {activityStats.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-slate-400 text-xs">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Top herramientas */}
            {topTools.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800"
              >
                <h3 className="text-white font-semibold text-sm mb-4">Recursos más usados</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={topTools} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10 }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Usos" radius={[0, 4, 4, 0]}>
                      {topTools.map((_, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
        )}

        {/* Estado vacío */}
        {activityStats.length === 0 && (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <Brain size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Las estadísticas aparecerán mientras navegas y usas las herramientas del sistema.</p>
          </div>
        )}

      </div>
    </div>
  );
}
