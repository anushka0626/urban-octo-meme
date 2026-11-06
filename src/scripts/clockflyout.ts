// Taskbar clock flyout: visitor's time vs IST, weather where they are, and a little calendar.
import { data } from './data';

const IST = 'Asia/Kolkata';
const IST_OFFSET = 330; // minutes

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

interface Weather {
  located: boolean;
  error?: boolean;
  city?: string | null;
  country?: string | null;
  temp?: number;
  feels?: number;
  code?: number;
  isDay?: boolean;
  wind?: number;
}

// WMO weather codes → pixel sprite + words
function describe(code: number, isDay: boolean): [string, string] {
  if (code === 0) return isDay ? ['w-sun', 'clear & sunny'] : ['w-moon', 'clear night'];
  if (code <= 2) return isDay ? ['w-partly', 'partly cloudy'] : ['w-moon', 'a few clouds'];
  if (code === 3) return ['w-cloud', 'cloudy'];
  if (code === 45 || code === 48) return ['w-fog', 'foggy'];
  if (code >= 51 && code <= 57) return ['w-rain', 'drizzle'];
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ['w-rain', 'rainy'];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ['w-snow', 'snowy'];
  if (code >= 95) return ['w-storm', 'thunderstorms'];
  return ['w-cloud', 'cloudy'];
}

function diffText() {
  const local = -new Date().getTimezoneOffset();
  const d = IST_OFFSET - local;
  const istHour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: IST }).format(new Date()));
  const mood =
    istHour < 7 ? 'probably asleep 😴' : istHour < 10 ? 'probably having chai ☕' : istHour < 18 ? 'probably in class or coding 💻' : istHour < 23 ? 'probably winding down 🌙' : 'probably still coding 🌙';
  if (d === 0) return `same time zone as ${data.site.firstName}! 🤝 (${mood})`;
  const h = Math.floor(Math.abs(d) / 60);
  const m = Math.abs(d) % 60;
  const amount = `${h ? `${h}h` : ''}${h && m ? ' ' : ''}${m ? `${m}m` : ''}`;
  return `${data.site.firstName} is ${amount} ${d > 0 ? 'ahead of' : 'behind'} you · ${mood}`;
}

function renderClocks() {
  const now = new Date();
  const t = (tz?: string) => now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz });
  $('fo-you')!.textContent = t();
  $('fo-ist')!.textContent = t(IST);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  $('fo-you-zone')!.textContent = `${now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })} · ${zone.replace(/_/g, ' ')}`;
  $('fo-ist-date')!.textContent = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', timeZone: IST });
  $('fo-diff')!.textContent = diffText();
}

function renderCalendar() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const bday = data.site.birthday;
  const names = [...Array(7)].map((_, i) => new Date(2023, 0, 1 + i).toLocaleDateString([], { weekday: 'narrow' }));
  let cells = names.map((n) => `<span class="dow">${n}</span>`).join('');
  cells += '<span></span>'.repeat(first);
  for (let d = 1; d <= days; d++) {
    const md = `${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cls = [d === now.getDate() ? 'today' : '', md === bday ? 'bday' : ''].filter(Boolean).join(' ');
    cells += `<span class="${cls}"${md === bday ? ` title="${data.site.firstName}'s birthday 🎂"` : ''}>${d}</span>`;
  }
  $('fo-cal')!.innerHTML = `<p class="fo-month pixel">${now.toLocaleDateString([], { month: 'long', year: 'numeric' })}</p><div class="fo-grid">${cells}</div>`;
}

let weatherLoaded = false;
async function loadWeather(coords?: GeolocationCoordinates) {
  weatherLoaded = true;
  const desc = $('fo-desc')!;
  const locate = $('fo-locate')!;
  try {
    const q = coords ? `?lat=${coords.latitude.toFixed(2)}&lon=${coords.longitude.toFixed(2)}` : '';
    const w = (await (await fetch(`/api/weather${q}`)).json()) as Weather;
    if (!w.located) {
      desc.textContent = "I can't tell where you are";
      $('fo-temp')!.textContent = '?°';
      locate.hidden = false;
      return;
    }
    if (w.error || w.temp === undefined) throw new Error();
    const [sprite, words] = describe(w.code!, w.isDay!);
    $<HTMLImageElement>('fo-wicon')!.src = `/pixels/${sprite}.svg`;
    $('fo-temp')!.textContent = `${Math.round(w.temp)}°C`;
    desc.textContent = `${words} · feels like ${Math.round(w.feels!)}°`;
    $('fo-place')!.textContent = w.city ? `in ${w.city}${w.country ? `, ${w.country}` : ''}` : 'where you are';
    locate.hidden = true;
  } catch {
    desc.textContent = 'the weather is hiding right now';
  }
}

export function initClockFlyout() {
  const btn = $('tray-clock');
  const fly = $('clock-flyout');
  if (!btn || !fly) return;
  let tick: number | undefined;

  const show = () => {
    fly.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    renderClocks();
    renderCalendar();
    tick = window.setInterval(renderClocks, 10_000);
    if (!weatherLoaded) loadWeather();
  };
  const hide = () => {
    if (fly.hidden) return;
    fly.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    clearInterval(tick);
  };

  btn.addEventListener('click', () => (fly.hidden ? show() : hide()));
  document.addEventListener('pointerdown', (e) => {
    const t = e.target as Node;
    if (!fly.hidden && !fly.contains(t) && !btn.contains(t)) hide();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !fly.hidden) {
      e.preventDefault();
      hide();
      btn.focus();
    }
  });
  $('fo-locate')!.addEventListener('click', () => {
    $('fo-desc')!.textContent = 'asking your browser…';
    navigator.geolocation?.getCurrentPosition(
      (pos) => loadWeather(pos.coords),
      () => ($('fo-desc')!.textContent = 'no location, no weather. that’s okay!'),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  });
}
