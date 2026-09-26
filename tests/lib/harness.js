/* LINESIDE test harness (Node side): browser, viewports, error capture, the font cache and the UI driver. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PW_PATH = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(PW_PATH);

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'tests', 'out');
const GAME_URL = process.env.LS_URL || 'file://' + path.join(ROOT, 'index.html');
const INPAGE = fs.readFileSync(path.join(__dirname, 'inpage.js'), 'utf8');
const FONT_RE = /^https?:\/\/fonts\.(googleapis|gstatic)\.com\//;
const FONT_CACHE = path.join(OUT, '.font-cache');

const VIEWPORTS = {
  desktop: { label: 'desktop 1440×900', ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
  mobile: { label: 'mobile 390×844 touch', ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } }
};
// Game settings used by most suites: instant text keeps runs fast, sound off keeps them quiet.
const FAST = { sound: false, instant: true, reduced: false, large: false };

const opts = { fonts: process.env.LS_FONTS || 'cache', headed: false, seed: null, verbose: false, url: GAME_URL };

// A tiny static server, so the game runs from a real http origin. (Under headless Chromium, file:// localStorage was
// occasionally wiped across a reload of the game page, which made save/resume tests flaky; over http it never is.)
const http = require('http');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
let server = null;
function serve(root) {
  return new Promise((res, rej) => {
    root = path.resolve(root);
    server = http.createServer((q, s) => {
      let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
      if (f.endsWith(path.sep)) f = path.join(f, 'index.html');
      if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404, { 'content-type': 'text/plain' }); return s.end('not found'); }
      s.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(s);
    });
    server.on('error', rej);
    server.listen(0, '127.0.0.1', () => res(`http://127.0.0.1:${server.address().port}/index.html`));
  });
}
function stopServer() { if (server) { server.close(); server = null; } }

let browser = null;
async function getBrowser() {
  if (!browser) browser = await chromium.launch({ headless: !opts.headed });
  return browser;
}
async function closeBrowser() { if (browser) { await browser.close().catch(() => { }); browser = null; } }

// Google Fonts go through a flaky proxy in the sandbox. We fetch each font file once, keep it in tests/out/.font-cache
// and serve it from there, so layout checks always see the same fonts. Failures are ignored (the page falls back).
async function fontRoute(route) {
  const url = route.request().url();
  if (opts.fonts === 'block') return route.abort();
  const key = crypto.createHash('sha1').update(url).digest('hex'), bodyF = path.join(FONT_CACHE, key + '.body'), metaF = path.join(FONT_CACHE, key + '.json');
  try {
    if (fs.existsSync(bodyF) && fs.existsSync(metaF)) { const m = JSON.parse(fs.readFileSync(metaF, 'utf8')); return await route.fulfill({ status: 200, headers: m.headers, body: fs.readFileSync(bodyF) }); }
    if (opts.fonts === 'offline') return await route.abort();
    for (let i = 0; i < 3; i++) {
      try {
        const resp = await route.fetch({ timeout: 15000 });
        const body = await resp.body();
        if (resp.ok() && body.length) {
          const h = resp.headers(), headers = {};
          for (const k of ['content-type', 'access-control-allow-origin', 'timing-allow-origin', 'cache-control']) if (h[k]) headers[k] = h[k];
          if (!headers['access-control-allow-origin']) headers['access-control-allow-origin'] = '*';
          fs.mkdirSync(FONT_CACHE, { recursive: true }); fs.writeFileSync(bodyF, body); fs.writeFileSync(metaF, JSON.stringify({ url, headers }));
          return await route.fulfill({ status: 200, headers, body });
        }
      } catch (e) { /* retry */ }
    }
    return await route.abort();
  } catch (e) { try { await route.abort(); } catch (e2) { } }
}

/* Open a fresh browser context + page with the in-page helpers and error capture.
 * o.viewport: 'desktop' | 'mobile' · o.settings: game settings to seed (null = leave the defaults) ·
 * o.gameSeed / o.policySeed: seeds for the game's Math.random and the test policy. */
