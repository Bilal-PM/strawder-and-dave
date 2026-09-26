/* layout: on a phone, nothing in the visible layers overflows the viewport horizontally, the HUD never sits on top of
 * an open dialogue card, text isn't clipped, and every on-screen button in the top layer actually receives a tap.
 * Audits every distinct screen of an expert playthrough (plus the title, setup, the project board tabs and the report),
 * after CSS animations have settled. Mobile issues FAIL; the same audit on desktop is reported as WARN. */
'use strict';
const H = require('../lib/harness');

const TYPES = { 'h-overflow': 'overflows the viewport', 'page-overflow': 'page scrolls sideways', 'hud-overlap': 'HUD over dialogue', 'text-clipped': 'clipped text', 'text-offscreen': 'text off screen', covered: "button can't be tapped" };

async function auditAll(t, r, vp) {
  const P = await H.openPage({ viewport: vp, policySeed: t.seed, gameSeed: t.seed });
  const found = new Map();   // one entry per (type, element), with the screens it was seen on
  let screens = 0;
  const audit = async label => {
    await H.settle(P.page);
    const a = await P.page.evaluate(() => __T.audit());
    screens++;
    for (const i of a.issues) {
      const k = i.type + '|' + (i.el || '');
      if (!found.has(k)) found.set(k, Object.assign({ screens: [] }, i));
      const f = found.get(k); if (f.screens.length < 4 && !f.screens.includes(label)) f.screens.push(label);
    }
  };
  try {
    await H.load(P.page); await audit('title');
    await P.page.evaluate(() => __T.click(document.querySelector('#tNew')));
    await P.page.waitForSelector('#setup.on #pname', { state: 'visible' });
    await P.page.fill('#pname', 'Alexandra-Louise');   // the longest name the field allows (18)
    await audit('setup');
    await P.page.evaluate(() => { __T.click(document.querySelector('#sGo')); const a = document.activeElement; if (a && a.blur) a.blur(); });
    const seen = new Set(); let boardDone = false;
    const onScreen = async st => {
      if (['busy', 'fade', 'loading'].includes(st.k)) return;
      let key, label;
      if (st.k === 'explore') { key = 'explore:' + st.room + ':' + st.done.length; label = `free roam (${st.room})`; }
      else {
        const sig = await P.page.evaluate(() => __T.layersOn().map(id => __T.hash(document.getElementById(id).innerHTML.replace(/\d+/g, '#'))).join('|'));
        key = (vp === 'mobile' ? sig : st.k + ':' + (st.sub || '') + ':' + (st.tag || '').split('·')[0].trim());
        label = `${st.k}${st.sub ? '/' + st.sub : ''}${st.tag ? ' "' + st.tag.slice(0, 30) + '"' : ''}`;
      }
      if (seen.has(key)) return; seen.add(key);
      await audit(label);
      // once, in free roam: open the project board and audit every tab
      if (st.k === 'explore' && !boardDone && st.done.length >= 1) {
        boardDone = true;
        const tabs = await P.page.evaluate(() => { const m = document.querySelector('#hudMenu'); if (!m) return []; __T.click(m); return [...document.querySelectorAll('#board [data-tab]')].map(b => b.dataset.tab); });
        for (const tab of tabs) { await P.page.evaluate(k => __T.click(document.querySelector(`#board [data-tab="${k}"]`)), tab); await audit('board: ' + tab); }
        await P.page.evaluate(() => { const c = document.querySelector('#bClose'); if (c) __T.click(c); });
        await P.page.waitForFunction(() => !__T.on('board'));
      }
    };
    await H.drive(P.page, { policy: 'expert', stop: "st.k==='report'", onScreen, timeoutMs: 420000 });
    await audit('report');
    await P.page.evaluate(() => { const b = document.querySelector('#rNext'); if (b) __T.click(b); });
    await audit("what's next");
    const list = [...found.values()];
    for (const i of list) {
      const m = `${TYPES[i.type] || i.type}: ${i.el ? i.el + ' ' : ''}${i.msg} [on: ${i.screens.join('; ')}]`;
      if (vp === 'mobile') r.fail(m); else r.warn(m);
    }
    r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
    const byType = list.reduce((a, i) => (a[i.type] = (a[i.type] || 0) + 1, a), {});
    r.note(`${screens} screens audited · ${list.length ? Object.entries(byType).map(([k, v]) => `${v} ${TYPES[k] || k}`).join(', ') : 'no issues'}`);
  } finally { await P.close(); }
}

module.exports = {
  name: 'layout',
  about: "Mobile: nothing overflows horizontally, HUD never over a dialogue card, no clipped text, buttons tappable (desktop: same audit, WARN only).",
  async run(t) {
    // A negative control: plant problems on the title screen and make sure the audit reports them.
    await t.check('the audit catches planted problems (self-test)', 'mobile', async r => {
      const P = await H.openPage({ viewport: 'mobile' });
      try {
        await H.load(P.page);
        const a = await P.page.evaluate(() => {
          const t = document.querySelector('#title'), box = document.createElement('div');
          box.id = 'qaPlant'; box.innerHTML = '<div style="width:600px;height:10px"></div><p style="width:60px;height:14px;overflow:hidden;white-space:nowrap">A very long line of text that cannot fit</p><button id="qaBtn" style="position:fixed;left:10px;top:10px;width:80px;height:40px">Tap</button><div style="position:fixed;left:0;top:0;width:120px;height:80px;z-index:99"></div>';
          t.appendChild(box); const res = __T.audit(); box.remove(); return res.issues.map(i => i.type);
        });
        for (const ty of ['h-overflow', 'text-clipped', 'covered']) r.ok(a.includes(ty), `the audit did not report a planted "${ty}" problem (got: ${a.join(', ') || 'nothing'})`);
        r.note(`planted overflow, clipped text and a covered button: all ${a.length ? 'reported' : 'missed'}`);
      } finally { await P.close(); }
    });
    await t.check('every screen of a playthrough (FAIL on issues)', 'mobile', r => auditAll(t, r, 'mobile'));
    await t.check('every kind of screen (WARN on issues)', 'desktop', r => auditAll(t, r, 'desktop'));
  }
};
