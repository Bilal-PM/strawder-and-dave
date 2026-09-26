/* performance: sample requestAnimationFrame for 5 seconds in free roam outdoors and inside the depot, on desktop and
 * mobile, and report the average and 95th-percentile frame time.
 * Budgets: FAIL if the average frame is slower than 50 ms (under 20 fps); WARN if the average is over 20 ms or the
 * 95th percentile over 33.4 ms (dropping below 30 fps). Headless Chromium renders in software, so treat the numbers
 * as a relative baseline between builds rather than what a player's device will see. */
'use strict';
const H = require('../lib/harness');

const SECONDS = +(process.env.LS_PERF_SECONDS || 5);

// rAF deltas for `secs` seconds, plus Chrome's own main-thread counters over the same window (CDP Performance domain):
// in headless Chromium rAF is capped at 60 Hz, so the busy time per frame is what shows the real headroom.
async function sample(page, cdp, secs) {
  const get = async () => { const m = await cdp.send('Performance.getMetrics'); return Object.fromEntries(m.metrics.map(x => [x.name, x.value])); };
  const m0 = await get();
  const d = await page.evaluate(ms => new Promise(res => {
    const d = []; let last = null, start = null;
    const f = t => { if (last != null) d.push(t - last); else start = t; last = t; if (t - start < ms) requestAnimationFrame(f); else res(d); };
    requestAnimationFrame(f);
  }), secs * 1000);
  const m1 = await get(), per = k => +((((m1[k] || 0) - (m0[k] || 0)) * 1000) / Math.max(1, d.length)).toFixed(2);
  const s = stats(d); s.busy = per('TaskDuration'); s.script = per('ScriptDuration'); s.heapMB = +((m1.JSHeapUsedSize || 0) / 1048576).toFixed(1);
  return s;
}
// Other work on a shared machine can spoil one window, so a sample over budget is taken again once and the better kept.
const over = s => s.avg > 20 || s.p95 > 33.4 || s.busy > 12;
async function measure(page, cdp, secs) {
  const a = await sample(page, cdp, secs); if (!over(a)) return a;
  const b = await sample(page, cdp, secs); const best = (b.avg + b.busy < a.avg + a.busy) ? b : a; best.resampled = true; return best;
}
function stats(d) {
  const s = d.slice().sort((a, b) => a - b), n = s.length, avg = d.reduce((a, b) => a + b, 0) / n;
  const p = q => s[Math.min(n - 1, Math.floor(q * n))];
  return { frames: n, avg: +avg.toFixed(2), p50: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), max: +s[n - 1].toFixed(2), fps: +(1000 / avg).toFixed(1), long: d.filter(x => x > 50).length };
}

module.exports = {
  name: 'performance',
  about: 'requestAnimationFrame sampled for 5 s outdoors and in the depot (desktop + mobile): average and 95th-percentile frame time.',
  async run(t) {
    for (const vp of ['desktop', 'mobile']) {
      await t.check(`frame times outdoors and in the depot (${SECONDS}s each)`, vp, async r => {
        const P = await H.openPage({ viewport: vp, policySeed: t.seed });
        try {
          const cdp = await P.ctx.newCDPSession(P.page); await cdp.send('Performance.enable');
          await H.newGame(P.page);
          await H.settle(P.page);
          const outRoom = await P.page.evaluate(() => __T.W().room);
          const out = await measure(P.page, cdp, SECONDS);
          await H.until(P.page, "T.S().ppe && st.k==='explore'", { timeoutMs: 60000 });
          const dep = await P.page.evaluate(() => __T.depotRoom());
          await H.gotoRoom(P.page, dep);
          await H.settle(P.page);
          const inn = await measure(P.page, cdp, SECONDS);
          const res = { [`outdoors (${outRoom})`]: out, [`depot (${dep})`]: inn };
          for (const [where, s] of Object.entries(res)) {
            r.log(`${where}: avg ${s.avg} ms · p50 ${s.p50} · p95 ${s.p95} · max ${s.max} · ${s.fps} fps · ${s.long} frames over 50 ms · ${s.frames} frames · main thread busy ${s.busy} ms/frame (script ${s.script}) · JS heap ${s.heapMB} MB${s.resampled ? ' (re-sampled once: the first window was over budget)' : ''}`);
            if (s.busy > 12) r.warn(`${where}: the main thread is busy ${s.busy} ms per frame, leaving little headroom in a 16.7 ms frame`);
            if (s.avg > 50) r.fail(`${where}: average frame ${s.avg} ms (${s.fps} fps) is over the 50 ms budget`);
            else if (s.avg > 20 || s.p95 > 33.4) r.warn(`${where}: average ${s.avg} ms, p95 ${s.p95} ms (budget: avg ≤ 20 ms, p95 ≤ 33.4 ms)`);
          }
          r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
          r.note(`outdoors avg ${out.avg} / p95 ${out.p95} ms, busy ${out.busy} ms/frame · depot avg ${inn.avg} / p95 ${inn.p95} ms, busy ${inn.busy} ms/frame`);
          t.perf = t.perf || {}; t.perf[vp] = res;
        } finally { await P.close(); }
      });
    }
  }
};
