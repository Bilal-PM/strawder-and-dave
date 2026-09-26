/* reachability: breadth-first search over world.canStand.
 *   · outdoors, from the spawn point, with and without PPE: can the player get within interaction range of every
 *     visible entity (and, with PPE, of the task entities that appear later: defects etc.)?
 *   · inside each room, from the point a door drops you: every entity in the room, including the exit.
 *   · every door's arrival point is free ground, and each room's exit lands somewhere reachable from the spawn.
 * Also reports entities that are reachable but can never be the thing you interact with (always shadowed by a nearer one).
 * The start points, room sizes and entity positions all come from the running game. */
'use strict';
const H = require('../lib/harness');

const STEP_OUT = 6, STEP_IN = 4;
const fmt = it => `${it.kind}:${it.id} @${it.x},${it.y}${it.hidden ? ' (hidden at start)' : ''}${it.closest == null ? '' : ''}`;

module.exports = {
  name: 'reachability',
  about: 'BFS over world.canStand from the spawn to every outdoor entity (with/without PPE), and from each room entry to everything inside.',
  async run(t) {
    let P = null, spawn = null, outdoor = null, reachedNoPpe = null;
    const ensure = async () => {
      if (P) return;
      P = await H.openPage({ viewport: 'desktop', policySeed: t.seed });
      spawn = await H.newGame(P.page);
      outdoor = await P.page.evaluate(() => __T.outdoorRoom());
    };
    try {
      for (const ppe of [false, true]) {
        await t.check(`outdoors from the spawn, ${ppe ? 'with' : 'without'} PPE`, 'desktop', async r => {
          await ensure();
          const res = await P.page.evaluate(([o, ppe, step]) => {
            const M = LS.WORLD.MAP, w = __T.W();
            const vis = __T.reach({ room: o, ppe, step, x: w.player.x, y: w.player.y, W: M.W, H: M.H, includeHidden: ppe });
            // the first objective (and the door to its room) must be reachable before anyone has PPE
            const tg = LS.game.currentTarget(); let first = null;
            if (tg) { if (tg.room === o) { const e = __T.targetEntity(tg); first = e && e.id; } else { const d = __T.doorTowards(o, tg.room); first = d && d.id; } }
            // points each room's exit drops you at
            const exits = w.entities.filter(e => { const t = __T.doorDest(e); return t && t.room === o && e.room !== o; }).map(e => { const t = __T.doorDest(e); return { id: e.id, room: e.room, x: t.x, y: t.y }; });
            const g = __T.bfs({ room: o, ppe, step, x: w.player.x, y: w.player.y, W: M.W, H: M.H });
            const ex = exits.map(e => ({ id: e.id, room: e.room, free: !__T.standWith(e.x, e.y, ppe), reached: g.near ? g.near({ x: e.x, y: e.y }, step * 2).length > 0 : false }));
            return { vis, first, firstTask: tg && tg.task.id, exits: ex, spawn: [Math.round(w.player.x), Math.round(w.player.y)] };
          }, [outdoor, ppe, STEP_OUT]);
          if (!r.ok(!res.vis.startBlocked, `the spawn point ${res.spawn} is not free ground (${res.vis.startBlocked})`)) return;
          const items = res.vis.items, un = items.filter(i => !i.reachable), shadow = items.filter(i => i.reachable && !i.focusable && !i.hidden);
          r.log(`BFS reached ${res.vis.reached} points (step ${STEP_OUT}) from the spawn ${res.spawn}; ${items.length} entities checked`);
          // sanity check on the tool itself: PPE opens the closed line, so it must add ground
          if (ppe && reachedNoPpe != null) r.ok(res.vis.reached > reachedNoPpe, `BFS sanity: PPE should open extra ground (${res.vis.reached} vs ${reachedNoPpe} points without)`);
          if (!ppe) reachedNoPpe = res.vis.reached;
          if (ppe) {
            for (const i of un) r.fail(`unreachable with PPE: ${fmt(i)} "${i.prompt}"`);
          } else {
            const firstUn = un.find(i => i.id === res.first);
            r.ok(!firstUn, `the first objective (${res.firstTask}) is out of reach without PPE: ${firstUn && fmt(firstUn)}`);
            for (const i of un.filter(i => i.id !== res.first)) r.log(`reachable only with PPE: ${fmt(i)} "${i.prompt}"`);
          }
          // Each room's exit must land the player on free ground they could have walked to. Without PPE this only
          // applies to rooms whose door is itself reachable without PPE.
          for (const e of res.exits) {
            const door = items.find(i => i.to === e.room);
            if (!ppe && door && !door.reachable) { r.log(`${e.id}: its room is PPE-only, so its landing point is only checked with PPE`); continue; }
            r.ok(e.free, `the ${e.id} exit drops the player on blocked ground`); r.ok(e.reached, `the ${e.id} exit drops the player somewhere cut off from the spawn`);
          }
          for (const i of shadow) r.warn(`${fmt(i)} "${i.prompt}" is reachable but never the nearest thing to interact with (always shadowed)`);
          r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
          r.note(`${items.length - un.length}/${items.length} entities reachable${un.length ? (ppe ? ' · unreachable: ' : ' · PPE-only: ') + un.map(i => i.kind + ':' + i.id).join(', ') : ''}${ppe ? ' (incl. task entities hidden at start)' : ''}`);
        });
      }

      await t.check('inside every room, from its entry point', 'desktop', async r => {
        await ensure();
        const rooms = await P.page.evaluate(step => {
          const w = __T.W(), R = LS.WORLD.ROOMS, out = [];
          for (const [id, rm] of Object.entries(R)) {
            const doors = w.entities.filter(e => { const t = __T.doorDest(e); return t && t.room === id; });
            if (!doors.length) { out.push({ id, noDoor: true }); continue; }
            for (const d of doors) {
              const to = __T.doorDest(d);
              const res = __T.reach({ room: id, ppe: true, step, x: to.x, y: to.y, W: rm.w, H: rm.h, includeHidden: true });
              out.push({ id, door: d.id, entry: [Math.round(to.x), Math.round(to.y)], res });
            }
          }
          return out;
        }, STEP_IN);
        let total = 0, ok = 0;
        for (const rm of rooms) {
          if (rm.noDoor) { r.fail(`room ${rm.id} has no door leading into it`); continue; }
          if (!r.ok(!rm.res.startBlocked, `${rm.door} drops the player on blocked ground in ${rm.id} at ${rm.entry} (${rm.res.startBlocked})`)) continue;
          const items = rm.res.items; total += items.length;
          for (const i of items) { if (i.reachable) ok++; else r.fail(`${rm.id}: unreachable from the entry: ${fmt(i)} "${i.prompt}"`); }
          r.ok(items.some(i => i.to && i.reachable), `${rm.id}: no reachable way out`);
          for (const i of items.filter(i => i.reachable && !i.focusable && !i.hidden)) r.warn(`${rm.id}: ${fmt(i)} "${i.prompt}" is reachable but always shadowed by a nearer entity`);
          r.log(`${rm.id} (via ${rm.door} → ${rm.entry}): ${items.filter(i => i.reachable).length}/${items.length} reachable, BFS ${rm.res.reached} points`);
        }
        r.ok(P.errors.length === 0, 'JS errors:\n' + H.fmtErrors(P.errors));
        r.note(`${rooms.length} rooms · ${ok}/${total} entities reachable from the entry point`);
      });
    } finally { if (P) await P.close(); }
  }
};
