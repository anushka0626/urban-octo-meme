// Boot sequence: Linux-ish log (now) → glitch → glowing orb (then) → login → desktop.
import { data } from './data';
import { replayOpen, topWin, raise } from './wm';
import { getPrefs } from './prefs';
import { playStartup, playShutdown } from './sound';

const LOG: [number, string][] = [
  [0, `<span class="dim">${data.site.handle}-pc firmware v2009.10 · memory check</span> <span class="ok">OK</span>`],
  [1, ''],
  [1, `<span class="ok">[  OK  ]</span> Mounted <span class="hl">/home/${data.site.handle}/childhood</span>.`],
  [1, `<span class="ok">[  OK  ]</span> Started purble-place.service.`],
  [1, `<span class="ok">[  OK  ]</span> Started google-doodles.service (interactive).`],
  [1, `<span class="ok">[  OK  ]</span> Reached target <span class="hl">Curiosity</span>.`],
  [1, `<span class="ok">[  OK  ]</span> Started linux.service, terminals.socket, research.timer.`],
  [1, `<span class="ok">[  OK  ]</span> Reached target <span class="hl">Engineering</span>.`],
  [2, ''],
  [1, `<span class="dim">loading desktop from 2009…</span>`],
];

export function initBoot() {
  const root = document.documentElement;
  const boot = document.getElementById('boot');
  if (!boot) return;
  if (!root.classList.contains('booting')) {
    boot.remove();
    return;
  }

  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const stage = (name: string) => {
    boot.dataset.at = name;
    boot.querySelectorAll<HTMLElement>('.boot-stage').forEach((s) => (s.hidden = s.dataset.stage !== name));
  };
  const log = boot.querySelector<HTMLElement>('#boot-log')!;
  const go = boot.querySelector<HTMLButtonElement>('#login-go')!;
  let signingIn = false;

  const toLogin = () => {
    timers.forEach(clearTimeout);
    boot.classList.remove('glitch');
    stage('login');
    go.focus();
  };

  const signIn = () => {
    if (signingIn) return;
    signingIn = true;
    go.hidden = true;
    boot.querySelector<HTMLElement>('.login-welcome')!.hidden = false;
    if (getPrefs().sound) playStartup();
    window.setTimeout(() => {
      try {
        sessionStorage.setItem('booted', '1');
      } catch {
        /* ignore */
      }
      boot.style.display = 'block';
      root.classList.remove('booting');
      boot.classList.add('fade-out');
      document.querySelectorAll<HTMLElement>('.win:not([hidden])').forEach(replayOpen);
      const top = topWin();
      if (top) raise(top, true);
      window.setTimeout(() => boot.remove(), 650);
      document.dispatchEvent(new Event('booted'));
    }, 1000);
  };

  // stage 1: the log
  stage('term');
  let t = 150;
  LOG.forEach(([gap, line]) => {
    t += gap * 140;
    later(t, () => {
      log.insertAdjacentHTML('beforeend', line + '\n');
    });
  });
  // glitch into stage 2
  later(t + 350, () => boot.classList.add('glitch'));
  later(t + 800, () => {
    boot.classList.remove('glitch');
    stage('orb');
  });
  // stage 3
  later(t + 800 + 2600, toLogin);

  boot.querySelector('#boot-skip')!.addEventListener('click', toLogin);
  go.addEventListener('click', signIn);
  boot.querySelector('.boot-login')!.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('button')) signIn();
  });
  document.addEventListener('keydown', function onKey(e) {
    if (!boot.isConnected) return document.removeEventListener('keydown', onKey);
    if (boot.dataset.at === 'login') {
      if (e.key === 'Tab') return;
      e.preventDefault();
      if (e.key === 'Enter' || e.key === ' ') signIn();
    } else {
      e.preventDefault();
      toLogin();
    }
  });
}

export function shutdown() {
  const el = document.createElement('div');
  el.className = 'shutdown';
  el.innerHTML = '<div><span class="spinner" aria-hidden="true"></span><span>Shutting down…</span></div>';
  document.body.append(el);
  if (getPrefs().sound) playShutdown();
  try {
    sessionStorage.removeItem('booted');
  } catch {
    /* ignore */
  }
  window.setTimeout(() => {
    if (location.pathname === '/') location.reload();
    else location.href = '/';
  }, 1600);
}
