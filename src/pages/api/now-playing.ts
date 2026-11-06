// What Anushka is listening to on Spotify right now.
// Runs on the server (Vercel function) so the client secret never reaches the browser.
import type { APIRoute } from 'astro';
import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } from 'astro:env/server';

export const prerender = false;

interface Track {
  playing: boolean;
  title: string;
  artist: string;
  album: string;
  art: string | null;
  url: string;
  id: string;
  progress: number;
  duration: number;
}

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expires > Date.now()) return cachedToken.value;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: SPOTIFY_REFRESH_TOKEN! }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expires: Date.now() + (json.expires_in - 60) * 1000 };
  return json.access_token;
}

const json = (body: unknown, maxAge = 30) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      // Vercel's CDN caches this, so Spotify is asked at most ~twice a minute no matter the traffic.
      'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
    },
  });

export const GET: APIRoute = async () => {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    return json({ playing: false, configured: false }, 300);
  }
  try {
    const token = await accessToken();
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 204 = nothing playing
    if (res.status === 204 || !res.ok) return json({ playing: false, configured: true });
    const now = await res.json();
    const item = now?.item;
    if (!item || now.currently_playing_type !== 'track') return json({ playing: false, configured: true });
    const track: Track = {
      playing: Boolean(now.is_playing),
      title: item.name,
      artist: item.artists.map((a: { name: string }) => a.name).join(', '),
      album: item.album.name,
      // smallest image ≥ 64px is plenty: it gets pixelated anyway
      art: item.album.images?.at(-1)?.url ?? item.album.images?.[0]?.url ?? null,
      url: item.external_urls.spotify,
      id: item.id,
      progress: now.progress_ms ?? 0,
      duration: item.duration_ms ?? 0,
    };
    return json({ ...track, configured: true });
  } catch {
    return json({ playing: false, configured: true, error: true }, 15);
  }
};
