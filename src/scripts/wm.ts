// Window manager: open / close / focus / drag / resize / minimize / maximize,
// taskbar buttons, and keeping the URL in sync with the focused window.
import { data, isMobile, normPath, winForPath } from './data';

const tasks = document.getElementById('tasks')!;
const desktop = document.getElementById('desktop')!;
const baseTitle = data.site.name;
const homeTitle = data.site.title;

let z = 10;
let cascade = 0;
const openers = new WeakMap<HTMLElement, HTMLElement>();

const winEl = (id: string) => document.getElementById(`win-${id}`) as HTMLElement | null;
const openWins = () =>
  [...document.querySelectorAll<HTMLElement>('.win:not([hidden])')].sort(
    (a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0),
  );
const visibleWins = () => openWins().filter((w) => !w.classList.contains('minimized'));
export const topWin = () => visibleWins()[0] ?? null;

function taskFor(w: HTMLElement) {
  return tasks.querySelector<HTMLButtonElement>(`[data-win="${w.dataset.win}"]`);
}

function addTask(w: HTMLElement) {
  if (taskFor(w)) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'task';
  b.dataset.win = w.dataset.win;
  b.title = w.dataset.title ?? '';
  b.innerHTML = `<img src="/icons/${w.dataset.icon}.svg" alt=""><span></span>`;
  b.querySelector('span')!.textContent = w.dataset.title ?? '';
  b.addEventListener('click', () => {
    if (w.classList.contains('minimized')) restore(w);
    else if (topWin() === w) minimize(w);
    else raise(w, true);
  });
  tasks.append(b);
}

function syncChrome() {
  const top = topWin();
  document.querySelectorAll<HTMLElement>('.win').forEach((w) => w.classList.toggle('inactive', w !== top));
  tasks.querySelectorAll<HTMLElement>('.task').forEach((t) => {
    const w = winEl(t.dataset.win!);
    t.classList.toggle('active', w === top);
    t.classList.toggle('minimized', !!w?.classList.contains('minimized'));
  });
  const info = top && data.windows.find((i) => i.id === top.dataset.win);
  document.title = !info || info.id === 'welcome' ? homeTitle : `${info.title} · ${baseTitle}`;
}

function setUrl(url: string | undefined, replace = false) {
  if (!url || normPath(location.pathname) === url) return;
  history[replace ? 'replaceState' : 'pushState']({ win: url }, '', url);
}

function placeNew(w: HTMLElement) {
  if (isMobile() || w.style.getPropertyValue('--x')) return;
  const dw = desktop.clientWidth;
  const dh = desktop.clientHeight;
  const ww = Math.min(w.offsetWidth, dw - 24);
  const wh = Math.min(w.offsetHeight, dh - 24);
  const step = (cascade++ % 6) * 34;
  const x = Math.max(8, Math.min((dw - ww) / 2 - 60 + step, dw - ww - 8));
  const y = Math.max(8, Math.min((dh - wh) / 2 - 40 + step, dh - wh - 8));
  w.style.setProperty('--x', `${Math.round(x)}px`);
  w.style.setProperty('--y', `${Math.round(y)}px`);
}

function replayOpen(w: HTMLElement) {
  w.style.animation = 'none';
  void w.offsetWidth;
  w.style.animation = '';
}

/** Bring to front; optionally move keyboard focus inside. */
export function raise(w: HTMLElement, moveFocus = false) {
  w.style.zIndex = String(++z);
  syncChrome();
  if (moveFocus && !w.contains(document.activeElement)) {
    const target =
      w.querySelector<HTMLElement>('[data-autofocus], .term-input') ?? w.querySelector<HTMLElement>('.win-body');
    target?.focus({ preventScroll: true });
  }
}

export function open(id: string, opts: { push?: boolean; opener?: HTMLElement | null } = {}) {
  const w = winEl(id);
  if (!w) return false;
  if (w.hidden) {
    w.hidden = false;
    w.classList.remove('closing', 'minimizing', 'minimized');
    placeNew(w);
    replayOpen(w);
    addTask(w);
    if (opts.opener) openers.set(w, opts.opener);
    w.dispatchEvent(new CustomEvent('win:open', { bubbles: true }));
  } else if (w.classList.contains('minimized')) {
    restore(w);
  }
  raise(w, true);
  if (opts.push !== false) setUrl(w.dataset.url);
  return true;
}

export function close(w: HTMLElement, { instant = false } = {}) {
  const finish = () => {
    w.hidden = true;
    w.classList.remove('closing', 'max');
    taskFor(w)?.remove();
    const next = topWin();
    syncChrome();
    setUrl(next?.dataset.url ?? '/', true);
    const opener = openers.get(w);
    if (opener?.isConnected && opener.offsetParent) opener.focus({ preventScroll: true });
    else if (next) raise(next, true);
  };
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
  w.classList.add('closing');
  w.addEventListener('animationend', finish, { once: true });
}

