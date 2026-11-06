// "commit garden" gadget: the last ~20 weeks of GitHub contributions as a pixel grid.
const WEEKS = 20;

interface Day {
  d: string;
  l: number;
  c: number;
}

export async function initGithub() {
  const gadget = document.getElementById('gh');
  const grid = document.getElementById('gh-grid');
  if (!gadget || !grid) return;
  try {
    const res = await fetch('/api/github');
    if (!res.ok) return;
    const data = (await res.json()) as { total?: number; days?: Day[]; error?: boolean };
    if (data.error || !data.days?.length) return;

    const weeks: Day[][] = [];
    for (let i = 0; i < data.days.length; i += 7) weeks.push(data.days.slice(i, i + 7));
    const recent = weeks.slice(-WEEKS).flat();
    grid.innerHTML = recent
      .map((day) => {
        const label = `${day.c || 'No'} contribution${day.c === 1 ? '' : 's'} on ${new Date(`${day.d}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
        return `<i class="l${day.l}" title="${label}"></i>`;
      })
      .join('');

    // streak: consecutive days with contributions, not counting an empty "today"
    const all = data.days;
    let i = all.length - 1;
    if (all[i]?.c === 0) i--;
    let streak = 0;
    while (i >= 0 && all[i].c > 0) {
      streak++;
      i--;
    }
    document.getElementById('gh-total')!.textContent = String(data.total ?? recent.reduce((s, d) => s + d.c, 0));
    const streakEl = document.getElementById('gh-streak')!;
    streakEl.textContent = streak >= 2 ? `🔥 ${streak} days` : '';
    gadget.setAttribute('aria-label', `GitHub: ${data.total} contributions in the last year. Opens GitHub profile.`);
    gadget.hidden = false;
  } catch {
    /* gadget stays hidden */
  }
}
