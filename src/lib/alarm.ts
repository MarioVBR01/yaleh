/**
 * @file alarm.ts
 * @description Sonidos de las alarmas (ORION #19): Pomodoro y aviso de fin de sesión, con el sonido
 * y el volumen elegidos en la configuración. Web Audio, sin archivos: funciona sin conexión.
 */

import type { AlarmSound } from '@shared/settings';

/** Qué avisa la alarma: fin de un ciclo de trabajo, fin de un descanso o fin de la sesión cerca. */
export type AlarmEvent = 'work' | 'break' | 'end';

type Note = { frequency: number; duration: number; delay: number };

/** Melodías de cada sonido (frecuencia en Hz, duración y retraso en ms). */
const PATTERNS: Record<AlarmSound, { wave: OscillatorType; notes: Record<AlarmEvent, Note[]> }> = {
  campana: {
    wave: 'sine',
    notes: {
      work: [
        { frequency: 523, duration: 200, delay: 0 },
        { frequency: 659, duration: 200, delay: 250 },
        { frequency: 784, duration: 400, delay: 500 },
      ],
      break: [
        { frequency: 440, duration: 300, delay: 0 },
        { frequency: 550, duration: 400, delay: 350 },
      ],
      end: [
        { frequency: 880, duration: 250, delay: 0 },
        { frequency: 660, duration: 250, delay: 300 },
        { frequency: 880, duration: 400, delay: 600 },
      ],
    },
  },
  suave: {
    wave: 'triangle',
    notes: {
      work: [
        { frequency: 392, duration: 500, delay: 0 },
        { frequency: 523, duration: 700, delay: 550 },
      ],
      break: [{ frequency: 440, duration: 700, delay: 0 }],
      end: [
        { frequency: 349, duration: 500, delay: 0 },
        { frequency: 440, duration: 700, delay: 550 },
      ],
    },
  },
  digital: {
    wave: 'square',
    notes: {
      work: [0, 150, 300].map(delay => ({ frequency: 1000, duration: 100, delay })),
      break: [0, 200].map(delay => ({ frequency: 800, duration: 120, delay })),
      end: [0, 150, 300, 600, 750, 900].map(delay => ({ frequency: 1200, duration: 100, delay })),
    },
  },
};

/** Suena la alarma. `volume` de 0 a 100 (0 = sin sonido). */
export function playAlarm(sound: AlarmSound, volume: number, event: AlarmEvent): void {
  if (volume <= 0) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const pattern = PATTERNS[sound];
    // La onda cuadrada suena más fuerte: se compensa.
    const peak = (Math.min(100, volume) / 100) * (pattern.wave === 'square' ? 0.15 : 0.4);
    for (const note of pattern.notes[event]) {
      const start = ctx.currentTime + note.delay / 1000;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.type = pattern.wave;
      oscillator.frequency.value = note.frequency;
      gain.gain.setValueAtTime(peak, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.duration / 1000);
      oscillator.start(start);
      oscillator.stop(start + note.duration / 1000);
    }
  } catch {
    // Sin Web Audio: sin sonido.
  }
}
