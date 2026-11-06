// Guestbook API.
//   GET              → approved notes
//   POST {note}      → submit a note (pending approval when MODERATED)
//   GET/POST with "Authorization: Bearer $GUESTBOOK_ADMIN_TOKEN" → list pending / approve / delete
import type { APIRoute } from 'astro';
import { GUESTBOOK_ADMIN_TOKEN } from 'astro:env/server';
import { NOTE_COLORS, GRID, LIMITS, MODERATED, type GuestEntry, type NoteColor } from '../../data/guestbook';
import { redis, storageReady as configured } from '../../lib/redis';

export const prerender = false;

const MAX_ENTRIES = 300;
const K = { entries: 'gb:entries', pending: 'gb:pending', rl: (ip: string) => `gb:rl:${ip}` };

const json = (body: unknown, status = 200, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

const isAdmin = (req: Request) => Boolean(GUESTBOOK_ADMIN_TOKEN) && req.headers.get('authorization') === `Bearer ${GUESTBOOK_ADMIN_TOKEN}`;

async function list(key: string, n = MAX_ENTRIES): Promise<GuestEntry[]> {
  const raw = (await redis(['LRANGE', key, 0, n - 1])) as string[];
  return raw.flatMap((r) => {
    try {
      return [JSON.parse(r) as GuestEntry];
    } catch {
      return [];
    }
  });
}

async function findRaw(key: string, id: string) {
  const raw = (await redis(['LRANGE', key, 0, -1])) as string[];
  return raw.find((r) => r.includes(`"id":"${id}"`));
}

function clean(s: unknown, max: number) {
  return typeof s === 'string'
    ? s
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
    : '';
}

export const GET: APIRoute = async ({ request }) => {
  if (!configured) return json({ configured: false, entries: [] }, 200, 'public, s-maxage=300');
  try {
    if (isAdmin(request)) return json({ configured, entries: await list(K.entries), pending: await list(K.pending) });
    return json({ configured, moderated: MODERATED, entries: await list(K.entries, 100) }, 200, 'public, s-maxage=20, stale-while-revalidate=60');
  } catch {
    return json({ configured, error: true, entries: [] }, 500);
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!configured) return json({ ok: false, error: 'The guestbook is not set up yet.' }, 503);
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Bad request.' }, 400);
  }

  // admin actions
  if (isAdmin(request)) {
    const id = String(body.id ?? '');
    if (body.action === 'approve') {
      const raw = await findRaw(K.pending, id);
      if (!raw) return json({ ok: false, error: 'Not found.' }, 404);
      await redis(['LREM', K.pending, 1, raw]);
      await redis(['LPUSH', K.entries, raw]);
      await redis(['LTRIM', K.entries, 0, MAX_ENTRIES - 1]);
      return json({ ok: true });
    }
    if (body.action === 'delete') {
      for (const key of [K.pending, K.entries]) {
        const raw = await findRaw(key, id);
        if (raw) await redis(['LREM', key, 1, raw]);
      }
      return json({ ok: true });
    }
  }

  // honeypot: real people never fill the hidden "website" field
  if (body.website) return json({ ok: true, pending: true });

  const name = clean(body.name, LIMITS.name);
  const message = clean(body.message, LIMITS.message);
  const color = NOTE_COLORS.includes(body.color as NoteColor) ? (body.color as NoteColor) : 'yellow';
  const pixels = typeof body.pixels === 'string' && new RegExp(`^[0-8]{${GRID * GRID}}$`).test(body.pixels) && /[1-8]/.test(body.pixels) ? body.pixels : '';
  if (!name || (!message && !pixels)) return json({ ok: false, error: 'Add your name and a message or a drawing.' }, 400);

  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] || clientAddress || 'unknown').trim();
  try {
    const ok = await redis(['SET', K.rl(ip), 1, 'EX', 60, 'NX']);
    if (!ok) return json({ ok: false, error: 'Slow down a little! Try again in a minute.' }, 429);

    const entry: GuestEntry = { id: crypto.randomUUID().slice(0, 8), name, message, color, pixels, ts: Date.now() };
    await redis(['LPUSH', MODERATED ? K.pending : K.entries, JSON.stringify(entry)]);
    await redis(['LTRIM', MODERATED ? K.pending : K.entries, 0, MAX_ENTRIES - 1]);
    return json({ ok: true, pending: MODERATED, entry });
  } catch {
    return json({ ok: false, error: 'Could not save your note, please try again.' }, 500);
  }
};
