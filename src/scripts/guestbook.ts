// Guestbook: pixel painting, posting notes and rendering the board.
import { GRID, PALETTE, type GuestEntry } from '../data/guestbook';
import { escapeHtml as esc, store } from './data';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const MINE = 'gb-mine';

function drawPixels(canvas: HTMLCanvasElement, pixels: string) {
  const c = canvas.getContext('2d')!;
  c.clearRect(0, 0, GRID, GRID);
  for (let i = 0; i < pixels.length; i++) {
    const v = Number(pixels[i]);
    if (!v) continue;
    c.fillStyle = PALETTE[v];
    c.fillRect(i % GRID, Math.floor(i / GRID), 1, 1);
  }
}

function noteHtml(e: GuestEntry, pending = false) {
  const rot = ((parseInt(e.id, 16) || 0) % 7) - 3; // stable little tilt per note
  const date = new Date(e.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `<article class="note note-${esc(e.color)}" style="--rot:${rot}deg" data-id="${esc(e.id)}">
    ${e.pixels ? `<canvas width="${GRID}" height="${GRID}" data-pixels="${esc(e.pixels)}" aria-label="Drawing by ${esc(e.name)}"></canvas>` : ''}
    ${e.message ? `<p>${esc(e.message)}</p>` : ''}
    <footer><span>— ${esc(e.name)}</span><time>${date}</time></footer>
    ${pending ? '<span class="pending">✿ waiting for Anushka to pin it up</span>' : ''}
  </article>`;
}

function mine(): GuestEntry[] {
  try {
    return JSON.parse(store.get(MINE) ?? '[]');
  } catch {
    return [];
  }
}

export function initGuestbook() {
  const board = $('gb-board');
  const form = $<HTMLFormElement>('gb-compose');
  const canvas = $<HTMLCanvasElement>('gb-canvas');
  if (!board || !form || !canvas) return;
  const pinned = board.innerHTML;
  const status = $('gb-status')!;
  const signBtn = $('gb-sign')!;
  let loaded = false;

  /* ── board ── */
  const load = async () => {
    loaded = true;
    try {
      const res = await fetch('/api/guestbook');
      const data = (await res.json()) as { configured: boolean; entries: GuestEntry[] };
      if (!data.configured) {
        $('gb-offline')!.hidden = false;
        signBtn.setAttribute('disabled', '');
      }
      const approved = new Set(data.entries.map((e) => e.id));
      const waiting = mine().filter((e) => !approved.has(e.id));
      store.set(MINE, JSON.stringify(waiting));
      board.innerHTML = pinned + waiting.map((e) => noteHtml(e, true)).join('') + data.entries.map((e) => noteHtml(e)).join('');
      board.querySelectorAll<HTMLCanvasElement>('canvas[data-pixels]').forEach((c) => drawPixels(c, c.dataset.pixels!));
      $('gb-count')!.textContent = data.entries.length ? `${data.entries.length} note${data.entries.length === 1 ? '' : 's'} pinned` : '';
    } catch {
      $('gb-offline')!.hidden = false;
    }
  };
  const win = $('win-guestbook')!;
  if (!win.hidden) load();
  win.addEventListener('win:open', () => !loaded && load());

  signBtn.addEventListener('click', () => {
    form.hidden = !form.hidden;
    signBtn.setAttribute('aria-expanded', String(!form.hidden));
    if (!form.hidden) form.querySelector<HTMLInputElement>('[name="name"]')!.focus();
  });

  /* ── painting ── */
  const pixels = new Array(GRID * GRID).fill(0);
  let ink = 1;
  const ctx = canvas.getContext('2d')!;
  const paintAt = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * GRID);
    const y = Math.floor(((e.clientY - r.top) / r.height) * GRID);
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    pixels[y * GRID + x] = ink;
    if (ink) {
      ctx.fillStyle = PALETTE[ink];
      ctx.fillRect(x, y, 1, 1);
    } else ctx.clearRect(x, y, 1, 1);
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    paintAt(e);
    const move = (ev: PointerEvent) => paintAt(ev);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', () => canvas.removeEventListener('pointermove', move), { once: true });
  });
  form.querySelectorAll<HTMLElement>('[data-ink]').forEach((b) =>
    b.addEventListener('click', () => {
      ink = Number(b.dataset.ink);
      form.querySelectorAll('[data-ink]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    }),
  );
  $('gb-clear')!.addEventListener('click', () => {
    pixels.fill(0);
    ctx.clearRect(0, 0, GRID, GRID);
  });

  /* ── submit ── */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      name: fd.get('name'),
      message: fd.get('message'),
      color: fd.get('color'),
      website: fd.get('website'),
      pixels: pixels.some(Boolean) ? pixels.join('') : '',
    };
    const btn = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
    btn.disabled = true;
    status.textContent = 'pinning…';
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; pending?: boolean; entry?: GuestEntry; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Something went wrong.');
      if (data.entry) {
        if (data.pending) store.set(MINE, JSON.stringify([data.entry, ...mine()]));
        board.insertAdjacentHTML('afterbegin', noteHtml(data.entry, data.pending));
        // keep Anushka's pinned note first
        const first = board.querySelector('.pinned');
        if (first) board.prepend(first);
        const c = board.querySelector<HTMLCanvasElement>(`[data-id="${data.entry.id}"] canvas`);
        if (c) drawPixels(c, c.dataset.pixels!);
      }
      status.textContent = data.pending ? 'thank you! ✿ your note will appear once Anushka pins it.' : 'pinned! ✿';
      form.reset();
      pixels.fill(0);
      ctx.clearRect(0, 0, GRID, GRID);
    } catch (err) {
      status.textContent = (err as Error).message;
    } finally {
      btn.disabled = false;
    }
  });
}
