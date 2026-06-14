// Node logic harness: boots Project Valley with mocked DOM/canvas and exercises
// real play paths to catch crashes / regressions. No browser required.
const fs=require('fs'), path=require('path'), vm=require('vm');

// ---------- universal element mock ----------
function rectMock(){return {left:0,top:0,right:960,bottom:640,width:960,height:640,x:0,y:0};}
function makeCtx(){
  const noop=()=>{};
  const ctx=new Proxy({
    canvas:{width:480,height:320},
    measureText:()=>({width:10}),
    createLinearGradient:()=>({addColorStop:noop}),
    createRadialGradient:()=>({addColorStop:noop}),
    createPattern:()=>({}),
    getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(1,(w||1)*(h||1)*4)),width:w||1,height:h||1}),
    createImageData:(w,h)=>({data:new Uint8ClampedArray(Math.max(1,(w||1)*(h||1)*4)),width:w||1,height:h||1}),
    putImageData:noop,
  },{
    get(t,p){ if(p in t)return t[p]; if(typeof p==='string'&&/^[a-z]/.test(p))return noop; return undefined; },
    set(t,p,v){ t[p]=v; return true; }
  });
  return ctx;
}
function makeEl(tag){
  const el={tagName:(tag||'div').toUpperCase(),style:{},dataset:{},children:[],_ctx:null,
    width:480,height:320,value:'',innerHTML:'',textContent:'',checked:false,
    classList:{_s:new Set(),add(){[...arguments].forEach(a=>this._s.add(a));},remove(){[...arguments].forEach(a=>this._s.delete(a));},toggle(c){this._s.has(c)?this._s.delete(c):this._s.add(c);},contains(c){return this._s.has(c);}},
    appendChild(c){this.children.push(c);return c;},removeChild(){},insertBefore(c){this.children.push(c);return c;},
    addEventListener(){},removeEventListener(){},setAttribute(){},removeAttribute(){},getAttribute(){return null;},
    focus(){},blur(){},click(){},remove(){},
    getBoundingClientRect:rectMock,
    querySelector(){return makeEl('div');},querySelectorAll(){return [];},
    getContext(){if(!this._ctx)this._ctx=makeCtx();return this._ctx;},
    cloneNode(){return makeEl(tag);},
  };
  return el;
}
const _els={};
const documentMock={
  getElementById(id){return _els[id]||(_els[id]=makeEl('div'));},
  createElement(tag){return makeEl(tag);},
  createElementNS(ns,tag){return makeEl(tag);},
  querySelector(){return makeEl('div');},querySelectorAll(){return [];},
  addEventListener(){},removeEventListener(){},
  body:makeEl('body'),documentElement:makeEl('html'),
  fonts:{ready:Promise.resolve(),load:()=>Promise.resolve()},
};
class ImageMock{constructor(){this.naturalWidth=64;this.naturalHeight=64;this.complete=false;}
  set src(v){this._src=v;this.complete=true;this.naturalWidth=this.naturalHeight=64; if(this.onload)process.nextTick(()=>this.onload&&this.onload());}
  get src(){return this._src;}}
class AudioMock{constructor(){}play(){return Promise.resolve();}pause(){}addEventListener(){}}
function audioNode(){return new Proxy({frequency:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},type:'sine'},{get(t,p){return p in t?t[p]:()=>audioNode();}});}
class AudioCtxMock{constructor(){this.currentTime=0;this.destination={};this.state='running';}
  createOscillator(){return audioNode();}createGain(){return audioNode();}createBiquadFilter(){return audioNode();}
  createBuffer(){return {getChannelData:()=>new Float32Array(1)};}createBufferSource(){return audioNode();}
  createDynamicsCompressor(){return audioNode();}resume(){return Promise.resolve();}suspend(){return Promise.resolve();}close(){return Promise.resolve();}}
