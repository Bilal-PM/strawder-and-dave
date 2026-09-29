#!/usr/bin/env node
/* LINESIDE — browser smoke test for the AI tutor, run from file:// in headless Chromium (Playwright).
 *
 *   node tests/ai/browser_smoke.js
 *
 * Checks, in a real browser and with no network:
 *   1. The scripted tutor works from file:// with the pack loaded.
 *   2. The 'echo' backend starts in a Blob CLASSIC worker from file:// (transport === 'worker'),
 *      reports progress, and round-trips lines through the full realise/validate pipeline.
 *   3. With useWorker:false the same backend runs on the main thread.
 *   4. A 'webllm' provider whose module URL can't be fetched fails cleanly and the tutor stays scripted.
 *   5. What the device reports (WebGPU adapter, Cache API, OPFS) and the tier the tutor would pick.
 * It never downloads a model. Uses $PLAYWRIGHT_PATH (default /opt/node22/lib/node_modules/playwright).
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright';
let chromium;
try { ({ chromium } = require(PW)); } catch (e) { console.log('SKIP: Playwright not found at ' + PW); process.exit(0); }

const repo = path.resolve(__dirname, '../..');
const src = (p) => 'file://' + path.join(repo, p);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lineside-ai-'));
const page = path.join(dir, 'smoke.html');
fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><title>AI smoke</title>
<script src="${src('js/packs/kestrel-vale.js')}"></script>
<script src="${src('js/ai/worker.js')}"></script>
<script src="${src('js/ai/tutor.js')}"></script>
<script>
window.__run = async function () {
  const AI = LS.AI, out = {};
  await AI.init({ seed: 1 });
  const a = await AI.say('jo', { answer: 'The critical path is the longest task.' });
  out.scripted = { intent: a.intent, source: a.source, text: a.text };
  const prog = [];
  const s = await AI.init({ provider: 'echo', optIn: true, warmup: true, onStatus: st => prog.push(st.state + ':' + st.progress.toFixed(2)) });
  out.echoStatus = { state: s.state, transport: s.transport, warmupMs: s.stats.warmupMs };
  out.progress = prog;
  const b = await AI.say('moira', { answer: 'Once the plan is agreed it is fixed.' });
  out.echo = { intent: b.intent, source: b.source, text: b.text };
  const c = await AI.coach({ question: 'testStart', answer: 'week 20', hintsGiven: 0 });
  out.coach = { source: c.source, text: c.text };
  const m = await AI.init({ provider: 'echo', optIn: true, useWorker: false, warmup: false });
  out.mainThread = { state: m.state, transport: m.transport };
  const w = await AI.init({ provider: 'webllm', optIn: true, moduleUrl: { webllm: 'https://127.0.0.1:9/nope.js' }, warmup: false, loadTimeoutMs: 15000 });
  out.webllmUnreachable = { state: w.state, reason: w.reason.slice(0, 80) };
  const d = await AI.say('jo', { answer: 'dunno' });
  out.afterFail = { source: d.source, intent: d.intent };
  const caps = await AI.detect();
  out.caps = caps; out.tier = AI.selectTier(caps, {});
  try { await caches.open('x'); out.cacheApi = true; } catch (e) { out.cacheApi = false; }
  try { await navigator.storage.getDirectory(); out.opfs = true; } catch (e) { out.opfs = false; }
  out.optInStored = (() => { try { return localStorage.getItem('lineside_ai'); } catch (e) { return 'n/a'; } })();
  return out;
};
</script>`);

(async () => {
  let fails = 0;
  const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails++; };
  for (const args of [[], ['--enable-unsafe-webgpu']]) {
    const browser = await chromium.launch({ args });
    const p = await browser.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e)));
    await p.goto('file://' + page);
    const r = await p.evaluate(() => window.__run());
    console.log(`\nChromium ${browser.version()} ${args.join(' ') || '(default flags)'}`);
    check(r.scripted.source === 'scripted' && r.scripted.intent === 'probe', 'scripted from file://: ' + r.scripted.text);
    check(r.echoStatus.state === 'ready' && r.echoStatus.transport === 'worker', 'echo backend in a Blob classic worker from file:// (' + JSON.stringify(r.echoStatus) + ')');
    check(r.progress.some((x) => /^downloading:0\.[1-9]/.test(x)), 'progress reported: ' + r.progress.slice(0, 6).join(' '));
    check(r.echo.source === 'model' && r.echo.intent === 'probe', 'line realised through the worker: ' + r.echo.text);
    check(!/28/.test(r.coach.text), 'coach hint does not leak: ' + r.coach.text);
    check(r.mainThread.state === 'ready' && r.mainThread.transport === 'main-thread', 'main-thread fallback');
    check(r.webllmUnreachable.state === 'failed', 'unreachable runtime fails cleanly: ' + r.webllmUnreachable.reason);
    check(r.afterFail.source === 'scripted', 'still scripted after failure');
    check(errors.length === 0, 'no page errors ' + errors.join(' | '));
    console.log('       caps: ' + JSON.stringify(r.caps));
    console.log('       tier: ' + JSON.stringify(r.tier) + ' cacheApi=' + r.cacheApi + ' opfs=' + r.opfs + ' stored=' + r.optInStored);
    await browser.close();
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`\nAI browser smoke: ${fails ? fails + ' failed' : 'all passed'}`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
