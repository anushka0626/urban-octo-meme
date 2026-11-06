// Small per-window behaviours: gadgets, explorer filter, contact, recycle bin, game, easter eggs.
import { data, store, toast, setWallpaper, currentWallpaper, wallpapers } from './data';
import { open, close } from './wm';
import { countPlay, offerScore } from './arcade';

/* ── clocks ── */
function initClocks() {
  const time = document.getElementById('tray-time')!;
  const date = document.getElementById('tray-date')!;
  const tray = document.getElementById('tray-clock')!;
  const h = document.getElementById('cg-h');
  const m = document.getElementById('cg-m');
  const s = document.getElementById('cg-s');
  const gadget = document.getElementById('clock-gadget');
  let extra = 0; // degrees added by the "doodle" spin

  const tick = () => {
    const now = new Date();
    time.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    date.textContent = now.toLocaleDateString();
    tray.title = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const sec = now.getSeconds();
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;
    h?.setAttribute('style', `transform: rotate(${hr * 30 + extra}deg)`);
    m?.setAttribute('style', `transform: rotate(${min * 6 + extra * 2}deg)`);
    // avoid the backwards sweep when seconds wrap 59 → 0
    if (s) {
      s.style.transition = sec === 0 ? 'none' : '';
      s.style.transform = `rotate(${sec * 6 + extra * 3}deg)`;
    }
  };
  tick();
  setInterval(tick, 1000);

  gadget?.addEventListener('click', () => {
    gadget.classList.add('spin');
    extra += 360;
    tick();
    setTimeout(() => gadget.classList.remove('spin'), 1400);
    toast('⏰ time flies', 'it was 2009 like five minutes ago.');
  });
}

/* ── explorer: filter box & back button ── */
function initExplorer() {
  document.querySelectorAll<HTMLInputElement>('[data-filter]').forEach((inp) => {
    const win = inp.closest('.win')!;
    const cards = [...win.querySelectorAll<HTMLElement>('.card[data-q]')];
    const status = win.querySelector('.ex-status');
    inp.addEventListener('input', () => {
      const q = inp.value.trim().toLowerCase();
      let n = 0;
      cards.forEach((c) => {
        const hit = !q || c.dataset.q!.includes(q);
        c.hidden = !hit;
        if (hit) n++;
      });
      if (status) status.textContent = `${n} item${n === 1 ? '' : 's'}${q ? ` matching “${inp.value}”` : ''}`;
    });
  });
  document.querySelectorAll<HTMLButtonElement>('[data-back]').forEach((b) => {
    b.addEventListener('click', () => {
      const win = b.closest<HTMLElement>('.win')!;
      const parent = data.windows.find((w) => w.url === b.dataset.back);
      close(win, { instant: true });
      if (parent) open(parent.id);
    });
  });
}

