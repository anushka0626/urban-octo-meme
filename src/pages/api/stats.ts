// Visitor dashboard + arcade leaderboards.
//   GET                                   → everything the dashboard shows
//   POST {type:'visit'}                   → count a visit (once per IP per 30 min), returns your visitor number
//   POST {type:'play', game}              → count a game started
//   POST {type:'score', game, name, score}→ submit a score (lower is better; best per name is kept)
// Stores only counts, a country code (from Vercel's geo header) and leaderboard names. No IPs are stored.
import type { APIRoute } from 'astro';
import { pipeline, redis, storageReady } from '../../lib/redis';

export const prerender = false;

const GAMES = { pairs: { min: 8, max: 999 }, sweeper: { min: 3, max: 3600 } } as const;
type Game = keyof typeof GAMES;

const K = {
  visits: 'st:visits',
  day: (d: string) => `st:day:${d}`,
  countries: 'st:countries',
  plays: 'st:plays',
  board: (g: Game) => `lb:${g}`,
  rl: (kind: string, ip: string) => `st:rl:${kind}:${ip}`,
};

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

const today = (offsetDays = 0) => new Date(Date.now() - offsetDays * 864e5).toISOString().slice(0, 10);
const pairs = (flat: unknown) => {
  const a = (flat as string[]) ?? [];
  const out: [string, number][] = [];
  for (let i = 0; i < a.length; i += 2) out.push([a[i], Number(a[i + 1])]);
  return out;
};
const ipOf = (request: Request, clientAddress?: string) =>
  (request.headers.get('x-forwarded-for')?.split(',')[0] || clientAddress || 'unknown').trim();

export const GET: APIRoute = async () => {
  if (!storageReady) return json({ configured: false }, 200, 'public, s-maxage=300');
  try {
    const days = Array.from({ length: 7 }, (_, i) => today(6 - i));
    const r = await pipeline([
      ['GET', K.visits],
      ['MGET', ...days.map(K.day)],
      ['HGETALL', K.countries],
      ['HGETALL', K.plays],
      ['ZRANGE', K.board('pairs'), 0, 9, 'WITHSCORES'],
      ['ZRANGE', K.board('sweeper'), 0, 9, 'WITHSCORES'],
      ['LLEN', 'gb:entries'],
    ]);
    const perDay = (r[1] as (string | null)[]).map((n, i) => ({ d: days[i], n: Number(n ?? 0) }));
    return json(
      {
        configured: true,
        visits: Number(r[0] ?? 0),
        today: perDay.at(-1)!.n,
        week: perDay,
        countries: pairs(r[2])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8),
        plays: Object.fromEntries(pairs(r[3])),
        leaders: {
          pairs: pairs(r[4]).map(([name, score]) => ({ name, score })),
          sweeper: pairs(r[5]).map(([name, score]) => ({ name, score })),
        },
        guestbook: Number(r[6] ?? 0),
      },
      200,
      'public, s-maxage=20, stale-while-revalidate=60',
    );
  } catch {
    return json({ configured: true, error: true }, 500);
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!storageReady) return json({ ok: false }, 503);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }
  const ip = ipOf(request, clientAddress);
  try {
    if (body.type === 'visit') {
      const fresh = await redis(['SET', K.rl('visit', ip), 1, 'EX', 1800, 'NX']);
      if (!fresh) return json({ ok: true, visitor: Number((await redis(['GET', K.visits])) ?? 0) });
      const country = (request.headers.get('x-vercel-ip-country') ?? '').toUpperCase();
      const [visitor] = await pipeline([
        ['INCR', K.visits],
        ['INCR', K.day(today())],
        ['EXPIRE', K.day(today()), 60 * 60 * 24 * 40],
        ...(/^[A-Z]{2}$/.test(country) ? [['HINCRBY', K.countries, country, 1]] : []),
      ]);
      return json({ ok: true, visitor: Number(visitor) });
    }

    const game = body.game as Game;
    if (!(game in GAMES)) return json({ ok: false }, 400);

    if (body.type === 'play') {
      await redis(['HINCRBY', K.plays, game, 1]);
      return json({ ok: true });
    }

    if (body.type === 'score') {
      const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
      const score = Math.round(Number(body.score) * 10) / 10;
      if (!/^[\p{L}\p{N} _.\-]{1,14}$/u.test(name)) return json({ ok: false, error: 'Names: up to 14 letters/numbers.' }, 400);
      if (!Number.isFinite(score) || score < GAMES[game].min || score > GAMES[game].max) return json({ ok: false, error: 'Hmm, that score looks off.' }, 400);
      if (!(await redis(['SET', K.rl('score', ip), 1, 'EX', 10, 'NX']))) return json({ ok: false, error: 'One sec, try again.' }, 429);
      await redis(['ZADD', K.board(game), 'LT', score, name]);
      return json({ ok: true });
    }
    return json({ ok: false }, 400);
  } catch {
    return json({ ok: false, error: 'Could not save.' }, 500);
  }
};
