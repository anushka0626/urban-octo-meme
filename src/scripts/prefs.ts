import { TINTS, DEFAULT_PREFS, type Prefs } from '../data/prefs';
import { store } from './data';

export function getPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(store.get('prefs') ?? '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  const t = TINTS[p.tint] ?? TINTS.sky;
  root.style.setProperty('--glass-tint', t.glass);
  root.style.setProperty('--bar-tint', t.bar);
  root.style.setProperty('--glass-alpha', String(p.alpha));
  root.classList.toggle('no-glass', !p.glass);
  root.classList.toggle('pixel-cursor', p.cursor);
}

export function setPrefs(patch: Partial<Prefs>) {
  const next = { ...getPrefs(), ...patch };
  store.set('prefs', JSON.stringify(next));
  applyPrefs(next);
  document.dispatchEvent(new CustomEvent('prefs', { detail: next }));
  return next;
}
