// Build-time data handed over from Shell.astro, plus tiny shared helpers.

export interface WinInfo {
  id: string;
  url: string;
  title: string;
  icon: string;
  kind: string;
  summary: string;
}
export interface Entry {
  slug: string;
  title: string;
  summary: string;
  tech: string[];
  id: string;
}
export interface SiteData {
  site: {
    name: string;
    title: string;
    firstName: string;
    handle: string;
    host: string;
    email: string;
    resumePdf: string;
    socials: { label: string; url: string; handle: string }[];
    spotify: { playlist: { name: string; url: string } };
    github: string;
    birthday: string | null;
  };
  windows: WinInfo[];
  terminal: { projects: Entry[]; research: Entry[]; writing: Entry[] };
}

export const data: SiteData = JSON.parse(document.getElementById('site-data')!.textContent!);

export const normPath = (p: string) => p.replace(/\/+$/, '') || '/';

const byUrl = new Map(data.windows.map((w) => [w.url, w]));
export const winForPath = (path: string) => byUrl.get(normPath(path));
export const winInfo = (id: string) => data.windows.find((w) => w.id === id);

export const isMobile = () => matchMedia('(max-width: 768px)').matches;

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* storage blocked: fine, it's only a convenience */
    }
  },
};

let toastTimer: number | undefined;
export function toast(title: string, text = '') {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<b>${escapeHtml(title)}</b>${escapeHtml(text)}`;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.remove(), 3800);
}

const WALLPAPERS = ['day', 'night', 'candy'] as const;
export type Wallpaper = (typeof WALLPAPERS)[number];
export function setWallpaper(wp: Wallpaper) {
  WALLPAPERS.forEach((w) => document.body.classList.remove(`wp-${w}`));
  if (wp !== 'day') document.body.classList.add(`wp-${wp}`);
  store.set('wallpaper', wp === 'day' ? null : wp);
}
export function currentWallpaper(): Wallpaper {
  return WALLPAPERS.find((w) => document.body.classList.contains(`wp-${w}`)) ?? 'day';
}
export const wallpapers = WALLPAPERS;
