// A tiny fake shell over the site's content. Second way to navigate everything.
import { data, escapeHtml as esc, setWallpaper, wallpapers, currentWallpaper, type Entry, type Wallpaper } from './data';
import { open, close } from './wm';
import { nowPlaying } from './music';
import { startScreensaver } from './screensaver';

const { site, terminal: t } = data;
const DIRS: Record<string, Entry[]> = { projects: t.projects, research: t.research, writing: t.writing };
const HOME_FILES = ['about.txt', 'resume.pdf', 'contact.txt', 'experience.txt'];
const HIDDEN = ['.bash_history', '.secret'];

const out = document.getElementById('term-out')!;
const form = document.getElementById('term-form') as HTMLFormElement;
const input = document.getElementById('term-input') as HTMLInputElement;
const cwdEl = document.getElementById('term-cwd')!;
const term = document.getElementById('term')!;

let cwd = ''; // '' = ~, otherwise a top-level dir name
const history: string[] = [];
let hIdx = 0;

const prompt = () =>
  `<span class="t-user">${site.handle}</span><span class="t-dim">@</span><span class="t-host">${site.host}</span><span class="t-dim">:</span><span class="t-path">~${cwd ? '/' + cwd : ''}</span><span class="t-dim">$</span>`;

function print(html = '') {
  out.insertAdjacentHTML('beforeend', html + '\n');
  term.parentElement!.scrollTop = term.parentElement!.scrollHeight;
}
const link = (id: string, label: string) => `<button class="t-link" type="button" data-open="${id}">${esc(label)}</button>`;

function resolve(arg: string): { dir?: string; file?: string; entry?: Entry } | null {
  let p = arg.replace(/^~\/?/, '').replace(/\/+$/, '');
  if (cwd && !arg.startsWith('~') && !arg.startsWith('/')) p = p === '..' ? '' : `${cwd}/${p}`;
  p = p.replace(/^\/+/, '');
  if (p === '' || p === '.') return { dir: '' };
  const [d, f] = p.split('/');
  if (!f) {
    if (DIRS[d]) return { dir: d };
    if (HOME_FILES.includes(d) || HIDDEN.includes(d)) return { file: d };
    return null;
  }
  const entry = DIRS[d]?.find((e) => `${e.slug}.md` === f || e.slug === f);
  return entry ? { file: `${d}/${entry.slug}.md`, entry } : null;
}

function ls(arg = '', all = false) {
  const r = resolve(arg || '.');
  if (!r || r.file) return r?.file ? print(esc(arg)) : print(`<span class="t-err">ls: cannot access '${esc(arg)}': No such file or directory</span>`);
  if (r.dir) return print(DIRS[r.dir].map((e) => link(e.id, `${e.slug}.md`)).join('  '));
  const dirs = Object.keys(DIRS).map((d) => `<span class="t-path">${d}/</span>`);
  const files = HOME_FILES.map((f) => esc(f));
  print([...(all ? HIDDEN.map((h) => `<span class="t-dim">${h}</span>`) : []), ...dirs, ...files].join('  '));
}

function cat(arg: string) {
  if (!arg) return print('<span class="t-err">cat: missing file operand</span>');
  const r = resolve(arg);
  if (!r) return print(`<span class="t-err">cat: ${esc(arg)}: No such file or directory</span>`);
  if (r.dir !== undefined) return print(`<span class="t-err">cat: ${esc(arg)}: Is a directory</span>`);
  if (r.entry) {
    const e = r.entry;
    return print(
      `<span class="t-yellow"># ${esc(e.title)}</span>\n${esc(e.summary)}\n${e.tech.length ? `<span class="t-dim">[${e.tech.map(esc).join(', ')}]</span>\n` : ''}→ ${link(e.id, 'open in a window')}`,
    );
  }
  switch (r.file) {
    case 'about.txt':
      return print(`${esc(data.windows.find((w) => w.id === 'welcome')!.summary)}\n→ ${link('about', 'open About Me')}`);
    case 'contact.txt':
      return print(
        site.socials.map((s) => `${s.label.padEnd(9)} <a href="${s.url}" target="_blank" rel="noopener">${esc(s.handle)}</a>`).join('\n'),
      );
    case 'experience.txt':
      return print(`→ ${link('experience', 'open Experience')}`);
    case 'resume.pdf':
      return print(`<span class="t-dim">%PDF-1.7 ����</span> binary file. try ${link('resume', 'open resume')} instead`);
    case '.bash_history':
      return print('<span class="t-dim">sudo pacman -S everything\nwhy is my wifi gone\nhow to exit vim\nsudo dnf install fedora\n</span>');
    case '.secret':
      return print('the real secret: try the Konami code on the desktop ↑↑↓↓←→←→BA 🌸');
  }
}

