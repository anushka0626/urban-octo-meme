// Personalize settings: shared by the early inline script (no flash) and src/scripts/prefs.ts.
// They live in the visitor's own browser only.

export const TINTS = {
  sky: { label: 'Sky', glass: '120, 160, 230', bar: '28, 52, 98' },
  lavender: { label: 'Lavender', glass: '165, 140, 235', bar: '58, 42, 112' },
  candy: { label: 'Candy', glass: '240, 140, 190', bar: '112, 40, 84' },
  mint: { label: 'Mint', glass: '110, 200, 165', bar: '24, 84, 70' },
  sunny: { label: 'Sunny', glass: '245, 200, 100', bar: '112, 80, 22' },
  graphite: { label: 'Graphite', glass: '115, 125, 150', bar: '30, 34, 46' },
} as const;

export type Tint = keyof typeof TINTS;

export interface Prefs {
  tint: Tint;
  alpha: number; // colour intensity 0.15 – 0.8
  glass: boolean; // transparency on/off
  saver: 'bubbles' | 'none';
  wait: number; // screensaver delay in minutes
  sound: boolean; // startup chime
  cursor: boolean; // pixel cursor
  trail: boolean; // sparkle trail behind the pointer
}

export const DEFAULT_PREFS: Prefs = {
  tint: 'sky',
  alpha: 0.42,
  glass: true,
  saver: 'bubbles',
  wait: 3,
  sound: false,
  cursor: true,
  trail: true,
};
