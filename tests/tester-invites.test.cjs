// Tester invite generator (src/dev/testerInvites.js): no network, pure text/HTML.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const inv = require('../src/dev/testerInvites.js');

const HEADER = 'accountId,email,password,uid,handle,displayName';
const CSV = `${HEADER}\ntester01,tester01@us.test,void-echo-12,u1,tester01,Tester 01\ntester02,tester02@us.test,mint-rose-34,u2,tester02,Anna, the tester\n`;
const LINK = 'https://expo.dev/accounts/x/projects/us-mobile/builds/abc';
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'invites-'));

test('parses the provisioning CSV, incl. CRLF, BOM and commas in display names', () => {
  const rows = inv.parseCsv('﻿' + CSV.replace(/\n/g, '\r\n'));
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    accountId: 'tester01', email: 'tester01@us.test', password: 'void-echo-12',
    uid: 'u1', handle: 'tester01', displayName: 'Tester 01',
  });
  assert.equal(rows[1].displayName, 'Anna, the tester');
  assert.throws(() => inv.parseCsv('id,pw\nx,y'), /Unexpected CSV header/);
});

test('fills the message template; inviter handle gets exactly one @', () => {
  const [row] = inv.parseCsv(CSV);
  const msg = inv.renderMessage(inv.DEFAULT_TEMPLATE, row, { link: LINK, inviterHandle: '@@felix'.slice(1) });
  assert.match(msg, /Account ID: tester01\nPassword: void-echo-12/);
  assert.ok(msg.includes(LINK));
  assert.match(msg, /Add Friend → @felix$/m);
  assert.ok(!/\{\w+\}/.test(msg), 'no placeholders left');
  const noHandle = inv.renderMessage(inv.DEFAULT_TEMPLATE, row, { link: LINK });
  assert.match(noHandle, /Add Friend → type a friend's @handle/);
});

test('share links URL-encode the whole message (no raw newlines or spaces)', () => {
  const links = inv.shareLinks('line 1\nline 2 & more');
  for (const href of Object.values(links)) assert.ok(!/[\n ]/.test(href), href);
  assert.ok(links.sms.startsWith('sms:?&body=line%201%0Aline%202%20%26%20more'));
  assert.ok(links.email.startsWith('mailto:?subject='));
  assert.ok(links.whatsapp.startsWith('https://wa.me/?text='));
});

test('HTML escapes everything from the CSV (a password cannot inject markup)', () => {
  const evil = { accountId: 'tester03', password: '<script>alert(1)</script>', handle: 'x', displayName: '' };
  const html = inv.renderHtml([{ row: evil, message: `pw: ${evil.password}` }]);
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.equal((html.match(/class="card"/g) || []).length, 1);
  assert.match(html, /Contains passwords/);
});

test('--only / --skip select rows and reject unknown IDs', () => {
  const rows = inv.parseCsv(CSV);
  assert.deepEqual(inv.selectRows(rows, { only: ['tester02'] }).map((r) => r.accountId), ['tester02']);
  assert.deepEqual(inv.selectRows(rows, { skip: ['tester02'] }).map((r) => r.accountId), ['tester01']);
  assert.throws(() => inv.selectRows(rows, { only: ['tester99'] }), /Unknown account ID/);
});

test('finds the one credentials CSV and refuses to guess between several', () => {
  const dir = tmpDir();
  assert.throws(() => inv.findCsv(dir, {}), /No testers-credentials/);
  fs.writeFileSync(path.join(dir, 'testers-credentials-emulator.csv'), CSV);
  fs.writeFileSync(path.join(dir, 'testers-credentials-us-felix-test-20261030.csv'), CSV);
  assert.match(inv.findCsv(dir, {}), /us-felix-test/);
  assert.match(inv.findCsv(dir, { emulator: true }), /emulator\.csv$/);
  fs.writeFileSync(path.join(dir, 'testers-credentials.csv'), CSV);
  assert.throws(() => inv.findCsv(dir, {}), /Several credential files/);
});

test('requires an https install link', () => {
  assert.throws(() => inv.parseArgs([]), /--link/);
  assert.throws(() => inv.parseArgs(['--link', 'http://insecure.example']), /--link/);
  assert.throws(() => inv.parseArgs(['--link']), /needs a value/);
  assert.equal(inv.parseArgs(['--link', LINK]).link, LINK);
});

test('CLI: --print writes messages to stdout; HTML mode writes a private file', () => {
  const dir = tmpDir();
  const csv = path.join(dir, 'creds.csv');
  fs.writeFileSync(csv, CSV);
  const script = path.join(__dirname, '..', 'src', 'dev', 'testerInvites.js');
  const printed = execFileSync('node', [script, '--csv', csv, '--link', LINK, '--print', '--skip', 'tester01'], { encoding: 'utf8' });
  assert.match(printed, /===== tester02 =====/);
  assert.ok(!printed.includes('tester01@'), 'skipped tester not printed');
  const out = path.join(dir, 'invites.html');
  execFileSync('node', [script, '--csv', csv, '--link', LINK, '--out', out], { encoding: 'utf8' });
  const html = fs.readFileSync(out, 'utf8');
  assert.equal((html.match(/class="card"/g) || []).length, 2);
  if (process.platform !== 'win32') assert.equal(fs.statSync(out).mode & 0o777, 0o600);
});
