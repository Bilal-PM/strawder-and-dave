#!/usr/bin/env node
/* LINESIDE — tests for the AI tutor (js/ai/tutor.js + js/ai/worker.js). Node only, no browser, no network.
 *
 *   node tests/ai/test_tutor.js            # all
 *   node tests/ai/test_tutor.js classifier # only tests whose name contains "classifier"
 *
 * Covers: the classifier (all five misconceptions, negation, correct answers), the output filter
 * (banned names, the blocked first name, safety, length), the scripted provider (variety, slot-filling,
 * persona voice, history, safety routing), CPM facts, coaching without leaks, tier selection, and a
 * mock LLM provider that exercises prompt building, JSON parsing, retries, timeouts and fallback.
 */
'use strict';
const path = require('path');
const assert = require('assert');

// Load the pack first (as index.html does) so the tutor syncs with the real works plan.
global.window = globalThis;
require(path.join(__dirname, '../../js/packs/kestrel-vale.js'));
require(path.join(__dirname, '../../js/ai/worker.js'));
const AI = require(path.join(__dirname, '../../js/ai/tutor.js'));

const only = process.argv[2] || '';
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
const BASE = { seed: 7, deadlineMs: 400, callTimeoutMs: 150, retries: 1, warmup: false };

// A mock LLM provider. `script` is a list of functions (messages, opts) -> string | Promise | throw.
function mockProvider(script, extra) {
  const calls = [];
  AI.registerProvider('mock', () => Object.assign({
    name: 'mock', supportsSchema: true,
    load: (onProgress) => { onProgress && onProgress({ progress: 0.5 }); onProgress && onProgress({ progress: 1 }); return Promise.resolve({ ok: true }); },
    generate: (messages, o) => {
      calls.push({ messages, o });
      const step = script.length > 1 ? script.shift() : script[0];
      try { return Promise.resolve(step(messages, o)); } catch (e) { return Promise.reject(e); }
    },
    transport: 'direct'
  }, extra || {}));
  return calls;
}
const draftOf = (messages) => { const m = /«([^»]*)»\s*$/.exec(messages[messages.length - 1].content); return m ? m[1] : ''; };
const words = (s) => s.trim().split(/\s+/).length;

// ------------------------------------------------------------------------------------------------
test('classifier: detects each misconception from varied phrasings', () => {
  AI.init(BASE);
  const cases = {
    longest_task: ['The critical path is the longest task.', 'Just find the job that takes the longest, that one is critical.', 'The relay is the biggest job so it must be the critical path', 'whichever activity lasts longest'],
    more_people: ['If we fall behind we can add more people and it will be quicker', 'Put extra gangs on the relay to finish early.', 'Double the crew and it takes half the time.', 'just throw more resource at it'],
    float_owned: ['The float belongs to Gaz because he owns that job.', 'Ruby’s eight weeks are the fitters’ float to spend.', 'The owner keeps the float for their own work'],
    fixed_plan: ['Once the plan is agreed it is fixed.', 'The plan is set in stone after the panel signs it.', 'Once it’s signed off, it’s final and we stick to it', 'The plan can’t change now'],
    cp_static: ['The critical path never changes.', 'The critical path stays the same the whole time', 'The track will always be the critical path.', 'critical path won’t move once we have it']
  };
  for (const [id, list] of Object.entries(cases)) {
    for (const a of list) {
      const c = AI.classify(a, 'project-planning');
      assert.ok(c.misconceptions.includes(id), `expected ${id} in "${a}", got ${JSON.stringify(c)}`);
      assert.ok(c.confidence >= 0.5, `confidence for "${a}"`);
    }
  }
});

test('classifier: negated misconceptions are not flagged, and count as understanding', () => {
  const cases = [
    ['It isn’t just the longest task, it’s the longest chain of dependent jobs.', 'longest_task', 'critical_path'],
    ['Adding people doesn’t always make it faster, some things have lead times.', 'more_people', 'resources'],
    ['It’s a myth that the critical path never changes.', 'cp_static', 'change'],
    ['The float belongs to the project, not to one person.', 'float_owned', 'float_shared'],
    ['People think the plan is fixed once agreed, but you re-plan as you learn.', 'fixed_plan', 'change']
  ];
  for (const [a, mc, facet] of cases) {
    const c = AI.classify(a);
    assert.ok(!c.misconceptions.includes(mc), `"${a}" wrongly flagged ${mc}: ${JSON.stringify(c)}`);
    assert.ok(c.understood.includes(facet), `"${a}" should show ${facet}: ${JSON.stringify(c.understood)}`);
  }
});

