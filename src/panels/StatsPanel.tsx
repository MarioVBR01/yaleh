/**
 * @file StatsPanel.tsx
 * @description Estadísticas de concentración (fase 10), calculadas con el historial de SQLite:
 * minutos por día y por semana, completadas frente a interrumpidas y pérdidas de foco promedio.
 * Junto al gráfico redondo, recuadros con las completadas y las interrumpidas (cantidad y % del
 * total), y debajo las 10 últimas sesiones del historial (ORION #6).
 */

import { useMemo } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { computeStats, formatDuration } from '@/lib/stats';
import { useSessionHistory } from '@/lib/useSessionHistory';
import SessionTable from './SessionTable';

/** Sesiones recientes que se muestran debajo de los gráficos. */
const RECENT_SESSIONS = 10;

/** Mismos valores que los tokens de src/index.css (recharts necesita colores literales). */
const COLORS = {
  accent: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  grid: '#1e293b',
  axis: '#64748b',
  muted: '#94a3b8',
  surface: '#0f172a',
  line: '#334155',
};

const tooltipStyle = {
  contentStyle: { background: COLORS.surface, border: `1px solid ${COLORS.line}`, borderRadius: 12, fontSize: 12 },
  labelStyle: { color: COLORS.muted },
};

function MinutesChart({ title, data }: { title: string; data: { label: string; minutes: number }[] }) {
  return (
    <div className="p-4 rounded-2xl bg-surface border border-line">
      <h3 className="text-ink font-semibold text-sm mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
          <XAxis dataKey="label" tick={{ fill: COLORS.axis, fontSize: 11 }} />
          <YAxis tick={{ fill: COLORS.axis, fontSize: 11 }} allowDecimals={false} />
          <Tooltip {...tooltipStyle} cursor={{ fill: COLORS.grid }} />
          <Bar dataKey="minutes" name="Minutos" fill={COLORS.accent} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Recuadro con la cantidad de sesiones de un tipo y su porcentaje del total. */
function OutcomeBox({ label, value, total, tone }: { label: string; value: number; total: number; tone: 'success' | 'danger' }) {
  const percent = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  const styles = tone === 'success' ? 'bg-success/10 border-success text-success' : 'bg-danger/10 border-danger text-danger';
  return (
    <div className={`p-4 rounded-xl border-l-4 ${styles}`} data-testid={`outcome-${tone}`}>
      <p className="text-ink-soft text-sm font-medium flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${tone === 'success' ? 'bg-success' : 'bg-danger'}`} /> {label}
      </p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-ink-subtle text-xs">{String(percent).replace('.', ',')} % del total</p>
    </div>
  );
}

export default function StatsPanel() {
  const { available, entries, loading, error } = useSessionHistory();
  const stats = useMemo(() => computeStats(entries), [entries]);

  const outcome = [
    { name: 'Completadas', value: stats.completed, color: COLORS.success },
    { name: 'Interrumpidas', value: stats.interrupted, color: COLORS.danger },
    { name: 'Liberadas (desarrollo)', value: stats.other, color: COLORS.warning },
  ].filter(d => d.value > 0);

  const kpis = [
    { label: 'Minutos de concentración', value: formatDuration(stats.totalMinutes * 60), icon: <Clock size={18} />, color: 'bg-accent' },
    { label: 'Completadas', value: stats.completed, icon: <CheckCircle2 size={18} />, color: 'bg-success' },
    { label: 'Interrumpidas', value: stats.interrupted, icon: <AlertTriangle size={18} />, color: 'bg-danger' },
    { label: 'Pérdidas de foco por sesión', value: stats.avgFocusLost, icon: <Eye size={18} />, color: 'bg-warning' },
  ];

  const showCharts = available && !error && (loading || stats.sessions > 0);

  return (
    <div className="h-full overflow-y-auto bg-canvas p-5">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-ink mb-1">📊 Estadísticas</h1>
          <p className="text-ink-muted text-sm">
            {available
              ? 'Calculadas con las sesiones guardadas en este equipo. Solo suman minutos las sesiones completadas.'
              : 'Disponible en la aplicación de escritorio.'}
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {available && !error && !loading && stats.sessions === 0 && (
          <p className="text-sm text-ink-subtle">Todavía no hay sesiones terminadas.</p>
        )}

        {showCharts && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-4 rounded-2xl border bg-surface border-line"
                >
                  <div className={`inline-flex p-2 rounded-xl ${kpi.color} text-ink mb-3`}>{kpi.icon}</div>
                  <p className="text-2xl font-bold text-ink">{kpi.value}</p>
                  <p className="text-ink-muted text-xs mt-0.5">{kpi.label}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MinutesChart title="Minutos por día (últimos 7 días)" data={stats.perDay} />
              <MinutesChart title="Minutos por semana (últimas 8 semanas)" data={stats.perWeek} />
            </div>

            {outcome.length > 0 && (
              <div className="p-4 rounded-2xl bg-surface border border-line">
                <h3 className="text-ink font-semibold text-sm mb-4">Sesiones completadas e interrumpidas</h3>
                <div className="grid gap-4 md:grid-cols-[220px_1fr] items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={outcome} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {outcome.map(d => (
                        <Cell key={d.name} fill={d.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} itemStyle={{ color: '#ffffff' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: COLORS.axis }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid gap-3 sm:grid-cols-2">
                  <OutcomeBox label="Completadas" value={stats.completed} total={stats.sessions} tone="success" />
                  <OutcomeBox label="Interrumpidas" value={stats.interrupted} total={stats.sessions} tone="danger" />
                </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-surface border border-line">
              <h3 className="text-ink font-semibold text-sm mb-3">Sesiones recientes</h3>
              <p className="text-ink-subtle text-[11px] mb-2">
                Las {RECENT_SESSIONS} últimas. El historial completo está en "Historial de sesiones".
              </p>
              <div className="overflow-x-auto">
                <SessionTable entries={entries.slice(0, RECENT_SESSIONS)} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
