/* LINESIDE — AI tutor model backend (LS.AIWorker)
 *
 * Runs a small language model for js/ai/tutor.js, preferably inside a Web Worker so generation never
 * stalls the game's draw loop. Backends: 'webllm' (@mlc-ai/web-llm, WebGPU), 'transformers'
 * (@huggingface/transformers, WebGPU or WASM) and 'echo' (no model; used by the tests).
 *
 * file:// notes (checked in headless Chromium 141, see docs/AI_TUTOR.md):
 *   - new Worker('js/ai/worker.js') is refused from file:// (SecurityError), so we never do that.
 *     Instead this whole file is a single function whose source is turned into a Blob and started as a
 *     CLASSIC worker. Blob classic workers work from file://; Blob MODULE workers did not.
 *   - Inside that worker, import('https://…') of a CORS-enabled ES module works, so the runtimes are
 *     loaded from the configured module URL. A relative import from a file:// page does not work.
 *   - If a worker can't be started at all, mainThreadClient() runs the same backend on the page.
 *
 * Load order: include this before js/ai/tutor.js. Also require()-able in Node for tests.
 */
(function main(root) {
  'use strict';

  function createBackend(scope) {
    var kind = null, engine = null, gen = null, busy = Promise.resolve(), echoCfg = {};

    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    function load(p, progress) {
      progress = progress || function () {};
      kind = p.kind;
      if (kind === 'echo') {
        echoCfg = p.echo || {};
        var steps = 4, chain = Promise.resolve();
        for (var i = 1; i <= steps; i++) (function (k) { chain = chain.then(function () { progress({ progress: k / steps, text: 'echo ' + k }); return sleep(echoCfg.loadStepMs || 5); }); })(i);
        return chain.then(function () {
          if (echoCfg.failLoad) throw new Error('echo: load failed on purpose');
          engine = { echo: true }; return { ok: true, model: 'echo' };
        });
      }
      if (!p.moduleUrl) return Promise.reject(new Error('no module URL configured for ' + kind));
      return import(p.moduleUrl).then(function (mod) {
        if (kind === 'webllm') {
          var appConfig;
          if (mod.prebuiltAppConfig) {
            appConfig = JSON.parse(JSON.stringify(mod.prebuiltAppConfig));
            appConfig.cacheBackend = p.cacheBackend || 'cache';
            if (p.modelBaseUrl || p.modelLibBaseUrl) {
              appConfig.model_list = appConfig.model_list.map(function (r) {
                r = Object.assign({}, r);
                if (p.modelBaseUrl) r.model = p.modelBaseUrl.replace(/\/$/, '') + '/' + r.model_id;
                if (p.modelLibBaseUrl) r.model_lib = p.modelLibBaseUrl.replace(/\/$/, '') + '/' + String(r.model_lib).split('/').pop();
                return r;
              });
            }
          }
          return mod.CreateMLCEngine(p.model, {
            appConfig: appConfig,
            initProgressCallback: function (r) { progress({ progress: r.progress, text: r.text }); }
          }).then(function (e) { engine = e; return { ok: true, model: p.model }; });
        }
        if (kind === 'transformers') {
          var T = mod;
          if (p.modelBaseUrl) { T.env.remoteHost = p.modelBaseUrl.replace(/\/?$/, '/'); T.env.remotePathTemplate = '{model}/'; }
          if (p.wasmPaths && T.env.backends && T.env.backends.onnx && T.env.backends.onnx.wasm) T.env.backends.onnx.wasm.wasmPaths = p.wasmPaths;
          T.env.allowLocalModels = false;
          return T.pipeline('text-generation', p.model, {
            device: p.device || 'wasm', dtype: p.dtype || 'q4',
            progress_callback: function (x) {
              if (x && (x.status === 'progress_total' || x.status === 'progress') && x.progress != null) progress({ progress: x.progress / 100, text: x.file || '' });
            }
          }).then(function (g) { gen = g; return { ok: true, model: p.model }; });
        }
        throw new Error('unknown backend ' + kind);
      });
    }

    function chatNow(p) {
      var messages = p.messages || [], maxTokens = p.maxTokens || 64, temperature = p.temperature == null ? 0.7 : p.temperature;
      if (kind === 'echo') {
        var last = String((messages[messages.length - 1] || {}).content || '');
        var m = /«([^»]*)»\s*$/.exec(last);
        var text = echoCfg.reply != null ? echoCfg.reply : (m ? m[1] : 'Echo.');
        return sleep(echoCfg.delayMs || 1).then(function () { return { text: echoCfg.raw ? text : JSON.stringify({ text: text }) }; });
      }
      if (kind === 'webllm') {
        var req = { messages: messages, max_tokens: maxTokens, temperature: temperature };
        if (p.schema) req.response_format = { type: 'json_object', schema: JSON.stringify(p.schema) };
        return engine.chat.completions.create(req).then(function (r) {
          return { text: r.choices[0].message.content, finish: r.choices[0].finish_reason, usage: r.usage };
        });
      }
      if (kind === 'transformers') {
        return gen(messages, { max_new_tokens: maxTokens, temperature: Math.max(temperature, 0.01), do_sample: temperature > 0, return_full_text: false })
          .then(function (out) {
            var g = out && out[0] && out[0].generated_text;
            return { text: Array.isArray(g) ? String((g[g.length - 1] || {}).content || '') : String(g || '') };
          });
      }
      return Promise.reject(new Error('backend not loaded'));
    }
    // One generation at a time; later requests wait their turn.
    function chat(p) {
      var run = busy.then(function () { return chatNow(p); });
      busy = run.then(function () {}, function () {});
      return run;
    }
    function abort() { try { if (engine && engine.interruptGenerate) engine.interruptGenerate(); } catch (e) { /* ignore */ } }
    function unload() { try { if (engine && engine.unload) engine.unload(); } catch (e) { /* ignore */ } engine = null; gen = null; }
    return { load: load, chat: chat, abort: abort, unload: unload };
  }

  function handle(backend, msg, reply) {
    var id = msg.id, t = msg.type, p = msg.payload || {};
    var done = function (r) { reply({ id: id, type: 'result', result: r }); };
    var fail = function (e) { reply({ id: id, type: 'error', error: String((e && e.message) || e) }); };
    try {
      if (t === 'ping') return done({ pong: true });
      if (t === 'load') return backend.load(p, function (pr) { reply({ id: id, type: 'progress', progress: pr }); }).then(done, fail);
      if (t === 'chat') return backend.chat(p).then(done, fail);
      if (t === 'abort') { backend.abort(); return done({ ok: true }); }
      if (t === 'unload') { backend.unload(); return done({ ok: true }); }
      fail(new Error('unknown message ' + t));
    } catch (e) { fail(e); }
  }

  // Inside a worker: serve requests and stop here.
  var inWorker = typeof root.importScripts === 'function' && typeof root.document === 'undefined' && typeof root.postMessage === 'function';
  if (inWorker && !root.__LS_AI_NO_AUTOBOOT) {
    var be = createBackend(root);
    root.onmessage = function (e) { handle(be, e.data || {}, function (m) { root.postMessage(m); }); };
    return;
  }

  // On the page (or in Node): clients that tutor.js talks to.
  function makeClient(send, isWorker, terminate) {
    var seq = 0, pending = {};
    function onReply(m) {
      var q = pending[m.id]; if (!q) return;
      if (m.type === 'progress') { if (q.onProgress) try { q.onProgress(m.progress); } catch (e) { /* ignore */ } return; }
      clearTimeout(q.timer); delete pending[m.id];
      if (m.type === 'error') q.reject(new Error(m.error)); else q.resolve(m.result);
    }
    function failAll(err) { Object.keys(pending).forEach(function (k) { var q = pending[k]; clearTimeout(q.timer); delete pending[k]; q.reject(err); }); }
    return {
      isWorker: isWorker, onReply: onReply, failAll: failAll,
      request: function (type, payload, timeoutMs, onProgress) {
        var id = ++seq;
        return new Promise(function (resolve, reject) {
          var q = pending[id] = { resolve: resolve, reject: reject, onProgress: onProgress };
          if (timeoutMs) q.timer = setTimeout(function () { delete pending[id]; reject(new Error(type + ' timed out after ' + timeoutMs + 'ms')); }, timeoutMs);
          try { send({ id: id, type: type, payload: payload }); } catch (e) { clearTimeout(q.timer); delete pending[id]; reject(e); }
        });
      },
      post: function (type, payload) { try { send({ id: ++seq, type: type, payload: payload }); } catch (e) { /* ignore */ } },
      terminate: function () { failAll(new Error('terminated')); if (terminate) terminate(); }
    };
  }
  function spawnClient() {
    var src = '(' + main.toString() + ')(self);';
    var url = root.URL.createObjectURL(new root.Blob([src], { type: 'text/javascript' }));
    var w = new root.Worker(url);              // classic worker on purpose (see header)
    var c = makeClient(function (m) { w.postMessage(m); }, true, function () { w.terminate(); try { root.URL.revokeObjectURL(url); } catch (e) { /* ignore */ } });
    w.onmessage = function (e) { c.onReply(e.data || {}); };
    w.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); c.failAll(new Error('worker error: ' + ((e && e.message) || 'could not start'))); };
    return c;
  }
  function mainThreadClient() {
    var be = createBackend(root), c;
    c = makeClient(function (m) { setTimeout(function () { handle(be, m, function (r) { c.onReply(r); }); }, 0); }, false, function () { be.unload(); });
    return c;
  }

  var api = { createBackend: createBackend, spawnClient: spawnClient, mainThreadClient: mainThreadClient, source: function () { return '(' + main.toString() + ')(self);'; } };
  root.LS = root.LS || {};
  root.LS.AIWorker = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
