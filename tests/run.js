#!/usr/bin/env node
/* LINESIDE test runner.
 *
 *   node tests/run.js                    run every suite
 *   node tests/run.js smoke gating       run the named suites
 *   node tests/run.js --list             list the suites
 *   options: --seed=N (random policy + game randomness) · --headed · --fonts=cache|block|offline · --verbose · --grep=text
 *
 * Prints a PASS/FAIL table, writes tests/out/results.json and tests/out/results.txt, and exits 1 if anything FAILed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('./lib/harness');

const ORDER = ['smoke', 'playthrough', 'gating', 'reachability', 'save', 'layout', 'performance', 'screenshots'];
const SUITES = new Proxy({}, { get: (o, n) => typeof n === 'string' && ORDER.includes(n) ? (o[n] = o[n] || require('./suites/' + n)) : undefined, has: (o, n) => ORDER.includes(n) });
const CHECK_TIMEOUT = +(process.env.LS_CHECK_TIMEOUT || 420000);

const args = process.argv.slice(2), names = [];
for (const a of args) {
  if (a === '--list') { for (const n of ORDER) console.log(n.padEnd(14) + SUITES[n].about); process.exit(0); }
  else if (a === '--headed') H.opts.headed = true;
  else if (a === '--verbose' || a === '-v') H.opts.verbose = true;
  else if (a.startsWith('--seed=')) H.opts.seed = +a.slice(7);
  else if (a.startsWith('--fonts=')) H.opts.fonts = a.slice(8);
  else if (a.startsWith('--grep=')) H.opts.grep = a.slice(7).toLowerCase();
  else if (a.startsWith('--rev=')) H.opts.rev = a.slice(6);
  else if (a.startsWith('-')) { console.error('unknown option ' + a); process.exit(2); }
  else if (!ORDER.includes(a)) { console.error(`unknown suite "${a}". Suites: ${ORDER.join(', ')}`); process.exit(2); }
  else names.push(a);
}
if (H.opts.seed == null) H.opts.seed = Math.floor(Math.random() * 1e6);
const run = names.length ? ORDER.filter(n => names.includes(n)) : ORDER;

// --rev=<git revision>: test a committed build (exported read-only with `git archive` into tests/out/rev-<sha>),
// e.g. while the working tree is half-way through an edit.
if (H.opts.rev) {
  const { execFileSync } = require('child_process');
  const sha = execFileSync('git', ['-C', H.ROOT, 'rev-parse', '--short', H.opts.rev]).toString().trim();
  const dir = path.join(H.OUT, 'rev-' + sha);
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    fs.mkdirSync(dir, { recursive: true });
    const tar = execFileSync('git', ['-C', H.ROOT, 'archive', '--format=tar', sha], { maxBuffer: 1 << 30 });
    execFileSync('tar', ['-x', '-C', dir], { input: tar });
  }
  H.opts.url = 'file://' + path.join(dir, 'index.html');
  H.opts.revLabel = `${H.opts.rev} (${sha})`;
}

// A small result collector used by every check.
class Result {
  constructor() { this.fails = []; this.warns = []; this.info = []; this.notes = []; this.status = null; }
  fail(m) { this.fails.push(m); return false; }
  warn(m) { this.warns.push(m); }
  log(m) { this.info.push(m); }
  note(m) { this.notes.push(m); }
  ok(cond, m) { if (!cond) this.fail(m); return !!cond; }
  skip(m) { this.status = 'SKIP'; this.notes.push(m); }
}

const results = [];
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${Math.round(ms / 1000)}s`)), ms))]);

async function check(suite, name, viewport, fn) {
  if (H.opts.grep && !(`${suite} ${name} ${viewport || ''}`).toLowerCase().includes(H.opts.grep)) return null;
  const r = new Result(), t0 = Date.now();
  if (process.stdout.isTTY) process.stdout.write(`  … ${suite} · ${name}${viewport ? ' · ' + viewport : ''}`);
  try { await withTimeout(Promise.resolve(fn(r)), CHECK_TIMEOUT, 'check'); }
  catch (e) {
    r.fail(e.message.split('\n')[0]);
    if (e.dump) r.log('state when it failed: ' + JSON.stringify(e.dump));
    if (H.opts.verbose && e.stack) r.log(e.stack);
  }
  const status = r.status || (r.fails.length ? 'FAIL' : r.warns.length ? 'WARN' : 'PASS');
  const row = { suite, check: name, viewport: viewport || '', status, ms: Date.now() - t0, notes: r.notes, fails: r.fails, warns: r.warns, info: r.info };
  results.push(row);
  process.stdout.write(`${process.stdout.isTTY ? '\r' : ''}  ${status.padEnd(4)} ${suite} · ${name}${viewport ? ' · ' + viewport : ''} (${(row.ms / 1000).toFixed(1)}s)\n`);
  if (H.opts.verbose) for (const l of [...r.fails, ...r.warns, ...r.info]) console.log('       ' + l);
  return row;
}

function table() {
  const cols = [['Suite', 12], ['Check', 44], ['Viewport', 8], ['Result', 6], ['Time', 7], ['Notes', 0]];
  const fit = (s, w) => { s = String(s); return w ? (s.length > w ? s.slice(0, w - 1) + '…' : s.padEnd(w)) : s; };
  const lines = [cols.map(([h, w]) => fit(h, w)).join('  '), cols.map(([, w]) => '-'.repeat(w || 40)).join('  ')];
  for (const r of results) {
    const note = r.notes.join('; ') || r.fails[0] || r.warns[0] || '';
    lines.push([fit(r.suite, 12), fit(r.check, 44), fit(r.viewport, 8), fit(r.status, 6), fit((r.ms / 1000).toFixed(1) + 's', 7), note.length > 110 ? note.slice(0, 109) + '…' : note].join('  '));
  }
  return lines.join('\n');
}
function details() {
  const out = [];
  for (const r of results) {
    if (r.status === 'PASS' && !H.opts.verbose && !r.info.length) continue;
    if (r.status === 'PASS' && !H.opts.verbose) continue;
    out.push(`\n[${r.status}] ${r.suite} · ${r.check}${r.viewport ? ' · ' + r.viewport : ''}`);
    for (const f of r.fails) out.push('  ✗ ' + f.split('\n').join('\n    '));
    for (const w of r.warns) out.push('  ! ' + w.split('\n').join('\n    '));
    for (const i of r.info) out.push('  · ' + i.split('\n').join('\n    '));
  }
  return out.join('\n');
}

(async () => {
  fs.mkdirSync(H.OUT, { recursive: true });
  const started = new Date();
  console.log(`LINESIDE tests · ${started.toISOString().replace('T', ' ').slice(0, 19)} · ${H.opts.url}${H.opts.revLabel ? ' · git ' + H.opts.revLabel : ' · working tree'}`);
  console.log(`suites: ${run.join(', ')} · seed ${H.opts.seed} · fonts ${H.opts.fonts}\n`);
  let crashed = null;
  // Preflight: if the game doesn't even boot, say so once instead of timing out in every check.
  const boot = await check('preflight', 'game boots to the title screen', 'desktop', async r => {
    const P = await H.openPage({ viewport: 'desktop' });
    try { await H.load(P.page); r.ok(!P.errors.some(e => e.startsWith('page error')), 'JS errors while booting:\n' + H.fmtErrors(P.errors)); }
    finally { await P.close(); }
  });
  if (boot.status === 'FAIL') { run.length = 0; console.log('\nThe game does not boot, so no suites were run. (Mid-edit working tree? Try --rev=HEAD.)'); }
  try {
    for (const n of run) {
      const S = SUITES[n];
      await S.run({ check: (name, vp, fn) => check(n, name, vp, fn), H, seed: H.opts.seed });
    }
  } catch (e) { crashed = e; console.error('\nrunner error: ' + (e.stack || e)); }
  finally { await H.closeBrowser(); }

  const counts = results.reduce((a, r) => (a[r.status] = (a[r.status] || 0) + 1, a), {});
  const summary = `${results.length} checks · ${['PASS', 'WARN', 'FAIL', 'SKIP'].filter(s => counts[s]).map(s => `${counts[s]} ${s}`).join(' · ')} · ${((Date.now() - started) / 1000).toFixed(0)}s · seed ${H.opts.seed}`;
  const text = `\n${table()}\n${details()}\n\n${summary}\n`;
  console.log(text);
  fs.writeFileSync(path.join(H.OUT, 'results.txt'), `LINESIDE tests · ${started.toISOString()} · ${H.opts.url}${H.opts.revLabel ? ' · git ' + H.opts.revLabel : ''}\n${text}`);
  fs.writeFileSync(path.join(H.OUT, 'results.json'), JSON.stringify({ started, url: H.opts.url, rev: H.opts.revLabel || null, seed: H.opts.seed, suites: run, counts, results }, null, 2));
  process.exit(crashed || counts.FAIL ? 1 : 0);
})();
