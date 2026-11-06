// Pixel Sweeper: 9×9 Minesweeper with 10 hidden flowers (like Win7's flower mode).
import { countPlay, offerScore } from './arcade';

const SIZE = 9;
const FLOWERS = 10;

export function initSweeper() {
  const found = document.getElementById('sw-board');
  if (!found) return;
  const board: HTMLElement = found;
  const face = document.getElementById('sw-new')!;
  const leftEl = document.getElementById('sw-left')!;
  const timeEl = document.getElementById('sw-time')!;
  const msg = document.getElementById('sw-msg')!;
  const submit = document.getElementById('sw-submit')!;
  const flagBtn = document.getElementById('sw-flagmode')!;

  let mines: boolean[] = [];
  let open: boolean[] = [];
  let flags: boolean[] = [];
  let started = 0;
  let timer: number | undefined;
  let over = false;
  let flagMode = false;
  const cells: HTMLButtonElement[] = [];

  const nbrs = (i: number) => {
    const x = i % SIZE;
    const y = Math.floor(i / SIZE);
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) out.push(ny * SIZE + nx);
      }
    return out;
  };
  const count = (i: number) => nbrs(i).filter((n) => mines[n]).length;
  const pad = (n: number) => String(Math.max(0, Math.min(999, n))).padStart(3, '0');
  const updateLeft = () => (leftEl.textContent = pad(FLOWERS - flags.filter(Boolean).length));

  function reset() {
    clearInterval(timer);
    mines = Array(SIZE * SIZE).fill(false);
    open = Array(SIZE * SIZE).fill(false);
    flags = Array(SIZE * SIZE).fill(false);
    started = 0;
    over = false;
    face.textContent = '🙂';
    timeEl.textContent = '000';
    msg.textContent = 'find the 10 hidden flowers 🌸 · right-click to flag';
    submit.hidden = true;
    board.innerHTML = '';
    cells.length = 0;
    for (let i = 0; i < SIZE * SIZE; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'sw-cell';
      b.dataset.i = String(i);
      b.setAttribute('aria-label', `Row ${Math.floor(i / SIZE) + 1}, column ${(i % SIZE) + 1}, hidden`);
      cells.push(b);
      board.append(b);
    }
    updateLeft();
  }

  function plant(safe: number) {
    const keepClear = new Set([safe, ...nbrs(safe)]); // first click always opens an area
    let placed = 0;
    while (placed < FLOWERS) {
      const i = Math.floor(Math.random() * SIZE * SIZE);
      if (mines[i] || keepClear.has(i)) continue;
      mines[i] = true;
      placed++;
    }
    started = performance.now();
    timer = window.setInterval(() => (timeEl.textContent = pad(Math.floor((performance.now() - started) / 1000))), 250);
    countPlay('sweeper');
  }

  function reveal(i: number) {
    const stack = [i];
    while (stack.length) {
      const j = stack.pop()!;
      if (open[j] || flags[j]) continue;
      open[j] = true;
      const n = count(j);
      const c = cells[j];
      c.classList.add('open');
      c.dataset.n = String(n);
      c.textContent = n ? String(n) : '';
      c.setAttribute('aria-label', n ? `${n}` : 'empty');
      if (n === 0) stack.push(...nbrs(j));
    }
  }

  function end(won: boolean, hit?: number) {
    over = true;
    clearInterval(timer);
    const secs = (performance.now() - started) / 1000;
    mines.forEach((m, i) => {
      if (m && !flags[i]) cells[i].innerHTML = '<img src="/pixels/flower.svg" alt="flower">';
      if (m) cells[i].classList.add('open');
    });
    if (hit !== undefined) cells[hit].classList.add('boom');
    face.textContent = won ? '😎' : '😵';
    if (won) {
      msg.textContent = `you found every flower in ${secs.toFixed(1)}s ✿`;
      offerScore(submit, 'sweeper', Math.round(secs * 10) / 10);
    } else msg.textContent = 'oops, you stepped on a flower! try again 🌸';
  }

  function toggleFlag(i: number) {
    if (open[i] || over) return;
    flags[i] = !flags[i];
    cells[i].innerHTML = flags[i] ? '<img src="/pixels/flag.svg" alt="flag">' : '';
    updateLeft();
  }

  function click(i: number) {
    if (over || flags[i]) return;
    if (!started) plant(i);
    if (open[i]) {
      // chord: if the number is satisfied by flags, open the rest
      const ns = nbrs(i);
      if (ns.filter((n) => flags[n]).length === count(i)) ns.forEach((n) => !open[n] && !flags[n] && click(n));
      return;
    }
    if (mines[i]) return end(false, i);
    reveal(i);
    if (open.filter(Boolean).length === SIZE * SIZE - FLOWERS) end(true);
  }

  board.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.sw-cell');
    if (!c) return;
    const i = Number(c.dataset.i);
    if (flagMode) toggleFlag(i);
    else click(i);
  });
  board.addEventListener('contextmenu', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('.sw-cell');
    if (!c) return;
    e.preventDefault();
    toggleFlag(Number(c.dataset.i));
  });
  board.addEventListener('pointerdown', (e) => {
    if (!over && e.button === 0 && (e.target as HTMLElement).closest('.sw-cell')) face.textContent = '😮';
  });
  board.addEventListener('pointerup', () => !over && (face.textContent = '🙂'));
  face.addEventListener('click', reset);
  flagBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    flagBtn.setAttribute('aria-pressed', String(flagMode));
  });
  reset();
}
