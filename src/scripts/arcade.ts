// Visitor counting, game plays, hall-of-fame submissions and the Visitor Dashboard.
import { escapeHtml as esc, store } from './data';

export type Game = 'pairs' | 'sweeper';

interface Stats {
  configured: boolean;
  error?: boolean;
  visits: number;
  today: number;
  week: { d: string; n: number }[];
  countries: [string, number][];
  plays: Record<string, number>;
  leaders: Record<Game, { name: string; score: number }[]>;
  guestbook: number;
}

const post = (body: object) =>
  fetch('/api/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then((r) => r.json() as Promise<{ ok: boolean; visitor?: number; error?: string }>)
    .catch(() => ({ ok: false, error: 'offline' }) as { ok: boolean; visitor?: number; error?: string });

export const countPlay = (game: Game) => void post({ type: 'play', game });

const fmtScore = (game: Game, s: number) => (game === 'sweeper' ? `${s.toFixed(1)}s` : `${s} moves`);

/** Shows "add your name to the hall of fame" under a finished game. */
export function offerScore(el: HTMLElement, game: Game, score: number) {
  const last = store.get('arcade-name') ?? '';
  el.hidden = false;
  el.innerHTML = `<span>🏆 ${esc(fmtScore(game, score))}! add your name:</span>
    <input maxlength="14" placeholder="your name" value="${esc(last)}" aria-label="Name for the hall of fame" />
    <button class="btn primary" type="button">Submit</button>`;
  const input = el.querySelector('input')!;
  const btn = el.querySelector('button')!;
  const send = async () => {
    const name = input.value.trim();
    if (!name) return input.focus();
    btn.disabled = true;
    const res = await post({ type: 'score', game, name, score });
    if (res.ok) {
      store.set('arcade-name', name);
      el.innerHTML = `<span>saved! ✿ <a href="/dashboard">see the hall of fame →</a></span>`;
    } else {
      btn.disabled = false;
      el.querySelector('span')!.textContent = res.error === 'offline' ? 'the hall of fame is offline right now' : (res.error ?? 'could not save');
    }
  };
  btn.addEventListener('click', send);
  input.addEventListener('keydown', (e) => e.key === 'Enter' && send());
}

/* ── dashboard ── */
const $ = (id: string) => document.getElementById(id);
const flag = (cc: string) => String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
let regionNames: Intl.DisplayNames | null = null;
try {
  regionNames = new Intl.DisplayNames(undefined, { type: 'region' });
} catch {
  /* old browser */
}

function renderVisitor(n: number) {
  const el = $('dash-you');
  if (!el) return;
  const digits = String(n).padStart(6, '0');
  el.innerHTML = [...digits].map((d) => `<span>${d}</span>`).join('');
  el.setAttribute('aria-label', `You are visitor number ${n}`);
}

async function loadDashboard() {
  let s: Stats;
  try {
    s = await (await fetch('/api/stats')).json();
  } catch {
    $('dash-status')!.textContent = 'The dashboard is offline right now.';
    return;
  }
  if (!s.configured || s.error) {
    $('dash-status')!.textContent = 'The dashboard is being set up. Check back soon!';
    return;
  }
  const nf = new Intl.NumberFormat();
  $('dash-today')!.textContent = nf.format(s.today);
  $('dash-total')!.textContent = nf.format(s.visits);
  $('dash-plays')!.textContent = nf.format(Object.values(s.plays).reduce((a, b) => a + b, 0));
  $('dash-notes')!.textContent = nf.format(s.guestbook);

  // last 7 days: one series, so one colour, values in ink, a tooltip per bar
  const max = Math.max(1, ...s.week.map((d) => d.n));
  const day = (d: string) => new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'short' });
  $('dash-week')!.innerHTML = s.week
    .map((d) => {
      const label = `${new Date(`${d.d}T12:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}: ${d.n} visitor${d.n === 1 ? '' : 's'}`;
      return `<div class="bar" title="${esc(label)}"><b>${d.n || ''}</b><i style="height:${(d.n / max) * 100}%"></i></div>`;
    })
    .join('');
  $('dash-days')!.innerHTML = s.week.map((d) => `<span>${day(d.d)}</span>`).join('');
  $('dash-week-table')!.querySelector('tbody')!.innerHTML = s.week.map((d) => `<tr><th>${d.d}</th><td>${d.n}</td></tr>`).join('');

  const cmax = Math.max(1, ...s.countries.map((c) => c[1]));
  $('dash-countries')!.innerHTML = s.countries.length
    ? s.countries
        .map(
          ([cc, n]) =>
            `<li><span aria-hidden="true">${flag(cc)}</span><span class="c-main"><span class="nm">${esc(regionNames?.of(cc) ?? cc)}</span><span class="meter"><i style="width:${(n / cmax) * 100}%"></i></span></span><b>${n}</b></li>`,
        )
        .join('')
    : '<li class="muted">countries show up once the site is live</li>';

  const me = store.get('arcade-name');
  (['sweeper', 'pairs'] as Game[]).forEach((g) => {
    const rows = s.leaders[g];
    if (!rows.length) return;
    $(`hof-${g}`)!.innerHTML = rows
      .map((r) => `<li class="${r.name === me ? 'me' : ''}"><span class="who">${esc(r.name)}</span><span class="sc">${esc(fmtScore(g, r.score))}</span></li>`)
      .join('');
  });
  $('dash-status')!.textContent = 'Only counts and countries are stored. No cookies, no tracking.';
}

export function initArcade() {
  // count this visit once per browser session
  let visitor: string | null = null;
  try {
    visitor = sessionStorage.getItem('visitor');
  } catch {
    /* ignore */
  }
  if (visitor) renderVisitor(Number(visitor));
  else
    post({ type: 'visit' }).then((r) => {
      if (!r.visitor) return;
      try {
        sessionStorage.setItem('visitor', String(r.visitor));
      } catch {
        /* ignore */
      }
      renderVisitor(r.visitor);
    });

  const win = $('win-dashboard');
  if (!win) return;
  if (!win.hidden) loadDashboard();
  win.addEventListener('win:open', () => loadDashboard());
}
