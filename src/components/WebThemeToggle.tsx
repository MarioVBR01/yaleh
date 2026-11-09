/**
 * @file WebThemeToggle.tsx
 * @description Web: botón redondo Sol/Luna para cambiar entre modo claro y oscuro.
 */

import { Moon, Sun } from 'lucide-react';
import { useWebTheme } from '../lib/useWebTheme';

export default function WebThemeToggle() {
  const { theme, toggle } = useWebTheme();
  const label = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className="w-10 h-10 rounded-full border border-line bg-surface text-ink-soft hover:text-ink hover:border-line-strong grid place-items-center flex-shrink-0 transition-colors"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
