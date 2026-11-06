// Pixel sparkle trail behind the mouse pointer (Personalize → "Sparkle trail").
import { getPrefs } from './prefs';

const COLORS = ['#ffffff', '#ffe27a', '#ff9ecf', '#bfe3ff', '#b6f0c2', '#c9b8ff'];

export function initTrail() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let on = getPrefs().trail;
  let last = 0;
  document.addEventListener('prefs', (e) => (on = (e as CustomEvent).detail.trail));
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!on || e.pointerType !== 'mouse' || reduced.matches) return;
      const now = performance.now();
      if (now - last < 40) return;
      last = now;
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = `${e.clientX}px`;
      s.style.top = `${e.clientY}px`;
      s.style.setProperty('--c', COLORS[Math.floor(Math.random() * COLORS.length)]);
      s.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}px`);
      document.body.append(s);
      s.addEventListener('animationend', () => s.remove());
    },
    { passive: true },
  );
}