test('classifier: correct answers and nonsense', () => {
  const good = AI.classify('The critical path is the longest chain of dependent activities; anything on it has zero float, so it sets the finish date.');
  assert.deepStrictEqual(good.misconceptions, []);
  assert.ok(good.understood.includes('critical_path') && good.understood.includes('dependencies'));
  assert.ok(good.confidence >= 0.6);
  const fs = AI.classify('The brakes can’t start until the bogies are finished, that’s finish to start.');
  assert.ok(fs.understood.includes('fs') && fs.understood.includes('dependencies'));
  const fl = AI.classify('Ruby has float so she can slip a bit without moving the opening date.');
  assert.ok(fl.understood.includes('float'));
  const none = AI.classify('I had a lovely scone at the bakery.');
  assert.deepStrictEqual(none.misconceptions, []); assert.deepStrictEqual(none.understood, []);
  assert.ok(none.confidence < 0.5);
  // Similarity backup catches a paraphrase with no rule hit.
  const para = AI.classify('more fitters so Ruby done sooner');
  assert.ok(para.misconceptions.includes('more_people'), JSON.stringify(para));
});

// ------------------------------------------------------------------------------------------------
test('filter: blocks real organisations and the blocked first name, case-insensitively', () => {
  const bad = ['Network Rail would never allow it.', 'Ask TfL.', 'like transport for london does', 'HS2 had the same problem',
    'We could hire Balfour Beatty.', 'Put it in Primavera P6.', 'Elaine says hello', 'ELAINE', 'network-rail standards', 'Siemens trains'];
  for (const t of bad) {
    const f = AI.filter(t);
    assert.strictEqual(f.ok, false, `should block "${t}"`);
    assert.ok(f.reasons.some((r) => r.startsWith('banned')), t);
  }
  const fine = ['The outflow from the drain is blocked.', 'Harrowby Parish Council approves.', 'Ruby is a 1961 railcar.', 'Kestrel Vale Transport Authority', 'Plain old orr-ange', 'The caf is open'];
  for (const t of fine) assert.ok(AI.filter(t).ok, `should allow "${t}": ${JSON.stringify(AI.filter(t))}`);
  assert.deepStrictEqual(AI.bannedNames('Talk to Network Rail and TfL'), ['Network Rail', 'TfL']);
});

test('filter: generated safety advice, style, spelling, and length caps', () => {
  assert.ok(!AI.filter('Just walk along the track to check it.', { generated: true }).ok);
  assert.ok(!AI.filter('You don’t need PPE for that.', { generated: true }).ok);
  assert.ok(!AI.filter('As an AI language model I think so.', { generated: true }).ok);
  assert.ok(!AI.filter('the the the the plan', { generated: true }).ok);
  const long = AI.filter('One two three four five. Six seven eight nine ten eleven twelve. What do you think happens next?', { maxWords: 12 });
  assert.ok(words(long.text) <= 12 && /\?$/.test(long.text), long.text);
  assert.strictEqual(AI.filter('Jo: My favorite color is grey.').text, 'My favourite colour is grey.');
  const leak = AI.filter('It starts in week 28.', { leaks: [/\b28\b/] });
  assert.ok(!leak.ok && leak.reasons.includes('leak'));
});

// ------------------------------------------------------------------------------------------------
test('scripted: reacts to the misconception, echoes the learner, asks a question', async () => {
  AI.init(BASE);
  const r = await AI.say('jo', { answer: 'I reckon the critical path is the longest task on the board' });
  assert.strictEqual(r.source, 'scripted');
  assert.strictEqual(r.intent, 'probe');
  assert.strictEqual(r.misconception, 'longest_task');
  assert.ok(/\?/.test(r.text), r.text);
  assert.ok(words(r.text) <= 35, r.text);
  assert.ok(AI.filter(r.text).ok);
});

