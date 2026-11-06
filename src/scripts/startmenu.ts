// Start menu: toggle, close-on-outside, and "Search programs and files".
import { data, escapeHtml, type WinInfo } from './data';
import { open } from './wm';
import { shutdown } from './boot';

const orb = document.getElementById('orb')!;
const menu = document.getElementById('startmenu')!;
const input = document.getElementById('sm-input') as HTMLInputElement;
const pinned = document.getElementById('sm-pinned')!;
const results = document.getElementById('sm-results')!;

const isOpen = () => !menu.hidden;

function show() {
  menu.hidden = false;
  orb.setAttribute('aria-expanded', 'true');
  input.value = '';
  render('');
  input.focus();
}
function hide(returnFocus = false) {
  if (!isOpen()) return;
  menu.hidden = true;
  orb.setAttribute('aria-expanded', 'false');
  if (returnFocus) orb.focus();
}

export function search(q: string): WinInfo[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return data.windows
    .map((w) => {
      const title = w.title.toLowerCase();
      const hay = `${title} ${w.summary} ${w.kind}`.toLowerCase();
      if (!words.every((x) => hay.includes(x))) return null;
      const score = words.reduce((s, x) => s + (title.startsWith(x) ? 3 : title.includes(x) ? 2 : 1), 0);
      return { w, score };
    })
    .filter((r): r is { w: WinInfo; score: number } => r !== null)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.w);
}

function render(q: string) {
  const hits = search(q);
  const searching = q.trim().length > 0;
  pinned.hidden = searching;
  results.hidden = !searching;
  if (!searching) return;
  if (!hits.length) {
    results.innerHTML = `<p class="sm-empty">No items match your search.<br>Try “linux”, “research” or “resume”.</p>`;
    return;
  }
  const groups = new Map<string, WinInfo[]>();
  hits.forEach((h) => groups.set(h.kind, [...(groups.get(h.kind) ?? []), h]));
  results.innerHTML = [...groups]
    .map(
      ([kind, items]) =>
        `<p class="sm-label">${escapeHtml(kind)} (${items.length})</p>` +
        items
          .map(
            (h) =>
              `<a class="sm-item" href="${h.url}"><img src="/icons/${h.icon}.svg" alt=""><span>${escapeHtml(h.title)}<small>${escapeHtml(h.summary)}</small></span></a>`,
          )
          .join(''),
    )
    .join('');
  results.querySelector('.sm-item')?.classList.add('hl');
}

export function initStartMenu() {
  orb.addEventListener('click', () => (isOpen() ? hide() : show()));
  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = search(input.value)[0];
      if (first) {
        open(first.id);
        hide();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      menu.querySelector<HTMLElement>('.sm-left a:not([hidden] a)')?.focus();
    }
  });
  menu.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) hide();
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...menu.querySelectorAll<HTMLElement>('.sm-left a')].filter((a) => a.offsetParent);
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as HTMLElement;
    if (isOpen() && !menu.contains(t) && !orb.contains(t)) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      e.preventDefault();
      hide(true);
    }
  });
  document.getElementById('shutdown')!.addEventListener('click', () => {
    hide();
    shutdown();
  });
}
