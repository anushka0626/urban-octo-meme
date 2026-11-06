// One-time helper: get a Spotify refresh token for the "now playing" gadget.
//
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/spotify-auth.mjs
//
// In your Spotify app's settings, add this Redirect URI exactly:
//   http://127.0.0.1:8888/callback
import http from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error('Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first (see README).');
  process.exit(1);
}

const redirect = 'http://127.0.0.1:8888/callback';
const auth = new URL('https://accounts.spotify.com/authorize');
auth.search = new URLSearchParams({
  client_id: id,
  response_type: 'code',
  redirect_uri: redirect,
  scope: 'user-read-currently-playing user-read-playback-state',
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', redirect);
  if (url.pathname !== '/callback') return res.writeHead(404).end();
  const code = url.searchParams.get('code');
  if (!code) {
    res.end(`Spotify said: ${url.searchParams.get('error') ?? 'no code'}`);
    return server.close();
  }
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirect }),
  });
  const json = await tokenRes.json();
  if (!json.refresh_token) {
    console.error('Token exchange failed:', json);
    res.end('Something went wrong, check the terminal.');
  } else {
    // save it straight into .env
    const line = `SPOTIFY_REFRESH_TOKEN=${json.refresh_token}`;
    const env = existsSync('.env') ? readFileSync('.env', 'utf8') : '';
    writeFileSync('.env', /^SPOTIFY_REFRESH_TOKEN=.*$/m.test(env) ? env.replace(/^SPOTIFY_REFRESH_TOKEN=.*$/m, line) : `${env.trimEnd()}\n${line}\n`);
    console.log('\n✅ Saved SPOTIFY_REFRESH_TOKEN to .env. Add the same value on Vercel too (keep it secret!).\n');
    res.end('Done! ✿ You can close this tab.');
  }
  server.close();
});

server.listen(8888, '127.0.0.1', () => {
  console.log('Open this link, log in to Spotify and click "Agree":\n');
  console.log(auth.toString() + '\n');
});
