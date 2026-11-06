// Approve or delete guestbook notes.
//
//   npm run guestbook                 → list notes waiting for approval
//   npm run guestbook -- approve <id>
//   npm run guestbook -- delete <id>  (works for pending and published notes)
//   npm run guestbook -- published    → list published notes
//
// Needs GUESTBOOK_ADMIN_TOKEN in .env (the same value you set on Vercel),
// and SITE_URL (defaults to the live site in astro.config.mjs; use http://localhost:4321 for dev).
const token = process.env.GUESTBOOK_ADMIN_TOKEN;
const site = (process.env.SITE_URL ?? 'https://anushkakhot.vercel.app').replace(/\/$/, '');
if (!token) {
  console.error('Set GUESTBOOK_ADMIN_TOKEN in .env first (see README).');
  process.exit(1);
}
const api = `${site}/api/guestbook`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
const [cmd = 'pending', id] = process.argv.slice(2);

const show = (notes) => {
  if (!notes.length) return console.log('  (none)');
  for (const n of notes) {
    console.log(`  [${n.id}] ${n.name} · ${new Date(n.ts).toLocaleString()}${n.pixels ? ' · 🎨 drawing' : ''}`);
    if (n.message) console.log(`         “${n.message}”`);
  }
};

if (cmd === 'approve' || cmd === 'delete') {
  if (!id) throw new Error(`usage: npm run guestbook -- ${cmd} <id>`);
  const res = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ action: cmd, id }) });
  const json = await res.json();
  console.log(json.ok ? `✅ ${cmd}d ${id}` : `❌ ${json.error ?? res.status}`);
} else {
  const res = await fetch(api, { headers });
  const json = await res.json();
  if (!json.pending) {
    console.error('Not authorised: check that GUESTBOOK_ADMIN_TOKEN matches the one on the server.');
    process.exit(1);
  }
  if (cmd === 'published') {
    console.log(`Published notes (${json.entries.length}):`);
    show(json.entries);
  } else {
    console.log(`Waiting for approval (${json.pending.length}):`);
    show(json.pending);
    if (json.pending.length) console.log('\nApprove with: npm run guestbook -- approve <id>');
  }
}
