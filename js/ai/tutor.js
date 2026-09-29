/* LINESIDE — AI tutor (LS.AI)
 *
 * NPC classmates and tutors who talk through a project-management concept with the learner:
 * Socratic follow-ups, reactions to what the learner actually said, misconception detection,
 * varied discussion points, and coaching during an applied scenario without giving the answer away.
 *
 * Design (see docs/AI_TUTOR.md):
 *   PLAN, then REALISE. The deterministic engine in this file always decides WHAT happens next
 *   (intent, which misconception to probe, which fact to lean on, which question to ask) and writes
 *   an authored draft line. An optional small in-browser model may only REPHRASE that draft in the
 *   persona's voice. Every model output is validated (length, banned names, safety, answer leaks,
 *   drift from the draft); on any failure, timeout or error the authored draft is used instead.
 *   So the game never waits on, and never depends on, a model.
 *
 * Providers: 'scripted' (always available, no network), 'webllm' and 'transformers' (loaded lazily
 * from a configurable module URL, only after the player opts in, only when the device can cope),
 * 'echo' (test backend in js/ai/worker.js), plus any provider added with LS.AI.registerProvider().
 *
 * Classic script, no build step, works from file://. Also loads in Node (module.exports) for tests.
 * Content rules: UK English, warm and gently funny, fictional names only, never the name on the
 * blocked-names list, and safety-critical answers are always authored, never generated.
 */