test('scripted: escalates strategy when the same misconception persists', async () => {
  AI.init(BASE);
  const a = 'More people always makes it faster.';
  const r1 = await AI.say('moira', { answer: a });
  const r2 = await AI.say('moira', { answer: a });
  const r3 = await AI.say('moira', { answer: a });
  const plans = AI.session('moira').history.map((h) => h.mc);
  assert.deepStrictEqual(plans, ['more_people', 'more_people', 'more_people']);
  assert.notStrictEqual(r1.text, r2.text); assert.notStrictEqual(r2.text, r3.text);
  assert.ok(/calendar|lead time|split|people/i.test(r2.text + r3.text), 'uses an example or the counter fact');
  assert.ok(/more people|creeping|still hearing|back at/i.test(r2.text), 'refers back to the history: ' + r2.text);
  // And when the learner comes round, it notices the change.
  const r4 = await AI.say('moira', { answer: 'Ah, adding people doesn’t always help, lead times don’t shrink.' });
  assert.ok(['praise', 'partial', 'teachback'].includes(r4.intent), r4.intent);
});

test('scripted: varied phrasing, no immediate repeats, persona voices differ', async () => {
  AI.init(Object.assign({}, BASE, { seed: 99 }));
  const answers = ['it depends which job has to finish first', 'the longest chain sets the date', 'float is spare time before the date moves',
    'you re-plan when things change', 'the order matters', 'drains before track'];
  const texts = [];
  for (let i = 0; i < 18; i++) texts.push((await AI.say('jo', { answer: answers[i % answers.length] })).text);
  const distinct = new Set(texts).size;
  assert.ok(distinct >= 14, `only ${distinct}/18 distinct lines`);
  for (let i = 1; i < texts.length; i++) assert.notStrictEqual(texts[i], texts[i - 1]);
  for (const t of texts) { assert.ok(AI.filter(t).ok, t); assert.ok(words(t) <= 35, t); }
  // Persona voice markers
  AI.init(Object.assign({}, BASE, { seed: 5 }));
  const gazLines = [], tomLines = [];
  for (let i = 0; i < 12; i++) {
    gazLines.push((await AI.say('gaz', { answer: answers[i % answers.length] })).text);
    tomLines.push((await AI.say('tom', { answer: answers[i % answers.length] })).text);
  }
  const gazMarks = AI.personas.gaz.openers.concat(AI.personas.gaz.praise, AI.personas.gaz.tics, AI.personas.gaz.thinking);
  assert.ok(gazLines.some((t) => gazMarks.some((m) => t.includes(m))), 'Gaz sounds like Gaz');
  assert.notDeepStrictEqual(gazLines, tomLines);
});

test('scripted: reproducible with a seed', async () => {
  const run = async () => { AI.init(Object.assign({}, BASE, { seed: 42 })); const out = []; for (const a of ['the plan is fixed once agreed', 'no idea', 'the longest chain']) out.push((await AI.say('jo', { answer: a })).text); return out; };
  assert.deepStrictEqual(await run(), await run());
});

test('scripted: clarify, redirect, teach-back, recap, open and discussion modes', async () => {
  AI.init(BASE);
  assert.strictEqual((await AI.say('jo', { answer: 'dunno' })).intent, 'clarify');
  assert.strictEqual((await AI.say('jo', { answer: 'Did you see the football last night?' })).intent, 'redirect');
  const tb = await AI.say('jo', { mode: 'teachback', topic: 'float' });
  assert.strictEqual(tb.intent, 'teachback'); assert.ok(/float/i.test(tb.text));
  const open = await AI.say('moira', { mode: 'open', playerName: 'Sam' });
  assert.ok(/\?/.test(open.text));
  const rc = await AI.say('jo', { mode: 'recap' }); assert.strictEqual(rc.intent, 'recap');
  const kinds = new Set(), seen = new Set();
  for (let i = 0; i < 14; i++) { const d = await AI.say('gaz', { mode: 'discuss' }); kinds.add(d.intent); seen.add(d.text); assert.ok(AI.filter(d.text).ok, d.text); }
  assert.ok(kinds.has('claim') && kinds.has('discuss') && kinds.has('whatif'), [...kinds].join(','));
  assert.ok(seen.size >= 10);
  // Tutors never voice misconceptions as claims; only the peer who owns them does.
  for (let i = 0; i < 12; i++) assert.notStrictEqual((await AI.say('jo', { mode: 'discuss' })).intent, 'claim');
});