function neofetch() {
  const art = [
    '<span class="t-user">     ▄▄▄▄▄▄▄     </span>',
    '<span class="t-user">   ▄█████████▄   </span>',
    '<span class="t-path">  ███▀▀ █ ▀▀███  </span>',
    '<span class="t-path">  ██▄▄▄███▄▄▄██  </span>',
    '<span class="t-host">  ████▀▀ ▀▀████  </span>',
    '<span class="t-host">   ▀█████████▀   </span>',
    '<span class="t-yellow">     ▀▀▀▀▀▀▀     </span>',
  ];
  const info = [
    `<span class="t-user">${site.handle}</span>@<span class="t-host">${site.host}</span>`,
    '<span class="t-dim">─────────────────</span>',
    `<span class="t-path">OS:</span> Fedora Linux (2009 desktop edition)`,
    `<span class="t-path">Shell:</span> tsh 0.1`,
    `<span class="t-path">WM:</span> aero-glass (pastel)`,
    `<span class="t-path">Uptime:</span> curious since 2009`,
    `<span class="t-path">Packages:</span> ${t.projects.length} projects, ${t.research.length} research, ${t.writing.length} notes`,
  ];
  print(art.map((a, i) => `${a}  ${info[i] ?? ''}`).join('\n'));
}

const OPENABLE: Record<string, string> = {
  about: 'about',
  me: 'about',
  projects: 'projects',
  research: 'research',
  writing: 'writing',
  notes: 'writing',
  blog: 'writing',
  resume: 'resume',
  cv: 'resume',
  'resume.pdf': 'resume',
  experience: 'experience',
  work: 'experience',
  contact: 'contact',
  mail: 'contact',
  games: 'games',
  game: 'games',
  bin: 'recycle',
  trash: 'recycle',
  welcome: 'welcome',
  guestbook: 'guestbook',
  personalize: 'personalize',
  settings: 'personalize',
  music: 'music',
  sweeper: 'sweeper',
  minesweeper: 'sweeper',
  dashboard: 'dashboard',
  stats: 'dashboard',
};

function openCmd(arg: string) {
  if (!arg) return print('usage: open &lt;section|file&gt;   e.g. <span class="t-yellow">open projects</span>');
  const key = arg.toLowerCase().replace(/\/$/, '').replace(/\.txt$/, '');
  if (OPENABLE[key]) {
    open(OPENABLE[key]);
    return print(`<span class="t-dim">opening ${esc(key)}…</span>`);
  }
  const r = resolve(arg);
  if (r?.entry) {
    open(r.entry.id);
    return print(`<span class="t-dim">opening ${esc(r.entry.title)}…</span>`);
  }
  if (r?.dir) {
    open(r.dir);
    return print(`<span class="t-dim">opening ${esc(r.dir)}…</span>`);
  }
  print(`<span class="t-err">open: ${esc(arg)}: not found</span>`);
}

