// Media player gadget + window: polls /api/now-playing and falls back to a playlist.
import { data } from './data';

export interface NowPlaying {
  playing: boolean;
  configured?: boolean;
  title?: string;
  artist?: string;
  album?: string;
  art?: string | null;
  url?: string;
  id?: string;
  progress?: number;
  duration?: number;
}

const POLL_MS = 30_000;
export let nowPlaying: NowPlaying = { playing: false };

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const playlist = data.site.spotify.playlist;
const playlistId = playlist.url.split('/playlist/')[1]?.split('?')[0] ?? '';

/** Draw the cover into a tiny canvas; CSS scales it up with crisp pixels. */
function pixelate(url: string, canvas: HTMLCanvasElement, fallback: HTMLElement) {
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.hidden = false;
    fallback.hidden = true;
  };
  img.src = url;
}

function marquee(el: HTMLElement | null, text: string) {
  if (!el) return;
  const span = el.firstElementChild as HTMLElement;
  if (span.textContent === text) return;
  span.textContent = text;
  el.classList.remove('scroll');
  requestAnimationFrame(() => {
    if (span.scrollWidth > el.clientWidth) {
      el.style.setProperty('--dur', `${Math.max(6, text.length * 0.32)}s`);
      el.classList.add('scroll');
    }
  });
}

let lastArt = '';
let lastEmbed = '';
let tick: number | undefined;

function renderGadget(np: NowPlaying) {
  const g = $('np');
  if (!g) return;
  const canvas = $<HTMLCanvasElement>('np-canvas')!;
  const fallback = $('np-fallback')!;
  g.dataset.state = np.playing ? 'playing' : 'idle';
  if (np.playing) {
    $('np-label')!.textContent = 'now playing ♪';
    marquee(g.querySelector('.np-marquee'), np.title!);
    $('np-artist')!.textContent = np.artist!;
    g.setAttribute('aria-label', `Now playing: ${np.title} by ${np.artist}`);
    if (np.art && np.art !== lastArt) pixelate(np.art, canvas, fallback);
  } else {
    $('np-label')!.textContent = 'nothing playing rn';
    marquee(g.querySelector('.np-marquee'), playlist.name);
    $('np-artist')!.textContent = 'a playlist I love';
    g.setAttribute('aria-label', `Music: ${playlist.name}`);
    canvas.hidden = true;
    fallback.hidden = false;
  }
}

function embedSrc(np: NowPlaying) {
  if (np.playing && np.id) return `https://open.spotify.com/embed/track/${np.id}?utm_source=generator`;
  return playlistId ? `https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator` : '';
}

function renderWindow(np: NowPlaying) {
  const win = $('win-music');
  if (!win) return;
  const art = win.querySelector<HTMLElement>('.player-art')!;
  const canvas = $<HTMLCanvasElement>('mp-canvas')!;
  const fallback = $('mp-fallback')!;
  const real = $<HTMLImageElement>('mp-real')!;
  const bar = $('mp-bar')!;
  const link = $<HTMLAnchorElement>('mp-link')!;

  if (np.playing) {
    $('mp-label')!.textContent = '♪ now playing on spotify';
    $('mp-title')!.textContent = np.title!;
    $('mp-artist')!.textContent = `${np.artist} · ${np.album}`;
    link.href = np.url!;
    if (np.art && np.art !== lastArt) {
      pixelate(np.art, canvas, fallback);
      real.src = np.art;
      art.classList.add('has-art');
    }
    bar.hidden = !np.duration;
  } else {
    $('mp-label')!.textContent = 'not playing right now · on repeat lately';
    $('mp-title')!.textContent = playlist.name;
    $('mp-artist')!.textContent = 'a playlist I love';
    link.href = playlist.url;
    canvas.hidden = true;
    fallback.hidden = false;
    art.classList.remove('has-art');
    bar.hidden = true;
  }

  // Only load the (third-party) embed once the window is actually open.
  const src = embedSrc(np);
  if (!win.hidden && src && src !== lastEmbed) {
    lastEmbed = src;
    const tall = !np.playing;
    $('mp-embed')!.innerHTML = `<iframe src="${src}" title="Spotify player" style="height:${tall ? 352 : 152}px" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
  }
}

function startProgress(np: NowPlaying) {
  clearInterval(tick);
  const fill = $('mp-progress');
  if (!fill || !np.playing || !np.duration) return;
  let p = np.progress ?? 0;
  const draw = () => (fill.style.width = `${Math.min(100, (p / np.duration!) * 100)}%`);
  draw();
  tick = window.setInterval(() => {
    p += 1000;
    draw();
    if (p >= np.duration!) {
      clearInterval(tick);
      poll();
    }
  }, 1000);
}

function render(np: NowPlaying) {
  renderGadget(np);
  renderWindow(np);
  lastArt = np.playing && np.art ? np.art : '';
  startProgress(np);
}

async function poll() {
  if (document.hidden) return;
  try {
    const res = await fetch('/api/now-playing', { headers: { accept: 'application/json' } });
    nowPlaying = res.ok ? ((await res.json()) as NowPlaying) : { playing: false };
  } catch {
    nowPlaying = { playing: false };
  }
  render(nowPlaying);
}

export function initMusic() {
  if (!$('np') && !$('win-music')) return;
  poll();
  setInterval(poll, POLL_MS);
  document.addEventListener('visibilitychange', () => !document.hidden && poll());
  $('win-music')?.addEventListener('win:open', () => renderWindow(nowPlaying));
}
