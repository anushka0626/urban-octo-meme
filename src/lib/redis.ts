// Tiny Redis client for the API routes: Upstash's REST API in production,
// an in-memory stand-in during `npm run dev` so everything works without setup.
import { KV_REST_API_URL, KV_REST_API_TOKEN, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } from 'astro:env/server';

export type Cmd = (string | number)[];

const URL_ = KV_REST_API_URL ?? UPSTASH_REDIS_REST_URL;
const TOKEN = KV_REST_API_TOKEN ?? UPSTASH_REDIS_REST_TOKEN;

/** True when there is somewhere to store data (real Redis, or dev memory). */
export const storageReady = Boolean(URL_ && TOKEN) || import.meta.env.DEV;

export async function redis(cmd: Cmd): Promise<unknown> {
  if (URL_ && TOKEN) {
    const res = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmd) });
    const json = (await res.json()) as { result?: unknown; error?: string };
    if (json.error) throw new Error(json.error);
    return json.result;
  }
  return memory(cmd);
}

/** Several commands in one round trip. */
export async function pipeline(cmds: Cmd[]): Promise<unknown[]> {
  if (URL_ && TOKEN) {
    const res = await fetch(`${URL_}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmds) });
    const json = (await res.json()) as { result?: unknown; error?: string }[];
    return json.map((r) => {
      if (r.error) throw new Error(r.error);
      return r.result;
    });
  }
  return cmds.map(memory);
}

/* ── dev-only memory store: just enough Redis for this site ── */
const mem = {
  str: new Map<string, string>(),
  exp: new Map<string, number>(),
  list: new Map<string, string[]>(),
  hash: new Map<string, Map<string, number>>(),
  zset: new Map<string, Map<string, number>>(),
};

function alive(key: string) {
  const e = mem.exp.get(key);
  if (e && e < Date.now()) {
    mem.exp.delete(key);
    mem.str.delete(key);
    return false;
  }
  return mem.str.has(key);
}

function memory(cmd: Cmd): unknown {
  const [op, key, ...a] = cmd as [string, string, ...(string | number)[]];
  const list = mem.list.get(key) ?? [];
  switch (op.toUpperCase()) {
    case 'GET':
      return alive(key) ? mem.str.get(key) : null;
    case 'SET': {
      const nx = a.includes('NX');
      if (nx && alive(key)) return null;
      mem.str.set(key, String(a[0]));
      const ex = a.indexOf('EX');
      if (ex >= 0) mem.exp.set(key, Date.now() + Number(a[ex + 1]) * 1000);
      return 'OK';
    }
    case 'INCR': {
      const v = Number(alive(key) ? mem.str.get(key) : 0) + 1;
      mem.str.set(key, String(v));
      return v;
    }
    case 'EXPIRE':
      mem.exp.set(key, Date.now() + Number(a[0]) * 1000);
      return 1;
    case 'MGET':
      return [key, ...a].map((k) => (alive(String(k)) ? mem.str.get(String(k)) : null));
    case 'LPUSH':
      mem.list.set(key, [String(a[0]), ...list]);
      return list.length + 1;
    case 'LLEN':
      return list.length;
    case 'LRANGE':
      return list.slice(Number(a[0]), Number(a[1]) === -1 ? undefined : Number(a[1]) + 1);
    case 'LREM': {
      const i = list.indexOf(String(a[1]));
      if (i >= 0) list.splice(i, 1);
      mem.list.set(key, list);
      return i >= 0 ? 1 : 0;
    }
    case 'LTRIM':
      mem.list.set(key, list.slice(0, Number(a[1]) + 1));
      return 'OK';
    case 'HINCRBY': {
      const h = mem.hash.get(key) ?? new Map();
      h.set(String(a[0]), (h.get(String(a[0])) ?? 0) + Number(a[1]));
      mem.hash.set(key, h);
      return h.get(String(a[0]));
    }
    case 'HGETALL':
      return [...(mem.hash.get(key) ?? new Map())].flatMap(([k, v]) => [k, String(v)]);
    case 'ZADD': {
      // ZADD key [LT] score member
      const lt = a[0] === 'LT';
      const [score, member] = lt ? [Number(a[1]), String(a[2])] : [Number(a[0]), String(a[1])];
      const z = mem.zset.get(key) ?? new Map();
      const cur = z.get(member);
      if (!lt || cur === undefined || score < cur) z.set(member, score);
      mem.zset.set(key, z);
      return cur === undefined ? 1 : 0;
    }
    case 'ZRANGE': {
      const sorted = [...(mem.zset.get(key) ?? new Map())].sort((x, y) => x[1] - y[1]);
      return sorted.slice(Number(a[0]), Number(a[1]) + 1).flatMap(([m, s]) => [m, String(s)]);
    }
  }
  return null;
}