async function openPage(o) {
  o = Object.assign({ viewport: 'desktop', settings: FAST, gameSeed: null, policySeed: 1 }, o || {});
  const b = await getBrowser();
  const vp = VIEWPORTS[o.viewport]; if (!vp) throw new Error('unknown viewport ' + o.viewport);
  const ctx = await b.newContext(Object.assign({ ignoreHTTPSErrors: true, acceptDownloads: true }, vp.ctx));
  await ctx.route(FONT_RE, fontRoute);
  const cfg = { settings: o.settings, gameSeed: o.gameSeed, policySeed: o.policySeed };
  await ctx.addInitScript({ content: `window.__T_CFG=${JSON.stringify(cfg)};\n${INPAGE}` });
  const page = await ctx.newPage();
  const errors = [], warnings = [], missing = [];
  const LOCAL_MISSING = /^file:|ERR_FILE_NOT_FOUND/;
  page.on('pageerror', e => errors.push(`page error: ${e.message}${e.stack ? '\n    ' + e.stack.split('\n').slice(1, 4).map(s => s.trim()).join('\n    ') : ''}`));
  page.on('console', m => {
    const loc = (m.location && m.location()) || {}, url = loc.url || '';
    if (FONT_RE.test(url) || /fonts\.(googleapis|gstatic)\.com/.test(m.text())) return;   // sandbox font failures are expected
    if (m.type() === 'error' && /ERR_FILE_NOT_FOUND|404/.test(m.text()) && url.startsWith(opts.url.replace(/[^/]*$/, ''))) return;   // counted once, as a missing file
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}${url ? ` (${url.replace(/^file:\/\/.*?\/strawder-and-dave\//, '')}:${loc.lineNumber})` : ''}`);
    else if (m.type() === 'warning') warnings.push(m.text());
  });
  // A missing local file (e.g. a script index.html references but nobody has committed yet) is its own kind of problem:
  // the smoke suite fails on it; other suites note it and carry on, so one missing file doesn't fail every check.
  page.on('requestfailed', r => {
    if (FONT_RE.test(r.url())) return;
    const t = (r.failure() || {}).errorText || '', base = opts.url.replace(/[^/]*$/, ''), f = r.url().startsWith(base) ? r.url().slice(base.length) : r.url();
    if (/^file:/.test(r.url()) && /FILE_NOT_FOUND/.test(t)) { if (!missing.includes(f)) missing.push(f); return; }
    // over http a 404'd script is also reported as an aborted request: count it once, as missing
    if (/ERR_ABORTED/.test(t) && r.url().startsWith(base)) { setTimeout(() => { if (!missing.includes(f)) errors.push(`request failed: ${r.url()} ${t}`); }, 100); return; }
    errors.push(`request failed: ${r.url()} ${t}`);
  });
  page.on('response', r => {
    if (r.status() < 400 || FONT_RE.test(r.url())) return;
    const base = opts.url.replace(/[^/]*$/, '');
    if (r.status() === 404 && r.url().startsWith(base)) { const f = r.url().slice(base.length); if (!missing.includes(f)) missing.push(f); return; }
    errors.push(`HTTP ${r.status()}: ${r.url()}`);
  });
  page.on('crash', () => errors.push('page crashed'));
  page.setDefaultTimeout(20000);
  page.__errors = errors;
  return { ctx, page, errors, warnings, missing, viewport: o.viewport, close: () => ctx.close().catch(() => { }) };
}

class BootError extends Error { }
async function load(page) {
  await page.goto(opts.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Wait for the title screen, but give up early if the game threw while booting.
  const t0 = Date.now();
  while (true) {
    const ok = await page.waitForFunction(() => window.__T && __T.ready() && document.querySelector('#title.on #tNew'), null, { timeout: 1000 }).then(() => true, () => false);
    if (ok) return;
    const errs = (page.__errors || []).filter(e => e.startsWith('page error'));
    if (errs.length && Date.now() - t0 > 1500) throw new BootError('the game did not boot: ' + errs[0].split('\n')[0]);
    if (Date.now() - t0 > 30000) throw new BootError('the title screen never appeared (30s)');
  }
}

// Free roam: the player can walk, the game accepts interactions, and the intro / cold open is over.
const FREE_ROAM = "st.k==='explore' && !!T.W().onInteract && T.S().introDone !== false";

class DriveError extends Error { constructor(msg, dump) { super(msg); this.dump = dump; } }

async function dump(page) { try { return await page.evaluate(() => __T.dump()); } catch (e) { return { error: String(e) }; } }

/* Drive the UI: look at the screen, act on it with a policy ('expert' | 'random'), wait for the screen to change.
 * stop: a JS expression evaluated in the page with (st, T), e.g. "st.k==='report'".
 * onScreen(st): optional hook called before each action (used for screenshots and layout audits). */
async function drive(page, o) {
  o = Object.assign({ policy: 'expert', stop: "st.k==='report'", maxSteps: 5000, timeoutMs: 300000, onScreen: null, trace: null }, o || {});
  const t0 = Date.now(); let stalls = 0, lastKey = null, sameKey = 0, steps = 0;
  while (true) {
    if (++steps > o.maxSteps) throw new DriveError(`gave up after ${o.maxSteps} steps`, await dump(page));
    if (Date.now() - t0 > o.timeoutMs) throw new DriveError(`timed out after ${Math.round(o.timeoutMs / 1000)}s`, await dump(page));
    if (o.onScreen) { const st = await page.evaluate(() => __T.state()); await o.onScreen(st); }
    const r = await page.evaluate(([p, s]) => __T.step(p, s), [o.policy, o.stop]);
    if (r.stop) return { steps, ms: Date.now() - t0, st: r.st };
    if (r.needCal) { await page.evaluate(() => __T.calibrate()); continue; }
    if (r.err) throw new DriveError(r.err, await dump(page));
    if (o.trace) o.trace.push(`${r.k}${r.act ? ': ' + r.act : ''}`);
    // An explore step that keeps choosing the same thing without the game moving on means we're stuck.
    if (r.k === 'explore' && r.key) {
      const key = r.key + '|' + r.st.graded + '|' + r.st.done.length + '|' + r.st.room;
      if (key === lastKey) { if (++sameKey >= 8) throw new DriveError(`stuck: interacting with ${r.key} again and again without progress (target ${r.target})`, await dump(page)); }
      else { lastKey = key; sameKey = 0; }
    }
    // The chapter card ignores taps for a moment, so re-tap it quickly; everything else gets 6s to react.
    const quick = r.k === 'chapter';
    try { await page.waitForFunction(s => __T.sig() !== s, r.sigBefore, { timeout: quick ? 1200 : 6000, polling: 'raf' }); stalls = 0; }
    catch (e) {
      if (/closed|crash/i.test(String(e))) throw e;
      if (++stalls >= (quick ? 15 : 6)) throw new DriveError(`stuck: the screen stopped changing (state ${r.k}${r.act ? ', last action ' + r.act : ''})`, await dump(page));
    }
  }
}

// New game from the title screen, then play through the chapter card, intro and tutorial until the player can walk.
async function newGame(page, o) {
  o = o || {};
  await load(page);
  await page.evaluate(() => __T.click(document.querySelector('#tNew')));
  await page.waitForSelector('#setup.on #pname', { state: 'visible' });
  await page.fill('#pname', o.name || 'Tester');
  await page.evaluate(() => __T.click(document.querySelector('#sGo')));
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await drive(page, { policy: o.policy || 'expert', stop: FREE_ROAM, timeoutMs: 90000 });
  return page.evaluate(() => { const w = __T.W(); return { room: w.room, x: w.player.x, y: w.player.y }; });
}

// Walk through doors until the player is in `room` (and the fade has finished).
async function gotoRoom(page, room, o) {
  o = o || {};
  for (let i = 0; i < 6; i++) {
    const cur = await page.evaluate(() => __T.W().room);
    if (cur === room) return true;
    const r = await page.evaluate(to => { const w = __T.W(), d = __T.doorTowards(w.room, to); if (!d) return { err: `no door path from ${w.room} to ${to}` }; __T.interact(d); return { id: d.id, hop: __T.doorDest(d).room }; }, room);
    if (r.err) throw new Error(r.err);
    // wait for this door's fade to finish, for something else (a refusal dialogue) to happen, or for the game to say nothing happened
    await page.waitForFunction(([to, id]) => { const w = __T.W(); return (w.room === to && !w.fadeDir) || __T.layersOn().length > 0 || __T.lastNoop === id; }, [r.hop, r.id], { timeout: 8000 });
    if (await page.evaluate(id => __T.lastNoop === id && (__T.lastNoop = null, true), r.id)) { if (o.allowRefusal) return false; throw new Error(`the door ${r.id} did nothing when used`); }
    const st = await page.evaluate(() => __T.state());
    if (st.k !== 'explore' && st.k !== 'fade') { if (o.allowRefusal) return false; await drive(page, { stop: "st.k==='explore'", timeoutMs: 30000 }); }
    await page.waitForFunction(() => !__T.W().fadeDir, null, { timeout: 8000 });
  }
  return page.evaluate(to => __T.W().room === to, room);
}

// Drive until a condition in the page is true (expression with st, T), e.g. "T.S().ppe && st.k==='explore'".
const until = (page, stop, o) => drive(page, Object.assign({ stop }, o || {}));

async function settle(page, timeout) {
  // wait for CSS animations in the visible layers to finish (and two frames to paint)
  await page.waitForFunction(() => __T.animsRunning() === 0, null, { timeout: timeout || 5000, polling: 'raf' }).catch(() => { });
  const f = await page.evaluate(() => __T.frames);
  await page.waitForFunction(f0 => __T.frames >= f0 + 2, f, { polling: 'raf' }).catch(() => { });
}

const fmtErrors = errs => errs.slice(0, 6).map(e => '  ' + e.split('\n').join('\n  ')).join('\n') + (errs.length > 6 ? `\n  …and ${errs.length - 6} more` : '');

module.exports = { serve, stopServer, FREE_ROAM, chromium, ROOT, OUT, GAME_URL, VIEWPORTS, FAST, opts, getBrowser, closeBrowser, openPage, load, drive, until, newGame, gotoRoom, settle, dump, DriveError, BootError, fmtErrors };
