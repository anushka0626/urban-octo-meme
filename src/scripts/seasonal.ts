// Seasonal Start orb, Google-Doodle style. Try /?orb=halloween to preview one.
import { data, toast } from './data';

interface Season {
  id: string;
  badge: string; // /pixels/<badge>.svg
  greeting: string;
}

// Diwali moves every year (Lakshmi Puja dates).
const DIWALI = ['2026-11-08', '2027-10-29', '2028-10-17', '2029-11-05', '2030-10-26'];

const SEASONS: Record<string, Season> = {
  birthday: { id: 'birthday', badge: 'season-cake', greeting: `🎂 It's ${data.site.firstName}'s birthday today!` },
  newyear: { id: 'newyear', badge: 'season-firework', greeting: '🎆 Happy New Year!' },
  valentine: { id: 'valentine', badge: 'heart', greeting: '💗 Happy Valentine’s Day!' },
  win7: { id: 'win7', badge: 'season-cake', greeting: '🎉 Windows 7 was released on this day in 2009.' },
  halloween: { id: 'halloween', badge: 'season-pumpkin', greeting: '🎃 Happy Halloween!' },
  diwali: { id: 'diwali', badge: 'season-diya', greeting: '🪔 Happy Diwali!' },
  christmas: { id: 'christmas', badge: 'season-hat', greeting: '🎄 Merry Christmas!' },
};

function seasonFor(d: Date): Season | null {
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const iso = `${d.getFullYear()}-${md}`;
  const daysFrom = (other: string) => Math.abs((new Date(`${other}T12:00`).getTime() - new Date(`${iso}T12:00`).getTime()) / 864e5);
  const between = (a: string, b: string) => (a <= b ? md >= a && md <= b : md >= a || md <= b);

  if (data.site.birthday && md === data.site.birthday) return SEASONS.birthday;
  if (between('12-31', '01-02')) return SEASONS.newyear;
  if (between('02-13', '02-15')) return SEASONS.valentine;
  if (md === '10-22') return SEASONS.win7;
  if (DIWALI.some((day) => daysFrom(day) <= 2)) return SEASONS.diwali;
  if (between('10-25', '10-31')) return SEASONS.halloween;
  if (between('12-20', '12-26')) return SEASONS.christmas;
  return null;
}

export function initSeasonal() {
  const orb = document.getElementById('orb');
  if (!orb) return;
  const forced = new URLSearchParams(location.search).get('orb');
  const season = forced ? SEASONS[forced] : seasonFor(new Date());
  if (!season) return;
  const img = document.createElement('img');
  img.className = 'orb-badge';
  img.src = `/pixels/${season.badge}.svg`;
  img.alt = '';
  orb.append(img);
  orb.classList.add(`season-${season.id}`);
  orb.title = `Start · ${season.greeting}`;
  orb.setAttribute('aria-label', `Start. ${season.greeting}`);

  // greet once per session, after the boot is over
  let seen = false;
  try {
    seen = sessionStorage.getItem('greeted') === season.id;
    sessionStorage.setItem('greeted', season.id);
  } catch {
    /* ignore */
  }
  if (seen && !forced) return;
  const greet = () => setTimeout(() => toast(season.greeting, 'the orb dressed up for the occasion.'), 900);
  if (document.documentElement.classList.contains('booting')) document.addEventListener('booted', greet, { once: true });
  else greet();
}
