/* Development-journey screenshots: capture any committed build (or the working tree) at the same views and sizes,
 * so each stage can be compared with the last.
 *
 *   node tools/journey/capture.js <id> [--rev=<git rev>] [--profile=auto|lineside] [--vp=desktop,mobile]
 *
 *   <id>        folder name, e.g. 14-tile-world. Raw frames go to tests/out/journey/<id>/<viewport>/ (git-ignored),
 *               with a contact sheet at tests/out/journey/index.html. Copy the keepers into docs/journey/.
 *   --rev       git revision to capture (exported read-only with git archive). Default: the working tree.
 *   --profile   lineside: the current tile world, at fixed views (title, cold open, depot, forecourt, office, the
 *               line, the crossing, the high street, the hall). auto: older builds; clicks through the menus and
 *               walks about. Default: lineside when the build has LS.WORLD, otherwise auto.
 *
 * Frames whose on-screen text contains a real organisation name or a retired character name are marked FLAG in the
 * log and in the file name, so they are never picked for a public post by accident.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const H = require('../../tests/lib/harness');

const args = process.argv.slice(2), opt = {};
for (const a of args) { const m = a.match(/^--([a-z]+)=(.*)$/); if (m) opt[m[1]] = m[2]; else opt.id = opt.id || a; }
if (!opt.id) { console.log('usage: node tools/journey/capture.js <id> [--rev=<git rev>] [--profile=auto|lineside] [--vp=desktop,mobile]'); process.exit(1); }
const VPS = (opt.vp || 'desktop,mobile').split(',');
const OUT = path.join(H.OUT, 'journey', opt.id);
const BANNED = /elaine|network rail|transport for london|\btfl\b|highways england|national highways|\bhs2\b|balfour|\bamey\b|siemens|alstom|hitachi|morgan sindall|\bkier\b|volkerrail|\bcolas\b|babcock|\bgtr\b|avanti|lner|northern rail|great western|crosscountry|limezu|kenney/i;

function exportRev(rev) {
  const sha = execSync(`git rev-parse --short ${rev}`, { cwd: H.ROOT }).toString().trim();
  const dir = path.join(H.OUT, 'journey', '.rev-' + sha);
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    fs.mkdirSync(dir, { recursive: true });
    execSync(`git archive ${sha} | tar -x -C "${dir}"`, { cwd: H.ROOT });
  }
  return { dir, sha };
}

/* Some older builds load a library from the jsdelivr CDN. Where the CDN is blocked, serve the same file from the npm
 * registry package instead (cached in tests/out/journey/.cdn/). */
