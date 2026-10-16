/**
 * @file Logo.tsx
 * @description Logo de YALEH (ORION #29): estudiante con birrete, destellos de IA y escudo con candado.
 * Mismo dibujo que src/assets/logo/logo-yaleh.svg (fondo claro) y logo-yaleh-modo-oscuro.svg; el
 * círculo toma los tokens --color-logo-disc y --color-logo-ring, así en modo oscuro lleva el borde
 * fino que lo separa del fondo.
 */

const ORANGE = '#F7941D';
const DISC = 'var(--color-logo-disc)';

export default function Logo({ size = 44, className = '', title = 'YALEH' }: { size?: number; className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={`flex-shrink-0 ${className}`}
      data-testid="yaleh-logo"
    >
      <circle cx="46" cy="48" r="40" fill={DISC} stroke="var(--color-logo-ring)" strokeWidth="1.5" />
      <g fill={ORANGE}>
        <path d="M22 17Q22 26 31 26Q22 26 22 35Q22 26 13 26Q22 26 22 17Z" />
        <path d="M31 12Q31 17 36 17Q31 17 31 22Q31 17 26 17Q31 17 31 12Z" />
        <path d="M31 78Q31 65 42 62L48 68L54 62Q65 65 65 78Q48 82 31 78Z" />
        <ellipse cx="48" cy="50" rx="9.5" ry="10.5" />
      </g>
      <path d="M37 36H59V43L48 47L37 43Z" fill={ORANGE} stroke={DISC} strokeWidth="1.6" />
      <path d="M28 33L48 25.5L68 33L48 40Z" fill={ORANGE} stroke={DISC} strokeWidth="1.2" />
      <path d="M31 33.5V44" stroke={ORANGE} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M31 43.5l2.3 3.2L31 50l-2.3-3.3Z" fill={ORANGE} />
      <path d="M42 62L48 68L54 62" fill="none" stroke={DISC} strokeWidth="1.6" />
      <path d="M38 70V79" stroke={DISC} strokeWidth="1.6" />
      <path d="M67 53L82 47.5L97 53V67C97 79 89 87 82 91C75 87 67 79 67 67Z" fill={ORANGE} stroke={DISC} strokeWidth="2" />
      <path d="M77 66V61.5a5 5 0 0 1 10 0V66" fill="none" stroke="#111010" strokeWidth="2.8" />
      <rect x="74" y="65" width="16" height="13" rx="2.6" fill="#111010" />
    </svg>
  );
}
