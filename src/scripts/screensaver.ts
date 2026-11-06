// Bubbles screensaver: glossy pastel bubbles drifting and bouncing after a few idle minutes.
import { getPrefs } from './prefs';
import { isMobile } from './data';

interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hue: number;
}

let canvas: HTMLCanvasElement | null = null;
let raf = 0;
let lastActivity = Date.now();
let startedAt = 0;

const HUES = [330, 270, 210, 150, 50]; // pink, lavender, sky, mint, sunny

function drawBubble(c: CanvasRenderingContext2D, b: Bubble) {
  const { x, y, r, hue } = b;
  // body: mostly clear, tinted toward the rim
  const body = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  body.addColorStop(0, `hsla(${hue}, 100%, 96%, 0.05)`);
  body.addColorStop(0.75, `hsla(${hue}, 90%, 80%, 0.18)`);
  body.addColorStop(1, `hsla(${hue}, 90%, 70%, 0.55)`);
  c.fillStyle = body;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  // iridescent rim
  const rim = c.createLinearGradient(x - r, y - r, x + r, y + r);
  rim.addColorStop(0, `hsla(${hue + 40}, 100%, 85%, 0.9)`);
  rim.addColorStop(0.5, `hsla(${hue}, 100%, 75%, 0.5)`);
  rim.addColorStop(1, `hsla(${hue - 60}, 100%, 80%, 0.9)`);
  c.strokeStyle = rim;
  c.lineWidth = Math.max(1.5, r * 0.04);
  c.stroke();
  // glossy highlight
  c.fillStyle = 'rgba(255,255,255,0.75)';
  c.beginPath();
  c.ellipse(x - r * 0.38, y - r * 0.45, r * 0.28, r * 0.14, -0.6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath();
  c.arc(x + r * 0.45, y + r * 0.42, r * 0.06, 0, Math.PI * 2);
  c.fill();
}

export function startScreensaver() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'saver';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const c = canvas.getContext('2d')!;
  c.scale(dpr, dpr);

  const count = Math.max(6, Math.min(16, Math.round((W * H) / 110_000)));
  const bubbles: Bubble[] = [];
  for (let i = 0; i < count; i++) {
    const r = 36 + Math.random() * 60;
    bubbles.push({
      x: r + Math.random() * (W - 2 * r),
      y: r + Math.random() * (H - 2 * r),
      vx: (Math.random() - 0.5) * 2.4,
      vy: (Math.random() - 0.5) * 2.4,
      r,
      hue: HUES[i % HUES.length],
    });
  }

  const step = () => {
    c.clearRect(0, 0, W, H);
    for (const b of bubbles) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < b.r || b.x > W - b.r) {
        b.vx *= -1;
        b.x = Math.max(b.r, Math.min(W - b.r, b.x));
      }
      if (b.y < b.r || b.y > H - b.r) {
        b.vy *= -1;
        b.y = Math.max(b.r, Math.min(H - b.r, b.y));
      }
    }
    // elastic collisions (mass ∝ area)
    for (let i = 0; i < bubbles.length; i++)
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i];
        const b = bubbles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const min = a.r + b.r;
        if (dist === 0 || dist >= min) continue;
        const nx = dx / dist;
        const ny = dy / dist;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel <= 0) continue;
        const ma = a.r * a.r;
        const mb = b.r * b.r;
        const imp = (2 * rel) / (ma + mb);
        a.vx -= imp * mb * nx;
        a.vy -= imp * mb * ny;
        b.vx += imp * ma * nx;
        b.vy += imp * ma * ny;
        const push = (min - dist) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    bubbles.forEach((b) => drawBubble(c, b));
    raf = requestAnimationFrame(step);
  };
  startedAt = Date.now();
  step();
}

export function stopScreensaver() {
  if (!canvas) return;
  cancelAnimationFrame(raf);
  const el = canvas;
  canvas = null;
  el.classList.add('out');
  setTimeout(() => el.remove(), 300);
}

export function initScreensaver() {
  const activity = (e: Event) => {
    lastActivity = Date.now();
    // ignore the tiny pointer jitter that can arrive right as it starts
    if (canvas && (e.type !== 'pointermove' || Date.now() - startedAt > 600)) stopScreensaver();
  };
  ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, activity, { passive: true, capture: true }),
  );
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopScreensaver();
    lastActivity = Date.now();
  });
  setInterval(() => {
    const p = getPrefs();
    if (canvas || p.saver !== 'bubbles' || document.hidden || isMobile()) return;
    if (document.documentElement.classList.contains('booting')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (Date.now() - lastActivity > p.wait * 60_000) startScreensaver();
  }, 5000);
}