const HELP = `<span class="t-yellow">available commands</span>
  <span class="t-host">help</span>               this list
  <span class="t-host">ls</span> [dir]           list files       <span class="t-host">cd</span> &lt;dir&gt;     change directory
  <span class="t-host">cat</span> &lt;file&gt;         read a file      <span class="t-host">open</span> &lt;thing&gt;  open a window
  <span class="t-host">whoami</span>             about me         <span class="t-host">neofetch</span>      system info
  <span class="t-host">projects</span>  <span class="t-host">research</span>  <span class="t-host">writing</span>  <span class="t-host">resume</span>  <span class="t-host">contact</span>
  <span class="t-host">np</span>                 what I'm listening to
  <span class="t-host">open guestbook</span>     leave me a note    <span class="t-host">bubbles</span>     screensaver
  <span class="t-host">open personalize</span>   change colours, cursor, sounds
  <span class="t-host">open sweeper</span>       minesweeper        <span class="t-host">stats</span>       visitor dashboard
  <span class="t-host">theme</span> [${wallpapers.join('|')}]   change wallpaper
  <span class="t-host">clear</span>  <span class="t-host">history</span>  <span class="t-host">date</span>  <span class="t-host">echo</span>  <span class="t-host">exit</span>
<span class="t-dim">tip: links are clickable, ↑/↓ for history, Tab to complete</span>`;

function listing(dir: string) {
  print(DIRS[dir].map((e) => `${link(e.id, e.slug.padEnd(22))} <span class="t-dim">${esc(e.summary)}</span>`).join('\n'));
}

function run(line: string) {
  const [cmd = '', ...rest] = line.trim().split(/\s+/);
  const arg = rest.join(' ');
  switch (cmd) {
    case '':
      return;
    case 'help':
    case '?':
    case 'man':
      return print(HELP);
    case 'ls':
    case 'll':
    case 'dir':
      return ls(rest.filter((r) => !r.startsWith('-')).join(' '), rest.some((r) => r.includes('a')) || cmd === 'll');
    case 'cd': {
      if (!arg || arg === '~') {
        cwd = '';
      } else {
        const r = resolve(arg);
        if (!r || r.dir === undefined) return print(`<span class="t-err">cd: ${esc(arg)}: Not a directory</span>`);
        cwd = r.dir;
      }
      cwdEl.textContent = `~${cwd ? '/' + cwd : ''}`;
      return;
    }
    case 'pwd':
      return print(`/home/${site.handle}${cwd ? '/' + cwd : ''}`);
    case 'cat':
    case 'less':
    case 'more':
    case 'bat':
      return cat(arg);
    case 'open':
    case 'xdg-open':
    case 'start':
      return openCmd(arg);
    case 'whoami':
      return print(`${esc(site.name)} — CS engineering student. builds software, explores research, uses Linux btw.\n→ ${link('about', 'more about me')}`);
    case 'neofetch':
    case 'fastfetch':
      return neofetch();
    case 'projects':
    case 'research':
    case 'writing':
      return listing(cmd);
    case 'resume':
    case 'cv':
      open('resume');
      return print(`opening résumé… or <a href="${site.resumePdf}" download>download the PDF</a>`);
    case 'contact':
    case 'email':
      return cat('contact.txt');
    case 'theme':
    case 'wallpaper': {
      if (!arg) return print(`current: ${currentWallpaper()} · options: ${wallpapers.join(', ')}`);
      if (!(wallpapers as readonly string[]).includes(arg)) return print(`<span class="t-err">theme: unknown theme '${esc(arg)}'</span>`);
      setWallpaper(arg as Wallpaper);
      return print(`wallpaper set to <span class="t-yellow">${esc(arg)}</span> ✨`);
    }
    case 'clear':
    case 'cls':
      out.innerHTML = '';
      return;
    case 'history':
      return print(history.map((h, i) => `${String(i + 1).padStart(4)}  ${esc(h)}`).join('\n'));
    case 'date':
      return print(new Date().toString());
    case 'echo':
      return print(esc(arg));
    case 'uname':
      return print(rest.includes('-a') ? 'Linux fedora 7.2.8-curiosity #1 SMP x86_64 GNU/Linux' : 'Linux');
    case 'sudo':
      return print(
        line.includes('rm -rf')
          ? `<span class="t-err">nice try.</span>`
          : `[sudo] password for ${site.handle}: \n<span class="t-err">${site.handle} is not in the sudoers file. This incident will be reported (to my mom).</span>`,
      );
    case 'rm':
      return print(line.includes('-rf') ? `<span class="t-err">rm: refusing to delete my childhood memories</span>` : `<span class="t-err">rm: permission denied</span>`);
    case 'vim':
    case 'vi':
    case 'nvim':
      return print('you are now trapped in vim. just kidding — type <span class="t-yellow">:q</span> anyway.');
    case ':q':
    case ':wq':
    case ':q!':
      return print('see? you escaped vim. put that on your résumé.');
    case 'nano':
    case 'emacs':
      return print(`${cmd}? in this economy? try vim.`);
    case 'ping':
      return print(`PING ${esc(arg || 'anushka')}: 64 bytes, time=0.1ms\n--- reply: "hi! send me an email :)" ---`);
    case 'exit':
    case 'logout': {
      const w = document.getElementById('win-terminal');
      if (w) close(w);
      return;
    }
    case 'np':
    case 'music':
    case 'spotify': {
      const np = nowPlaying;
      if (np.playing) print(`<span class="t-host">♪ now playing:</span> ${esc(np.title!)} <span class="t-dim">— ${esc(np.artist!)}</span>`);
      else print(`<span class="t-dim">nothing playing right now.</span> on repeat lately: <span class="t-yellow">${esc(site.spotify.playlist.name)}</span>`);
      return print(`→ ${link('music', 'open the media player')}`);
    }
    case 'bubbles':
    case 'screensaver':
      print('<span class="t-dim">starting bubbles… move the mouse to wake up.</span>');
      setTimeout(startScreensaver, 400);
      return;
    case 'sign':
      return openCmd('guestbook');
    case 'hello':
    case 'hi':
      return print('hi! 👋 type <span class="t-yellow">help</span> to see what I can do.');
    default:
      if (OPENABLE[cmd]) return openCmd(cmd);
      print(`<span class="t-err">tsh: command not found: ${esc(cmd)}</span>  <span class="t-dim">(try 'help')</span>`);
  }
}

