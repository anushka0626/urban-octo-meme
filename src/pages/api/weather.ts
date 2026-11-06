// Weather where the visitor is, for the taskbar clock flyout.
// Location comes from Vercel's approximate IP geo headers (no permission prompt),
// or from ?lat=&lon= when the visitor clicks "use my location". Weather: Open-Meteo (free, no key).
import type { APIRoute } from 'astro';

export const prerender = false;

const json = (body: unknown, cache = 'private, max-age=600') =>
  new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': cache } });

export const GET: APIRoute = async ({ request, url }) => {
  const h = request.headers;
  const qLat = url.searchParams.get('lat');
  const qLon = url.searchParams.get('lon');
  const lat = Number(qLat ?? h.get('x-vercel-ip-latitude'));
  const lon = Number(qLon ?? h.get('x-vercel-ip-longitude'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (!qLat && !h.get('x-vercel-ip-latitude'))) {
    return json({ located: false }, 'no-store');
  }
  const decode = (v: string | null) => {
    try {
      return v ? decodeURIComponent(v) : null;
    } catch {
      return v;
    }
  };
  try {
    const api = new URL('https://api.open-meteo.com/v1/forecast');
    api.search = new URLSearchParams({
      latitude: lat.toFixed(2),
      longitude: lon.toFixed(2),
      current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m',
      timezone: 'auto',
    }).toString();
    const res = await fetch(api);
    if (!res.ok) throw new Error(String(res.status));
    const w = (await res.json()) as {
      timezone: string;
      current: { temperature_2m: number; apparent_temperature: number; weather_code: number; is_day: number; wind_speed_10m: number };
    };
    return json({
      located: true,
      city: qLat ? null : decode(h.get('x-vercel-ip-city')),
      country: qLat ? null : h.get('x-vercel-ip-country'),
      tz: w.timezone,
      temp: w.current.temperature_2m,
      feels: w.current.apparent_temperature,
      code: w.current.weather_code,
      isDay: w.current.is_day === 1,
      wind: w.current.wind_speed_10m,
    });
  } catch {
    return json({ located: true, error: true }, 'no-store');
  }
};
