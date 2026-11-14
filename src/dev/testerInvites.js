/**
 * Turn the tester credentials CSV + an APK install link into ready-to-send
 * invite messages — one per tester, with one-tap SMS / email / WhatsApp / copy.
 *
 *   node src/dev/testerInvites.js --link https://expo.dev/.../builds/<id>
 *   node src/dev/testerInvites.js --link <url> --handle @felix --only tester01,tester02
 *   node src/dev/testerInvites.js --link <url> --print            # plain text to stdout
 *
 * Options
 *   --link <https url>    APK install link (EAS build page / internal-distribution link). Required.
 *   --csv <path>          credentials CSV; default: the single testers-credentials*.csv in the
 *                         repo root (the emulator one only with --emulator).
 *   --handle <@handle>    your handle, so the message says who to add first.
 *   --only a,b / --skip a,b   pick account IDs (e.g. skip ones used for testing).
 *   --template <file>     message text with {link} {accountId} {password} {handle} {inviterHandle}.
 *   --out <file>          HTML output; default testers-invites.html (gitignored — it holds passwords).
 *   --print               print the messages instead of writing HTML.
 *
 * Nothing is sent and nothing goes over the network: you press the buttons.
 * The output contains passwords — delete it once the invites are out.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const CSV_HEADER = 'accountId,email,password,uid,handle,displayName';

const DEFAULT_TEMPLATE = `Hi! You're invited to test "us" — a small app for seeing friends nearby (Android only, trusted testers).

1. Open this link on your Android phone and install the app:
{link}
(Android will ask you to allow installs from your browser — allow it; the app isn't in the Play Store yet.)

2. Open us and sign in:
Account ID: {accountId}
Password: {password}

3. Settings → My Account: set your display name and change your password (there's no email reset, so remember it).
4. Chats → Add Friend → {inviterHandle}

Messages are end-to-end encrypted: never uninstall the app, or your old messages are gone for good. New versions install over the old one.
Tell me what breaks — screenshots help!`;

/** Parse the provisioning CSV (no quoting; displayName may contain commas). */
function parseCsv(text) {
  const lines = text.replace(/^﻿/, '').trim().split(/\r?\n/);
  if (lines[0].trim() !== CSV_HEADER) {
    throw new Error(`Unexpected CSV header: "${lines[0]}" (expected "${CSV_HEADER}")`);
  }
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const [accountId, email, password, uid, handle, ...rest] = line.split(',');
      return { accountId, email, password, uid, handle, displayName: rest.join(',') };
    });
}