const localStorageMock={_d:{},getItem(k){return k in this._d?this._d[k]:null;},setItem(k,v){this._d[k]=String(v);},removeItem(k){delete this._d[k];},clear(){this._d={};}};

// install globals
const G=globalThis;
G.window=G; G.document=documentMock; G.localStorage=localStorageMock;
G.Image=ImageMock; G.Audio=AudioMock; G.AudioContext=AudioCtxMock; G.webkitAudioContext=AudioCtxMock;
G.requestAnimationFrame=(cb)=>{return 1;}; G.cancelAnimationFrame=()=>{};
G.performance={now:()=>Date.now()};
G.navigator={userAgent:'node',maxTouchPoints:0,clipboard:{writeText:()=>Promise.resolve()}};
G.devicePixelRatio=1; G.innerWidth=960; G.innerHeight=640;
G.addEventListener=()=>{}; G.removeEventListener=()=>{};
G.alert=()=>{}; G.confirm=()=>true; G.prompt=()=>'';
G.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
G.getComputedStyle=()=>({getPropertyValue:()=>''});

// ---------- load game script ----------
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const scripts=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
let code=scripts.join('\n;\n');
// epilogue: capture top-level consts/fns into global for assertions
const names=['S','applyEffects','advanceWeek','getPhase','getPhaseIdx','getDlgPhaseIdx','chooseDlg','NPCS','OMAP','SMAP','ZONES','isSolid','render','updatePlayer','startGame','newGame','selectCharacter','beginGame','saveGame','loadGame','EVENTS','PHASES','DLG','transitionToMap','showEvent','triggerEvent','getObjectives','updateHUD','updateNotepad','WALK_FRAMES','updateNPCAI','CHARS','ATLAS','drawSprite'];
code+='\n;globalThis.__G=(function(){const o={};'+names.map(n=>`try{o['${n}']=${n};}catch(e){}`).join('')+'return o;})();';

const results={pass:[],fail:[]};
function check(name,fn){try{fn();results.pass.push(name);}catch(e){results.fail.push(name+' :: '+(e&&e.message||e));}}

try{ vm.runInThisContext(code,{filename:'index.html'}); }
catch(e){ console.error('BOOT FAILED:',e&&e.stack||e); process.exit(2); }
const g=G.__G||{};

