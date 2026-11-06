// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  // Replace with your real domain once it's connected (used for canonical/OG URLs).
  site: 'https://anushkakhot.vercel.app',
  // Every page is prerendered; only the small /api/* routes run as Vercel functions.
  output: 'static',
  adapter: vercel(),
  // the dev toolbar sits right on top of the taskbar
  devToolbar: { enabled: false },
  env: {
    schema: {
      SPOTIFY_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      SPOTIFY_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      SPOTIFY_REFRESH_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Guestbook storage: Upstash Redis (Vercel → Storage → Upstash adds the KV_* vars for you)
      KV_REST_API_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      KV_REST_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      UPSTASH_REDIS_REST_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      GUESTBOOK_ADMIN_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
