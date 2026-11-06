// Contribution calendar for the "commit garden" gadget.
// Reads GitHub's public contributions page (no token needed); cached on Vercel's CDN for an hour.
import type { APIRoute } from 'astro';
import { site } from '../../data/site';

export const prerender = false;

const json = (body: unknown, maxAge: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 6}`,
    },
  });

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(`https://github.com/users/${site.github}/contributions`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (personal website commit-garden gadget)' },
    });
    if (!res.ok) throw new Error(String(res.status));
    const html = await res.text();

    // "3 contributions on October 5th." / "No contributions on …" keyed by the cell id
    const counts = new Map<string, number>();
    for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>\s*([^<]*)/g)) {
      const n = /^(\d+)/.exec(m[2].trim());
      counts.set(m[1], n ? Number(n[1]) : 0);
    }
    const days: { d: string; l: number; c: number }[] = [];
    for (const m of html.matchAll(/<td\b[^>]*>/g)) {
      const tag = m[0];
      const date = /data-date="([\d-]+)"/.exec(tag)?.[1];
      const level = /data-level="(\d)"/.exec(tag)?.[1];
      const id = /\bid="([^"]+)"/.exec(tag)?.[1];
      if (date && level) days.push({ d: date, l: Number(level), c: (id && counts.get(id)) || 0 });
    }
    days.sort((a, b) => (a.d < b.d ? -1 : 1));
    const total = Number(/([\d,]+)\s+contributions?\s+in the last year/.exec(html.replace(/\s+/g, ' '))?.[1].replace(/,/g, '') ?? 0);
    if (!days.length) throw new Error('no data');
    return json({ user: site.github, total, days }, 3600);
  } catch {
    return json({ user: site.github, error: true }, 300);
  }
};