async function cdnRoute(route) {
  const m = route.request().url().match(/\/npm\/((?:@[^/]+\/)?[^/@]+)@([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!m) return route.continue();
  const [, pkg, ver, file] = m, dir = path.join(H.OUT, 'journey', '.cdn', `${pkg.replace('/', '__')}@${ver}`), f = path.join(dir, 'package', file);
  try {
    if (!fs.existsSync(f)) {
      fs.mkdirSync(dir, { recursive: true });
      const tgz = execSync(`npm pack ${pkg}@${ver} --silent`, { cwd: dir }).toString().trim().split('\n').pop();
      execSync(`tar -xzf "${tgz}"`, { cwd: dir });
    }
    return route.fulfill({ status: 200, contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(f) });
  } catch (e) { return route.continue(); }
}

const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);

async function run() {
  const src = opt.rev ? exportRev(opt.rev) : { dir: H.ROOT, sha: 'worktree' };
  const url = await H.serve(src.dir);
  fs.rmSync(OUT, { recursive: true, force: true });
  const b = await H.getBrowser(), log = [];
  for (const vp of VPS) {
    const dir = path.join(OUT, vp); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext(Object.assign({ ignoreHTTPSErrors: true }, H.VIEWPORTS[vp].ctx));
    await ctx.route(H.FONT_RE, H.fontRoute);
    await ctx.route(/^https:\/\/cdn\.jsdelivr\.net\/npm\//, cdnRoute);
    // quiet, and no leftover saves between viewports
    await ctx.addInitScript(() => { try { if (!sessionStorage.__j) { localStorage.clear(); sessionStorage.__j = 1; } } catch (e) { } });
    const page = await ctx.newPage(); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    let n = 0, last = null;
    const shoot = async (name, o) => {
      await page.waitForTimeout((o && o.wait) || 700);
      const buf = await page.screenshot();
      if (last && buf.equals(last)) return;   // nothing changed
      last = buf;
      const text = await page.evaluate(() => document.body ? document.body.innerText : '').catch(() => '');
      const bad = (text.match(BANNED) || [])[0];
      const file = `${String(n++).padStart(2, '0')}-${slug(name)}${bad ? '-FLAG' : ''}.png`;
      fs.writeFileSync(path.join(dir, file), buf);
      log.push(`${vp}/${file}${bad ? `   FLAG: shows "${bad}"` : ''}`);
    };
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const profile = opt.profile || (await page.evaluate(() => !!(window.LS && LS.LEVEL && LS.WORLD && LS.WORLD.DOORS && LS.WORLD.DOORS.shed && LS.WORLD.tp && LS.game && LS.game.world)) ? 'lineside' : 'auto');
    try { await (profile === 'lineside' ? lineside : auto)(page, shoot); }
    catch (e) { log.push(`${vp}: stopped early: ${e.message.split('\n')[0]}`); await shoot('stopped').catch(() => { }); }
    if (errors.length) log.push(`${vp}: page errors: ${[...new Set(errors)].slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  await H.closeBrowser(); H.stopServer();
  fs.writeFileSync(path.join(OUT, 'log.txt'), `${opt.id} · ${src.sha}\n${log.join('\n')}\n`);
  try { contactSheet(); } catch (e) { /* another capture is writing at the same time; the next run rebuilds it */ }
  console.log(`${opt.id} (${src.sha}): ${log.filter(l => /\.png/.test(l)).length} frames → ${path.relative(H.ROOT, OUT)}`);
  for (const l of log) if (/FLAG|stopped|errors/.test(l)) console.log('  ' + l);
}

/* Older builds: click through the menus the way a first-time player would, then walk about. */
async function auto(page, shoot) {
  await shoot('title', { wait: 300 });
  const tries = {};
  for (let i = 0; i < 22; i++) {
    const did = await page.evaluate(tries => {
      const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && !el.disabled; };
      for (const inp of document.querySelectorAll('input[type=text], input:not([type])')) if (vis(inp) && !inp.value) { inp.value = 'Sam'; inp.dispatchEvent(new Event('input', { bubbles: true })); }
      const txt = b => (b.textContent || '').replace(/\s+/g, ' ').trim();
      const good = /^(new game|begin|start|play|next|continue|got it|let'?s go|ok\b|okay|i'?m ready|ready|go\b|take the job|take it|accept|lock it in|confirm|submit|tap to|click to|carry on|onward|done)|→|›/i;
      const bad = /setting|reset|restart|music|sound|audio|help|^\?$|team|share|download|csv|credit|delete|quit|menu|stats|mute|skip this phase|delegate|project|journal|board|profile|graduate|\bjp\b|^\d|iconbtn|hud|chip|♫|♪/i;
      const key = b => (txt(b) || b.className || 'button').slice(0, 30), fresh = b => (tries[key(b)] || 0) < 3;
      const all = [...document.querySelectorAll('button, .btn, [role=button], a.button')].filter(vis).filter(b => !bad.test(txt(b) + ' ' + (typeof b.className === 'string' ? b.className : '') + ' ' + (b.id || '')));
      let b = all.filter(fresh).find(b => good.test(txt(b)));
      if (!b) b = [...document.querySelectorAll('.choices button, .choice, .ch, .opt, .dc, .option')].filter(vis).filter(fresh)[0];
      if (!b) b = all.filter(fresh)[0];
      if (b) { b.click(); return key(b); }
      return null;
    }, tries);
    if (did) tries[did] = (tries[did] || 0) + 1;
    else {
      await page.keyboard.press('Enter'); await page.waitForTimeout(250); await page.keyboard.press('Space');
      const vp = page.viewportSize(); await page.mouse.click(vp.width / 2, vp.height * 0.8);
    }
    await shoot(did ? 'click-' + did : 'key');
  }
  for (const [k, ms] of [['ArrowRight', 900], ['ArrowDown', 700], ['ArrowLeft', 1400], ['ArrowUp', 900], ['KeyD', 900], ['KeyS', 700]]) {
    await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k);
    await shoot('walk');
  }
}

/* The tile world (claude/lineside-chapter-1 and later): the same ten views every time. */
async function lineside(page, shoot) {
  await shoot('title', { wait: 300 });
  await page.evaluate(() => document.getElementById('tNew').click());
  await page.fill('#pname', 'Sam');
  await page.evaluate(() => document.getElementById('sGo').click());
  await shoot('chapter-card', { wait: 1600 });
  await page.evaluate(() => document.getElementById('chapter').click());
  const adv = async n => {
    for (let i = 0; i < n; i++) {
      const st = await page.evaluate(() => ({ ex: document.body.classList.contains('exploring'), ch: !!document.querySelector('#talk.on .choices button') }));
      if (st.ex) return;
      if (st.ch) await page.evaluate(() => document.querySelector('#talk .choices button').click());
      else await page.evaluate(() => { const t = document.querySelector('#talk.on > *'); if (t) { t.click(); t.click(); } });
      await page.waitForTimeout(200);
    }
  };
  const until = async (fn, tries) => { for (let i = 0; i < (tries || 60); i++) { if (await page.evaluate(fn)) return true; await page.waitForTimeout(250); } return false; };
  await adv(20); await shoot('sunday-arrival', { wait: 900 });
  await page.evaluate(() => { const w = LS.game.world(), d = LS.WORLD.DOORS.shed; w.walkTo(d.x, d.y, null); });
  await until(() => LS.game.world().room === 'shed');
  await shoot('depot-by-torchlight', { wait: 1100 });
  for (let k = 0; k < 3; k++) {
    await page.evaluate(() => { const w = LS.game.world(), e = w.entities.find(e => e.kind === 'find' && !e.found && !e.hidden); if (e) { w.player.x = e.sx; w.player.y = e.sy; w.focus = e; w.onInteract(e); } });
    await page.waitForTimeout(300); await adv(4);
  }
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => document.body.classList.contains('exploring') && LS.game.S().introDone)) break; await adv(1); await page.waitForTimeout(100); }
  await shoot('monday-forecourt', { wait: 1000 });
  await page.evaluate(() => { const w = LS.game.world(), d = LS.WORLD.DOORS.office; w.player.x = d.x - 40; w.player.y = d.y + 30; w.snapCam(); });
  await shoot('compound-office-door', { wait: 900 });
  await page.evaluate(() => { const w = LS.game.world(), d = LS.WORLD.DOORS.office; w.walkTo(d.x, d.y, null); });
  if (!await until(() => LS.game.world().room === 'office', 30)) await page.evaluate(() => { const w = LS.game.world(), e = LS.LEVEL.rooms.office.enter_at, p = LS.WORLD.tp(e[0], e[1] - 1); w.place('office', p.x, p.y, 'up'); });
  await shoot('office-interior', { wait: 1000 });
  const at = async (room, tx, ty, face, name) => {
    await page.evaluate(([room, tx, ty, face]) => { const w = LS.game.world(), p = LS.WORLD.tp(tx, ty); w.place(room, p.x, p.y, face); }, [room, tx, ty, face]);
    await shoot(name, { wait: 1000 });
  };
  await page.evaluate(() => { const S = LS.game.S(); S.ppe = true; S.done.induction = true; S.flags.walkOn = true; LS.game.refreshWorld(); });
  await at('outside', 80, 22, 'right', 'the-line-beck-bridge');
  await at('outside', 103, 23, 'right', 'level-crossing');
  await at('outside', 40, 57, 'down', 'high-street');
  await at('shed', 15, 9, 'up', 'depot-interior-marjorie');
  await at('hall', 13, 10, 'up', 'village-hall');
}

function contactSheet() {
  const root = path.join(H.OUT, 'journey'), ids = fs.readdirSync(root).filter(d => !d.startsWith('.') && fs.statSync(path.join(root, d)).isDirectory()).sort();
  const sec = ids.map(id => {
    const vps = fs.readdirSync(path.join(root, id)).filter(v => fs.statSync(path.join(root, id, v)).isDirectory());
    return `<h2>${id}</h2>` + vps.map(v => `<h3>${v}</h3><div class=g>` + fs.readdirSync(path.join(root, id, v)).filter(f => f.endsWith('.png')).sort()
      .map(f => `<figure><img src="${id}/${v}/${f}" loading=lazy><figcaption>${f}</figcaption></figure>`).join('') + '</div>').join('');
  }).join('');
  fs.writeFileSync(path.join(root, 'index.html'), `<!doctype html><meta charset=utf-8><title>Journey frames</title><style>body{font:14px system-ui;margin:16px;background:#f5f3ee}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}img{width:100%;border:1px solid #ccc}figcaption{font-size:12px;color:#555}</style>${sec}`);
}

run().catch(e => { console.error(e); H.stopServer(); H.closeBrowser().then(() => process.exit(1)); });