export function minimize(w: HTMLElement) {
  w.classList.add('minimizing');
  const done = () => {
    w.classList.remove('minimizing');
    w.classList.add('minimized');
    syncChrome();
    const next = topWin();
    if (next) raise(next, true);
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
  w.addEventListener('animationend', done, { once: true });
}

function restore(w: HTMLElement) {
  w.classList.remove('minimized');
  replayOpen(w);
  raise(w, true);
}

function toggleMax(w: HTMLElement) {
  w.classList.toggle('max');
  w.querySelector('.wc-max')?.setAttribute('aria-label', w.classList.contains('max') ? 'Restore' : 'Maximize');
}

let hiddenByShowDesktop: HTMLElement[] = [];
function showDesktop() {
  const vis = visibleWins();
  if (vis.length) {
    hiddenByShowDesktop = vis;
    vis.forEach((w) => w.classList.add('minimized'));
  } else {
    hiddenByShowDesktop.filter((w) => !w.hidden).forEach((w) => w.classList.remove('minimized'));
    hiddenByShowDesktop = [];
  }
  syncChrome();
}

/* ── drag & resize ── */
function startDrag(w: HTMLElement, e: PointerEvent, mode: 'move' | 'resize') {
  if (isMobile() || w.classList.contains('max') || e.button !== 0) return;
  e.preventDefault();
  const handle = e.currentTarget as HTMLElement;
  handle.setPointerCapture(e.pointerId);
  const sx = e.clientX;
  const sy = e.clientY;
  const ox = w.offsetLeft;
  const oy = w.offsetTop;
  const ow = w.offsetWidth;
  const oh = w.offsetHeight;
  w.classList.add('dragging');
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - sx;
    const dy = ev.clientY - sy;
    if (mode === 'move') {
      const x = Math.max(-ow + 100, Math.min(ox + dx, desktop.clientWidth - 100));
      const y = Math.max(0, Math.min(oy + dy, desktop.clientHeight - 32));
      w.style.setProperty('--x', `${x}px`);
      w.style.setProperty('--y', `${y}px`);
    } else {
      w.style.setProperty('--w', `${Math.max(340, ow + dx)}px`);
      w.style.setProperty('--h', `${Math.max(240, oh + dy)}px`);
    }
  };
  const up = () => {
    w.classList.remove('dragging');
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
}

function wire(w: HTMLElement) {
  const bar = w.querySelector<HTMLElement>('.win-titlebar')!;
  bar.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('.win-controls')) return;
    startDrag(w, e, 'move');
  });
  bar.addEventListener('dblclick', (e) => {
    if (!(e.target as HTMLElement).closest('.win-controls') && !isMobile()) toggleMax(w);
  });
  w.querySelector<HTMLElement>('.win-resize')?.addEventListener('pointerdown', (e) => startDrag(w, e, 'resize'));
  w.addEventListener('pointerdown', () => {
    if (topWin() !== w) raise(w);
  });
  w.addEventListener('focusin', () => {
    if (topWin() !== w) raise(w);
  });
  w.querySelector('.win-controls')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    e.preventDefault();
    const action = btn.dataset.action;
    if (action === 'close') close(w);
    else if (action === 'min') minimize(w);
    else if (action === 'max') toggleMax(w);
  });
}

/** Turn internal links that point at a window into "open that window". */
function interceptLinks(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as HTMLElement).closest('a');
  if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.action) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return;
  const info = winForPath(url.pathname);
  if (!info) return;
  e.preventDefault();
  open(info.id, { opener: a });
}

export function initWM() {
  document.querySelectorAll<HTMLElement>('.win').forEach(wire);
  // windows rendered open by the server
  document.querySelectorAll<HTMLElement>('.win:not([hidden])').forEach((w) => {
    addTask(w);
    raise(w);
  });
  history.replaceState({ win: normPath(location.pathname) }, '', location.href);

  document.addEventListener('click', interceptLinks);
  document.getElementById('show-desktop')?.addEventListener('click', showDesktop);

  window.addEventListener('popstate', () => {
    const info = winForPath(location.pathname);
    if (info) open(info.id, { push: false });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const top = topWin();
    if (top && (top.contains(document.activeElement) || document.activeElement === document.body)) {
      e.preventDefault();
      close(top);
    }
  });

  // Re-clamp windows that ended up off-screen after a resize.
  window.addEventListener('resize', () => {
    document.querySelectorAll<HTMLElement>('.win:not([hidden])').forEach((w) => {
      if (w.offsetLeft > desktop.clientWidth - 100) w.style.setProperty('--x', `${Math.max(8, desktop.clientWidth - w.offsetWidth - 8)}px`);
      if (w.offsetTop > desktop.clientHeight - 32) w.style.setProperty('--y', '8px');
    });
  });
}

export { replayOpen };