// ---------- smoke tests ----------
check('boot: script evaluated',()=>{ if(!g.S)throw new Error('no game state S captured'); });
check('S.metrics has 5 keys',()=>{ const m=g.S.metrics; ['schedule','budget','safety','quality','morale'].forEach(k=>{ if(typeof m[k]!=='number')throw new Error('missing metric '+k); }); });
check('applyEffects clamps 0..100',()=>{ const m=g.S.metrics; m.safety=98; g.applyEffects({safety:50}); if(m.safety>100)throw new Error('not clamped high '+m.safety); m.budget=3; g.applyEffects({budget:-50}); if(m.budget<0)throw new Error('not clamped low '+m.budget); });
check('PHASES/getPhase cover the timeline',()=>{ [32,28,20,12,4,0,-4,-8].forEach(w=>{ const p=g.getPhase(w); if(!p)throw new Error('no phase for week '+w); }); });
check('OMAP is a non-empty 2D grid',()=>{ if(!Array.isArray(g.OMAP)||!Array.isArray(g.OMAP[0]))throw new Error('OMAP not 2D'); });
check('SMAP is a non-empty 2D grid',()=>{ if(!Array.isArray(g.SMAP)||!Array.isArray(g.SMAP[0]))throw new Error('SMAP not 2D'); });
check('isSolid handles out-of-bounds',()=>{ g.isSolid(-1,-1); g.isSolid(99999,99999); });
check('NPCS present (5) with dialogue',()=>{ if(!Array.isArray(g.NPCS)||g.NPCS.length<5)throw new Error('NPCS count '+(g.NPCS&&g.NPCS.length)); g.NPCS.forEach(n=>{ if(!g.DLG[n.id])throw new Error('no DLG for '+n.id); }); });
check('every NPC dialogue choice applies without throwing & stays clamped',()=>{
  for(const id in g.DLG){ const phases=g.DLG[id];
    phases.forEach(ph=>ph.forEach(line=>(line.choices||[]).forEach(c=>{ if(c.e)g.applyEffects(c.e); })));
  }
  const m=g.S.metrics; for(const k in m){ if(m[k]<0||m[k]>100)throw new Error('metric out of range after choices: '+k+'='+m[k]); }
});
check('EVENTS choices apply without throwing',()=>{ (g.EVENTS||[]).forEach(ev=>(ev.choices||[]).forEach(c=>{ if(c.e)g.applyEffects(c.e); })); });
check('save -> load round-trip',()=>{ if(g.saveGame)g.saveGame(); if(g.loadGame)g.loadGame(); });
check('advanceWeek progresses through phases without throwing',()=>{ g.S.week=32; let guard=0; while(g.S.week>-8 && guard++<40){ const before=g.S.week; try{g.advanceWeek();}catch(e){throw new Error('advanceWeek @week '+before+': '+e.message);} if(g.S.week===before)break; } });
check('loadGame recovers from a corrupt save (clamp metrics + validate char + safe spawn)',()=>{
  G.localStorage.setItem('projectValley_save', JSON.stringify({week:32,map:'office',px:16,py:16,playerChar:99,metrics:{schedule:999,budget:-50,safety:'x'}}));
  g.loadGame();
  const m=g.S.metrics; for(const k in m){ if(typeof m[k]!=='number'||m[k]<0||m[k]>100) throw new Error('metric not clamped: '+k+'='+m[k]); }
  if(g.S.playerChar<0||g.S.playerChar>3) throw new Error('playerChar not validated: '+g.S.playerChar);
  if(g.isSolid(Math.floor((g.S.px+8)/16),Math.floor((g.S.py+12)/16))) throw new Error('player loaded into a solid tile');
});
check('animation counters stay finite (WALK_FRAMES defined; update loop safe)',()=>{
  if(typeof g.WALK_FRAMES!=='number') throw new Error('WALK_FRAMES missing/not a number');
  g.S.screen='game'; g.S.map='office'; g.S.pmoving=true; g.S.animTimer=0;
  for(let i=0;i<12;i++){ try{ if(g.updatePlayer)g.updatePlayer(200); }catch(e){ throw new Error('updatePlayer threw: '+e.message);} }
  if(!Number.isFinite(g.S.pframe)) throw new Error('S.pframe not finite: '+g.S.pframe);
  for(let i=0;i<12;i++){ try{ if(g.updateNPCAI)g.updateNPCAI(200); }catch(e){ throw new Error('updateNPCAI threw: '+e.message);} }
  g.NPCS.forEach(n=>{ if(!Number.isFinite(n.aiFrame)) throw new Error('aiFrame not finite for '+n.id+': '+n.aiFrame); });
});
check('ATLAS manifest is well-formed (every entry [x,y,w,h] of 4 finite numbers)',()=>{
  if(!g.ATLAS||typeof g.ATLAS!=='object') throw new Error('ATLAS missing');
  const need=['floor','wall','desk','chair','plant','sofa','table','cabin','excavator','fence','track','grass'];
  need.forEach(k=>{ const a=g.ATLAS[k]; if(!Array.isArray(a)||a.length!==4||a.some(n=>!Number.isFinite(n))) throw new Error('bad atlas entry: '+k+'='+JSON.stringify(a)); });
  if(typeof g.drawSprite!=='function') throw new Error('drawSprite missing');
});

// ---------- report ----------
console.log('\n=== Project Valley — logic harness ===');
results.pass.forEach(p=>console.log('  PASS  '+p));
results.fail.forEach(f=>console.log('  FAIL  '+f));
console.log(`\n${results.pass.length} passed, ${results.fail.length} failed.`);
process.exit(results.fail.length?1:0);
