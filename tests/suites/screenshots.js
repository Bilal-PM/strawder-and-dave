/* screenshots: play Chapter 1 (expert policy) on desktop and mobile and save the first instance of every kind of
 * screen to tests/out/screens/<viewport>/, plus a contact sheet at tests/out/screens/index.html. */
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('../lib/harness');

const DIR = path.join(H.OUT, 'screens');
const safe = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

async function shoot(t, r, vp) {
  const dir = path.join(DIR, vp);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const P = await H.openPage({ viewport: vp, policySeed: t.seed, gameSeed: t.seed });
  const shots = []; let n = 0;
  const snap = async (key, label) => {
    await H.settle(P.page);
    const file = `${String(n++).padStart(2, '0')}_${safe(key)}.png`;
    await P.page.screenshot({ path: path.join(dir, file) });
    shots.push({ file, label });
  };
  try {
    await H.load(P.page); await snap('title', 'Title');
    await P.page.evaluate(() => __T.click(document.querySelector('#tNew')));
    await P.page.waitForSelector('#setup.on #pname', { state: 'visible' });
    await P.page.fill('#pname', 'Sam'); await snap('setup', 'Setup');
    await P.page.evaluate(() => { __T.click(document.querySelector('#sGo')); const a = document.activeElement; if (a && a.blur) a.blur(); });
    const seen = new Set(); let board = false;
    const onScreen = async st => {
      if (['busy', 'fade', 'loading', 'report'].includes(st.k)) return;
      const tag = (st.tag || '').split('·')[0].trim();
      const key = st.k === 'explore' ? 'explore-' + st.room : `${st.k}${st.sub ? '-' + st.sub : ''}${tag ? '-' + tag : ''}`;
      if (seen.has(key)) return; seen.add(key);
      await snap(key, st.k === 'explore' ? `Free roam: ${st.room}` : `${st.k}${st.sub ? ' (' + st.sub + ')' : ''}${st.tag ? ': ' + st.tag : ''}`);
      if (st.k === 'explore' && !board && st.done.length >= 1) {
        board = true;
        await P.page.evaluate(() => { const m = document.querySelector('#hudMenu'); if (m) __T.click(m); });
        await snap('board', 'Project board');
        await P.page.evaluate(() => { const c = document.querySelector('#bClose'); if (c) __T.click(c); });
        await P.page.waitForFunction(() => !__T.on('board'));
      }
    };
    await H.drive(P.page, { policy: 'expert', stop: "st.k==='report'", onScreen, timeoutMs: 420000 });
    await snap('report', 'Report (top)');
    for (const [f, lbl] of [[0.45, 'middle'], [1, 'bottom']]) {
      await P.page.evaluate(q => { const el = document.querySelector('#report'); el.scrollTop = (el.scrollHeight - el.clientHeight) * q; }, f);
      await snap('report-' + lbl, `Report (${lbl})`);
    }
    await P.page.evaluate(() => { const b = document.querySelector('#rNext'); if (b) __T.click(b); });
    await snap('whats-next', "What's next");
    r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
    r.note(`${shots.length} screenshots in tests/out/screens/${vp}/`);
    return shots;
  } finally { await P.close(); }
}

function contactSheet(all) {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sec = Object.entries(all).map(([vp, shots]) => `<h2>${esc(vp)}</h2><div class="g ${vp}">${shots.map(s => `<figure><a href="${vp}/${s.file}"><img loading="lazy" src="${vp}/${s.file}" alt="${esc(s.label)}"></a><figcaption>${esc(s.file.slice(0, 2))} · ${esc(s.label)}</figcaption></figure>`).join('')}</div>`).join('');
  fs.writeFileSync(path.join(DIR, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LINESIDE screenshots</title>
<style>:root{color-scheme:light dark}body{font:14px system-ui,sans-serif;margin:0 16px 40px;background:Canvas;color:CanvasText}h1{font-size:20px}h2{font-size:16px;margin-top:28px}
.g{display:grid;gap:14px}.g.desktop{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}.g.mobile{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
figure{margin:0}img{width:100%;border:1px solid #8884;border-radius:6px;display:block}figcaption{font-size:12px;opacity:.75;margin-top:4px}</style>
<h1>LINESIDE screenshots · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}</h1>${sec}`);
}

module.exports = {
  name: 'screenshots',
  about: 'Plays Chapter 1 and saves every kind of screen for desktop and mobile into tests/out/screens/ (with a contact sheet).',
  async run(t) {
    const all = {};
    for (const vp of ['desktop', 'mobile']) await t.check('key screens of Chapter 1', vp, async r => { all[vp] = await shoot(t, r, vp); });
    if (Object.keys(all).length) contactSheet(all);
  }
};
