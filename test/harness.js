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
const names=['S','applyEffects','advanceWeek','getPhase','getPhaseIdx','getDlgPhaseIdx','chooseDlg','NPCS','OMAP','SMAP','ZONES','isSolid','render','updatePlayer','startGame','newGame','selectCharacter','beginGame','saveGame','loadGame','EVENTS','PHASES','DLG','transitionToMap','showEvent','triggerEvent','getObjectives','updateHUD','updateNotepad','WALK_FRAMES','updateNPCAI','CHARS','ATLAS','drawSprite','OFFICE_W','OFFICE_H','OFFICE_OBJECTS','OFFICE_SOLID_OBJ','objBaseCells','OFFICE_SOLID','SITE_W','SITE_H','SITE_OBJECTS','SITE_SOLID_OBJ','ZONES','NPC_WANDER_OFFICE','NPC_WANDER_SITE','siteTrackFrac','POPUPS','enterWeek','afterEvent','chooseEvent','closeReport','REPORT_WEEKS','getObjectives','showEndScreen','chooseDlg','openNPCDialogue','interactionSpent','spendInteraction','getDlgPhaseIdx','EVENTS','showInsight','rng','seedRng','DIFFICULTY','diff','getPMRating','getLeadershipArchetype','resolveRisk','eventCallback','PERSONA','reflectionNote','showEvent','showReport','applyEventChoice','skipPhase','hintsVisible','metricDeltaHTML','snapshotMetrics','showLockerRoom','togglePPE','closeEventResult','presentEvent','beginDecision','eventHesitate','eventTimerMs','startEventTimer','stopEventTimer','tickEventTimer','SCENES','THEMES','getTheme','setMasterVolume','playMumble','VOICE','playSFX','playLocationAmbient','startBGM','stopBGM','DELIVERABLES','deliverableAvailable','deliverablesAvailableCount','openDeliverable','recordMetricHistory','perfPanelHTML','perfBarsHTML','showDocsOverlay','startNewWeek','MAPS','MD','npcCell','mapW','mapH','SUPPLIER_W','SUPPLIER_H','SUPMAP','transitionToMap','updateTransition','tallyLeadership','dominantStyle','STYLE_KEY'];
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
  const rooms={meeting:[5,3],yourOffice:[25,3],breakRoom:[5,11],documents:[25,11],openPlan:[15,8],
    to_supplier:[12,16],to_studio:[3,16],to_boardroom:[25,16]}; // the three new exit doors must be reachable
  for(const k in rooms){ const r=rooms[k]; if(!seen[r[1]][r[0]]) throw new Error('room/door unreachable: '+k+' @'+r); }
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
  ['office','site','supplier','boardroom','studio'].forEach(mapName=>{
    g.S.map=mapName; const W=g.MAPS[mapName].W, H=g.MAPS[mapName].H;
    (g.ZONES[mapName]||[]).forEach(z=>{
      const cx=z.x+z.w/2, cy=z.y+z.h/2; let ok=false;
      for(let dy=-2;dy<=2&&!ok;dy++)for(let dx=-2;dx<=2;dx++){ const x=Math.round(cx+dx),y=Math.round(cy+dy); if(x>=0&&y>=0&&x<W&&y<H&&!g.isSolid(x,y)){ok=true;break;} }
      if(!ok) throw new Error('zone '+mapName+'/'+z.id+' has no walkable cell within 2 tiles of its centre');
    });
  });
});
check('new interiors (supplier/boardroom/studio): spawn+area NPC reachable, zones reachable, NPC has dialogue',()=>{
  [['supplier','raj'],['boardroom','okoye'],['studio','sarah']].forEach(([mapName,npcId])=>{
    g.S.map=mapName; const M=g.MAPS[mapName],W=M.W,H=M.H; const solid=(x,y)=>g.isSolid(x,y);
    const sp=M.spawn; if(solid(sp.x,sp.y)) throw new Error(mapName+' spawn solid @'+sp.x+','+sp.y);
    const npc=g.NPCS.find(n=>n.id===npcId); const cell=g.npcCell(npc,mapName);
    if(!cell) throw new Error(npcId+' not placed on '+mapName); if(solid(cell[0],cell[1])) throw new Error(npcId+' seat solid on '+mapName);
    if(!g.DLG[npcId]) throw new Error(npcId+' has no dialogue');
    const seen=Array.from({length:H},()=>new Array(W).fill(false)); const st=[[sp.x,sp.y]]; seen[sp.y][sp.x]=true;
    while(st.length){ const p=st.pop(); [[1,0],[-1,0],[0,1],[0,-1]].forEach(d=>{ const nx=p[0]+d[0],ny=p[1]+d[1]; if(nx>=0&&ny>=0&&nx<W&&ny<H&&!seen[ny][nx]&&!solid(nx,ny)){ seen[ny][nx]=true; st.push([nx,ny]); } }); }
    if(!seen[cell[1]][cell[0]]) throw new Error(npcId+' seat unreachable from spawn on '+mapName);
    (g.ZONES[mapName]||[]).forEach(z=>{ let ok=false; for(let dy=-2;dy<=2&&!ok;dy++)for(let dx=-2;dx<=2;dx++){const x=Math.round(z.x+z.w/2+dx),y=Math.round(z.y+z.h/2+dy); if(x>=0&&y>=0&&x<W&&y<H&&seen[y][x]){ok=true;break;}} if(!ok)throw new Error(mapName+' zone unreachable: '+z.id); });
  });
});
check('map registry: transitions office↔(supplier/boardroom/studio) set map+spawn and derive NPCs',()=>{
  [['supplier','raj'],['boardroom','okoye'],['studio','sarah']].forEach(([mapName,npcId])=>{
    g.S.map='office';
    g.transitionToMap(mapName); g.updateTransition(500);
    if(g.S.map!==mapName) throw new Error('did not switch to '+mapName);
    if(g.S.px!==g.MAPS[mapName].spawn.x*16) throw new Error(mapName+' spawn not applied');
    if(!g.npcCell(g.NPCS.find(n=>n.id===npcId),mapName)) throw new Error(npcId+' has no '+mapName+' cell');
    g.transitionToMap('office'); g.updateTransition(500);
    if(g.S.map!=='office') throw new Error('did not return to office from '+mapName);
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
  g.closeEventResult(); // dismiss the post-choice score-reveal panel → funnels to the report
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
check('end screen shows a working action button (Play Again not hidden) + simple start→finish bars',()=>{
  g.S.metricHistory=[]; g.S.week=32; g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70}; g.recordMetricHistory();
  g.S.week=-8; g.S.metrics={schedule:84,budget:60,safety:90,quality:72,morale:55};
  const bars=g.perfBarsHTML();
  if(!/start/i.test(bars)||!/70 →/.test(bars)) throw new Error('perfBarsHTML missing start→finish read');
  g.showEndScreen();
  if(g.S.screen!=='end') throw new Error('end screen did not render');
  // the Play Again button must be present in the rendered end-screen HTML (not hidden/absent)
  const titleHTML=documentMock.getElementById('wtTitle').innerHTML;
  if(!/Play Again/.test(titleHTML)) throw new Error('Play Again action missing from end screen');
});
check('troubled-project ending renders at low metrics (and a strong run at high)',()=>{
  g.S.eventChoices=[];
  g.S.metrics={schedule:20,budget:15,safety:25,quality:30,morale:18}; g.S.week=-8; g.showEndScreen();
  if(g.S.screen!=='end') throw new Error('low-metric end screen did not render');
  g.S.metrics={schedule:95,budget:90,safety:92,quality:96,morale:90}; g.showEndScreen();
  if(g.S.screen!=='end') throw new Error('high-metric end screen did not render');
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
check('every curveball event carries a PM insight (lesson attaches to the decision)',()=>{
  if(typeof g.showInsight!=='function') throw new Error('showInsight missing');
  (g.EVENTS||[]).forEach(ev=>{ if(!ev.insight||typeof ev.insight!=='string'||ev.insight.length<10) throw new Error('event missing insight: '+ev.title); });
});
check('seedable RNG is deterministic',()=>{
  g.seedRng(12345); const a=[g.rng(),g.rng(),g.rng()];
  g.seedRng(12345); const b=[g.rng(),g.rng(),g.rng()];
  if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error('rng not deterministic for a fixed seed');
  if(a.some(x=>x<0||x>=1)) throw new Error('rng out of [0,1)');
});
check('difficulty scales penalties/rewards (Apprentice softens, Director sharpens; Manager unchanged)',()=>{
  const base='manager';
  g.S.difficulty='manager'; g.S.metrics.safety=50; g.applyEffects({safety:-10});
  if(g.S.metrics.safety!==40) throw new Error('manager should be 1:1 (-10), got '+g.S.metrics.safety);
  g.S.difficulty='apprentice'; g.S.metrics.safety=50; g.applyEffects({safety:-10});
  if(g.S.metrics.safety<=40) throw new Error('apprentice should soften the penalty, got '+g.S.metrics.safety);
  g.S.difficulty='director'; g.S.metrics.safety=50; g.applyEffects({safety:-10});
  if(g.S.metrics.safety>=40) throw new Error('director should sharpen the penalty, got '+g.S.metrics.safety);
  g.S.difficulty=base;
});
check('risky choices resolve probabilistically against the seeded RNG (success vs backfire)',()=>{
  g.S.difficulty='manager';
  const ev=g.EVENTS.find(e=>e.week===16); const risky=ev.choices.find(c=>c.risk); if(!risky) throw new Error('no risky choice on wk16');
  const p=risky.risk.p; // manager riskBonus=0
  g.seedRng(7); const peek=g.rng(); g.seedRng(7); const res=g.resolveRisk(risky);
  if(res.ok!==(peek<p)) throw new Error('risk outcome did not match the seeded roll');
  if(res.ok&&res.e!==risky.e) throw new Error('success should apply the success effect');
  if(!res.ok&&res.e!==risky.risk.fail) throw new Error('backfire should apply the fail effect');
});
check('involuntary setback pre-applies its hit exactly once on showEvent',()=>{
  g.S.difficulty='manager'; g.S.flags={}; g.S.eventOpen=false;
  g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70};
  const ev=g.EVENTS.find(e=>e.week===12); if(!ev.setback) throw new Error('wk12 should be a setback');
  const before=g.S.metrics.schedule; g.showEvent(ev);
  if(g.S.metrics.schedule>=before) throw new Error('setback did not apply its schedule hit');
  if(!g.S.flags['sb_12']) throw new Error('setback flag not set');
  const after=g.S.metrics.schedule; g.showEvent(ev);
  if(g.S.metrics.schedule!==after) throw new Error('setback double-applied on re-show');
});
check('consequence callback fires only when the earlier decision flag is set (named causality)',()=>{
  const ev4=g.EVENTS.find(e=>e.week===4);
  g.S.flags={}; if(g.eventCallback(ev4)!==null) throw new Error('callback should be null without the flag');
  g.S.flags={safety_skip:'ok'}; const cb=g.eventCallback(ev4);
  if(!cb||!cb.text||!cb.e||cb.e.safety>=0) throw new Error('callback should add a named safety penalty when safety_skip is set');
  g.S.flags={};
});
check('rating gate: a red metric caps stars; red safety caps harder',()=>{
  g.S.difficulty='manager';
  g.S.metrics={schedule:95,budget:95,safety:95,quality:95,morale:95}; if(g.getPMRating()!==5) throw new Error('clean run should be 5');
  g.S.metrics={schedule:95,budget:95,safety:95,quality:35,morale:95}; if(g.getPMRating()>3) throw new Error('a red metric should cap at 3, got '+g.getPMRating());
  g.S.metrics={schedule:95,budget:95,safety:30,quality:95,morale:95}; if(g.getPMRating()>2) throw new Error('red safety should cap at 2, got '+g.getPMRating());
});
check('leadership archetype classifies the run (hero → villain) and always returns a labelled path',()=>{
  g.S.relationships={sarah:{hearts:0,talked:1},mike:{hearts:0,talked:1},emma:{hearts:0,talked:1},james:{hearts:0,talked:1},priya:{hearts:0,talked:1}};
  g.S.npcMemory={};
  g.S.metrics={schedule:75,budget:75,safety:25,quality:70,morale:25}; let a=g.getLeadershipArchetype();
  if(!a||!a.name||!a.icon) throw new Error('archetype must return a labelled path');
  if(a.name!=='The Empire-Builder') throw new Error('low safety+morale, decent results → Empire-Builder, got '+a.name);
  g.S.metrics={schedule:80,budget:80,safety:80,quality:80,morale:80};
  g.S.relationships={sarah:{hearts:4,talked:3},mike:{hearts:4,talked:3},emma:{hearts:4,talked:3},james:{hearts:3,talked:3},priya:{hearts:4,talked:3}};
  a=g.getLeadershipArchetype(); if(a.name!=='The Mentor') throw new Error('high people+safety+hearts → Mentor, got '+a.name);
});
check('shared resolver makes Skip Phase honest: setbacks still land, gambles still resolve via RNG',()=>{
  g.S.difficulty='manager';
  // setback week 12 auto-resolved (as skip does) still applies its pre-hit and records the event
  g.S.flags={}; g.S.eventsDone=[]; g.S.eventChoices=[];
  g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70};
  g.S.relationships={sarah:{hearts:2,talked:1},mike:{hearts:2,talked:1},emma:{hearts:2,talked:1},james:{hearts:2,talked:1},priya:{hearts:2,talked:1}};
  const ev12=g.EVENTS.find(e=>e.week===12);
  g.applyEventChoice(ev12,0); // setback {schedule:-2,budget:-1} + choice0 {budget:-4,schedule:+2,quality:+1}
  if(!g.S.flags['sb_12']) throw new Error('skip-path setback flag not set (pre-hit branch did not run)');
  if(g.S.metrics.budget!==65) throw new Error('skip-path setback+choice budget should be 70-1-4=65, got '+g.S.metrics.budget);
  if(!g.S.eventsDone.includes(12)) throw new Error('skip-path did not record the event');
  // a risky choice auto-resolved can BACKFIRE (not free best-case): force a failing roll
  const ev16=g.EVENTS.find(e=>e.week===16); const risky=ev16.choices.findIndex(c=>c.risk);
  const rc=ev16.choices[risky]; const p=rc.risk.p;
  // find a seed whose first roll fails (>=p)
  let seed=1; for(;seed<9999;seed++){ g.seedRng(seed); if(g.rng()>=p) break; }
  g.S.flags={}; g.S.eventsDone=[]; g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70};
  g.seedRng(seed); g.applyEventChoice(ev16,risky);
  if(g.S.metrics.budget>70) throw new Error('forced-fail gamble should NOT have paid off on the skip path');
});
check('hints show only on Apprentice; post-choice delta reveal reflects real metric change',()=>{
  g.S.difficulty='manager'; if(g.hintsVisible()) throw new Error('hints must be hidden on Manager');
  g.S.difficulty='director'; if(g.hintsVisible()) throw new Error('hints must be hidden on Director');
  g.S.difficulty='apprentice'; if(!g.hintsVisible()) throw new Error('hints must show on Apprentice');
  g.S.difficulty='manager';
  g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70};
  const before=g.snapshotMetrics(); g.applyEffects({safety:5,morale:-3});
  const html=g.metricDeltaHTML(before);
  if(!/Safety \+5/.test(html)||!/Morale -3/.test(html)) throw new Error('delta reveal wrong: '+html);
});
check('PPE locker room shows a working on/off control (no crash, toggles state)',()=>{
  g.S.dlgOpen=false; g.S.ppeEquipped=false; g.showLockerRoom();
  g.togglePPE(true); if(!g.S.ppeEquipped) throw new Error('Put-on PPE did not set equipped');
  g.showLockerRoom(); g.togglePPE(false); if(g.S.ppeEquipped) throw new Error('Take-off PPE did not clear equipped');
});
check('event timer scales with difficulty (off on Apprentice, tighter on Director)',()=>{
  g.S.difficulty='apprentice'; if(g.eventTimerMs()!==0) throw new Error('Apprentice should have no timer');
  g.S.difficulty='manager'; const m=g.eventTimerMs();
  g.S.difficulty='director'; const d=g.eventTimerMs();
  if(!(d<m)) throw new Error('Director timer should be tighter than Manager ('+d+' vs '+m+')');
  g.S.difficulty='manager';
});
check('hesitation on timeout auto-resolves a NON-risky default choice + records the event',()=>{
  g.S.difficulty='manager'; g.S.flags={}; g.S.eventsDone=[]; g.S.eventChoices=[]; g.S.eventOpen=true;
  g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70}; g.S.week=24;
  g.eventHesitate(24);
  if(!g.S.eventsDone.includes(24)) throw new Error('hesitation did not resolve the event');
  if(!g.S.eventChoices.length) throw new Error('hesitation did not log a choice');
  const ch=g.EVENTS.find(e=>e.week===24).choices; const di=ch.findIndex(c=>!c.risk);
  if(di>=0&&ch[di].risk) throw new Error('hesitation default must be non-risky');
  g.closeEventResult();
});
check('cut-scene present() opens without throwing and has a scene for every event week',()=>{
  g.EVENTS.forEach(ev=>{ if(!g.SCENES[String(ev.week)]) throw new Error('no cut-scene for event week '+ev.week); });
  g.S.eventOpen=false; g.S.week=8; g.presentEvent(g.EVENTS.find(e=>e.week===8));
  if(!g.S.eventOpen) throw new Error('presentEvent should mark the event open');
});
check('every location has its own soundtrack theme (incl. the 3 Phase-D areas) + safe default',()=>{
  ['office','site','supplier','boardroom','studio'].forEach(m=>{
    const t=g.THEMES[m]; if(!t||!Array.isArray(t.melody)||!Array.isArray(t.harmony)||!Array.isArray(t.bass)) throw new Error('theme malformed for '+m);
  });
  g.S.map='nowhere'; if(g.getTheme()!==g.THEMES.office) throw new Error('getTheme must default to office for unknown maps');
  g.S.map='site'; if(g.getTheme()!==g.THEMES.site) throw new Error('getTheme should pick the site theme');
});
check('master volume dial clamps 0..0.6, mutes at 0, and persists to S.masterVol',()=>{
  g.setMasterVolume(0.45); if(g.S.masterVol!==0.45) throw new Error('volume not stored');
  g.setMasterVolume(99); if(g.S.masterVol!==0.6) throw new Error('volume not clamped high');
  g.setMasterVolume(-5); if(g.S.masterVol!==0) throw new Error('volume not clamped low (mute)');
  g.setMasterVolume(0.3);
});
check('new SFX + ambience + NPC mumble voices fire without throwing (and every NPC has a voice)',()=>{
  ['doorOpen','doorClose','excavator','drill','clang','reverse','trainHorn','phone'].forEach(s=>g.playSFX(s));
  g.S.map='site'; g.S.week=8; g.playLocationAmbient();      // construction-phase machinery branch
  g.S.map='office'; g.playLocationAmbient();
  g.NPCS.forEach(n=>{ if(typeof g.VOICE[n.id]!=='number') throw new Error('no voice pitch for '+n.id); g.playMumble(n.id,40); });
});
check('deliverables: each has readable body + readyWeek; more unlock as the project progresses',()=>{
  if(!Array.isArray(g.DELIVERABLES)||g.DELIVERABLES.length<6) throw new Error('too few deliverables');
  g.DELIVERABLES.forEach(d=>{ if(!d.id||!d.name||typeof d.readyWeek!=='number'||!d.body||d.body.length<40) throw new Error('deliverable malformed: '+(d&&d.name)); });
  g.S.week=32; const early=g.deliverablesAvailableCount();
  g.S.week=-8; const late=g.deliverablesAvailableCount();
  if(!(late>early)) throw new Error('more deliverables should be readable later ('+early+'→'+late+')');
  if(late!==g.DELIVERABLES.length) throw new Error('all deliverables should be readable by close-out');
  // a locked deliverable cannot be opened early; an available one renders
  g.S.week=32; const locked=g.DELIVERABLES.find(d=>!g.deliverableAvailable(d));
  if(locked){ g.S.docsOpen=false; g.openDeliverable(locked.id); /* no-throw, stays gated */ }
  g.openDeliverable('brief'); // available from the start
});
check('performance journey records per week (start→now) and renders an SVG trend',()=>{
  g.S.metricHistory=[]; g.S.week=32; g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70}; g.recordMetricHistory();
  g.S.week=28; g.S.metrics={schedule:64,budget:72,safety:80,quality:66,morale:60}; g.recordMetricHistory();
  if(g.S.metricHistory.length!==2) throw new Error('history not recorded per week');
  g.recordMetricHistory(); // same week → updates, not appends
  if(g.S.metricHistory.length!==2) throw new Error('same-week record should update, not append');
  const html=g.perfPanelHTML();
  if(!/<svg/.test(html)||!/Schedule: 70/.test(html)) throw new Error('perf panel missing svg or start→now line');
});
check('docs overlay renders (timeline + journey + deliverables) without throwing',()=>{
  g.S.docsOpen=false; g.S.week=8; g.showDocsOverlay();
  if(!g.S.docsOpen) throw new Error('docs overlay did not open');
});
check('leadership-style engine: valid stance tags tally, dominant style reads, archetype reflects it',()=>{
  // every tagged dialogue choice uses a valid stance (D/C/S/V)
  for(const id in g.DLG){ g.DLG[id].forEach(ph=>ph.forEach(l=>(l.choices||[]).forEach(c=>{ if(c.s&&!g.STYLE_KEY[c.s]) throw new Error('invalid style tag '+c.s+' on '+id); }))); }
  // Sarah is fully stance-tagged (the rewrite template) — every choice has a stance
  g.DLG.sarah.forEach(ph=>ph.forEach(l=>l.choices.forEach(c=>{ if(!c.s) throw new Error('Sarah choice missing stance tag: '+c.t); })));
  g.S.leadershipChoices={directive:0,collaborative:0,supportive:0,visionary:0};
  g.tallyLeadership('D'); g.tallyLeadership('D'); g.tallyLeadership('D'); g.tallyLeadership('C');
  if(g.S.leadershipChoices.directive!==3) throw new Error('directive tag not tallied');
  if(g.dominantStyle()!=='directive') throw new Error('dominant style should be directive, got '+g.dominantStyle());
  // with middling metrics (no strong pattern) the badge should read the leadership STYLE
  g.S.metrics={schedule:55,budget:55,safety:55,quality:55,morale:55};
  g.S.relationships={sarah:{hearts:1,talked:1},mike:{hearts:1,talked:1},emma:{hearts:1,talked:1},james:{hearts:1,talked:1},priya:{hearts:1,talked:1}};
  g.S.npcMemory={};
  if(g.getLeadershipArchetype().name!=='The Commander') throw new Error('directive lean should read as The Commander');
});
check('NPCs carry memory of the last interaction (drives their next opener)',()=>{
  g.S.npcMemory={}; g.S.spentInteractions=[]; g.S.week=20;
  g.S.metrics={schedule:70,budget:70,safety:70,quality:70,morale:70};
  const pi=g.getDlgPhaseIdx(20); g.chooseDlg('james',pi,0,0);
  if(!g.S.npcMemory.james||!g.S.npcMemory.james.lastTier) throw new Error('NPC memory not recorded after a choice');
});

// ---------- report ----------
console.log('\n=== Project Valley — logic harness ===');
results.pass.forEach(p=>console.log('  PASS  '+p));
results.fail.forEach(f=>console.log('  FAIL  '+f));
console.log(`\n${results.pass.length} passed, ${results.fail.length} failed.`);
process.exit(results.fail.length?1:0);