(function (root, factory) {
  var LS = root.LS = root.LS || {};
  var api = factory(root, LS);
  LS.AI = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root, LS) {
  'use strict';

  var VERSION = '1.0.0';

  // ------------------------------------------------------------------------------------------
  // Small utilities
  // ------------------------------------------------------------------------------------------
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function assign(t) {
    for (var i = 1; i < arguments.length; i++) {
      var s = arguments[i]; if (!s) continue;
      for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) t[k] = s[k];
    }
    return t;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function now() { return (root.performance && root.performance.now) ? root.performance.now() : Date.now(); }
  function words(s) { return String(s || '').trim().split(/\s+/).filter(Boolean); }
  function wordCount(s) { return words(s).length; }
  function norm(s) { return String(s || '').replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"').toLowerCase(); }
  function cap1(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function sentences(s) { return String(s || '').match(/[^.!?]+[.!?]+["”’)]*|[^.!?]+$/g) || []; }
  function uniq(a) { var o = [], seen = {}; for (var i = 0; i < a.length; i++) if (!seen[a[i]]) { seen[a[i]] = 1; o.push(a[i]); } return o; }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function withTimeout(p, ms, label) {
    var t;
    return Promise.race([
      Promise.resolve(p).then(function (v) { clearTimeout(t); return v; }, function (e) { clearTimeout(t); throw e; }),
      new Promise(function (_, rej) { t = setTimeout(function () { rej(new Error((label || 'call') + ' timed out after ' + ms + 'ms')); }, ms); })
    ]);
  }
  function safeStore(key, val) {
    try {
      if (!root.localStorage) return null;
      if (val === undefined) { var v = root.localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      root.localStorage.setItem(key, JSON.stringify(val)); return val;
    } catch (e) { return null; }
  }

  // Tokens for the lightweight similarity "embedding" (hashed unigrams + bigrams, stopwords removed).
  var STOP = {};
  ('a an the and or but so of to in on at for with is are was were be been it its it\'s this that these those i you we they he she ' +
   'my your our their me us them do does did can could would should will just then than there here as by from if into about ' +
   'what which who whom how why when where think reckon guess maybe probably really very quite like well yes yeah ok okay um erm')
    .split(' ').forEach(function (w) { STOP[w] = 1; });
  function stem(w) {
    if (w.length > 5 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ed$/.test(w)) return w.slice(0, -2);
    if (w.length > 4 && /es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function tokens(s) {
    return norm(s).replace(/'s\b/g, '').split(/[^a-z0-9']+/).filter(function (w) { return w && !STOP[w]; }).map(stem);
  }
  function vec(s) {
    var t = tokens(s), v = {};
    for (var i = 0; i < t.length; i++) {
      v[t[i]] = (v[t[i]] || 0) + 1;
      if (i + 1 < t.length) { var b = t[i] + '_' + t[i + 1]; v[b] = (v[b] || 0) + 1.5; }
    }
    return v;
  }
  function cosine(a, b) {
    var dot = 0, na = 0, nb = 0, k;
    for (k in a) { na += a[k] * a[k]; if (b[k]) dot += a[k] * b[k]; }
    for (k in b) nb += b[k] * b[k];
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  }

  // ------------------------------------------------------------------------------------------
  // Configuration (host can pre-set window.LS_AI_CONFIG before this script, or pass to init())
  // ------------------------------------------------------------------------------------------
  var DEFAULTS = {
    provider: 'auto',            // 'auto' | 'webllm' | 'transformers' | 'scripted' | registered name
    optIn: false,                // the player must opt in before anything is downloaded
    useWorker: true,             // run the model in a Blob worker (falls back to the main thread)
    tier: null,                  // force 'high' | 'default' | 'tiny' | 'none'
    allowLarge: false,           // allow the 'high' tier (1.5B) on strong desktops
    moduleUrl: {                 // ES module URLs; self-host these for production (see docs/AI_TUTOR.md)
      webllm: 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/lib/index.js',
      transformers: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/dist/transformers.min.js'
    },
    modelBaseUrl: null,          // null = runtime's default hub; else the client's own host (CORS enabled)
    modelLibBaseUrl: null,       // WebLLM only: where the compiled model .wasm files live
    wasmPaths: null,             // Transformers.js only: where the ONNX Runtime .wasm files live
    cacheBackend: 'cache',       // WebLLM: 'cache' | 'indexeddb' | 'opfs'
    models: null,                // override the tier -> model table (see MODELS)
    deadlineMs: 4500,            // longest a line may wait for the model before the authored line is used
    callTimeoutMs: 3500,         // per attempt
    retries: 1,                  // extra attempts after a rejected or unparsable output
    loadTimeoutMs: 15 * 60 * 1000,
    maxTokens: 72,
    temperature: 0.7,
    seed: null,                  // fixed seed = reproducible scripted choices (tests, replays)
    maxWords: 35,
    onStatus: null,
    warmup: true,                // one tiny generation after load, to measure speed
    storageKey: 'lineside_ai'
  };
  var cfg = assign({}, DEFAULTS, root.LS_AI_CONFIG || {});

  // Tier -> model table. vram figures are WebLLM's own prebuilt config (v0.2.85).
  var MODELS = {
    webllm: {
      high:    { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC', vramMB: 1630 },
      default: { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', f32: 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC', vramMB: 945 },
      tiny:    { id: 'SmolLM2-360M-Instruct-q4f16_1-MLC', f32: 'SmolLM2-360M-Instruct-q4f32_1-MLC', vramMB: 376 }
    },
    transformers: {
      high:    { id: 'onnx-community/Qwen2.5-1.5B-Instruct', dtype: 'q4f16' },
      default: { id: 'onnx-community/Qwen2.5-0.5B-Instruct', dtype: 'q4f16' },
      tiny:    { id: 'HuggingFaceTB/SmolLM2-360M-Instruct', dtype: 'q4' }
    },
    echo: { high: { id: 'echo' }, default: { id: 'echo' }, tiny: { id: 'echo' } }
  };

  // ------------------------------------------------------------------------------------------
  // Output filter: banned names, safety topics, style. Applied to EVERY line, authored or generated.
  // ------------------------------------------------------------------------------------------
  // Real organisations and brands must never appear. Case-insensitive unless flagged; word-bounded.
  var BANNED = [
    'Network Rail', 'TfL', 'Transport for London', 'HS2', 'High Speed 2', 'High Speed Two', 'London Underground',
    'Crossrail', 'Elizabeth line', 'National Rail', 'British Rail', 'Railtrack', 'Great British Railways', 'GBR',
    'LNER', 'GWR', 'Great Western Railway', 'Avanti', 'ScotRail', 'Transport for Wales', 'TransPennine', 'Thameslink',
    'Govia', 'Arriva', 'FirstGroup', 'First Group', 'Stagecoach', 'Northern Rail', 'Merseyrail', 'Chiltern Railways',
    'c2c', 'Southeastern', 'Eurostar', 'Office of Rail and Road', 'ORR', 'RSSB', 'RAIB', 'Health and Safety Executive',
    'Department for Transport', 'DfT', 'Balfour Beatty', 'Amey', 'Siemens', 'Alstom', 'Hitachi', 'Bombardier', 'CAF',
    'Stadler', 'Wabtec', 'Colas', 'VolkerRail', 'Volker', 'Babcock', 'Kier', 'Costain', 'Morgan Sindall', 'Laing O\'Rourke',
    'Skanska', 'Jacobs', 'Atkins', 'AtkinsRéalis', 'AECOM', 'Mott MacDonald', 'Arup', 'WSP', 'Ferrovial', 'Carillion',
    'Primavera', 'P6', 'Microsoft Project', 'MS Project', 'Asta Powerproject', 'Jira', 'Trello', 'Monday.com',
    'Elaine'
  ];
  var CASE_SENSITIVE = { 'ORR': 1, 'CAF': 1, 'GBR': 1, 'DfT': 1, 'WSP': 1, 'P6': 1, 'c2c': 1 };
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var BANNED_RE = BANNED.map(function (n) {
    var body = escRe(n).replace(/\\?'/g, "['’]").replace(/ /g, '[\\s-]+');
    return { name: n, re: new RegExp('(^|[^A-Za-z0-9])' + body + '(?![A-Za-z0-9])', CASE_SENSITIVE[n] ? '' : 'i') };
  });
  function bannedNames(text) {
    var s = String(text || ''), out = [];
    for (var i = 0; i < BANNED_RE.length; i++) if (BANNED_RE[i].re.test(s)) out.push(BANNED_RE[i].name);
    return out;
  }

  // Safety-critical topics. In learner input they trigger an AUTHORED safety line (the model is never
  // consulted). In generated output they cause rejection, because safety advice is never generated.
  var SAFETY_RE = [
    { topic: 'on_track', re: /\b(walk|walking|go|going|step|stepping|stand|standing|cross|crossing|climb|play|playing|run|running|nip)\b[^.?!]{0,30}\b(on|onto|across|along|over|near)\b[^.?!]{0,15}\b(the\s+)?(track|tracks|line|rails?|railway|ballast|sleepers)\b/i },
    { topic: 'live_line', re: /\b(live\s+(line|rail|track)|third\s+rail|conductor\s+rail|overhead\s+(line|wires?)|electrified|electrocut\w*|volts?)\b/i },
    { topic: 'protection', re: /\b(possession|lookout|look-out|isolation|isolate the|protection|safe system of work|red zone|green zone|permit to work|line blockage)\b/i },
    { topic: 'ppe', re: /\b(ppe|hi-?vis|high[\s-]visibility|hard\s*hat|safety boots)\b/i },
    { topic: 'trespass', re: /\b(trespass\w*|sneak\w*\s+(in|onto)|jump\w*\s+the\s+fence|through\s+the\s+fence)\b/i },
    { topic: 'hazard', re: /\b(asbestos|is\s+it\s+safe|safe\s+to|unsafe|dangerous|danger|injur\w*|hurt)\b/i }
  ];
  function safetyTopic(text) {
    var s = String(text || '');
    for (var i = 0; i < SAFETY_RE.length; i++) if (SAFETY_RE[i].re.test(s)) return SAFETY_RE[i].topic;
    return null;
  }

  var US_UK = [
    [/\bcolor/gi, 'colour'], [/\bfavorite/gi, 'favourite'], [/\bbehavior/gi, 'behaviour'], [/\bcenter\b/gi, 'centre'],
    [/\borganiz/gi, 'organis'], [/\brealiz/gi, 'realis'], [/\bprioritiz/gi, 'prioritis'], [/\banalyz/gi, 'analys'],
    [/\bapologiz/gi, 'apologis'], [/\brecogniz/gi, 'recognis'], [/\bminimiz/gi, 'minimis'], [/\bmaximiz/gi, 'maximis'],
    [/\bemphasiz/gi, 'emphasis'], [/\bsummariz/gi, 'summaris'], [/\bmom\b/gi, 'mum'], [/\bgotten\b/gi, 'got'],
    [/\bmeter(s?)\b/gi, 'metre$1'], [/\bschedule slip/gi, 'programme slip'], [/\bcheck (is|was) in the mail\b/gi, 'cheque is in the post'],
    [/\btrash\b/gi, 'rubbish'], [/\bvacation\b/gi, 'holiday'], [/\bawesome\b/gi, 'brilliant'], [/\bgotcha\b/gi, 'got it']
  ];
  function ukSpell(s) {
    var out = String(s || '');
    for (var i = 0; i < US_UK.length; i++) {
      out = out.replace(US_UK[i][0], function (m) {
        var r = US_UK[i][1];
        if (typeof r !== 'string') return m;
        return m.charAt(0) === m.charAt(0).toUpperCase() && m.charAt(0) !== m.charAt(0).toLowerCase() ? cap1(r) : r;
      });
    }
    return out;
  }
  var STYLE_BAD = /\b(as an ai|language model|i cannot|i can't help|i'm sorry, but|assistant:|user:|system:|<\|)|https?:\/\/|\[[^\]]*\]\(|```/i;

  // Trim to a word cap without cutting a sentence in half; keep a closing question if there is one.
  function capLength(text, maxWords) {
    var s = String(text || '').trim();
    if (wordCount(s) <= maxWords) return s;
    var ss = sentences(s).map(function (x) { return x.trim(); }).filter(Boolean);
    var q = null;
    for (var i = ss.length - 1; i >= 0; i--) if (/\?\s*["”]?$/.test(ss[i])) { q = ss[i]; break; }
    var out = [], n = q ? wordCount(q) : 0;
    for (var j = 0; j < ss.length; j++) {
      if (ss[j] === q) continue;
      var w = wordCount(ss[j]);
      if (n + w > maxWords) break;
      out.push(ss[j]); n += w;
    }
    if (q && wordCount(q) <= maxWords) out.push(q);
    if (!out.length) return words(s).slice(0, maxWords).join(' ').replace(/[,;:]$/, '') + '…';
    return out.join(' ');
  }

  /** Check a candidate line. Returns {ok, text, reasons[]}. `opts`: {maxWords, leaks[], requireQuestion, draft, generated}. */
  function filterText(text, opts) {
    opts = opts || {};
    var reasons = [];
    var s = String(text == null ? '' : text);
    s = s.replace(/^[\s"'“‘]*(?:(?:Jo|Moira|Gaz|Tom|Hannah|Helen|Priya|Steve|Assistant|Tutor)|[A-Z][a-z]+ [A-Z][a-z]+)\s*:\s*/, '')   // "Jo: ..."
         .replace(/[*_#`>]+/g, '').replace(/\s+/g, ' ').replace(/^["'“‘]+|["'”’]+$/g, '').trim();
    s = s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
    s = ukSpell(s);
    var maxW = opts.maxWords || cfg.maxWords;
    if (!s) reasons.push('empty');
    var banned = bannedNames(s);
    if (banned.length) reasons.push('banned:' + banned.join(','));
    if (STYLE_BAD.test(s)) reasons.push('style');
    if (opts.generated) {
      if (safetyTopic(s)) reasons.push('safety');
      var letters = s.replace(/[^A-Za-z]/g, '').length, nonAscii = s.replace(/[\x00-\x7F‘-”–—…£]/g, '').length;
      if (letters < 8 || nonAscii > 2) reasons.push('garbled');
      if (/(\b\w+\b)(?:\s+\1\b){2,}/i.test(s)) reasons.push('repetition');
    }
    if (opts.leaks) for (var i = 0; i < opts.leaks.length; i++) if (opts.leaks[i].test(s)) { reasons.push('leak'); break; }
    if (wordCount(s) > maxW) s = capLength(s, maxW);
    if (opts.requireQuestion && !/\?/.test(s)) reasons.push('no-question');
    if (opts.draft && opts.generated) {
      var dk = tokens(opts.draft).filter(function (t) { return t.length > 3; }), sk = tokens(s);
      var hit = dk.filter(function (t) { return sk.indexOf(t) >= 0; }).length;
      if (dk.length >= 4 && hit / dk.length < 0.2) reasons.push('drift');
    }
    return { ok: reasons.length === 0, text: s, reasons: reasons };
  }

  // ------------------------------------------------------------------------------------------
  // Critical path method (forward/backward pass). Facts are computed, never generated.
  // ------------------------------------------------------------------------------------------
  function cpm(acts) {
    var byId = {}, order = [], seen = {}, temp = {};
    acts.forEach(function (a) { byId[a.id] = assign({ preds: [] }, a); });
    function visit(id) {
      if (seen[id]) return; if (temp[id]) throw new Error('dependency loop at ' + id);
      temp[id] = 1; (byId[id].preds || []).forEach(function (p) { if (!byId[p]) throw new Error('unknown predecessor ' + p); visit(p); });
      temp[id] = 0; seen[id] = 1; order.push(id);
    }
    acts.forEach(function (a) { visit(a.id); });
    order.forEach(function (id) {
      var a = byId[id]; a.es = 0;
      a.preds.forEach(function (p) { a.es = Math.max(a.es, byId[p].ef); });
      a.ef = a.es + a.dur;
    });
    var finish = 0; order.forEach(function (id) { finish = Math.max(finish, byId[id].ef); });
    var succ = {}; order.forEach(function (id) { succ[id] = []; });
    order.forEach(function (id) { byId[id].preds.forEach(function (p) { succ[p].push(id); }); });
    for (var i = order.length - 1; i >= 0; i--) {
      var a = byId[order[i]]; a.lf = finish;
      succ[a.id].forEach(function (s) { a.lf = Math.min(a.lf, byId[s].ls); });
      a.ls = a.lf - a.dur; a.tf = a.ls - a.es; a.critical = a.tf === 0;
    }
    var path = [], cur = order.filter(function (id) { return byId[id].critical && !byId[id].preds.length; })[0];
    while (cur) { path.push(cur); cur = succ[cur].filter(function (s) { return byId[s].critical; })[0]; }
    return { finish: finish, acts: byId, order: order, critical: path };
  }

  // ------------------------------------------------------------------------------------------
  // Concept card: Project Planning. Everything the model may say is grounded in `facts`.
  // ------------------------------------------------------------------------------------------
  var CONCEPTS = {};
  CONCEPTS['project-planning'] = {
    id: 'project-planning',
    title: 'Project planning',
    summary: 'Break the work into activities, estimate durations, link them by dependencies, find the critical path and the float.',
    facts: {
      activities: 'An activity is a piece of work with a clear start, finish and owner, such as "Brake overhaul".',
      durations: 'Each activity has an estimated duration. Estimates are ranges really, and they get better as you learn.',
      dependencies: 'A dependency says one activity relies on another. Most are finish-to-start: B cannot start until A has finished.',
      fs: 'Finish-to-start: the brakes cannot be set up until the bogies are back under her.',
      critical_path: 'The critical path is the longest chain of dependent activities from start to finish. It sets the earliest finish date.',
      float: 'Total float is how long an activity can slip without moving the finish date. Critical activities have zero float.',
      float_shared: 'Float belongs to the whole chain and the project, not one person. Use it early and the jobs after it lose it.',
      change: 'A plan is a baseline you manage change against. When things slip or new facts arrive, you re-plan and the critical path can move.',
      resources: 'More people only help if the work can be split. Lead times, approvals, drying time and one crew per worksite don’t speed up.'
    },
    facets: ['activities', 'durations', 'dependencies', 'critical_path', 'float', 'change'],
    facetLabel: {
      activities: 'breaking it into activities', durations: 'the durations', dependencies: 'the dependencies',
      fs: 'finish-to-start', critical_path: 'the critical path', float: 'float', float_shared: 'who float belongs to',
      change: 'how plans change', resources: 'what extra people can and can’t do'
    },
    // Signals that the learner has understood a facet.
    understood: {
      activities: [/\b(break|split|chunk|divide|list|identify)\w*\b[^.?!]{0,30}\b(activit\w*|tasks?|jobs?|work packages?|steps?)\b/i, /\bwork breakdown\b/i],
      durations: [/\b(duration|how long (each|it) takes|estimate\w*|weeks? (each|per|for))\b/i],
      dependencies: [/\bdepend\w*\b|\bpredecessor|\bsuccessor|\bcan'?t (start|begin|happen) (until|till|before)\b|\bhas to (come|happen|be done|finish) (first|before)\b|\bwaits? (on|for)\b|\bin (the right )?order\b|\bsequence\b/i, /\b\w+\s+(go(es)?|come?s?|has to be|have to be|must be|needs? to be)?\s*(done\s+|in\s+|fixed\s+)?(before|after)\s+(the\s+)?\w+/i, /\bfirst\b[^.?!]{0,40}\bthen\b/i],
      fs: [/\bfinish[\s-]+to[\s-]+start\b|\bcan'?t start (until|till|before)[^.?!]{0,40}\b(finish\w*|done|complete\w*)\b|\bonce[^.?!]{0,30}\b(finished|done|complete)\b[^.?!]{0,30}\b(start|begin)\b|\bhas to finish before\b/i],
      critical_path: [/\blongest\s+(chain|path|sequence|route|string|run|line of)\b/i, /\b(zero|no)\s+float\b/i, /\bcritical path\b[^.?!]{0,40}\b(sets|determines|drives|decides|controls)\b[^.?!]{0,25}\b(date|finish|end|opening)\b/i, /\b(chain|sequence)\b[^.?!]{0,30}\b(sets|determines|drives)\b[^.?!]{0,20}\b(date|finish|end)\b/i],
      float: [/\b(slip|late|delay)\w*\b[^.?!]{0,30}\b\d+\s*weeks?\b[^.?!]{0,30}$|\bcan slip\b/i, /\b(float|slack|leeway)\b[^.?!]{0,50}\b(slip|delay|late|without|spare|room|move|moving|affect\w*)\b/i, /\bslip\b[^.?!]{0,40}\bwithout\b[^.?!]{0,30}\b(date|finish|end)\b/i],
      float_shared: [/\b(float|slack)\b[^.?!]{0,50}\b(shared|project'?s?|programme|whole|everyone|the chain|the path|pm|project manager)\b/i],
      change: [/\b(re-?plan\w*|re-?baselin\w*|update the plan|revis\w*|living document|changes? (as|when)|can (move|shift|switch|change))\b/i],
      resources: [/\b(doesn'?t|does not|won'?t|not|never|isn'?t)\b[^.?!]{0,25}\b(always|necessarily|automatically)?\b[^.?!]{0,20}\b(shorten|faster|quicker|speed|sooner|help)\w*/i, /\blead times?\b|\bcan'?t be split\b|\btoo many cooks\b/i]
    },
    misconceptions: {
      longest_task: {
        label: 'the longest task is the critical path',
        short: 'the single longest task',
        patterns: [
          /\b(longest|biggest|slowest|largest|lengthiest)\s+(single\s+|individual\s+|one\s+)?(task|activity|job|step|item|bit of work|piece of work)\b/i,
          /\b(task|activity|job)\s+(that|which)\s+takes\s+(the\s+)?(longest|most time)\b/i,
          /\bwhichever\s+(task|activity|job)\b[^.?!]{0,20}\blongest\b/i
        ],
        exemplars: ['the critical path is just the longest task', 'find the job that takes the most weeks and that is critical', 'the relay is nine weeks so the relay is the critical path'],
        counter: 'critical_path',
        probes: [
          'Is it the longest single job, or the longest run of jobs that have to happen one after another?',
          'Picture one nine-week job on its own, and three five-week jobs that must go in a row. Which sets the finish date?',
          'If the longest job had nothing waiting for it, would it still decide when we open?'
        ],
        example: 'Relay, tamp and stress is the longest single job at nine weeks. But it’s the whole track chain, twenty-eight weeks end to end, that sets the date.',
        teachBack: 'Tell me in one sentence how you’d tell a long job from a critical one.'
      },
      more_people: {
        label: 'adding people always shortens the job',
        short: 'more people always means faster',
        patterns: [
          /\b(add|adding|more|extra|double|doubling|bring\w*\s+in|throw\w*|hire|hiring|get)\b[^.?!]{0,25}\b(people|staff|workers|crews?|gangs?|hands|fitters|bodies|resources?|labour|team|men)\b[^.?!]{0,40}\b(shorten\w*|shorter|faster|quicker|speed\w*|sooner|halve\w*|cut|reduce\w*|less time|finish(es)? early|catch up)\b/i,
          /\b(twice|double)\s+the\s+(people|crew|staff|workers|fitters)\b[^.?!]{0,30}\bhalf\s+the\s+time\b/i,
          /\bjust\s+(add|throw|put)\s+more\s+(people|resource|bodies|hands)\b/i
        ],
        anti: [/\b(doesn'?t|does not|won'?t|will not|not|never|isn'?t|can'?t)\b[^.?!]{0,25}\b(always|necessarily|automatically|really)?\b[^.?!]{0,20}\b(shorten|faster|quicker|speed|sooner|help)\w*/i],
        exemplars: ['if we are late we can just add more people', 'put two gangs on it and it takes half as long', 'more fitters means Marjorie is done sooner'],
        counter: 'resources',
        probes: [
          'Would two extra fitters make the wheelsets come back from the specialist any sooner?',
          'If you put three gangs on one short stretch of track, do they all fit in the same place at once?',
          'Which of our jobs are waiting on time rather than on hands?'
        ],
        example: 'The wheelset lead time and the nesting-season checks run on the calendar, not on how many people turn up.',
        teachBack: 'Give me one job where more people would help, and one where it wouldn’t.'
      },
      float_owned: {
        label: 'float belongs to whoever owns the activity',
        short: 'float belongs to the activity’s owner',
        patterns: [
          /\b(float|slack)\b[^.?!]{0,40}\b(belongs? to|is owned by|owned by|is (theirs|his|hers|mine)|their|his|her|my own|keep|keeps|to spend|to use up|spare time for)\b/i,
          /\b(owner|team|gaz|fitter|contractor|they|he|she)\b[^.?!]{0,30}\b(owns?|has|gets|keeps|can use|can spend)\b[^.?!]{0,20}\b(the\s+|their\s+|his\s+|her\s+)?(float|slack)\b/i
        ],
        unless: /\b(project|programme|everyone|shared|whole|the chain|the path|network|together|pm|project manager)\b/i,
        exemplars: ['Marjorie has eight weeks of float so that is Gaz’s time to use', 'the float is the fitters own buffer', 'whoever does the job gets to keep the float'],
        counter: 'float_shared',
        probes: [
          'If the brakes use up four of Marjorie’s eight weeks, how much is left for the engines after them?',
          'Who should decide when float gets spent: the person doing one job, or the person holding the whole plan?',
          'If Gaz spends the float in week three, what happens to everyone after him in the chain?'
        ],
        example: 'Marjorie’s eight weeks of float are shared along her whole chain. Spend them on the bogies and the brakes and engines have none left.',
        teachBack: 'How would you explain to Gaz why his float isn’t just his?'
      },
      fixed_plan: {
        label: 'a plan is fixed once it is agreed',
        short: 'the plan is fixed once agreed',
        patterns: [
          /\bplan\b[^.?!]{0,35}\b(is\s+)?(fixed|set in stone|locked( in| down)?|final|can'?t (be )?chang\w*|cannot (be )?chang\w*|won'?t chang\w*|never chang\w*|shouldn'?t chang\w*|mustn'?t chang\w*|stays? the same)\b/i,
          /\bonce\b[^.?!]{0,20}\b(agreed|signed off|approved|baselined)\b[^.?!]{0,35}\b(fixed|final|stays?|stick to it|no changes|can'?t chang\w*|done)\b/i,
          /\bstick\s+to\s+the\s+(original\s+)?plan\s+(no matter what|whatever happens)\b/i
        ],
        exemplars: ['once the plan is agreed it is fixed', 'we signed the plan off so we cannot change it now', 'the plan is set in stone after approval'],
        counter: 'change',
        probes: [
          'When the bats turned up in Beck Bridge, should the plan carry on pretending they hadn’t?',
          'What’s the difference between changing a plan and losing control of it?',
          'If the plan never changed, what would it tell you about next month?'
        ],
        example: 'The agreed plan becomes the baseline. When facts change you re-plan against it, and write down why, so everyone can see the change.',
        teachBack: 'What would you say to someone who thinks re-planning means the plan failed?'
      },
      cp_static: {
        label: 'the critical path never changes',
        short: 'the critical path never changes',
        patterns: [
          /\bcritical path\b[^.?!]{0,30}\b(never|doesn'?t|does not|won'?t|will not|can'?t|cannot)\s+(ever\s+)?(change|move|shift|switch)\w*/i,
          /\bcritical path\b[^.?!]{0,25}\b(stays?|remains?|is always|will always be)\b[^.?!]{0,15}\b(the same|fixed|put|the track)\b/i,
          /\bonce\s+(it'?s\s+)?critical,?\s+always\s+critical\b/i,
          /\b(track|marjorie)\b[^.?!]{0,20}\b(always|forever)\s+(be\s+)?(the\s+)?critical\b/i
        ],
        exemplars: ['the critical path is the track and that will not change', 'the critical path stays the same for the whole job', 'once we know the critical path we can stop watching the rest'],
        counter: 'change',
        probes: [
          'Suppose Marjorie’s wheelsets come back ten weeks late. Which chain sets the date then?',
          'What would have to happen for a chain with float to become critical?',
          'If we only ever watch the critical path, what might sneak up on us?'
        ],
        example: 'Marjorie has eight weeks of float. Let her slip by more than that and she becomes the critical path instead of the track.',
        teachBack: 'Explain to Tom why he still needs to keep an eye on Marjorie’s chain.'
      }
    },
    // Socratic follow-ups by facet: questions, never answers.
    followUps: {
      activities: ['What separate jobs would we need to list for Marjorie before we could plan her?', 'How would you break “fix the track” into jobs someone could actually do?', 'What makes something a proper activity rather than a vague wish?'],
      durations: ['Where would a number like “nine weeks for the relay” come from, and how sure are we of it?', 'Would you give a single number for a duration, or a range? Why?', 'Which of our durations do you trust least?'],
      dependencies: ['Pick one job that can’t start until another has finished. Why that one?', 'Why can’t the new track go down before the drains are sorted?', 'Which two jobs could happen at the same time, and why?'],
      fs: ['What does finish-to-start mean for the bogies and the brakes?', 'Can you think of a pair of jobs that don’t need a strict finish-to-start link?'],
      critical_path: ['How would you find the chain that sets the opening date?', 'Why do we care more about one chain than the others?', 'What would you tell Helen the critical path is, in plain words?'],
      float: ['If Marjorie’s work slips by three weeks, does the opening date move? Why?', 'How would you work out how far a job can slip before it hurts?', 'What does zero float tell you about a job?'],
      change: ['What would make the critical path switch from one chain to another?', 'When would you re-plan, and who would you tell?', 'How do you change a plan without losing track of what was agreed?']
    },
    // Teach-back prompts: the learner explains it in their own words.
    teachBack: {
      activities: 'How would you turn “restore Marjorie” into a list of jobs?',
      durations: 'Where do the week numbers on Jo’s board come from, and how far would you trust them?',
      dependencies: 'Why does the order of the jobs matter so much?',
      fs: 'What does finish-to-start mean, with an example from the board?',
      critical_path: 'What’s the critical path, in your own words, and why should Helen care?',
      float: 'What does float mean, and what does zero float tell you?',
      change: 'Why might the critical path be different next month?'
    },
    // Varied discussion points for group talk: questions, claims to challenge, and computed what-ifs.
    discussion: [
      { id: 'd1', facet: 'critical_path', kind: 'question', text: 'Marjorie gets all the attention, but is she what sets the opening date?' },
      { id: 'd2', facet: 'float', kind: 'question', text: 'If a job has float, is it safe to ignore it?' },
      { id: 'd3', facet: 'dependencies', kind: 'question', text: 'Which job on the board would you start the day the money lands, and why?' },
      { id: 'd4', facet: 'durations', kind: 'question', text: 'Ecology checks take six weeks, not three. What makes nature so slow to plan around?' },
      { id: 'd5', facet: 'change', kind: 'question', text: 'Is a plan that keeps changing a bad plan?' },
      { id: 'd6', facet: 'activities', kind: 'question', text: 'What’s missing from the board that a real programme would need?' },
      { id: 'c1', facet: 'critical_path', kind: 'claim', mc: 'longest_task', who: 'gaz', text: 'I reckon it’s simple. Find the biggest job and that’s your critical path. Am I wrong?' },
      { id: 'c2', facet: 'resources', kind: 'claim', mc: 'more_people', who: 'gaz', text: 'If the track runs late, we just put more gangs on it. Sorted. Isn’t it?' },
      { id: 'c3', facet: 'float', kind: 'claim', mc: 'float_owned', who: 'gaz', text: 'Eight weeks of float on Marjorie? That’s my eight weeks, that is. Right?' },
      { id: 'c4', facet: 'change', kind: 'claim', mc: 'fixed_plan', who: 'gaz', text: 'Once the panel signs the plan off, that’s it, isn’t it? No more fiddling.' },
      { id: 'c5', facet: 'change', kind: 'claim', mc: 'cp_static', who: 'gaz', text: 'The track’s the critical path, so I can stop worrying about Marjorie. Yes?' },
      { id: 'w1', facet: 'change', kind: 'whatif' },
      { id: 'w2', facet: 'float', kind: 'whatif' }
    ],
    // The applied scenario: Jo's works plan. Kept in step with the pack (see syncFromPack).
    scenario: {
      lanes: [
        { id: 'train', label: 'Marjorie', cards: [
          { id: 't1', t: 'Asbestos survey, strip down & inspect', w: 3 }, { id: 't2', t: 'Bogies & wheelsets', w: 7 },
          { id: 't3', t: 'Brake overhaul', w: 3 }, { id: 't4', t: 'Engines & rewire, then run up', w: 5 }, { id: 't5', t: 'Static tests in the depot', w: 2 }] },
        { id: 'track', label: 'the track', cards: [
          { id: 'k1', t: 'Ecology surveys & vegetation clearance', w: 6 }, { id: 'k2', t: 'Drainage & Beck Bridge repairs', w: 5 },
          { id: 'k3', t: 'Relay, tamp & stress the track', w: 9 }, { id: 'k4', t: 'Level crossing & junction', w: 8 }] }
      ],
      join: { id: 'tr', t: 'Test runs, driver training & sign-off', w: 10 },
      // Question-specific hint ladders, and the patterns a hint must never contain (the answer).
      questions: {
        testStart: {
          ask: 'When can test runs on the line start?',
          correct: [/\b28\b|\btwenty[\s-]eight\b/i],
          hints: [
            'What does a test run need before it can happen? Is it only the train?',
            'You need a working train and a working railway. Which of the two is ready later?',
            'Add up each lane on its own. Test runs wait for whichever total is bigger.'
          ],
          leaks: [/\bweek\s*28\b/i, /\b28\b/, /\btwenty[\s-]eight\b/i]
        },
        criticalPath: {
          ask: 'Which workstream is on the critical path?',
          correct: [/\btrack\b/i],
          wrong: [/\bnot (the )?track\b|\bmarjorie\b[^.?!]{0,20}\b(is|’s|'s)\b[^.?!]{0,10}\bcritical\b/i],
          hints: [
            'The critical path isn’t the most exciting chain. It’s the one that decides the date. Which is that?',
            'Which lane takes longer end to end, if you count every job in it?',
            'Compare the two totals. The longer chain has no float. The shorter one does.'
          ],
          leaks: [/\bthe track\b[^.?!]{0,25}\b(is|’s|'s)\b[^.?!]{0,10}\bcritical\b/i, /\bcritical path\b[^.?!]{0,15}\b(is|’s|'s)\b[^.?!]{0,10}\btrack\b/i, /\b28 weeks?\b[^.?!]{0,40}\b20\b/i]
        }
      }
    }
  };

  function scenarioActs(concept) {
    var sc = concept.scenario, acts = [], ends = [];
    sc.lanes.forEach(function (l) {
      l.cards.forEach(function (c, i) { acts.push({ id: c.id, name: c.t, dur: c.w, lane: l.id, preds: i ? [l.cards[i - 1].id] : [] }); });
      ends.push(l.cards[l.cards.length - 1].id);
    });
    if (sc.join) acts.push({ id: sc.join.id, name: sc.join.t, dur: sc.join.w, lane: 'join', preds: ends });
    return acts;
  }
  function scenarioFacts(concept) {
    var r = cpm(scenarioActs(concept)), sc = concept.scenario;
    var lanes = sc.lanes.map(function (l) {
      var total = l.cards.reduce(function (n, c) { return n + c.w; }, 0);
      return { id: l.id, label: l.label, total: total, float: r.acts[l.cards[0].id].tf, critical: r.acts[l.cards[0].id].critical };
    });
    return { cpm: r, lanes: lanes, finish: r.finish };
  }

  /** Pull card names and durations from the live pack if present, so the tutor never contradicts the game. */
  function syncFromPack() {
    try {
      var p = LS.PACKS && LS.PACKS['kestrel-vale'], pl = p && p.c1 && p.c1.plan;
      if (!pl || !pl.lanes) return false;
      var sc = CONCEPTS['project-planning'].scenario;
      sc.lanes = pl.lanes.map(function (l) {
        return { id: l.id, label: l.id === 'track' ? 'the track' : l.label, cards: l.cards.map(function (c) { return { id: c.id, t: c.t.replace(/\s*\(.*\)\s*$/, ''), w: c.w }; }) };
      });
      var tr = (pl.background || []).filter(function (b) { return /test runs/i.test(b.t); })[0];
      if (tr) sc.join = { id: 'tr', t: tr.t.replace(/\s*·\s*/g, ', '), w: tr.w };
      return true;
    } catch (e) { return false; }
  }

  /** A computed what-if: delay one activity, recompute, and describe what really happens. */
  function makeWhatIf(concept, rng) {
    var base = scenarioFacts(concept), acts = scenarioActs(concept).filter(function (a) { return a.lane !== 'join'; });
    var a = acts[Math.floor(rng() * acts.length)], base0 = base.cpm.acts[a.id];
    var options = base0.critical ? [2, 3, 4] : [Math.max(2, base0.tf - 3), base0.tf + 2, base0.tf + 4];
    var d = options[Math.floor(rng() * options.length)];
    var changed = scenarioActs(concept).map(function (x) { return x.id === a.id ? assign({}, x, { dur: x.dur + d }) : x; });
    var r = cpm(changed), moved = r.finish - base.finish;
    var lane = concept.scenario.lanes.filter(function (l) { return l.id === a.lane; })[0];
    var cpLane = concept.scenario.lanes.filter(function (l) { return r.acts[l.cards[0].id].critical; }).map(function (l) { return l.id; });
    return {
      activity: a.id, name: a.name, lane: a.lane, laneLabel: lane.label, by: d, moves: moved > 0, movesBy: moved,
      floatBefore: base0.tf, criticalAfter: cpLane,
      text: 'Say “' + a.name + '” runs ' + d + ' weeks late. Does the opening date move, and which chain sets it then?'
    };
  }
  function checkWhatIf(answer, wi) {
    var s = norm(answer);
    var saysNo = /\b(no|doesn'?t|does not|won'?t|wouldn'?t|not move|stays|same date|no change|absorb\w*|within (the )?float)\b/.test(s);
    var saysYes = /\b(yes|moves?|slips?|later|delay\w*|pushes|push\w* (back|out))\b/.test(s) && !/\b(doesn'?t|won'?t|wouldn'?t|not) (move|slip|push)/.test(s);
    var ok = wi.moves ? (saysYes && !/\bdoesn'?t move\b/.test(s)) : saysNo;
    var nums = (s.match(/\b\d+\b/g) || []).map(Number);
    var byOk = !wi.moves || nums.indexOf(wi.movesBy) >= 0;
    return { correct: ok && byOk, direction: ok, amount: byOk };
  }

  // ------------------------------------------------------------------------------------------
  // Persona cards
  // ------------------------------------------------------------------------------------------
  var PERSONAS = {
    jo: {
      id: 'jo', name: 'Jo Adeyemi', short: 'Jo', role: 'Engineering Lead', stance: 'tutor',
      voice: 'brisk, precise and kind; dry humour; lives on sticky notes and coffee',
      openers: ['Right.', 'Okay.', 'Good.', 'Hmm.', 'Sticky-note time.'],
      praise: ['Spot on.', 'That’s it.', 'Yes, exactly.', 'Good. That’s the bit people miss.'],
      thinking: ['Let’s test that.', 'Hold that thought.', 'Let me push on that a bit.'],
      tics: ['I’ll put that on a sticky note.', 'Pass me a marker.', 'That deserves more coffee.'],
      sample: 'Good. So which job can’t start until the drains are done?'
    },
    moira: {
      id: 'moira', name: 'Moira Kell', short: 'Moira', role: 'Harrowby’s last station master, your mentor', stance: 'tutor',
      voice: 'patient, wry and warm; Socratic; old railway wisdom; always has tea on the go',
      openers: ['Now then.', 'Ah.', 'Well.', 'Mm.'],
      praise: ['There you are.', 'That’s the ticket.', 'Now you’re thinking like a railway.', 'Just so.'],
      thinking: ['Let’s turn that over.', 'Sit with that a moment.', 'I had a gaffer who said the same.'],
      tics: ['Pour yourself a tea and think on.', 'The railway taught me that one the hard way.', 'Kettle’s on.'],
      sample: 'Now then. If one job runs late, who else has to wait for it?'
    },
    gaz: {
      id: 'gaz', name: 'Gaz Whitfield', short: 'Gaz', role: 'Depot Fitter, Marjorie’s biggest fan', stance: 'peer',
      voice: 'cheerful, chatty, plain-spoken; adores Marjorie the railcar; learns out loud and sometimes gets it wrong',
      openers: ['Here, listen.', 'Right then.', 'Ooh.', 'Go on then.'],
      praise: ['Oh, that’s good, that.', 'Makes sense when you put it like that.', 'Nice one.'],
      thinking: ['Hang on, let me get this straight.', 'I’m with you so far.', 'Hmm, my head says one thing.'],
      tics: ['Bless her.', 'Don’t tell Marjorie.', 'She’d agree, if she could talk.'],
      sample: 'Ooh. So if the brakes slip, do the engines have to wait too?'
    },
    tom: {
      id: 'tom', name: 'Tom Brennan', short: 'Tom', role: 'Track & Site Manager', stance: 'tutor',
      voice: 'practical, short sentences, safety first, quietly funny',
      openers: ['Look.', 'Fair enough.', 'Right.', 'Aye.'],
      praise: ['That’s right.', 'Good. Simple as that.', 'Yep.'],
      thinking: ['Let’s walk it through.', 'Picture it on site.', 'Think about the ground.'],
      tics: ['The ground doesn’t care about the plan.', 'Mud always wins.', 'Ask me how I know.'],
      sample: 'Right. Why do the drains go in before the new track?'
    }
  };
  function persona(p) {
    if (p && typeof p === 'object') return assign({}, PERSONAS.jo, p);
    var base = PERSONAS[p] || PERSONAS.jo;
    try {
      var cast = LS.PACKS && LS.PACKS['kestrel-vale'] && LS.PACKS['kestrel-vale'].cast;
      if (cast && cast[base.id] && cast[base.id].name) base = assign({}, base, { name: cast[base.id].name });
    } catch (e) { /* ignore */ }
    return base;
  }

  // Authored safety lines: safety-critical answers are never generated.
  var SAFETY_LINES = {
    on_track: 'That one’s a safety question, not a planning one. Nobody goes on or near the line without a briefing, PPE and Hannah’s say-so. Now, back to the plan:',
    live_line: 'Live railway is Hannah’s department, and the answer is always the same: stay off it and ask her. Back to the plan:',
    protection: 'How we protect people on site is set by Hannah and the safe system of work, not worked out on a sticky note. Ask her. Meanwhile:',
    ppe: 'PPE and site rules come from Hannah’s induction, and she won’t budge on them. Quite right too. Back to planning:',
    trespass: 'That’s one for Hannah and, honestly, nobody should be on the railway without permission. Back to the plan:',
    hazard: 'Anything about whether something is safe goes to Hannah, full stop. I’ll plan around her answer. So:'
  };

  // ------------------------------------------------------------------------------------------
  // Classifier: rules first (negation-aware), similarity second, model third (optional, async).
  // ------------------------------------------------------------------------------------------
  var NEG_BEFORE = /\b(not|isn'?t|aren'?t|wasn'?t|don'?t (think|believe|reckon)|doesn'?t mean|not (true|the case|just|simply|only|necessarily|always)|myth|misconception|wrong to (think|say)|mistake to|rather than|instead of|people (think|say)|some (think|say)|it'?s a trap)\b/i;
  function clauses(text) {
    return norm(text).split(/[.;!?\n]+|\bbut\b|\bhowever\b|\balthough\b|\bwhereas\b|\bexcept\b/).map(function (c) { return c.trim(); }).filter(Boolean);
  }
  function getConcept(c) { return (c && typeof c === 'object') ? c : (CONCEPTS[c || 'project-planning'] || CONCEPTS['project-planning']); }

  var EXEMPLAR_VECS = {};
  function exemplarVecs(concept) {
    if (EXEMPLAR_VECS[concept.id]) return EXEMPLAR_VECS[concept.id];
    var out = {};
    Object.keys(concept.misconceptions).forEach(function (id) { out[id] = concept.misconceptions[id].exemplars.map(vec); });
    return (EXEMPLAR_VECS[concept.id] = out);
  }

  /** classify(answer, concept) -> {misconceptions[], understood[], confidence, scores, evidence} (synchronous). */
  function classify(answer, concept) {
    concept = getConcept(concept);
    var text = String(answer || ''), cl = clauses(text), scores = {}, evidence = {}, understood = [];
    var mcs = concept.misconceptions;
    Object.keys(mcs).forEach(function (id) {
      var m = mcs[id], best = 0;
      cl.forEach(function (c) {
        if (m.anti && m.anti.some(function (re) { return re.test(c); })) return;
        m.patterns.forEach(function (re) {
          var mm = re.exec(c); if (!mm) return;
          if (m.unless && m.unless.test(c)) return;
          if (NEG_BEFORE.test(c.slice(0, mm.index))) return;
          best = Math.max(best, 0.85); evidence[id] = mm[0];
        });
      });
      if (best < 0.85 && !(m.anti && cl.some(function (c) { return m.anti.some(function (re) { return re.test(c); }); }))) {
        var v = vec(text), sim = 0;
        exemplarVecs(concept)[id].forEach(function (e) { sim = Math.max(sim, cosine(v, e)); });
        if (sim >= 0.5 && !cl.some(function (c) { return NEG_BEFORE.test(c); })) { best = Math.max(best, clamp(0.35 + sim * 0.4, 0, 0.75)); evidence[id] = evidence[id] || ('similar (' + sim.toFixed(2) + ')'); }
      }
      if (best > 0) scores[id] = best;
    });
    Object.keys(concept.understood).forEach(function (f) {
      if (concept.understood[f].some(function (re) { return cl.some(function (c) { return re.test(c); }); })) understood.push(f);
    });
    // A negated misconception is itself a sign of understanding.
    Object.keys(mcs).forEach(function (id) {
      if (scores[id]) return;
      var m = mcs[id];
      cl.forEach(function (c) {
        m.patterns.forEach(function (re) { var mm = re.exec(c); if (mm && NEG_BEFORE.test(c.slice(0, mm.index))) understood.push(m.counter); });
      });
    });
    understood = uniq(understood);
    // Understanding a facet cancels the matching weak (similarity-only) misconception.
    Object.keys(scores).forEach(function (id) { if (scores[id] < 0.8 && understood.indexOf(mcs[id].counter) >= 0) delete scores[id]; });
    var list = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    var conf = list.length ? scores[list[0]] : understood.length ? clamp(0.5 + 0.12 * understood.length, 0, 0.95) : 0.2;
    return { misconceptions: list, understood: understood, confidence: +conf.toFixed(2), scores: scores, evidence: evidence };
  }

  // ------------------------------------------------------------------------------------------
  // Scripted planner: decides the move, writes the authored draft. Always available.
  // ------------------------------------------------------------------------------------------
  var BANK = {
    ackMc: ['You said “{echo}”.', 'I can see why you’d say that.', 'Lots of people think that at first.', 'Interesting. “{echo}”, you reckon?', 'That’s a common one, and a fair guess.'],
    reconsider: ['Does that change your answer?', 'So what do you reckon now?', 'Where does that leave your idea?', 'Still sure?'],
    ackMcAgain: ['We’re back at {mc} again, I think.', 'That’s {mc} creeping back in.', 'Still hearing {mc} in there.'],
    ackPartial: ['You’ve got {got} nailed.', 'Good on {got}.', 'Yes to {got}.', '{got}: spot on.'],
    ackPraiseEcho: ['“{echo}”. Yes.', 'Exactly: {echo}.'],
    improved: ['That’s a shift from earlier. Nice.', 'Better than your first go, that.', 'See, you got there.'],
    clarify: ['No rush.', 'Take your time.', 'Fair enough, it’s a lot at once.', 'Let’s make it smaller.'],
    clarifyQ: ['Pick one job on the board. What has to happen before it can start?', 'Start small: which comes first, the drains or the new track?', 'Here’s an easier one: why can’t Marjorie be tested before her brakes work?'],
    redirect: ['Ha. Maybe over a brew later.', 'Good question for another day.', 'Hold that one for the pub.'],
    teachBackIntro: ['Try explaining it to Gaz.', 'Teach it back to me.', 'Pretend I’ve never seen a plan.', 'Say it like you’re telling the parish council.'],
    hintIntro: ['A nudge, not an answer:', 'Here’s a thought:', 'Try this:', 'One question to help:'],
    coachPraise: ['That’s the right order. Next!', 'Yes, that’s how the work has to flow.', 'Right answer, and for the right reason.'],
    coachFirst: ['Have a look at {lane}. Is anything there waiting on a job placed after it?', 'Something in {lane} is starting before the job it depends on. Which one?'],
    coachSecond: ['Look at “{card}”. What has to be true before it can begin?', 'Read the note on “{card}”. What is it waiting for?'],
    coachThird: ['Go through {lane} one card at a time and ask: could this start on day one? “{card}” is the one to question.', 'Start {lane} with the job that needs nothing else, then keep asking what each one waits for. Check “{card}”.'],
    discussOpen: ['Question for the group.', 'Here’s one to chew on.', 'Let’s argue about this.', 'Something to think about.']
  };

  function makeSession(pid, conceptId, seed) {
    var s = (seed != null) ? seed : (cfg.seed != null ? cfg.seed + hashStr(pid + conceptId) : (Math.random() * 4294967296) >>> 0);
    return { persona: pid, concept: conceptId, rng: mulberry32(s), turn: 0, history: [], used: {}, mcSeen: {}, covered: {}, correctStreak: 0, lastMc: null, discussed: {}, whatIf: null };
  }
  var SESSIONS = {};
  function session(pid, conceptId, ctx) {
    if (ctx && ctx.session) return ctx.session;
    var key = pid + '|' + conceptId;
    if (!SESSIONS[key] || (ctx && ctx.reset)) SESSIONS[key] = makeSession(pid, conceptId, ctx && ctx.seed);
    return SESSIONS[key];
  }

  // Choose a variant not used recently in this session (per bank key).
  function choose(sess, key, list) {
    if (!list || !list.length) return '';
    var used = sess.used[key] || [], fresh = [];
    for (var i = 0; i < list.length; i++) if (used.indexOf(i) < 0) fresh.push(i);
    if (!fresh.length) { used = used.slice(-1); fresh = []; for (var j = 0; j < list.length; j++) if (used.indexOf(j) < 0) fresh.push(j); }
    var k = fresh[Math.floor(sess.rng() * fresh.length)];
    used.push(k); if (used.length > Math.max(1, list.length - 1)) used.shift();
    sess.used[key] = used;
    return list[k];
  }
  function fill(t, slots) {
    return String(t).replace(/\{(\w+)\}/g, function (_, k) { return slots[k] != null ? slots[k] : ''; });
  }
  var PROPER = ['I', 'Marjorie', 'Gaz', 'Jo', 'Tom', 'Moira', 'Helen', 'Hannah', 'Steve', 'Priya', 'Brian', 'Beck', 'Harrowby', 'Kestrel'];
  // A short, safe quote of what the learner said, to show we listened.
  function echoOf(answer) {
    var c = String(answer || '').replace(/\s+/g, ' ').trim().split(/[.;!?\n]|,\s*(?:but|so|because)\b/)[0] || '';
    c = c.replace(/^(i think|i reckon|i guess|maybe|well|um|erm|so|probably|it'?s)\s*,?\s*/i, '').replace(/[,:;\-\s]+$/, '');
    var w = words(c);
    if (w.length < 2 || bannedNames(c).length || safetyTopic(c)) return null;
    if (w.length > 9) c = w.slice(0, 9).join(' ') + '…';
    var first = (c.match(/^[A-Za-z]+/) || [''])[0];
    if (/^[A-Z][a-z]/.test(first) && PROPER.indexOf(first) < 0) c = c.charAt(0).toLowerCase() + c.slice(1);
    return c.replace(/["“”]/g, '');
  }
  function joinParts(parts, maxWords) {
    // parts: [{t, drop}] in order; drop lower priorities first until it fits.
    var list = parts.filter(function (p) { return p && p.t; });
    function total() { return list.reduce(function (n, p) { return n + wordCount(p.t); }, 0); }
    while (total() > maxWords) {
      var worst = -1, wi = -1;
      for (var i = 0; i < list.length; i++) if ((list[i].drop || 0) > worst) { worst = list[i].drop || 0; wi = i; }
      if (worst <= 0) break;
      list.splice(wi, 1);
    }
    return capLength(list.map(function (p) { return p.t.trim(); }).join(' ').replace(/\s+/g, ' '), maxWords);
  }
  function nextFacet(concept, sess, prefer) {
    if (prefer && concept.followUps[prefer] && !sess.covered[prefer]) return prefer;
    for (var i = 0; i < concept.facets.length; i++) if (!sess.covered[concept.facets[i]]) return concept.facets[i];
    return concept.facets[Math.floor(sess.rng() * concept.facets.length)];
  }
  function isDontKnow(a) { return /^\s*(i\s+)?(don'?t|do not|dunno|no idea|not sure|pass|\?+)\b|^\s*(idk|dunno|no idea|not sure|pass|\?+)\s*$/i.test(a); }
  function onTopic(a, concept) {
    var s = norm(a);
    if (/\b(plan|task|job|activit|depend|order|before|after|first|critical|float|slack|path|chain|week|duration|late|slip|delay|people|crew|gang|fitter|marjorie|track|drain|brake|bogie|engine|relay|crossing|junction|test|finish|start|longest|time|change|schedule|programme|sequence)/.test(s)) return true;
    return classify(a, concept).misconceptions.length > 0;
  }

  /**
   * planTurn(persona, context) -> plan {intent, draft, question, mc, facet, facts[], leaks[], requireQuestion}
   * context: {concept, answer, mode:'react'|'open'|'discuss'|'teachback'|'recap'|'followup', topic, playerName, session, seed}
   */
  function planTurn(pid, context) {
    context = context || {};
    var P = persona(pid), concept = getConcept(context.concept), sess = session(P.id, concept.id, context);
    var answer = context.answer != null ? String(context.answer) : '', mode = context.mode || (answer ? 'react' : 'open');
    var maxW = context.maxWords || cfg.maxWords, R = sess.rng;
    var plan = { persona: P.id, concept: concept.id, mode: mode, intent: 'socratic', facts: [], leaks: context.leaks || [], requireQuestion: true, classification: null };
    var parts = [], opener = { t: R() < 0.55 ? choose(sess, P.id + ':open', P.openers) : '', drop: 3 };
    var tic = { t: (R() < 0.18 && P.tics) ? choose(sess, P.id + ':tic', P.tics) : '', drop: 4 };
    var SF = scenarioFacts(concept);

    // 1) Safety always wins, and is always authored.
    var st = answer && safetyTopic(answer);
    if (st) {
      var fq = concept.followUps[nextFacet(concept, sess)];
      plan.intent = 'safety'; plan.safety = st;
      plan.draft = joinParts([{ t: SAFETY_LINES[st] }, { t: choose(sess, 'fu:safety', fq) }], maxW + 12);
      plan.authoredOnly = true;
      return finishPlan(plan, sess, answer);
    }

    if (mode === 'react' || mode === 'followup') {
      var c = classify(answer, concept); plan.classification = c;
      var echo = echoOf(answer);
      if (!answer.trim() || isDontKnow(answer) || wordCount(answer) < 2 && !/\d/.test(answer)) {
        plan.intent = 'clarify';
        parts = [opener, { t: choose(sess, 'clarify', BANK.clarify), drop: 2 }, { t: choose(sess, 'clarifyQ', BANK.clarifyQ) }];
      } else if (!onTopic(answer, concept)) {
        plan.intent = 'redirect';
        var fqr = concept.followUps[nextFacet(concept, sess)];
        parts = [opener, { t: choose(sess, 'redirect', BANK.redirect), drop: 2 }, { t: choose(sess, 'fu:' + 'redirect', fqr) }];
      } else if (c.misconceptions.length) {
        var id = c.misconceptions[0], m = concept.misconceptions[id], seen = sess.mcSeen[id] || 0;
        plan.intent = 'probe'; plan.mc = id; plan.facet = m.counter; sess.mcSeen[id] = seen + 1; sess.correctStreak = 0;
        var ack = seen === 0 ? fill(choose(sess, 'ackMc' + (echo ? '' : 'NoEcho'), echo ? BANK.ackMc : BANK.ackMc.filter(function (t) { return t.indexOf('{echo}') < 0; })), { echo: echo })
                             : fill(choose(sess, 'ackMcAgain', BANK.ackMcAgain), { mc: '“' + m.short + '”' });
        var core;
        if (seen === 0) { core = choose(sess, 'probe:' + id, m.probes); plan.strategy = 'question'; }
        else if (seen === 1) { core = m.example + ' ' + choose(sess, 'reconsider', BANK.reconsider); plan.strategy = 'example'; plan.facts.push(m.example); }
        else { core = concept.facts[m.counter] + ' ' + m.teachBack; plan.strategy = 'teachback'; plan.facts.push(concept.facts[m.counter]); }
        plan.facts.push(concept.facts[m.counter]);
        parts = [opener, { t: ack, drop: seen ? 1 : 2 }, { t: core }];
      } else if (c.understood.length) {
        c.understood.forEach(function (f) { sess.covered[f] = true; });
        sess.correctStreak++;
        var got = c.understood.map(function (f) { return concept.facetLabel[f] || f; });
        var wasWrong = sess.lastMc && c.understood.indexOf(concept.misconceptions[sess.lastMc].counter) >= 0;
        var facet = nextFacet(concept, sess, context.topic);
        plan.facet = facet; plan.facts.push(concept.facts[facet] || '');
        if (c.understood.length >= 2 || c.confidence >= 0.74 || wasWrong) {
          plan.intent = 'praise';
          var pr = wasWrong ? choose(sess, 'improved', BANK.improved) : choose(sess, P.id + ':praise', P.praise);
          var q = (sess.correctStreak % 3 === 0)
            ? choose(sess, 'tb', BANK.teachBackIntro) + ' ' + choose(sess, 'tbq', ['What’s the critical path, in your own words?', 'What does float really mean?', 'Why does the order of jobs matter so much?'])
            : choose(sess, 'fu:' + facet, concept.followUps[facet]);
          if (sess.correctStreak % 3 === 0) plan.intent = 'teachback';
          parts = [{ t: pr, drop: 1 }, tic, { t: q }];
        } else {
          plan.intent = 'partial';
          parts = [opener, { t: cap1(fill(choose(sess, 'ackPartial', BANK.ackPartial), { got: got[0] })), drop: 1 },
                   { t: choose(sess, 'fu:' + facet, concept.followUps[facet]) }];
        }
      } else {
        plan.intent = 'socratic';
        var f2 = nextFacet(concept, sess, context.topic); plan.facet = f2;
        parts = [opener, { t: choose(sess, P.id + ':think', P.thinking), drop: 2 }, { t: choose(sess, 'fu:' + f2, concept.followUps[f2]) }];
      }
      sess.lastMc = plan.mc || null;
    } else if (mode === 'discuss') {
      // Claims (a peer voicing a misconception for the learner to challenge) belong to the persona who says them.
      var eligible = function (d) { return d.kind !== 'claim' || d.who === P.id; };
      var pool = concept.discussion.filter(function (d) { return eligible(d) && !sess.discussed[d.id]; });
      if (!pool.length) { sess.discussed = {}; pool = concept.discussion.filter(eligible); }
      var d = pool[Math.floor(R() * pool.length)];
      sess.discussed[d.id] = true; plan.discussion = d.id; plan.facet = d.facet;
      if (d.kind === 'whatif') {
        var wi = makeWhatIf(concept, R); sess.whatIf = wi; plan.whatIf = wi; plan.intent = 'whatif';
        parts = [{ t: choose(sess, 'dOpen', BANK.discussOpen), drop: 2 }, { t: wi.text }];
        plan.facts.push('The plan totals: ' + SF.lanes.map(function (l) { return l.label + ' ' + l.total + ' weeks'; }).join(', ') + '.');
        plan.leaks = plan.leaks.concat([new RegExp('\\b' + (wi.moves ? 'yes' : 'no') + '\\b', 'i')]);
      } else if (d.kind === 'claim') {
        plan.intent = 'claim'; plan.mc = d.mc;
        parts = [{ t: d.text }];
      } else {
        plan.intent = 'discuss';
        parts = [opener, { t: choose(sess, 'dOpen', BANK.discussOpen), drop: 2 }, { t: d.text }];
      }
    } else if (mode === 'teachback') {
      plan.intent = 'teachback';
      var ft = context.topic || nextFacet(concept, sess); plan.facet = ft;
      parts = [opener, { t: choose(sess, 'tb', BANK.teachBackIntro), drop: 1 }, { t: concept.teachBack[ft] || concept.teachBack.critical_path }];
    } else if (mode === 'recap') {
      plan.intent = 'recap'; plan.requireQuestion = false;
      var cov = Object.keys(sess.covered).map(function (f) { return concept.facetLabel[f] || f; });
      var todo = concept.facets.filter(function (f) { return !sess.covered[f]; }).map(function (f) { return concept.facetLabel[f]; });
      parts = [opener, { t: cov.length ? 'So far you’ve got ' + cov.slice(0, 3).join(', ') + '.' : 'We’ve only just started.' },
               { t: todo.length ? 'Next I want to hear about ' + todo[0] + '.' : 'That’s the whole plan covered. Nicely done.' }];
    } else { // open
      plan.intent = 'open';
      var f0 = context.topic || nextFacet(concept, sess); plan.facet = f0;
      var hello = context.playerName ? choose(sess, 'hello', ['Hello, {n}.', 'Morning, {n}.', 'Ah, {n}.']).replace('{n}', context.playerName) : '';
      parts = [{ t: hello, drop: 3 }, opener, { t: choose(sess, 'fu:' + f0, concept.followUps[f0]) }];
    }
    plan.draft = joinParts(parts, maxW);
    return finishPlan(plan, sess, answer);
  }
  function finishPlan(plan, sess, answer) {
    var f = filterText(plan.draft, { maxWords: (plan.intent === 'safety' ? cfg.maxWords + 12 : cfg.maxWords) });
    plan.draft = f.text; plan.draftOk = f.ok;
    if (!/\?/.test(plan.draft)) plan.requireQuestion = false;
    sess.turn++;
    sess.history.push({ turn: sess.turn, learner: answer || null, intent: plan.intent, mc: plan.mc || null, text: plan.draft });
    if (sess.history.length > 12) sess.history.shift();
    plan.session = sess;
    return plan;
  }

  // ------------------------------------------------------------------------------------------
  // Coaching during the applied scenario (never gives the answer away)
  // ------------------------------------------------------------------------------------------
  function dependencyIssue(concept, lanes) {
    var sc = concept.scenario;
    for (var i = 0; i < sc.lanes.length; i++) {
      var L = sc.lanes[i], placed = lanes && lanes[L.id];
      if (!placed || !placed.length) continue;
      var rank = {}; L.cards.forEach(function (c, k) { rank[c.id] = k; });
      for (var a = 0; a < placed.length; a++) {
        for (var b = a + 1; b < placed.length; b++) {
          if (rank[placed[a]] > rank[placed[b]]) {
            var early = L.cards[rank[placed[a]]];
            return { lane: L.id, laneLabel: L.label, card: early.id, cardName: early.t };
          }
        }
      }
    }
    return null;
  }
  /**
   * coachPlan(state) -> plan. state: {concept, persona, lanes:{laneId:[cardIds]}, question:'testStart'|'criticalPath', answer,
   *                                   attempts, hintsGiven}
   */
  function coachPlan(state) {
    state = state || {};
    var concept = getConcept(state.concept), P = persona(state.persona || 'jo'), sess = session(P.id, concept.id + ':coach', state);
    var level = clamp((state.hintsGiven != null ? state.hintsGiven : (state.attempts || 1) - 1) + 1, 1, 3);
    var plan = { persona: P.id, concept: concept.id, mode: 'coach', intent: 'hint', level: level, facts: [], leaks: [], requireQuestion: false };
    var sc = concept.scenario, qs = sc.questions;
    Object.keys(qs).forEach(function (k) { plan.leaks = plan.leaks.concat(qs[k].leaks); });
    var parts = [];
    if (state.lanes) {
      var issue = dependencyIssue(concept, state.lanes);
      if (!issue) { plan.intent = 'praise'; parts = [{ t: choose(sess, 'coachPraise', BANK.coachPraise) }]; }
      else {
        plan.target = issue;
        var key = level === 1 ? 'coachFirst' : level === 2 ? 'coachSecond' : 'coachThird';
        parts = [{ t: choose(sess, 'hintIntro', BANK.hintIntro), drop: 1 }, { t: fill(choose(sess, key, BANK[key]), { lane: issue.laneLabel, card: issue.cardName }) }];
        plan.facts.push(concept.facts.dependencies);
      }
    } else if (state.question && qs[state.question]) {
      var Q = qs[state.question], ans = String(state.answer || '');
      var right = ans && Q.correct.every(function (re) { return re.test(ans); }) && !(Q.wrong || []).some(function (re) { return re.test(ans); });
      if (right) { plan.intent = 'praise'; parts = [{ t: choose(sess, 'coachPraise', BANK.coachPraise) }]; }
      else {
        var c = ans ? classify(ans, concept) : { misconceptions: [] };
        if (c.misconceptions.length && level < 3) {
          var m = concept.misconceptions[c.misconceptions[0]]; plan.mc = c.misconceptions[0]; plan.intent = 'probe';
          parts = [{ t: choose(sess, 'hintIntro', BANK.hintIntro), drop: 1 }, { t: choose(sess, 'probe:' + plan.mc, m.probes) }];
        } else {
          parts = [{ t: choose(sess, 'hintIntro', BANK.hintIntro), drop: 1 }, { t: Q.hints[level - 1] }];
        }
      }
    } else {
      parts = [{ t: choose(sess, 'hintIntro', BANK.hintIntro), drop: 1 }, { t: choose(sess, 'fu:coach', concept.followUps.dependencies) }];
    }
    plan.draft = joinParts(parts, cfg.maxWords);
    var f = filterText(plan.draft, { leaks: plan.leaks });
    plan.draftOk = f.ok; plan.draft = f.text;
    plan.requireQuestion = /\?/.test(plan.draft);
    return plan;
  }

  // ------------------------------------------------------------------------------------------
  // Prompt building (short and strict: small models follow short prompts best)
  // ------------------------------------------------------------------------------------------
  var TEXT_SCHEMA = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] };
  function buildRealisePrompt(plan, ctx) {
    var P = persona(plan.persona), concept = getConcept(plan.concept);
    var facts = uniq([concept.facts[plan.facet]].concat(plan.facts)).filter(Boolean).slice(0, 3);
    var sys = [
      'You are ' + P.name + ', ' + P.role + ', in a cosy game about reopening a small UK branch railway.',
      'Voice: ' + P.voice + '.',
      'Rules: UK English. At most ' + (ctx.maxWords || cfg.maxWords) + ' words. Warm, gently funny, never rude.',
      'Keep the meaning of the draft. ' + (plan.requireQuestion ? 'Keep its question and end with it. ' : '') + 'Never give the answer away.',
      'Use only these facts:' + (facts.length ? '\n- ' + facts.join('\n- ') : ' none.'),
      'No real companies, brands or people. No safety advice.',
      'Reply only as JSON: {"text": "..."}'
    ].join('\n');
    var hist = (plan.session && plan.session.history || []).slice(-3, -1).map(function (h) { return (h.learner ? 'Learner: ' + String(h.learner).slice(0, 120) + '\n' : '') + P.short + ': ' + h.text; }).join('\n');
    var user = (hist ? 'Earlier:\n' + hist + '\n\n' : '') +
      (ctx.answer ? 'Learner just said: «' + String(ctx.answer).slice(0, 200) + '»\n' : '') +
      'Say this in your own voice: «' + plan.draft + '»';
    return [
      { role: 'system', content: sys },
      { role: 'user', content: 'Say this in your own voice: «What has to finish before the brakes can start?»' },
      { role: 'assistant', content: JSON.stringify({ text: P.sample }) },
      { role: 'user', content: user }
    ];
  }
  function buildClassifyPrompt(answer, concept) {
    concept = getConcept(concept);
    var ids = Object.keys(concept.misconceptions);
    var sys = 'You label a learner\'s answer about ' + concept.title.toLowerCase() + '. Reply only as JSON: {"misconceptions": [ids], "understood": [ids]}.\n' +
      'Misconception ids:\n' + ids.map(function (id) { return '- ' + id + ': ' + concept.misconceptions[id].label; }).join('\n') +
      '\nUnderstood ids: ' + Object.keys(concept.understood).join(', ') + '.\nUse [] when none apply. Never invent ids.';
    return [{ role: 'system', content: sys }, { role: 'user', content: 'Answer: «' + String(answer).slice(0, 300) + '»' }];
  }
  function classifySchema(concept) {
    concept = getConcept(concept);
    return { type: 'object', properties: {
      misconceptions: { type: 'array', items: { type: 'string', enum: Object.keys(concept.misconceptions) } },
      understood: { type: 'array', items: { type: 'string', enum: Object.keys(concept.understood) } } },
      required: ['misconceptions', 'understood'] };
  }
  /** Tolerant JSON extraction: code fences, prose around it, single quotes, trailing commas. */
  function parseJSON(s) {
    if (s && typeof s === 'object') return s;
    s = String(s || '').replace(/```(?:json)?/gi, '').trim();
    var a = s.indexOf('{'), b = s.lastIndexOf('}');
    if (a < 0 || b <= a) return null;
    var body = s.slice(a, b + 1);
    try { return JSON.parse(body); } catch (e) { /* try repairs */ }
    try { return JSON.parse(body.replace(/,\s*([}\]])/g, '$1').replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":').replace(/:\s*'([^']*)'/g, ': "$1"')); } catch (e2) { return null; }
  }

  // ------------------------------------------------------------------------------------------
  // Providers
  // ------------------------------------------------------------------------------------------
  var FACTORIES = {};
  function registerProvider(name, factory) { FACTORIES[name] = factory; }

  // Worker-backed provider (webllm / transformers / echo). The backend lives in js/ai/worker.js.
  function workerProvider(kind) {
    return function (opts) {
      var client = null, ready = false;
      function makeClient() {
        var W = LS.AIWorker;
        if (!W) throw new Error('js/ai/worker.js is not loaded');
        if (opts.useWorker !== false && typeof root.Worker === 'function' && typeof root.Blob === 'function' && root.URL && root.URL.createObjectURL) {
          try { return W.spawnClient(); } catch (e) { /* fall through to main thread */ }
        }
        return W.mainThreadClient();
      }
      return {
        name: kind, supportsSchema: kind === 'webllm' || kind === 'echo',
        load: function (onProgress) {
          client = makeClient();
          var payload = {
            kind: kind, moduleUrl: (opts.moduleUrl || {})[kind], model: opts.modelId, dtype: opts.dtype, device: opts.device,
            modelBaseUrl: opts.modelBaseUrl, modelLibBaseUrl: opts.modelLibBaseUrl, wasmPaths: opts.wasmPaths,
            cacheBackend: opts.cacheBackend, echo: opts.echo
          };
          // Make sure the worker actually started; if not, run the same backend on the main thread.
          return client.request('ping', {}, 5000).catch(function () {
            try { client.terminate(); } catch (e) { /* ignore */ }
            client = LS.AIWorker.mainThreadClient();
          }).then(function () {
            return client.request('load', payload, opts.loadTimeoutMs, onProgress);
          }).then(function (r) { ready = true; return r; });
        },
        generate: function (messages, o) {
          if (!ready) return Promise.reject(new Error('not ready'));
          return client.request('chat', { messages: messages, maxTokens: o.maxTokens, temperature: o.temperature, schema: o.schema || null }, o.timeoutMs)
            .then(function (r) { return r && r.text != null ? r.text : r; });
        },
        abort: function () { if (client) client.post('abort', {}); },
        unload: function () { ready = false; if (client) client.terminate(); client = null; },
        get transport() { return client ? (client.isWorker ? 'worker' : 'main-thread') : null; }
      };
    };
  }
  registerProvider('webllm', workerProvider('webllm'));
  registerProvider('transformers', workerProvider('transformers'));
  registerProvider('echo', workerProvider('echo'));

  // ------------------------------------------------------------------------------------------
  // Device capability and tier selection
  // ------------------------------------------------------------------------------------------
  function detect() {
    var nav = root.navigator || {};
    var caps = {
      webgpu: !!nav.gpu, wasm: typeof root.WebAssembly === 'object', worker: typeof root.Worker === 'function',
      deviceMemory: nav.deviceMemory || null, cores: nav.hardwareConcurrency || null,
      mobile: /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '') || (nav.maxTouchPoints > 1 && /Macintosh/.test(nav.userAgent || '')),
      saveData: !!(nav.connection && nav.connection.saveData), f16: false, maxBufferMB: 0, fallbackAdapter: false,
      quotaMB: null, fileProtocol: !!(root.location && root.location.protocol === 'file:')
    };
    var jobs = [];
    if (caps.webgpu) {
      jobs.push(withTimeout(nav.gpu.requestAdapter(), 3000, 'adapter').then(function (ad) {
        if (!ad) { caps.webgpu = false; return; }
        caps.f16 = !!(ad.features && ad.features.has && ad.features.has('shader-f16'));
        caps.maxBufferMB = Math.round(((ad.limits && ad.limits.maxStorageBufferBindingSize) || 0) / 1048576);
        caps.fallbackAdapter = !!(ad.isFallbackAdapter || (ad.info && ad.info.isFallbackAdapter));
      }).catch(function () { caps.webgpu = false; }));
    }
    if (nav.storage && nav.storage.estimate) {
      jobs.push(withTimeout(nav.storage.estimate(), 2000, 'quota').then(function (e) { caps.quotaMB = Math.round(((e.quota || 0) - (e.usage || 0)) / 1048576); }).catch(function () {}));
    }
    return Promise.all(jobs).then(function () { return caps; });
  }
  /** selectTier(caps, opts) -> {tier, provider, reason}. Pure: tested in Node. */
  function selectTier(caps, opts) {
    opts = opts || {};
    var mem = caps.deviceMemory || 4, quota = caps.quotaMB == null ? 4096 : caps.quotaMB;
    if (opts.tier) return { tier: opts.tier, provider: opts.tier === 'none' ? 'scripted' : (caps.webgpu ? 'webllm' : 'transformers'), reason: 'forced' };
    if (caps.saveData) return { tier: 'none', provider: 'scripted', reason: 'data saver is on' };
    if (quota < 600) return { tier: 'none', provider: 'scripted', reason: 'not enough storage for a model' };
    if (caps.webgpu && !caps.fallbackAdapter) {
      if (caps.mobile || mem <= 4 || (caps.maxBufferMB && caps.maxBufferMB < 1024) || quota < 1500)
        return { tier: 'tiny', provider: 'webllm', reason: 'WebGPU on a smaller device' };
      if (opts.allowLarge && !caps.mobile && mem >= 8 && quota >= 4000 && (caps.cores || 0) >= 8)
        return { tier: 'high', provider: 'webllm', reason: 'WebGPU on a strong desktop' };
      return { tier: 'default', provider: 'webllm', reason: 'WebGPU available' };
    }
    if (caps.wasm && caps.worker && !caps.mobile && mem >= 8 && (caps.cores || 0) >= 8)
      return { tier: 'tiny', provider: 'transformers', reason: 'no WebGPU; CPU is strong enough for the tiny model' };
    return { tier: 'none', provider: 'scripted', reason: caps.webgpu ? 'software GPU only' : 'no WebGPU and a modest CPU' };
  }
  function modelFor(provider, tier, caps) {
    var table = (cfg.models && cfg.models[provider]) || MODELS[provider] || {};
    var m = table[tier] || table['default'];
    if (!m) return null;
    if (provider === 'webllm') return { id: (caps && caps.f16 === false && m.f32) ? m.f32 : m.id };
    if (provider === 'transformers') return { id: m.id, dtype: m.dtype, device: caps && caps.webgpu ? 'webgpu' : 'wasm' };
    return { id: m.id };
  }

  // ------------------------------------------------------------------------------------------
  // Orchestration
  // ------------------------------------------------------------------------------------------
  var ST = { state: 'scripted', provider: 'scripted', tier: 'none', model: null, progress: 0, reason: 'not initialised', transport: null,
             caps: null, stats: { lines: 0, model: 0, fallback: 0, rejected: 0, timeouts: 0, errors: 0, lastMs: 0, warmupMs: null } };
  var P_INST = null, queue = Promise.resolve(), initPromise = null;
  function setStatus(patch) {
    assign(ST, patch);
    if (typeof cfg.onStatus === 'function') { try { cfg.onStatus(status()); } catch (e) { /* ignore */ } }
  }
  function status() { var s = assign({}, ST); s.stats = assign({}, ST.stats); s.ready = ST.state === 'ready'; return s; }
  function modelReady() { return ST.state === 'ready' && P_INST && typeof P_INST.generate === 'function'; }

  /** init(opts) -> Promise<status>. Never rejects. The game can call it and carry on without awaiting. */
  function init(opts) {
    cfg = assign({}, DEFAULTS, root.LS_AI_CONFIG || {}, opts || {});
    if (opts && opts.moduleUrl) cfg.moduleUrl = assign({}, DEFAULTS.moduleUrl, opts.moduleUrl);
    syncFromPack();
    Object.keys(SESSIONS).forEach(function (k) { delete SESSIONS[k]; });
    if (P_INST && P_INST.unload) { try { P_INST.unload(); } catch (e) { /* ignore */ } }
    P_INST = null;
    ST.stats = { lines: 0, model: 0, fallback: 0, rejected: 0, timeouts: 0, errors: 0, lastMs: 0, warmupMs: null };
    var saved = safeStore(cfg.storageKey) || {};
    var optIn = cfg.optIn === true || ((!opts || opts.optIn == null) && saved.optIn === true);
    if (cfg.provider === 'scripted' || !optIn) {
      setStatus({ state: 'scripted', provider: 'scripted', tier: 'none', model: null, progress: 0, reason: optIn ? 'scripted by choice' : 'player has not opted in' });
      return (initPromise = Promise.resolve(status()));
    }
    setStatus({ state: 'checking', reason: 'checking this device' });
    initPromise = (cfg.caps ? Promise.resolve(cfg.caps) : detect()).then(function (caps) {
      ST.caps = caps;
      var pick = selectTier(caps, cfg), provName = cfg.provider === 'auto' ? pick.provider : cfg.provider;
      if (provName === 'scripted' || pick.tier === 'none' && cfg.provider === 'auto') {
        setStatus({ state: 'scripted', provider: 'scripted', tier: 'none', reason: pick.reason }); return status();
      }
      var tier = pick.tier === 'none' ? 'tiny' : pick.tier;
      var factory = FACTORIES[provName];
      if (!factory) { setStatus({ state: 'failed', provider: 'scripted', reason: 'unknown provider ' + provName }); return status(); }
      var m = modelFor(provName, tier, caps) || { id: cfg.model };
      if (cfg.model) m.id = cfg.model;
      P_INST = factory(assign({}, cfg, { modelId: m.id, dtype: m.dtype, device: m.device }, cfg.providerOptions || {}));
      setStatus({ state: 'downloading', provider: provName, tier: tier, model: m.id, progress: 0, reason: pick.reason });
      return withTimeout(P_INST.load(function (p) {
        var frac = typeof p === 'number' ? p : (p && (p.progress != null ? p.progress : (p.loaded && p.total ? p.loaded / p.total : 0))) || 0;
        setStatus({ state: 'downloading', progress: clamp(frac > 1 ? frac / 100 : frac, 0, 1) });
      }), cfg.loadTimeoutMs, 'model load').then(function () {
        setStatus({ state: 'ready', progress: 1, transport: P_INST.transport || 'direct' });
        safeStore(cfg.storageKey, { optIn: true, model: m.id, provider: provName, at: Date.now() });
        if (cfg.warmup === false) return status();
        var t0 = now();
        return withTimeout(P_INST.generate([{ role: 'user', content: 'Reply as JSON: {"text": "Ready."}' }], { maxTokens: 8, temperature: 0, schema: TEXT_SCHEMA, timeoutMs: 20000 }), 20000, 'warm-up')
          .then(function () { ST.stats.warmupMs = Math.round(now() - t0); }, function () { ST.stats.warmupMs = -1; })
          .then(function () { return status(); });
      });
    }).catch(function (e) {
      setStatus({ state: 'failed', provider: 'scripted', reason: String(e && e.message || e) });
      P_INST = null;
      return status();
    });
    return initPromise;
  }

  // One model call at a time; each with its own timeout; overall deadline enforced by the caller.
  function enqueue(fn) {
    var p = queue.then(fn, fn);
    queue = p.then(function () {}, function () {});
    return p;
  }
  /**
   * realise(plan, ctx) -> Promise<{text, source, reasons}>. Tries the model (with retries) and validates
   * the output; resolves with the authored draft on any failure. Never rejects, never exceeds the deadline.
   */
  function realise(plan, ctx) {
    ctx = ctx || {};
    var fallback = { text: plan.draft, source: 'scripted', reasons: [] };
    if (plan.authoredOnly || ctx.scripted || !modelReady()) return Promise.resolve(fallback);
    var t0 = now(), deadline = ctx.deadlineMs || cfg.deadlineMs, reasons = [], P = P_INST;
    var messages = buildRealisePrompt(plan, ctx);
    var attempt = 0, cancelled = false;
    function tryOnce() {
      if (cancelled) return Promise.resolve(null);
      var left = deadline - (now() - t0);
      if (left < 60) { reasons.push('deadline'); return Promise.resolve(null); }
      attempt++;
      var temp = clamp(cfg.temperature + (attempt - 1) * 0.15, 0, 1.2);
      return enqueue(function () {
        if (cancelled) return null;
        return withTimeout(P.generate(messages, { maxTokens: cfg.maxTokens, temperature: temp, schema: P.supportsSchema ? TEXT_SCHEMA : null, timeoutMs: Math.min(cfg.callTimeoutMs, left) }), Math.min(cfg.callTimeoutMs, left), 'generate');
      }).then(function (raw) {
        if (raw == null) return null;
        // JSON is asked for; plain text is accepted only if the model clearly didn't try JSON at all.
        var obj = parseJSON(raw), looksJSON = /[{}]|"text"\s*:/.test(String(raw));
        var text = obj && typeof obj.text === 'string' ? obj.text : (!obj && !looksJSON ? String(raw) : null);
        if (text == null) { reasons.push('bad-json'); return attempt <= cfg.retries ? tryOnce() : null; }
        var f = filterText(text, { generated: true, maxWords: ctx.maxWords || cfg.maxWords, leaks: plan.leaks, requireQuestion: plan.requireQuestion, draft: plan.draft });
        if (!f.ok) { reasons = reasons.concat(f.reasons); ST.stats.rejected++; return attempt <= cfg.retries ? tryOnce() : null; }
        return f.text;
      }, function (e) {
        if (/timed out/.test(String(e && e.message))) { ST.stats.timeouts++; reasons.push('timeout'); if (P.abort) try { P.abort(); } catch (x) { /* ignore */ } }
        else { ST.stats.errors++; reasons.push('error:' + String(e && e.message || e).slice(0, 60)); }
        return attempt <= cfg.retries ? tryOnce() : null;
      });
    }
    var timer;
    var guard = new Promise(function (res) { timer = setTimeout(function () { cancelled = true; reasons.push('deadline'); res(null); }, deadline); });
    return Promise.race([tryOnce(), guard]).then(function (text) {
      clearTimeout(timer); cancelled = true;
      ST.stats.lastMs = Math.round(now() - t0);
      if (text) { ST.stats.model++; return { text: text, source: 'model', reasons: reasons }; }
      ST.stats.fallback++;
      return { text: plan.draft, source: 'scripted', reasons: reasons };
    });
  }
  function result(plan, r) {
    var sess = plan.session;
    if (sess && sess.history.length && r.source === 'model') sess.history[sess.history.length - 1].text = r.text;
    ST.stats.lines++;
    return {
      text: r.text, intent: plan.intent, source: r.source, persona: plan.persona, concept: plan.concept,
      misconception: plan.mc || null, facet: plan.facet || null, level: plan.level || null, whatIf: plan.whatIf || null,
      classification: plan.classification || null, rejected: r.reasons && r.reasons.length ? r.reasons : undefined
    };
  }

  /** say(persona, context) -> Promise<{text, intent, source, ...}>. */
  function say(p, context) {
    var plan;
    try { plan = planTurn(p, context || {}); }
    catch (e) { return Promise.resolve({ text: 'Hmm, let me think about that. What would you do first?', intent: 'socratic', source: 'scripted', error: String(e) }); }
    return realise(plan, context || {}).then(function (r) { return result(plan, r); });
  }
  /** sayNow(persona, context) -> {text, intent} synchronously, authored only. For when even a promise is too slow. */
  function sayNow(p, context) { var plan = planTurn(p, context || {}); return result(plan, { text: plan.draft, source: 'scripted', reasons: [] }); }
  /** followUp(persona, context) -> Promise: a Socratic follow-up on the learner's last answer (or the next uncovered facet). */
  function followUp(p, context) {
    context = assign({}, context || {});
    if (context.answer == null) {
      var sess = session(persona(p).id, getConcept(context.concept).id, context), last = sess.history.slice().reverse().filter(function (h) { return h.learner; })[0];
      if (last) context.answer = last.learner;
    }
    context.mode = context.answer ? 'followup' : 'open';
    return say(p, context);
  }
  /** coach(scenarioState) -> Promise<{text, intent, level, ...}>: hints that never give the answer. */
  function coach(state) {
    var plan;
    try { plan = coachPlan(state || {}); }
    catch (e) { return Promise.resolve({ text: 'Take it one card at a time. What does each job need first?', intent: 'hint', source: 'scripted', level: 1 }); }
    return realise(plan, state || {}).then(function (r) { return result(plan, r); });
  }
  /** classifyDeep(answer, concept) -> Promise: rules merged with a model vote (model can only add weight, never invent ids). */
  function classifyDeep(answer, concept) {
    var base = classify(answer, concept);
    if (!modelReady() || safetyTopic(answer)) return Promise.resolve(assign(base, { source: 'rules' }));
    var C = getConcept(concept), P = P_INST;
    return enqueue(function () {
      return withTimeout(P.generate(buildClassifyPrompt(answer, C), { maxTokens: 48, temperature: 0, schema: P.supportsSchema ? classifySchema(C) : null, timeoutMs: cfg.callTimeoutMs }), cfg.callTimeoutMs, 'classify');
    }).then(function (raw) {
      var o = parseJSON(raw);
      if (!o || !Array.isArray(o.misconceptions)) return assign(base, { source: 'rules' });
      var scores = assign({}, base.scores);
      o.misconceptions.filter(function (id) { return C.misconceptions[id]; }).forEach(function (id) {
        scores[id] = clamp((scores[id] || 0) + 0.3, 0, 0.95);   // model alone reaches 0.3: below the 0.5 bar
      });
      Object.keys(base.scores).forEach(function (id) { if (o.misconceptions.indexOf(id) < 0) scores[id] = clamp(scores[id] - 0.1, 0, 1); });
      var list = Object.keys(scores).filter(function (id) { return scores[id] >= 0.5; }).sort(function (a, b) { return scores[b] - scores[a]; });
      var und = uniq(base.understood.concat((o.understood || []).filter(function (f) { return C.understood[f]; })));
      return { misconceptions: list, understood: und, confidence: list.length ? +scores[list[0]].toFixed(2) : base.confidence, scores: scores, evidence: base.evidence, source: 'rules+model' };
    }, function () { return assign(base, { source: 'rules' }); });
  }
  function optIn(v) { var s = safeStore(cfg.storageKey) || {}; s.optIn = !!v; safeStore(cfg.storageKey, s); return !!v; }

  return {
    version: VERSION,
    init: init, status: status, say: say, sayNow: sayNow, followUp: followUp, coach: coach,
    classify: classify, classifyDeep: classifyDeep, optIn: optIn,
    registerProvider: registerProvider, detect: detect, selectTier: selectTier, modelFor: modelFor,
    filter: filterText, bannedNames: bannedNames, safetyTopic: safetyTopic, cpm: cpm,
    whatIf: function (conceptId, seed) { return makeWhatIf(getConcept(conceptId), mulberry32(seed != null ? seed : (Math.random() * 4294967296) >>> 0)); },
    checkWhatIf: checkWhatIf,
    scenario: function (conceptId) { return scenarioFacts(getConcept(conceptId)); },
    reset: function () { Object.keys(SESSIONS).forEach(function (k) { delete SESSIONS[k]; }); },
    session: function (p, conceptId) { return session(persona(p).id, getConcept(conceptId).id); },
    concepts: CONCEPTS, personas: PERSONAS, models: MODELS, safetyLines: SAFETY_LINES, banned: BANNED,
    _internal: { planTurn: planTurn, coachPlan: coachPlan, buildRealisePrompt: buildRealisePrompt, buildClassifyPrompt: buildClassifyPrompt,
                 parseJSON: parseJSON, realise: realise, capLength: capLength, echoOf: echoOf, syncFromPack: syncFromPack, config: function () { return cfg; } }
  };
});
