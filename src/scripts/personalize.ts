// Personalize window, desktop right-click menu and the tray volume toggle.
import { DEFAULT_PREFS, type Tint } from '../data/prefs';
import { getPrefs, setPrefs } from './prefs';
import { currentWallpaper, setWallpaper, wallpapers, isMobile, toast, type Wallpaper } from './data';
import { open } from './wm';
import { startScreensaver } from './screensaver';
import { playDing, playStartup } from './sound';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function syncWindow() {
  const p = getPrefs();
  document.querySelectorAll<HTMLElement>('[data-wall]').forEach((b) =>
    b.setAttribute('aria-checked', String(b.dataset.wall === currentWallpaper())),
  );
  document.querySelectorAll<HTMLElement>('[data-tint]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tint === p.tint)));
  $<HTMLInputElement>('pz-glass')!.checked = p.glass;
  $<HTMLInputElement>('pz-alpha')!.value = String(p.alpha);
  $<HTMLInputElement>('pz-alpha')!.disabled = !p.glass;
  $<HTMLSelectElement>('pz-saver')!.value = p.saver;
  $<HTMLSelectElement>('pz-wait')!.value = String(p.wait);
  $<HTMLInputElement>('pz-sound')!.checked = p.sound;
  $<HTMLInputElement>('pz-cursor')!.checked = p.cursor;
  $<HTMLInputElement>('pz-trail')!.checked = p.trail;
}

function syncTray() {
  const btn = $('sound-toggle');
  if (!btn) return;
  const on = getPrefs().sound;
  btn.classList.toggle('muted', !on);
  btn.setAttribute('aria-pressed', String(on));
  btn.title = on ? 'Startup sound: on' : 'Startup sound: off';
}

function initWindow() {
  if (!$('win-personalize')) return;
  syncWindow();
  document.addEventListener('prefs', syncWindow);
  document.querySelectorAll<HTMLElement>('[data-wall]').forEach((b) =>
    b.addEventListener('click', () => {
      setWallpaper(b.dataset.wall as Wallpaper);
      syncWindow();
    }),
  );
  document.querySelectorAll<HTMLElement>('[data-tint]').forEach((b) =>
    b.addEventListener('click', () => setPrefs({ tint: b.dataset.tint as Tint })),
  );
  $('pz-glass')!.addEventListener('change', (e) => setPrefs({ glass: (e.target as HTMLInputElement).checked }));
  $('pz-alpha')!.addEventListener('input', (e) => setPrefs({ alpha: Number((e.target as HTMLInputElement).value) }));
  $('pz-saver')!.addEventListener('change', (e) => setPrefs({ saver: (e.target as HTMLSelectElement).value as 'bubbles' | 'none' }));
  $('pz-wait')!.addEventListener('change', (e) => setPrefs({ wait: Number((e.target as HTMLSelectElement).value) }));
  $('pz-preview')!.addEventListener('click', () => startScreensaver());
  $('pz-sound')!.addEventListener('change', (e) => {
    const on = (e.target as HTMLInputElement).checked;
    setPrefs({ sound: on });
    if (on) playDing();
  });
  $('pz-test-sound')!.addEventListener('click', () => playStartup());
  $('pz-cursor')!.addEventListener('change', (e) => setPrefs({ cursor: (e.target as HTMLInputElement).checked }));
  $('pz-trail')!.addEventListener('change', (e) => setPrefs({ trail: (e.target as HTMLInputElement).checked }));
  $('pz-reset')!.addEventListener('click', () => {
    setPrefs({ ...DEFAULT_PREFS });
    setWallpaper('day');
    syncWindow();
  });
}

function initTray() {
  syncTray();
  document.addEventListener('prefs', syncTray);
  $('sound-toggle')?.addEventListener('click', () => {
    const on = !getPrefs().sound;
    setPrefs({ sound: on });
    if (on) playDing();
    toast(on ? '🔔 Startup sound on' : '🔕 Startup sound off', on ? 'you’ll hear it next time you sign in.' : '');
  });
}

/* ── desktop context menu ── */
function initContextMenu() {
  const menu = $('ctx');
  const desktop = $('desktop');
  if (!menu || !desktop) return;
  const items = () => [...menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]')];

  const hide = () => {
    menu.hidden = true;
  };
  const show = (x: number, y: number) => {
    const gadgetsHidden = document.body.classList.contains('no-gadgets');
    menu.querySelector('[data-cmd="gadgets"]')?.setAttribute('aria-checked', String(!gadgetsHidden));
    menu.hidden = false;
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(x, window.innerWidth - r.width - 4)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - r.height - 4)}px`;
    items()[0]?.focus();
  };

  desktop.addEventListener('contextmenu', (e) => {
    if (isMobile() || (e.target as HTMLElement).closest('.win, input, textarea, a[href^="http"]')) return;
    e.preventDefault();
    show(e.clientX, e.clientY);
  });
  // keyboard: context-menu key / Shift+F10 while focus is on the desktop
  document.addEventListener('keydown', (e) => {
    const onDesktop = !document.activeElement || document.activeElement === document.body || (document.activeElement as HTMLElement).closest('.icons');
    if (onDesktop && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
      e.preventDefault();
      show(80, 80);
    }
    if (menu.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length]?.focus();
    }
  });
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node)) hide();
  });
  window.addEventListener('blur', hide);

  menu.addEventListener('click', (e) => {
    const cmd = (e.target as HTMLElement).closest<HTMLElement>('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    hide();
    switch (cmd) {
      case 'refresh': {
        const icons = document.querySelector<HTMLElement>('.icons')!;
        icons.style.visibility = 'hidden';
        setTimeout(() => (icons.style.visibility = ''), 140);
        break;
      }
      case 'wallpaper': {
        const next = wallpapers[(wallpapers.indexOf(currentWallpaper()) + 1) % wallpapers.length];
        setWallpaper(next);
        break;
      }
      case 'gadgets':
        document.body.classList.toggle('no-gadgets');
        break;
      default:
        open(cmd);
    }
  });
}

export function initPersonalize() {
  initWindow();
  initTray();
  initContextMenu();
}