/* ── contact ── */
function initContact() {
  const form = document.getElementById('compose') as HTMLFormElement | null;
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const from = String(fd.get('from') ?? '').trim();
    const subject = String(fd.get('subject') ?? '').trim() || 'Hello from your website!';
    const body = String(fd.get('body') ?? '').trim() + (from ? `\n\n— ${from}` : '');
    location.href = `mailto:${data.site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
  document.querySelectorAll<HTMLElement>('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy!);
        toast('Copied!', `${b.dataset.copy} is on your clipboard.`);
      } catch {
        toast('Hmm, could not copy', b.dataset.copy!);
      }
    }),
  );
}

/* ── welcome: "show at startup" ── */
function initWelcome() {
  const cb = document.getElementById('welcome-startup') as HTMLInputElement | null;
  if (!cb) return;
  const hide = store.get('hideWelcome') === '1';
  cb.checked = !hide;
  cb.addEventListener('change', () => store.set('hideWelcome', cb.checked ? null : '1'));
  const w = document.getElementById('win-welcome')!;
  if (hide && location.pathname === '/' && !w.hidden) close(w, { instant: true });
}

/* ── recycle bin ── */
function initRecycleBin() {
  const table = document.getElementById('bin-table');
  const msg = document.getElementById('bin-msg');
  if (!table || !msg) return;
  document.getElementById('empty-bin')!.addEventListener('click', () => {
    table.classList.remove('crumple');
    void table.offsetWidth;
    table.classList.add('crumple');
    msg.textContent = 'Recycle Bin could not be emptied: these files are sentimental. (Error 0x2009)';
  });
  document.getElementById('restore-bin')!.addEventListener('click', () => {
    msg.textContent = 'Restoring… no. They were abandoned for a reason.';
  });
}

/* ── Pixel Pairs (a Purble-Pairs-ish memory game) ── */
function initGame() {
  const board = document.getElementById('pp-board');
  if (!board) return;
  const movesEl = document.getElementById('pp-moves')!;
  const pairsEl = document.getElementById('pp-pairs')!;
  const msg = document.getElementById('pp-msg')!;
  const SPRITES = ['heart', 'star', 'floppy', 'cupcake', 'cursor', 'mushroom', 'flower', 'plant'];
  let first: HTMLButtonElement | null = null;
  let lock = false;
  let moves = 0;
  let pairs = 0;
  let counted = false;

  const deal = () => {
    const deck = [...SPRITES, ...SPRITES]
      .map((v) => ({ v, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.v);
    board.innerHTML = deck
      .map(
        (v, i) =>
          `<button class="cardp" type="button" data-v="${v}" aria-label="Card ${i + 1}, face down"><span class="back"></span><span class="face"><img src="/pixels/${v}.svg" alt="" width="44" height="44"></span></button>`,
      )
      .join('');
    first = null;
    lock = false;
    moves = 0;
    pairs = 0;
    movesEl.textContent = '0';
    pairsEl.textContent = '0';
    msg.textContent = 'find all the pairs!';
    document.getElementById('pp-submit')!.hidden = true;
    counted = false;
  };

  board.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLButtonElement>('.cardp');
    if (!c || lock || c === first || c.classList.contains('up')) return;
    if (!counted) {
      counted = true;
      countPlay('pairs');
    }
    c.classList.add('up');
    c.setAttribute('aria-label', `${c.dataset.v}`);
    if (!first) {
      first = c;
      return;
    }
    moves++;
    movesEl.textContent = String(moves);
    if (first.dataset.v === c.dataset.v) {
      first.classList.add('done');
      c.classList.add('done');
      first = null;
      pairs++;
      pairsEl.textContent = String(pairs);
      if (pairs === SPRITES.length) {
        msg.textContent = moves <= 12 ? `perfect memory! ${moves} moves ★` : `you win! ${moves} moves ✿`;
        offerScore(document.getElementById('pp-submit')!, 'pairs', moves);
      }
    } else {
      lock = true;
      const a = first;
      first = null;
      setTimeout(() => {
        [a, c].forEach((x) => {
          x.classList.remove('up');
          x.setAttribute('aria-label', 'Card, face down');
        });
        lock = false;
      }, 750);
    }
  });
  document.getElementById('pp-new')!.addEventListener('click', deal);
  deal();
}

/* ── Konami code → cycle wallpaper ── */
function initKonami() {
  const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let i = 0;
  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    i = e.key.toLowerCase() === seq[i].toLowerCase() ? i + 1 : e.key === seq[0] ? 1 : 0;
    if (i === seq.length) {
      i = 0;
      const next = wallpapers[(wallpapers.indexOf(currentWallpaper()) + 1) % wallpapers.length];
      setWallpaper(next);
      toast('✨ cheat code accepted', `wallpaper: ${next}`);
    }
  });
}

export function initApps() {
  initClocks();
  initExplorer();
  initContact();
  initWelcome();
  initRecycleBin();
  initGame();
  initKonami();
}
