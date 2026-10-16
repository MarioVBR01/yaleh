/**
 * @file StudyVisuals.tsx
 * @description Cómo se ven los resultados nuevos de Estudio (ORION #18): mapa mental, tabla de datos
 * (se puede copiar), infografía armada por la app con íconos y presentación (se descarga como .pptx).
 */

import { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FlaskConical,
  Globe,
  Lightbulb,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { InfographicContent, InfographicIcon, MindMapContent, PresentationContent, TableContent } from '../ai/study-items';
import { getElectronAPI } from '../lib/electron';

export function MindMap({ data }: { data: MindMapContent }) {
  return (
    <div className="space-y-3" data-testid="mindmap">
      <div className="mx-auto w-fit max-w-full px-4 py-2 rounded-xl bg-accent text-on-accent text-sm font-semibold text-center">
        {data.central}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.branches.map(branch => (
          <div key={branch.label} className="rounded-xl border border-accent/40 bg-canvas p-2">
            <p className="text-ink text-xs font-semibold mb-1">{branch.label}</p>
            <div className="flex flex-wrap gap-1">
              {branch.children.map(child => (
                <span key={child} className="px-2 py-0.5 rounded-full bg-surface-raised text-[11px] text-ink-soft">
                  {child}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Texto separado por tabulaciones: se pega bien en una hoja de cálculo. */
export function tableToTsv(data: TableContent): string {
  return [data.columns, ...data.rows].map(row => row.map(cell => cell.replace(/[\t\n]+/g, ' ')).join('\t')).join('\n');
}

export function DataTable({ data }: { data: TableContent }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tableToTsv(data));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('No se pudo copiar la tabla:', err);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink text-sm font-semibold">{data.title}</p>
        <button onClick={() => void copy()} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-line text-[11px] text-ink-soft hover:text-ink">
          <Copy size={11} /> {copied ? 'Copiada' : 'Copiar'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs select-text">
          <thead>
            <tr className="text-left text-ink-subtle border-b border-line">
              {data.columns.map(c => (
                <th key={c} className="py-1 pr-2 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-line/50 text-ink-soft">
                {row.map((cell, j) => (
                  <td key={j} className="py-1 pr-2 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ICONS: Record<InfographicIcon, LucideIcon> = {
  book: BookOpen,
  clock: Clock,
  chart: BarChart3,
  idea: Lightbulb,
  target: Target,
  people: Users,
  globe: Globe,
  check: CheckCircle2,
  warning: AlertTriangle,
  calendar: Calendar,
  money: Wallet,
  science: FlaskConical,
};

export function Infographic({ data }: { data: InfographicContent }) {
  return (
    <div className="rounded-xl bg-canvas border border-line p-3 space-y-3" data-testid="infographic">
      <div className="text-center">
        <p className="text-ink font-bold">{data.title}</p>
        {data.subtitle && <p className="text-ink-muted text-[11px]">{data.subtitle}</p>}
      </div>
      {data.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {data.stats.map(stat => {
            const Icon = ICONS[stat.icon];
            return (
              <div key={stat.label} className="rounded-lg bg-surface-raised p-2 text-center">
                <Icon size={18} className="mx-auto text-accent mb-1" />
                <p className="text-ink text-lg font-bold leading-tight">{stat.value}</p>
                <p className="text-ink-muted text-[10px]">{stat.label}</p>
              </div>
            );
          })}
        </div>
      )}
      <ul className="space-y-1.5">
        {data.points.map(point => {
          const Icon = ICONS[point.icon];
          return (
            <li key={point.text} className="flex gap-2 text-xs text-ink-soft">
              <Icon size={14} className="text-warning flex-shrink-0 mt-0.5" /> {point.text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Colores de fondo de las diapositivas (los mismos tonos oscuros de la app). */
const SLIDE_BACKGROUNDS = ['#1e293b', '#1e3a8a', '#0f172a'];

export function Presentation({ data }: { data: PresentationContent }) {
  const api = getElectronAPI();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!api) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await api.exportOffice({
        kind: 'pptx',
        title: data.title,
        slides: [
          { title: data.title, content: '', background: SLIDE_BACKGROUNDS[1] },
          ...data.slides.map((s, i) => ({
            title: s.title,
            content: s.bullets.map(b => `• ${b}`).join('\n'),
            background: SLIDE_BACKGROUNDS[i % 2 === 0 ? 0 : 2],
          })),
        ],
      });
      setStatus(result.ok ? { ok: true, text: `Guardado en ${result.path}` } : { ok: false, text: result.message });
    } catch {
      setStatus({ ok: false, text: 'No se pudo guardar la presentación.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="presentation">
      <div className="flex items-center justify-between gap-2">
        <p className="text-ink text-sm font-semibold">{data.title}</p>
        {api && (
          <button
            onClick={() => void download()}
            disabled={busy}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-line text-[11px] text-ink-soft hover:text-ink disabled:opacity-50"
          >
            <Download size={11} /> {busy ? 'Guardando…' : 'Descargar .pptx'}
          </button>
        )}
      </div>
      {status && (
        <p role={status.ok ? 'status' : 'alert'} className={`text-[11px] break-all ${status.ok ? 'text-success' : 'text-danger'}`}>
          {status.text}
        </p>
      )}
      <ol className="space-y-2">
        {data.slides.map((slide, i) => (
          <li key={i} className="rounded-lg border border-line bg-canvas p-2">
            <p className="text-ink text-xs font-semibold">
              {i + 1}. {slide.title}
            </p>
            <ul className="list-disc pl-5 text-[11px] text-ink-soft">
              {slide.bullets.map(b => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}