function complete(value: string) {
  const parts = value.split(/\s+/);
  const last = parts.pop() ?? '';
  const cands =
    parts.length === 0
      ? ['help', 'ls', 'cd', 'cat', 'open', 'whoami', 'neofetch', 'projects', 'research', 'writing', 'resume', 'contact', 'theme', 'clear', 'history', 'exit']
      : (() => {
          const slash = last.lastIndexOf('/');
          const base = slash >= 0 ? last.slice(0, slash) : cwd;
          const prefix = slash >= 0 ? last.slice(0, slash + 1) : '';
          if (base && DIRS[base]) return DIRS[base].map((e) => `${prefix}${e.slug}.md`);
          return [...Object.keys(DIRS).map((d) => `${d}/`), ...HOME_FILES, ...(parts[0] === 'theme' ? wallpapers : [])];
        })();
  const hits = cands.filter((c) => c.startsWith(last));
  if (hits.length === 1) return [...parts, hits[0]].join(' ') + (hits[0].endsWith('/') ? '' : ' ');
  if (hits.length > 1) print(hits.map(esc).join('  '));
  return value;
}

let greeted = false;
function greet() {
  if (greeted) return;
  greeted = true;
  print(`<span class="t-dim">tsh 0.1 — last login: ${new Date().toDateString()} on tty1</span>`);
  print(`welcome! type <span class="t-yellow">help</span> to get started, or try <span class="t-yellow">neofetch</span>.\n`);
}

export function initTerminal() {
  const win = document.getElementById('win-terminal');
  if (!win) return;
  out.querySelector('noscript')?.remove();
  if (!win.hidden) greet();
  win.addEventListener('win:open', () => {
    greet();
    input.focus();
  });
  term.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-open]');
    if (btn) return void open(btn.dataset.open!);
    if (!window.getSelection()?.toString()) input.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const line = input.value;
    print(`${prompt()} ${esc(line)}`);
    if (line.trim()) history.push(line);
    hIdx = history.length;
    input.value = '';
    run(line);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      hIdx = Math.max(0, hIdx - 1);
      input.value = history[hIdx] ?? '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      hIdx = Math.min(history.length, hIdx + 1);
      input.value = history[hIdx] ?? '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      input.value = complete(input.value);
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      out.innerHTML = '';
    }
  });
}