function renderMessage(template, row, { link, inviterHandle }) {
  const values = {
    link,
    accountId: row.accountId,
    password: row.password,
    handle: row.handle ? `@${row.handle.replace(/^@/, '')}` : '',
    inviterHandle: inviterHandle ? `@${inviterHandle.replace(/^@/, '')}` : "type a friend's @handle",
  };
  return template.replace(/\{(link|accountId|password|handle|inviterHandle)\}/g, (_, k) => values[k]);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shareLinks(message) {
  const body = encodeURIComponent(message);
  return {
    // "?&body=" is understood by both Android and iOS Messages.
    sms: `sms:?&body=${body}`,
    email: `mailto:?subject=${encodeURIComponent('Your invite to test us')}&body=${body}`,
    whatsapp: `https://wa.me/?text=${body}`,
  };
}

function renderHtml(invites) {
  const cards = invites
    .map(({ row, message }) => {
      const links = shareLinks(message);
      const id = escapeHtml(row.accountId);
      return `
  <section class="card" data-id="${id}">
    <header>
      <h2>${id}</h2>
      <label class="sent"><input type="checkbox" data-sent> sent</label>
    </header>
    <input class="note" data-note placeholder="Given to… (only saved in this browser)">
    <textarea readonly rows="14">${escapeHtml(message)}</textarea>
    <nav>
      <button type="button" data-copy>Copy</button>
      <a href="${escapeHtml(links.sms)}">SMS</a>
      <a href="${escapeHtml(links.email)}">Email</a>
      <a href="${escapeHtml(links.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
    </nav>
  </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>us tester invites</title>
<style>
  :root { color-scheme: dark; --void:#0F1115; --fog:#F2F4F6; --signal:#2E5CFF; --mint:#00E096; --rose:#F472B6; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; background: var(--void); color: var(--fog); font: 15px/1.45 Inter, system-ui, sans-serif; }
  main { max-width: 720px; margin: 0 auto; display: grid; gap: 16px; }
  .warn { border: 1px solid var(--rose); border-radius: 16px; padding: 12px 16px; background: rgba(244,114,182,.08); }
  .card { border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 16px; background: rgba(255,255,255,.04); display: grid; gap: 10px; }
  .card.done { opacity: .55; }
  header { display: flex; align-items: center; justify-content: space-between; }
  h1 { font-size: 20px; margin: 0; } h2 { font-size: 17px; margin: 0; }
  textarea, .note { width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.25); color: var(--fog); padding: 10px; font: inherit; }
  textarea { resize: vertical; font-size: 13px; }
  nav { display: flex; flex-wrap: wrap; gap: 8px; }
  nav a, nav button { flex: 1 1 120px; text-align: center; padding: 10px 12px; border-radius: 12px; border: 0; background: var(--signal); color: #fff; font: 600 14px Inter, system-ui, sans-serif; text-decoration: none; cursor: pointer; }
  nav button { background: rgba(255,255,255,.12); }
  .sent { display: flex; gap: 6px; align-items: center; color: var(--mint); }
</style>
</head>
<body>
<main>
  <h1>us — tester invites (${invites.length})</h1>
  <p class="warn"><strong>Contains passwords.</strong> Send each card to one person only, never post this
  file or the whole list anywhere, and delete it once the invites are out. "Sent" ticks and notes are
  only stored in this browser.</p>
${cards}
</main>
<script>
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} };
  document.querySelectorAll('.card').forEach((card) => {
    const id = card.dataset.id;
    const sent = card.querySelector('[data-sent]');
    const note = card.querySelector('[data-note]');
    sent.checked = store('invite-sent:' + id) === '1';
    note.value = store('invite-note:' + id) || '';
    card.classList.toggle('done', sent.checked);
    sent.addEventListener('change', () => { store('invite-sent:' + id, sent.checked ? '1' : '0'); card.classList.toggle('done', sent.checked); });
    note.addEventListener('input', () => store('invite-note:' + id, note.value));
    card.querySelector('[data-copy]').addEventListener('click', async (e) => {
      const text = card.querySelector('textarea').value;
      try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied ✓'; }
      catch { card.querySelector('textarea').select(); e.target.textContent = 'Press Ctrl+C'; }
      setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
    });
  });
</script>
</body>
</html>
`;
}

/** Pick rows by --only / --skip (comma-separated account IDs). */
function selectRows(rows, { only, skip }) {
  const onlySet = only ? new Set(only) : null;
  const skipSet = new Set(skip ?? []);
  const unknown = [...(onlySet ?? []), ...skipSet].filter((id) => !rows.some((r) => r.accountId === id));
  if (unknown.length) throw new Error(`Unknown account ID(s): ${unknown.join(', ')}`);
  return rows.filter((r) => (!onlySet || onlySet.has(r.accountId)) && !skipSet.has(r.accountId));
}

function findCsv(dir, { emulator }) {
  const all = fs.readdirSync(dir).filter((f) => /^testers-credentials.*\.csv$/.test(f));
  const candidates = all.filter((f) => /emulator/.test(f) === Boolean(emulator));
  if (candidates.length === 1) return path.join(dir, candidates[0]);
  if (candidates.length === 0) {
    throw new Error(
      `No ${emulator ? 'emulator ' : ''}testers-credentials*.csv in ${dir}` +
        (all.length ? ` (found: ${all.join(', ')})` : '') +
        ' — run src/dev/provisionTesters.js first, or pass --csv <path>.'
    );
  }
  throw new Error(`Several credential files: ${candidates.join(', ')} — pick one with --csv <path>.`);
}

function parseArgs(argv) {
  const opts = { only: null, skip: null, print: false, emulator: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      return v;
    };
    if (a === '--link') opts.link = next();
    else if (a === '--csv') opts.csv = next();
    else if (a === '--handle') opts.inviterHandle = next();
    else if (a === '--only') opts.only = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--skip') opts.skip = next().split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--template') opts.template = next();
    else if (a === '--out') opts.out = next();
    else if (a === '--print') opts.print = true;
    else if (a === '--emulator') opts.emulator = true;
    else throw new Error(`Unknown option ${a}`);
  }
  if (!opts.link || !/^https:\/\/\S+$/.test(opts.link)) {
    throw new Error('--link <https://…> is required (the APK install link from EAS).');
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const csvPath = opts.csv ? path.resolve(opts.csv) : findCsv(REPO_ROOT, opts);
  const rows = selectRows(parseCsv(fs.readFileSync(csvPath, 'utf8')), opts);
  if (rows.length === 0) throw new Error('No testers selected.');
  const template = opts.template ? fs.readFileSync(opts.template, 'utf8') : DEFAULT_TEMPLATE;
  const invites = rows.map((row) => ({
    row,
    message: renderMessage(template, row, { link: opts.link, inviterHandle: opts.inviterHandle }),
  }));

  if (opts.print) {
    for (const { row, message } of invites) {
      console.log(`===== ${row.accountId} =====\n${message}\n`);
    }
    return;
  }
  const out = path.resolve(opts.out ?? path.join(REPO_ROOT, 'testers-invites.html'));
  fs.writeFileSync(out, renderHtml(invites), { encoding: 'utf8', mode: 0o600 });
  console.log(`✅ ${invites.length} invite(s) from ${path.basename(csvPath)} → ${out}`);
  console.log('   Open it in a browser (on your phone for SMS). It contains passwords — delete it when done.');
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  DEFAULT_TEMPLATE,
  parseCsv,
  renderMessage,
  renderHtml,
  shareLinks,
  selectRows,
  findCsv,
  parseArgs,
  escapeHtml,
};
