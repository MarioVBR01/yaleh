/** Formatea bytes a una unidad legible (KB, MB, GB). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Formatea minutos a texto legible ("45 minutos", "1h 30min", "2 horas"). */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h} hora${h > 1 ? 's' : ''}`;
}
