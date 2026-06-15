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
G.setTimeout=(fn,ms)=>{ if(typeof fn==='function'){ try{fn();}catch(e){} } return 0; }; G.clearTimeout=()=>{}; G.setInterval=()=>0; G.clearInterval=()=>{};
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
const names=['S','applyEffects','advanceWeek','getPhase','getPhaseIdx','getDlgPhaseIdx','chooseDlg','NPCS','OMAP','SMAP','ZONES','isSolid','render','updatePlayer','startGame','newGame','selectCharacter','beginGame','saveGame','loadGame','EVENTS','PHASES','DLG','transitionToMap','showEvent','triggerEvent','getObjectives','updateHUD','updateNotepad','WALK_FRAMES','updateNPCAI','CHARS','ATLAS','drawSprite','OFFICE_W','OFFICE_H','OFFICE_OBJECTS','OFFICE_SOLID_OBJ','objBaseCells','OFFICE_SOLID','SITE_W','SITE_H','SITE_OBJECTS','SITE_SOLID_OBJ','ZONES','NPC_WANDER_OFFICE','NPC_WANDER_SITE','siteTrackFrac','POPUPS','enterWeek','afterEvent','chooseEvent','closeReport','REPORT_WEEKS','getObjectives','showEndScreen','chooseDlg','openNPCDialogue','interactionSpent','spendInteraction','getDlgPhaseIdx'];
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
check('advanceWeek walks the full timeline 32 -> -8 (sync), no drift on honest completion',()=>{ g.S.week=32; g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70}; let guard=0; while(g.S.week>-8 && guard++<30){ const before=g.S.week; g.advanceWeek(); if(g.S.week===before) throw new Error('stuck advancing at week '+before); } if(g.S.week!==-8) throw new Error('did not reach close-out, ended at '+g.S.week); if(g.S.metrics.morale!==70) throw new Error('honest Week Complete applied a hidden morale drift: '+g.S.metrics.morale); });
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
check('office map: doorways/exit walkable, no furniture on doorways, seats clear, every room reachable',()=>{
  const W=g.OFFICE_W,H=g.OFFICE_H,OMAP=g.OMAP; g.S.map='office';
  const solid=(x,y)=>g.isSolid(x,y);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const c=OMAP[y][x]; if((c==='+'||c==='X')&&solid(x,y)) throw new Error('doorway/exit solid @'+x+','+y); }
  g.OFFICE_OBJECTS.forEach(o=>{ if(g.OFFICE_SOLID_OBJ[o.a]) g.objBaseCells(o).forEach(c=>{ const ch=OMAP[c[1]]&&OMAP[c[1]][c[0]]; if(ch==='+'||ch==='X') throw new Error('solid object '+o.a+' base on doorway @'+c); }); });
  if(solid(14,15)) throw new Error('player spawn (14,15) is solid');
  g.NPCS.forEach(n=>{ if(n.officeX<0)return; if(n.officeX>=W||n.officeY>=H) throw new Error('seat OOB '+n.id); if(solid(n.officeX,n.officeY)) throw new Error('seat solid '+n.id); });
  // flood-fill reachability from spawn
  const seen=Array.from({length:H},()=>new Array(W).fill(false)); const st=[[14,15]]; seen[15][14]=true;
  while(st.length){ const p=st.pop(); [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{ const nx=p[0]+d[0],ny=p[1]+d[1]; if(nx>=0&&ny>=0&&nx<W&&ny<H&&!seen[ny][nx]&&!solid(nx,ny)){ seen[ny][nx]=true; st.push([nx,ny]); } }); }
  const rooms={meeting:[5,3],yourOffice:[25,3],breakRoom:[5,11],documents:[25,11],openPlan:[15,8]};
  for(const k in rooms){ const r=rooms[k]; if(!seen[r[1]][r[0]]) throw new Error('room unreachable: '+k+' @'+r); }
});
check('site map: spawn & compound gate walkable, NPC site seats clear, key areas reachable',()=>{
  g.S.map='site'; const W=g.SITE_W,H=g.SITE_H; const solid=(x,y)=>g.isSolid(x,y);
  if(solid(3,13)) throw new Error('site spawn (3,13) solid');
  if(solid(16,10)&&solid(16,11)&&solid(16,12)) throw new Error('compound gate blocked at track');
  g.NPCS.forEach(n=>{ if(n.siteX<0)return; if(n.siteX>=W||n.siteY>=H) throw new Error('site seat OOB '+n.id); if(solid(n.siteX,n.siteY)) throw new Error('site seat solid '+n.id); });
  const seen=Array.from({length:H},()=>new Array(W).fill(false)); const st=[[3,13]]; seen[13][3]=true;
  while(st.length){ const p=st.pop(); [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{ const nx=p[0]+d[0],ny=p[1]+d[1]; if(nx>=0&&ny>=0&&nx<W&&ny<H&&!seen[ny][nx]&&!solid(nx,ny)){ seen[ny][nx]=true; st.push([nx,ny]); } }); }
  const pts={compound:[22,6],materials:[21,15],trackRight:[25,11]};
  for(const k in pts){ const r=pts[k]; if(!seen[r[1]][r[0]]) throw new Error('site area unreachable: '+k+' @'+r); }
});
check('every interaction zone has a walkable cell nearby (so it is reachable to trigger)',()=>{
  ['office','site'].forEach(mapName=>{
    g.S.map=mapName; const W=mapName==='office'?g.OFFICE_W:g.SITE_W, H=mapName==='office'?g.OFFICE_H:g.SITE_H;
    (g.ZONES[mapName]||[]).forEach(z=>{
      const cx=z.x+z.w/2, cy=z.y+z.h/2; let ok=false;
      for(let dy=-2;dy<=2&&!ok;dy++)for(let dx=-2;dx<=2;dx++){ const x=Math.round(cx+dx),y=Math.round(cy+dy); if(x>=0&&y>=0&&x<W&&y<H&&!g.isSolid(x,y)){ok=true;break;} }
      if(!ok) throw new Error('zone '+mapName+'/'+z.id+' has no walkable cell within 2 tiles of its centre');
    });
  });
});
check('NPC wander targets are in-bounds and walkable (office & site)',()=>{
  g.S.map='office'; g.NPC_WANDER_OFFICE.forEach(t=>{ if(t.x<0||t.x>=g.OFFICE_W||t.y<0||t.y>=g.OFFICE_H||g.isSolid(t.x,t.y)) throw new Error('office wander bad @'+t.x+','+t.y); });
  g.S.map='site'; g.NPC_WANDER_SITE.forEach(t=>{ if(t.x<0||t.x>=g.SITE_W||t.y<0||t.y>=g.SITE_H||g.isSolid(t.x,t.y)) throw new Error('site wander bad @'+t.x+','+t.y); });
});
check('construction progression: track-laid fraction is monotonic 0..1 across the project',()=>{
  const weeks=[32,24,16,12,8,4,0,-8]; let prev=-1;
  weeks.forEach(w=>{ g.S.week=w; const f=g.siteTrackFrac(); if(f<0||f>1) throw new Error('frac out of range @week '+w+': '+f); if(f<prev) throw new Error('frac decreased @week '+w); prev=f; });
  g.S.week=32; if(g.siteTrackFrac()!==0) throw new Error('track should be unlaid at kick-off');
  g.S.week=-8; if(g.siteTrackFrac()!==1) throw new Error('track should be complete at close-out');
});
check('decisions spawn floating score popups (juice) without throwing',()=>{
  g.POPUPS.length=0; g.S.week=32; g.S.px=100; g.S.py=100; g.S.camX=0; g.S.camY=0;
  g.applyEffects({schedule:3,morale:-2,budget:0});
  if(g.POPUPS.length!==2) throw new Error('expected 2 popups (nonzero effects), got '+g.POPUPS.length);
});
check('enterWeek funnel: event-then-report ordering at a collision week (28), no double-resolve',()=>{
  g.S.eventsDone.length=0; g.S.eventOpen=false; g.S.week=28;
  g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70};
  g.enterWeek();
  if(!g.S.eventOpen) throw new Error('expected an event modal to show at week 28');
  g.chooseEvent(28,0);
  if(!g.S.eventsDone.includes(28)) throw new Error('event 28 not marked resolved');
  if(g.S.eventsDone.filter(w=>w===28).length!==1) throw new Error('event 28 double-resolved');
  if(!g.S.eventOpen) throw new Error('expected the monthly report to show after the event (28 is a report week)');
  if(g.closeReport) g.closeReport();
  if(g.S.eventOpen) throw new Error('report did not close');
  if(!Array.isArray(g.S.objectives)) throw new Error('startNewWeek did not run after report');
});
check('every weekly objective target resolves to a real NPC or zone (breadcrumbs + completion work)',()=>{
  const npcIds=new Set(g.NPCS.map(n=>n.id));
  const zoneIds=new Set([].concat(g.ZONES.office||[],g.ZONES.site||[]).map(z=>z.id));
  [32,28,24,20,16,12,8,4,0,-4,-8].forEach(w=>{
    (g.getObjectives(w)||[]).forEach(o=>{
      if(o.type==='npc'&&!npcIds.has(o.target)) throw new Error('objective npc target missing: '+o.target+' @week '+w);
      if(o.type==='zone'&&!zoneIds.has(o.target)) throw new Error('objective zone target missing: '+o.target+' @week '+w);
    });
  });
});
check('choice-aware ending: curveball choices are logged and the end screen renders them',()=>{
  g.S.eventChoices=[]; g.S.eventsDone.length=0; g.S.week=28; g.S.eventOpen=false;
  g.S.metrics={schedule:80,budget:40,safety:90,quality:60,morale:55};
  g.enterWeek(); g.chooseEvent(28,0);
  if(!g.S.eventChoices.length) throw new Error('curveball choice was not logged');
  if(!g.S.eventChoices[0].title||!g.S.eventChoices[0].choice) throw new Error('logged choice missing title/choice');
  g.S.week=-8; g.showEndScreen();
  if(g.S.screen!=='end') throw new Error('end screen did not render');
});
check('weekly interaction cap: re-talking an NPC after a choice applies no further effects',()=>{
  g.S.spentInteractions=[]; g.S.week=20; g.S.dlgOpen=false;
  g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70};
  const pi=g.getDlgPhaseIdx(20);
  g.chooseDlg('sarah',pi,0,0); // a real choice: applies effects + spends the weekly slot
  if(!g.interactionSpent('npc_sarah')) throw new Error('choice did not consume the weekly slot');
  const after=JSON.stringify(g.S.metrics);
  g.openNPCDialogue(g.NPCS.find(n=>n.id==='sarah')); // spent -> flavour only
  if(JSON.stringify(g.S.metrics)!==after) throw new Error('re-talking after the cap still changed metrics (exploit not closed)');
});

// ---------- report ----------
console.log('\n=== Project Valley — logic harness ===');
results.pass.forEach(p=>console.log('  PASS  '+p));
results.fail.forEach(f=>console.log('  FAIL  '+f));
console.log(`\n${results.pass.length} passed, ${results.fail.length} failed.`);
process.exit(results.fail.length?1:0);