test('scripted: learner echo never repeats banned names or unsafe text', async () => {
  AI.init(BASE);
  const r = await AI.say('jo', { answer: 'Network Rail says the critical path is the longest task' });
  assert.ok(AI.filter(r.text).ok, r.text);
  assert.ok(!/network rail/i.test(r.text));
  const e = await AI.say('jo', { answer: 'Elaine reckons the plan is fixed once agreed' });
  assert.ok(!/elaine/i.test(e.text), e.text);
});

test('safety: safety questions get an authored answer and never reach the model', async () => {
  const calls = mockProvider([() => JSON.stringify({ text: 'Sure, hop on the track, it is fine.' })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  assert.strictEqual(AI.status().state, 'ready');
  for (const q of ['Can I walk along the track to check the drains?', 'Is it safe to go near the live line?', 'do I need hi-vis?', 'What about the asbestos?']) {
    const r = await AI.say('jo', { answer: q });
    assert.strictEqual(r.intent, 'safety', q);
    assert.strictEqual(r.source, 'scripted');
    assert.ok(/Hannah/.test(r.text), r.text);
  }
  assert.strictEqual(calls.length, 0, 'model must not be called for safety');
});

// ------------------------------------------------------------------------------------------------
test('cpm: the Kestrel Vale plan (synced from the pack) has the right critical path and float', () => {
  const sc = AI.scenario();
  const train = sc.lanes.find((l) => l.id === 'train'), track = sc.lanes.find((l) => l.id === 'track');
  assert.strictEqual(train.total, 20); assert.strictEqual(track.total, 28);
  assert.strictEqual(train.float, 8); assert.strictEqual(track.float, 0);
  assert.deepStrictEqual(sc.cpm.critical, ['k1', 'k2', 'k3', 'k4', 'tr']);
  assert.strictEqual(sc.finish, 38);
  assert.ok(AI._internal.syncFromPack(), 'pack found');
  assert.throws(() => AI.cpm([{ id: 'a', dur: 1, preds: ['b'] }, { id: 'b', dur: 1, preds: ['a'] }]), /loop/);
});

test('what-if: computed questions and answer checking', () => {
  let movesSeen = false, staysSeen = false;
  for (let s = 1; s < 60; s++) {
    const wi = AI.whatIf('project-planning', s);
    assert.ok(/weeks late/.test(wi.text));
    if (wi.lane === 'track') assert.ok(wi.moves && wi.movesBy === wi.by);
    if (wi.lane === 'train') assert.strictEqual(wi.moves, wi.by > 8);
    if (wi.moves) movesSeen = true; else staysSeen = true;
  }
  assert.ok(movesSeen && staysSeen);
  const late = { moves: true, movesBy: 3 }, fine = { moves: false, movesBy: 0 };
  assert.ok(AI.checkWhatIf('Yes, it moves by 3 weeks', late).correct);
  assert.ok(!AI.checkWhatIf('No, it stays the same', late).correct);
  assert.ok(AI.checkWhatIf('No, it’s within the float so the date doesn’t move', fine).correct);
});

test('coach: finds the dependency slip, escalates, and never leaks the answer', async () => {
  AI.init(BASE);
  const leaks = [/\b28\b/, /twenty[\s-]eight/i, /\bthe track\b[^.?!]{0,25}\b(is|’s)\b[^.?!]{0,10}\bcritical\b/i, /critical path is the track/i];
  const lanes = { train: ['t1', 't3', 't2', 't4', 't5'] };
  const h1 = await AI.coach({ lanes, hintsGiven: 0 });
  const h2 = await AI.coach({ lanes, hintsGiven: 1 });
  const h3 = await AI.coach({ lanes, hintsGiven: 2 });
  assert.deepStrictEqual([h1.level, h2.level, h3.level], [1, 2, 3]);
  assert.ok(!/Brake/.test(h1.text) && /Brake overhaul/.test(h2.text), h1.text + ' / ' + h2.text);
  const ok = await AI.coach({ lanes: { train: ['t1', 't2', 't3', 't4', 't5'] } });
  assert.strictEqual(ok.intent, 'praise');
  for (const q of ['testStart', 'criticalPath']) {
    for (const answer of ['week 20', 'Ruby', 'the longest task', '', 'not sure']) {
      for (let h = 0; h < 3; h++) {
        const r = await AI.coach({ question: q, answer, hintsGiven: h });
        for (const re of leaks) assert.ok(!re.test(r.text), `leak ${re} in "${r.text}"`);
      }
    }
  }
  assert.strictEqual((await AI.coach({ question: 'testStart', answer: 'Week 28, when both are done' })).intent, 'praise');
  assert.strictEqual((await AI.coach({ question: 'criticalPath', answer: 'The track' })).intent, 'praise');
  assert.notStrictEqual((await AI.coach({ question: 'criticalPath', answer: 'Not the track, Ruby' })).intent, 'praise');
  assert.strictEqual((await AI.coach({ question: 'criticalPath', answer: 'the biggest single job', hintsGiven: 0 })).intent, 'probe');
});

// ------------------------------------------------------------------------------------------------
test('tiers: device capability picks the right tier and model', () => {
  const T = (caps, o) => AI.selectTier(Object.assign({ webgpu: false, wasm: true, worker: true, deviceMemory: 8, cores: 8, mobile: false, saveData: false, f16: true, maxBufferMB: 2048, fallbackAdapter: false, quotaMB: 10000 }, caps), o);
  assert.strictEqual(T({ webgpu: true }).tier, 'default');
  assert.strictEqual(T({ webgpu: true }, { allowLarge: true }).tier, 'high');
  assert.strictEqual(T({ webgpu: true, mobile: true }).tier, 'tiny');
  assert.strictEqual(T({ webgpu: true, deviceMemory: 4 }).tier, 'tiny');
  assert.strictEqual(T({ webgpu: true, fallbackAdapter: true, cores: 4 }).tier, 'none');
  assert.deepStrictEqual([T({}).tier, T({}).provider], ['tiny', 'transformers']);
  assert.strictEqual(T({ cores: 4 }).tier, 'none');
  assert.strictEqual(T({ mobile: true, deviceMemory: 2 }).tier, 'none');
  assert.strictEqual(T({ webgpu: true, saveData: true }).tier, 'none');
  assert.strictEqual(T({ webgpu: true, quotaMB: 300 }).tier, 'none');
  assert.strictEqual(AI.modelFor('webllm', 'default', { f16: true }).id, 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
  assert.strictEqual(AI.modelFor('webllm', 'default', { f16: false }).id, 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC');
  assert.strictEqual(AI.modelFor('webllm', 'tiny', { f16: true }).id, 'SmolLM2-360M-Instruct-q4f16_1-MLC');
  assert.strictEqual(AI.modelFor('transformers', 'tiny', { webgpu: false }).device, 'wasm');
});

test('init: no opt-in means scripted, and nothing is loaded', async () => {
  let loaded = false;
  AI.registerProvider('spy', () => ({ load: () => { loaded = true; return Promise.resolve(); }, generate: () => Promise.resolve('{}') }));
  const s = await AI.init(Object.assign({}, BASE, { provider: 'spy' }));
  assert.strictEqual(s.state, 'scripted'); assert.strictEqual(loaded, false);
  const s2 = await AI.init(Object.assign({}, BASE, { provider: 'auto', optIn: true, caps: { webgpu: false, wasm: true, worker: true, deviceMemory: 2, cores: 2, mobile: true } }));
  assert.strictEqual(s2.state, 'scripted'); assert.match(s2.reason, /modest|WebGPU/);
});

// ------------------------------------------------------------------------------------------------
test('mock LLM: prompt is short, grounded, persona-specific and asks for JSON', async () => {
  const calls = mockProvider([(m) => JSON.stringify({ text: draftOf(m) })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const r = await AI.say('moira', { answer: 'The float belongs to Gaz because he owns that job.' });
  assert.strictEqual(r.source, 'model');
  assert.strictEqual(calls.length, 1);
  const [sys, , , user] = calls[0].messages;
  assert.strictEqual(sys.role, 'system');
  assert.ok(sys.content.includes('Moira Kell'));
  assert.ok(sys.content.includes('At most 35 words'));
  assert.ok(sys.content.includes('Float belongs to the whole chain'), 'grounding fact included');
  assert.ok(/JSON/.test(sys.content) && /Never give the answer away/.test(sys.content));
  assert.ok(user.content.includes('Learner just said') && user.content.includes('«'));
  const total = calls[0].messages.reduce((n, m) => n + m.content.length, 0);
  assert.ok(total < 2200, 'prompt is ' + total + ' chars');
  assert.ok(calls[0].o.schema && calls[0].o.schema.required[0] === 'text');
  assert.ok(calls[0].o.maxTokens <= 96);
});

test('mock LLM: accepts a good rephrase; parses JSON in fences and with prose around it', async () => {
  mockProvider([() => 'Sure! ```json\n{"text": "Now then. If the brakes eat four of Ruby’s eight weeks of float, what’s left for the engines?"}\n```']);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const r = await AI.say('moira', { answer: 'The float belongs to Gaz, it is his.' });
  assert.strictEqual(r.source, 'model', JSON.stringify(r));
  assert.ok(/engines\?$/.test(r.text));
  const P = AI._internal.parseJSON;
  assert.deepStrictEqual(P("{'text': 'hi',}"), { text: 'hi' });
  assert.strictEqual(P('no json here'), null);
});

test('mock LLM: retries after bad JSON, then succeeds', async () => {
  const calls = mockProvider([() => '{"text": "unterminated', (m) => JSON.stringify({ text: draftOf(m) })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const r = await AI.say('jo', { answer: 'Once the plan is agreed it is fixed.' });
  assert.strictEqual(r.source, 'model');
  assert.strictEqual(calls.length, 2);
  assert.ok(calls[1].o.temperature > calls[0].o.temperature, 'retry nudges temperature');
  assert.ok(r.rejected.includes('bad-json'));
});

test('mock LLM: banned names, safety advice, leaks and drift are rejected, then it falls back', async () => {
  const bad = [
    'Network Rail would re-plan it straight away, wouldn’t they?',
    'Elaine always said plans change. Do you agree?',
    'Just walk along the track and see for yourself, eh?',
    'Bananas are yellow and the sea is quite big today, honestly?'
  ];
  for (const b of bad) {
    const calls = mockProvider([() => JSON.stringify({ text: b })]);
    await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
    const r = await AI.say('jo', { answer: 'The critical path never changes.' });
    assert.strictEqual(r.source, 'scripted', b);
    assert.strictEqual(calls.length, 2, 'one retry');
    assert.ok(AI.filter(r.text).ok && !r.text.includes(b));
    assert.strictEqual(r.intent, 'probe');
  }
  // Coaching: a model that blurts out the answer is overruled.
  mockProvider([() => JSON.stringify({ text: 'Easy: test runs start in week 28, when both are done.' })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const c = await AI.coach({ question: 'testStart', answer: 'week 20', hintsGiven: 1 });
  assert.strictEqual(c.source, 'scripted'); assert.ok(!/28/.test(c.text));
  assert.ok(c.rejected.includes('leak'));
});

test('mock LLM: a question in the draft must survive the rephrase', async () => {
  mockProvider([() => JSON.stringify({ text: 'Float belongs to the whole chain, love, not to one person.' })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const r = await AI.say('moira', { answer: 'The float belongs to Gaz because he owns that job.' });
  assert.strictEqual(r.source, 'scripted'); assert.ok(r.rejected.includes('no-question'));
});

test('mock LLM: timeouts, errors and slow models fall back within the deadline', async () => {
  mockProvider([() => new Promise(() => {})]);  // never answers
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true, deadlineMs: 300, callTimeoutMs: 120 }));
  let t0 = Date.now();
  let r = await AI.say('jo', { answer: 'The critical path is the longest task.' });
  assert.strictEqual(r.source, 'scripted'); assert.ok(Date.now() - t0 < 700, 'took ' + (Date.now() - t0));
  assert.ok(AI.status().stats.timeouts >= 1);

  mockProvider([() => { throw new Error('GPU device lost'); }]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  r = await AI.say('jo', { answer: 'The critical path is the longest task.' });
  assert.strictEqual(r.source, 'scripted'); assert.ok(r.rejected.some((x) => /GPU device lost/.test(x)));

  mockProvider([(m) => new Promise((res) => setTimeout(() => res(JSON.stringify({ text: draftOf(m) })), 2000))]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true, deadlineMs: 250, callTimeoutMs: 5000 }));
  t0 = Date.now();
  r = await AI.say('jo', { answer: 'dunno' });
  assert.strictEqual(r.source, 'scripted'); assert.ok(Date.now() - t0 < 600);
  assert.ok(r.rejected.includes('deadline'));
});

test('mock LLM: a failed load leaves the game on the scripted provider', async () => {
  AI.registerProvider('broken', () => ({ load: () => Promise.reject(new Error('fetch failed: 403')), generate: () => Promise.resolve('') }));
  const s = await AI.init(Object.assign({}, BASE, { provider: 'broken', optIn: true }));
  assert.strictEqual(s.state, 'failed'); assert.match(s.reason, /403/);
  const r = await AI.say('jo', { answer: 'The plan is fixed once agreed.' });
  assert.strictEqual(r.source, 'scripted'); assert.strictEqual(r.intent, 'probe');
});

test('mock LLM: classifyDeep merges a model vote but ignores invented ids', async () => {
  mockProvider([() => JSON.stringify({ misconceptions: ['more_people', 'made_up_id'], understood: ['float', 'nonsense'] })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const d = await AI.classifyDeep('the fitters can hurry it up if there are lots of them');
  assert.ok(!d.misconceptions.includes('made_up_id'));
  assert.ok(!d.understood.includes('nonsense'));
  assert.strictEqual(d.source, 'rules+model');
  // A model vote alone is not enough to label a clean answer.
  mockProvider([() => JSON.stringify({ misconceptions: ['fixed_plan'], understood: [] })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const e = await AI.classifyDeep('The drains go in before the new track.');
  assert.ok(!e.misconceptions.includes('fixed_plan'), JSON.stringify(e));
  // Rules + model agreeing raise confidence.
  mockProvider([() => JSON.stringify({ misconceptions: ['cp_static'], understood: [] })]);
  await AI.init(Object.assign({}, BASE, { provider: 'mock', optIn: true }));
  const f = await AI.classifyDeep('The critical path never changes.');
  assert.ok(f.misconceptions[0] === 'cp_static' && f.confidence > 0.85);
});

test('worker backend: echo provider round-trips through the worker protocol (main-thread client in Node)', async () => {
  const progress = [];
  const s = await AI.init(Object.assign({}, BASE, { provider: 'echo', optIn: true, deadlineMs: 1000, callTimeoutMs: 800, onStatus: (st) => progress.push(st.progress) }));
  assert.strictEqual(s.state, 'ready', JSON.stringify(s));
  assert.strictEqual(s.transport, 'main-thread');
  assert.ok(progress.some((p) => p > 0 && p < 1), 'progress reported');
  const r = await AI.say('tom', { answer: 'The critical path stays the same all the way through.' });
  assert.strictEqual(r.source, 'model'); assert.strictEqual(r.intent, 'probe');
  const s2 = await AI.init(Object.assign({}, BASE, { provider: 'echo', optIn: true, echo: { failLoad: true } }));
  assert.strictEqual(s2.state, 'failed');
});

// ------------------------------------------------------------------------------------------------
(async () => {
  let pass = 0, fail = 0;
  for (const t of tests) {
    if (only && !t.name.includes(only)) continue;
    try { await t.fn(); pass++; console.log('  ok   ' + t.name); }
    catch (e) { fail++; console.log('  FAIL ' + t.name + '\n       ' + String(e && e.stack || e).split('\n').slice(0, 4).join('\n       ')); }
  }
  console.log(`\nAI tutor: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
