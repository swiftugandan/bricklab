import {Model,COLORS,part,dims,fullName,starter,validateProject,LIMIT,DEFAULT_GRAVITY} from './model.js';
import {SLOTS,slotAt,tweak,blockedSlots} from './wheel.js';
import {Workshop} from './scene.js';
import {HUD} from './hud.js';
import {StudioUI} from './studio-ui.js';
const STORAGE='bricklab.project.v1',SETTINGS='bricklab.settings.v1',model=new Model();let restored=false,saveTimer;
// Workshop settings are device preferences, kept apart from the project so exported files never carry them.
const settings={gravity:DEFAULT_GRAVITY,sound:true};try{const raw=JSON.parse(localStorage.getItem(SETTINGS)||'{}');for(const key of Object.keys(settings))if(typeof raw[key]==='boolean')settings[key]=raw[key];}catch(e){console.warn('[Bricklab] Saved settings could not be read',e);}
model.gravity=settings.gravity;
try{const raw=localStorage.getItem(STORAGE);if(raw){Object.assign(model,validateProject(JSON.parse(raw),{gravity:model.gravity}));restored=true;}}catch(e){console.warn('[Bricklab] Saved project could not be restored',e);}
if(!restored)Object.assign(model,validateProject(starter('blank'),{gravity:model.gravity}));
const state={model,part:'b24',color:COLORS[0][1],category:'Bricks',rotation:0,tool:'build',selected:null,modal:null,wheel:null,carry:null,sticky:null,toastAction:null,aim:null,sheet:false,menu:false,coach:true,saved:restored?'Restored on this device':'Autosave on this device',backend:'',toast:restored?'Welcome back. Your build is right here.':'Make yourself at home. Add your first brick.',toastUntil:performance.now()+5000,sound:settings.sound};
// The splash in index.html covers the download of the scripts; once this module runs they're here, and the renderer is next.
const splash=document.getElementById('splash'),splashText=splash?.querySelector('p');if(splashText)splashText.textContent='Warming up the renderer…';
// The studio UI is drawn by the 3D renderer, so a failure to start it is reported on the splash, which stays up.
function showFatal(message){splash?.classList.add('error');if(splashText)splashText.textContent=message;}
// Fades the splash once the first frame with both the build and the studio UI is on screen.
let splashGone=!splash;function hideSplash(){splashGone=true;splash.classList.add('done');const remove=()=>splash.remove();splash.addEventListener('transitionend',remove,{once:true});setTimeout(remove,800);}
const canvas=document.querySelector('#hud'), hud=new HUD(state,action);hud.draw();const world=new Workshop();
try{await world.init(document.querySelector('#world'),canvas,model);state.backend=world.backend;world.ui=new StudioUI(world.geometries);world.ui.resize(innerWidth,innerHeight);hud.dirty=true;console.info('[Bricklab] Ready',{backend:world.backend,pieces:model.bricks.length,capacity:LIMIT});}catch(err){console.error('[Bricklab] Renderer initialization failed',err);showFatal('3D could not start. Enable WebGL 2, then reload.');throw err;}
let candidate=null,heightOffset=0,lastPointer=null,lastPointerType='mouse',viewIndex=0,audioContext;
// `actionId` adds a button to the toast, such as Undo after a delete.
function toast(message,actionId=null){state.toast=message;state.toastAction=actionId?{id:actionId,label:{undo:'Undo'}[actionId]}:null;state.toastUntil=performance.now()+3400;hud.dirty=true;setTimeout(()=>hud.dirty=true,3500);}
function clickSound(){if(!state.sound)return;try{audioContext??=new AudioContext();audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.setValueAtTime(650,audioContext.currentTime);osc.frequency.exponentialRampToValueAtTime(290,audioContext.currentTime+.06);gain.gain.setValueAtTime(.035,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.075);osc.connect(gain).connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.08);}catch{}}
function saveSettings(){settings.gravity=model.gravity;settings.sound=state.sound;try{localStorage.setItem(SETTINGS,JSON.stringify(settings));}catch(err){console.warn('[Bricklab] Settings could not be saved',err);}}
function autosave(){try{localStorage.setItem(STORAGE,JSON.stringify(model.serialize()));state.saved='Saved on this device';}catch(err){state.saved='Save failed — export your work';toast('Device storage is full. Export your project to keep it.');console.warn('[Bricklab] Autosave failed',err);}hud.dirty=true;}
// Undo and redo can flip gravity back, so the saved setting follows the model.
model.onChange(()=>{if(model.gravity!==settings.gravity)saveSettings();if(model.fallen)toast(model.fallen===1?'1 piece fell':model.fallen+' pieces fell');state.saved='Saving…';clearTimeout(saveTimer);saveTimer=setTimeout(autosave,250);if(state.selected&&!brickOf(state.selected))state.selected=null;if(state.carry?.mode==='move'&&!brickOf(state.carry.id))carry(null);if(state.aim)state.aim.ok=!model.valid(state.aim,ignoreId());world.select(state.selected);hud.dirty=true;});
window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);autosave();});
const brickOf=id=>model.bricks.find(b=>b.id===id);
// Sets or clears the piece in hand; a piece being moved is hidden from the scene until it's dropped or put back.
function carry(c){state.carry=c;world.carrying(c?.mode==='move'?c.id:null);if(!c)world.preview(null);hud.dirty=true;}
function select(id){state.selected=id;world.select(id);hud.dirty=true;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function safeName(){return model.name.replace(/[^a-z0-9_-]/gi,'-').toLowerCase();}
async function photo(){state.modal=null;closeWheel();world.preview(null);const selected=state.selected;world.select(null);world.render(false);document.querySelector('#world').toBlob(blob=>{if(blob){download(blob,safeName()+'.png');toast('Snapshot downloaded');}else toast('Image export failed. Please try again.');world.select(selected);},'image/png');hud.dirty=true;}

// The piece wheel. It opens on a piece and follows it on screen; `flick` is the press point when it was opened by
// pressing on the piece, so dragging from there toward a slot and letting go picks that slot.
function openWheel(id,flick=null){const b=brickOf(id);if(!b)return;setAim(null);state.wheel={id,hi:-1,ring:false,keep:false,flick,...world.screenOf(b)};candidate=null;world.preview(null);select(id);}
function closeWheel(){if(!state.wheel)return;state.wheel=null;select(null);}
// Keeps the wheel on its piece as the camera moves, and closes it if the piece is gone (deleted, undone).
function followWheel(){const w=state.wheel;if(!w)return;const b=brickOf(w.id);if(!b){closeWheel();return;}const p=world.screenOf(b);if(Math.abs(p.x-w.x)>.5||Math.abs(p.y-w.y)>.5){w.x=p.x;w.y=p.y;hud.dirty=true;}}
// Touch placement. Touch has no hover, so the first tap aims: the ghost shows where the piece would go, with a bubble of
// adjustments above it. Tapping the ghost (or Place) puts it down. The ghost follows the camera like the wheel does.
const ignoreId=()=>state.carry?.mode==='move'?state.carry.id:null;
function setAim(a){state.aim=a?{part:a.part,color:a.color,r:a.r,x:a.x,y:a.y,z:a.z,ok:!model.valid(a,ignoreId())}:null;if(a)state.coach=false;followAim(true);updatePreview();hud.dirty=true;}
function followAim(force=false){const a=state.aim;if(!a)return;const p=world.screenOf(a);if(force||!a.screen||Math.abs(p.x-a.screen.x)>.5||Math.abs(p.y-a.screen.y)>.5){a.screen=p;hud.dirty=true;}}
function inAim(point){const a=state.aim,d=dims(a);return point.x>=a.x&&point.x<=a.x+d.w&&point.z>=a.z&&point.z<=a.z+d.d;}
function aimOrPlace(x,y){const hit=world.hit(x,y);if(state.aim&&hit&&inAim(hit.point)){placeAim();return;}const c=makeCandidate(x,y);if(c)setAim(c);}
function placeAim(){const a=state.aim,c=state.carry;if(!a)return;if(!a.ok){toast(model.valid(a,ignoreId())||'It can\'t go there');return;}const err=c?.mode==='move'?model.update(c.id,{x:a.x,y:a.y,z:a.z,r:a.r}):model.add({part:a.part,color:a.color,r:a.r,x:a.x,y:a.y,z:a.z});if(err){toast(err);return;}
 clickSound();try{navigator.vibrate?.(12);}catch{}if(c&&!(c.mode==='copy'&&state.sticky?.id==='copy'))carry(null);setAim(null);toast(c?.mode==='move'?'Moved':'Placed','undo');}
// Adjusts the aimed ghost from its bubble. Turning also turns the piece in hand, so the next aim keeps the rotation.
function adjustAim(how){const a=state.aim;if(!a)return;if(how==='rotate'){a.r=(a.r+1)%4;if(state.carry)state.carry.r=a.r;else state.rotation=a.r;}else if(how==='raise')a.y++;else if(how==='lower')a.y=Math.max(0,a.y-1);setAim(a);}
function stopSticky(){state.sticky=null;hud.dirty=true;}
// Applies a wheel slot to a piece. `keep` makes it a sticky mode: later clicks on pieces apply it directly until Esc.
function useSlot(slotId,id,keep=false){const b=brickOf(id),slot=SLOTS.find(s=>s.id===slotId);if(!b||!slot)return;
 if(slot.kind==='tweak'){const err=model.update(id,tweak(slotId,b));if(err){toast(`${slot.label}: ${err}`);return;}clickSound();}
 else if(slot.kind==='picker'){if(!state.wheel||state.wheel.id!==id)openWheel(id);state.wheel.ring=true;state.wheel.keep=keep;hud.dirty=true;return;}
 else if(slot.kind==='remove'){const name=fullName(part(b.part));model.remove(id);clickSound();closeWheel();toast(`${name} deleted`,'undo');}
 else if(slot.kind==='carry'){carry({mode:slotId,id,part:b.part,color:b.color,r:b.r});heightOffset=0;closeWheel();toast(slotId==='move'?'Click where it should go. Esc puts it back.':'Click where the copy should go. Esc cancels.');}
 else if(slot.kind==='switch'){state.part=b.part;state.color=b.color;state.rotation=b.r;state.category=part(b.part).group;state.tool='build';closeWheel();toast(`Building with ${COLORS.find(c=>c[1]===b.color)?.[0]||''} ${fullName(part(b.part)).toLowerCase()}`);}
 if(keep){state.sticky={id:slotId};if(slot.kind!=='switch')state.tool='select';closeWheel();}
 hud.dirty=true;world.dirty=true;}
function paintFromWheel(color,keep){const w=state.wheel;if(!w)return;state.color=color;const err=model.update(w.id,{color});if(err){toast(err);return;}clickSound();if(keep||w.keep){state.sticky={id:'paint',color};state.tool='select';}closeWheel();toast(`Painted ${COLORS.find(c=>c[1]===color)[0]}`,'undo');}
// A click on a piece while a sticky mode is on applies that mode straight away.
function applySticky(id){const st=state.sticky;if(st.id==='paint'){const err=model.update(id,{color:st.color});if(err)toast(err);else clickSound();}else useSlot(st.id,id);}
// Drops a carried piece (Move) or a copy of it (Copy) where the pointer points. A sticky Copy keeps the copy in hand.
function dropCarried(){const c=state.carry;candidate=makeCandidate(lastPointer.x,lastPointer.y);if(!candidate)return;const err=c.mode==='move'?model.update(c.id,{x:candidate.x,y:candidate.y,z:candidate.z,r:candidate.r}):model.add(candidate);if(err){toast(err);return;}clickSound();
 if(!(c.mode==='copy'&&state.sticky?.id==='copy'))carry(null);toast(c.mode==='move'?'Moved':'Copy placed','undo');updatePreview();}

function action(id,{keep=false}={}){
 if(id.startsWith('part:')){state.part=id.slice(5);state.tool='build';state.sheet=false;carry(null);heightOffset=0;closeWheel();stopSticky();if(state.aim)setAim({...state.aim,part:state.part,color:state.color,r:state.rotation});}
 else if(id.startsWith('color:')){state.color=id.slice(6);if(state.aim&&!state.carry)setAim({...state.aim,color:state.color});}
 else if(id.startsWith('category:'))state.category=id.slice(9);
 else if(id.startsWith('tool:')){state.tool=id.slice(5);carry(null);setAim(null);heightOffset=0;closeWheel();stopSticky();world.preview(null);}
 else if(id.startsWith('slot:')&&state.wheel)useSlot(id.slice(5),state.wheel.id,keep);
 else if(id.startsWith('wheelcolor:'))paintFromWheel(id.slice(11),keep);
 else if(id==='wheel:close')closeWheel();
 else if(id.startsWith('aim:')){const how=id.slice(4);if(how==='place')placeAim();else if(how==='cancel'){setAim(null);if(state.carry)carry(null);}else adjustAim(how);}
 else if(id==='sheet:toggle'){state.sheet=!state.sheet;state.menu=false;closeWheel();}
 else if(id==='sheet:close'||id==='sheet:handle')state.sheet=false;
 else if(id==='menu:toggle'){state.menu=!state.menu;state.sheet=false;}
 else if(id==='menu:close')state.menu=false;
 else if(id.startsWith('menu:')){state.menu=false;action(id.slice(5));return;}
 else if(id==='coach:dismiss')state.coach=false;
 else if(id==='topview'){world.home('top');toast('Top view');}
 else if(id==='sticky:stop')stopSticky();
 else if(id==='rotate'){if(state.wheel)useSlot('rotate',state.wheel.id);else if(state.aim)adjustAim('rotate');else if(state.carry){state.carry.r=(state.carry.r+1)%4;updatePreview();}else{state.rotation=(state.rotation+1)%4;updatePreview();}}
 else if(id==='undo'||id==='redo'){if(model[id]())toast(id==='undo'?'Undone':'Redone');carry(null);}
 else if(id==='home')world.home();else if(id==='plus')world.zoom(.85);else if(id==='minus')world.zoom(1.15);
 else if(id==='grid'){world.grid.visible=!world.grid.visible;world.dirty=true;}
 else if(id==='view'){viewIndex=(viewIndex+1)%3;world.home(['iso','top','front'][viewIndex]);toast(['Perspective view','Top view','Front view'][viewIndex]);}
 else if(['projects','export','help','settings'].includes(id)){state.modal=id;closeWheel();world.preview(null);}
 else if(id==='close'){state.modal=null;}
 else if(id==='sound'){state.sound=!state.sound;saveSettings();toast(state.sound?'Brick sounds on':'Brick sounds off');}
 else if(id==='gravity'){model.setGravity(!model.gravity);carry(null);toast(!model.gravity?'Gravity off. Pieces stay where you put them.':model.fallen===1?'Gravity on. 1 piece fell. Undo to bring it back.':model.fallen?`Gravity on. ${model.fallen} pieces fell. Undo to bring them back.`:'Gravity on');}
 else if(id.startsWith('starter:')){model.replace(starter(id.slice(8)));state.modal=null;carry(null);heightOffset=0;closeWheel();select(null);world.home();toast(id==='starter:blank'?'A fresh plate. What will you build?':'Ready for your own twist.');}
 else if(id==='download'){download(new Blob([JSON.stringify(model.serialize(),null,2)],{type:'application/json'}),safeName()+'.bricklab');toast('Project downloaded');}
 else if(id==='photo')photo();
 else if(id==='import')document.querySelector('#file').click();
 hud.dirty=true;world.dirty=true;
}
document.querySelector('#file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2_000_000)throw Error('Project file exceeds 2 MB');const data=JSON.parse(await file.text());model.replace(data);state.modal=null;closeWheel();carry(null);world.home();toast('Project opened — '+model.bricks.length+' pieces');}catch(err){toast('Could not open project: '+err.message);}e.target.value='';});
// Where the piece in hand would go: the Build piece, or a carried piece (Move/Copy) with its own shape, colour and turn.
function makeCandidate(x,y){const hit=world.hit(x,y);if(!hit)return null;const c=state.carry,ignore=c?.mode==='move'?c.id:null,p=part(c?c.part:state.part),r=c?c.r:state.rotation,d=r%2?{w:p.d,d:p.w}:p;let yLevel=0;if(hit.id&&hit.id!==ignore){const under=brickOf(hit.id);yLevel=under.y+part(under.part).h;}return {part:p.id,color:c?c.color:state.color,r,x:Math.floor(hit.point.x-d.w/2+.5),z:Math.floor(hit.point.z-d.d/2+.5),y:Math.max(0,yLevel+heightOffset)};}
function updatePreview(){if(state.aim){world.preview(state.modal||state.wheel?null:state.aim,state.aim.ok);return;}if(lastPointerType!=='mouse'||!lastPointer||state.modal||state.wheel||hud.hit(lastPointer.x,lastPointer.y)||!(state.tool==='build'||state.carry)){candidate=null;world.preview(null);return;}candidate=makeCandidate(lastPointer.x,lastPointer.y);world.preview(candidate,candidate&&!model.valid(candidate,state.carry?.mode==='move'?state.carry.id:null));}
// A plain click in the world: drop what's carried, place in Build, or with Select open the wheel (or apply a sticky mode).
function clickWorld(x,y,touch=false){lastPointer={x,y};if(touch&&(state.carry||state.tool==='build')){aimOrPlace(x,y);return;}if(state.carry){dropCarried();return;}
 if(state.tool==='build'){candidate=makeCandidate(x,y);if(candidate){const err=model.add(candidate);if(err)toast(err);else{clickSound();if(model.bricks.length%25===0)toast(model.bricks.length+' pieces. Looking good!');updatePreview();}}return;}
 const id=world.hit(x,y)?.id;if(!id){select(null);return;}if(state.sticky)applySticky(id);else openWheel(id);}

// Pointer input. Presses on a piece can open the wheel three ways: a click with Select, a right-click with any tool, or a
// long press with any tool. With Select, pressing on a piece and flicking toward a slot picks it in one motion.
const LONG_PRESS=450,FLICK=22;let start=null,activePointers=new Set(),multiGesture=false,pressTimer=0;
canvas.addEventListener('pointerdown',e=>{canvas.focus({preventScroll:true});lastPointerType=e.pointerType;activePointers.add(e.pointerId);if(activePointers.size>1){multiGesture=true;clearTimeout(pressTimer);}
 const zone=hud.hit(e.clientX,e.clientY),brick=!zone&&!state.modal&&!state.carry&&!state.wheel?world.hit(e.clientX,e.clientY)?.id??null:null;
 // A Select press on a piece may become a flick, so it doesn't start orbiting the camera.
 const flickable=!!brick&&state.tool==='select'&&e.button===0&&e.pointerType==='mouse'&&!state.sticky;
 world.controls.enabled=!zone&&!state.modal&&!flickable;
 start={x:e.clientX,y:e.clientY,zone:zone?.id,button:e.button,brick,flickable,shift:e.shiftKey,held:false};hud.pressed=zone&&!zone.disabled?zone.id:null;hud.dirty=true;
 // Holding still on a piece opens its wheel; holding a slot or a wheel colour keeps that action going.
 clearTimeout(pressTimer);if(brick||/^(slot|wheelcolor):/.test(zone?.id||''))pressTimer=setTimeout(()=>{if(!start||multiGesture)return;start.held=true;if(start.brick){world.controls.enabled=false;openWheel(start.brick,{x:start.x,y:start.y});}else hud.dirty=true;},LONG_PRESS);
 if(zone||state.modal)e.stopImmediatePropagation();},true);
canvas.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY};lastPointerType=e.pointerType;const z=hud.hit(e.clientX,e.clientY);if(hud.hover!==z?.id){hud.hover=z?.id;hud.dirty=true;}canvas.style.cursor=z?'pointer':state.carry||state.tool==='build'?'crosshair':'grab';
 const dist=start?Math.hypot(e.clientX-start.x,e.clientY-start.y):0;if(dist>10)clearTimeout(pressTimer);
 if(start?.flickable&&!state.wheel&&dist>FLICK)openWheel(start.brick,{x:start.x,y:start.y});
 const w=state.wheel;if(w?.flick&&!w.ring){const i=slotAt(e.clientX-w.flick.x,e.clientY-w.flick.y,FLICK);if(i!==w.hi){w.hi=i;hud.dirty=true;}}
 if(start&&dist>6){world.preview(null);return;}updatePreview();});
canvas.addEventListener('pointerup',e=>{activePointers.delete(e.pointerId);clearTimeout(pressTimer);if(!start){if(!activePointers.size)multiGesture=false;return;}
 const st=start,moved=Math.hypot(e.clientX-st.x,e.clientY-st.y)>6,zone=hud.hit(e.clientX,e.clientY),w=state.wheel;start=null;hud.pressed=null;
 // Releasing a flick (or a long press that opened the wheel) over a slot picks it; anywhere else leaves the wheel open.
 if(st.zone==='sheet:handle'&&moved&&e.clientY-st.y>20)state.sheet=false;
 else if(w?.flick){w.flick=null;if(w.hi>=0){const slot=SLOTS[w.hi];w.hi=-1;if(!blockedSlots(model,brickOf(w.id))[slot.id])useSlot(slot.id,w.id,st.shift);else toast(`${slot.label}: ${blockedSlots(model,brickOf(w.id))[slot.id]}`);}}
 else if(!moved&&!multiGesture&&st.zone&&zone?.id===st.zone){if(zone.disabled){if(zone.id.startsWith('slot:'))toast(zone.label.replace(', unavailable: ',': '));}else action(st.zone,{keep:st.shift||st.held});}
 else if(!moved&&!multiGesture&&!st.zone&&!zone&&!state.modal){if(state.wheel)closeWheel();else if(st.button===2&&st.brick)openWheel(st.brick);else if(st.button===0&&!st.held)clickWorld(e.clientX,e.clientY,e.pointerType!=='mouse');}
 if(!activePointers.size)multiGesture=false;world.controls.enabled=true;hud.dirty=true;},true);
canvas.addEventListener('pointercancel',()=>{activePointers.clear();multiGesture=false;start=null;clearTimeout(pressTimer);hud.pressed=null;hud.dirty=true;world.controls.enabled=true;});
// A finger lifting also counts as leaving, so this clears only the hover preview; an aimed ghost stays until placed or cancelled.
canvas.addEventListener('pointerleave',()=>{if(!start){lastPointer=null;updatePreview();}});canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{if(hud.hit(e.clientX,e.clientY)||state.modal){e.stopImmediatePropagation();e.preventDefault();}},{capture:true,passive:false});
// Keys act on the piece the wheel is open on: 1–8 pick slots, arrows and Enter pick by direction, and each action also
// has a letter (R rotate, [ ] lower/raise, P paint, D copy, M move, X or Delete delete, U use). Shift keeps it going.
window.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();hud.focus=(hud.focus+(e.shiftKey?-1:1)+hud.zones.length)%hud.zones.length;hud.dirty=true;return;}if((e.key==='Enter'||e.key===' ')&&hud.focus>=0){e.preventDefault();const z=hud.zones[hud.focus];if(z&&!z.disabled)action(z.id,{keep:e.shiftKey});return;}hud.focus=-1;const key=e.key.toLowerCase();
 if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();action(e.shiftKey?'redo':'undo');return;}if((e.ctrlKey||e.metaKey)&&key==='s'){e.preventDefault();action('download');return;}
 if(key==='escape'){if(state.modal)state.modal=null;else if(state.sheet)state.sheet=false;else if(state.menu)state.menu=false;else if(state.aim)setAim(null);else if(state.carry){carry(null);toast('Put back');}else if(state.wheel)closeWheel();else if(state.sticky)stopSticky();else select(null);hud.dirty=true;return;}
 if(state.modal)return;const w=state.wheel;
 if(w&&!w.ring){if(/^[1-8]$/.test(e.key)){e.preventDefault();useSlot(SLOTS[+e.key-1].id,w.id,e.shiftKey);return;}
  if(['arrowright','arrowdown','arrowleft','arrowup'].includes(key)){e.preventDefault();w.hi=(Math.max(w.hi,0)+(key==='arrowright'||key==='arrowdown'?1:7))%8;hud.dirty=true;return;}
  if(key==='enter'&&w.hi>=0){e.preventDefault();useSlot(SLOTS[w.hi].id,w.id,e.shiftKey);return;}}
 const slotKey=SLOTS.find(s=>s.key===key)?.id||(key==='delete'||key==='backspace'?'delete':null);
 if(w&&slotKey){e.preventDefault();useSlot(slotKey,w.id,e.shiftKey);return;}
 if(state.carry&&key==='r'){e.preventDefault();action('rotate');return;}
 const keys={b:'tool:build',v:'tool:select',r:'rotate',f:'home',h:'help'};if(keys[key]){e.preventDefault();action(keys[key]);}if(key==='t'){world.home('top');toast('Top view');}
 if(key==='enter'&&state.selected&&!w){openWheel(state.selected);return;}
 if(key==='['||key===']'){e.preventDefault();heightOffset+=key===']'?1:-1;updatePreview();toast('Placement offset: '+heightOffset+' plates');}});
window.addEventListener('resize',()=>{world.resize();hud.resize();world.ui?.resize(innerWidth,innerHeight);});
// Read-only diagnostics describe the current visible workshop; no test-only mutations.
window.bricklabDiagnostics=()=>({backend:world.backend,pieces:model.bricks.length,revision:model.revision,drawCalls:world.renderer.info.render.drawCalls,triangles:world.renderer.info.render.triangles,frames:world.frames,lastSubmissionMs:Number(world.frameMs.toFixed(2)),selected:state.selected,tool:state.tool,wheel:state.wheel&&{id:state.wheel.id,ring:state.wheel.ring,x:Math.round(state.wheel.x),y:Math.round(state.wheel.y)},carry:state.carry&&{mode:state.carry.mode},sticky:state.sticky,aim:state.aim&&{x:state.aim.x,y:state.aim.y,z:state.aim.z,r:state.aim.r,ok:state.aim.ok,sx:Math.round(state.aim.screen?.x),sy:Math.round(state.aim.screen?.y)},sheet:state.sheet,menu:state.menu,history:{undo:model.past.length,redo:model.future.length},project:model.serialize()});
const context=document.modelContext;if(context?.registerTool){const lifecycle=new AbortController();const register=t=>{try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(e=>console.warn('[Bricklab] Tool registration unavailable',e));}catch(e){console.warn('[Bricklab] Tool registration unavailable',e);}};register({name:'inspect_brick_build',description:'Read the current brick project, the remaining capacity and whether gravity is on.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({project:model.serialize(),capacity:LIMIT,gravity:model.gravity})});register({name:'add_build_bricks',description:'Place up to 100 bricks atomically on the current build plate. Coordinates are integer studs, height is in plates. When gravity is on (off by default; see inspect_brick_build), every brick must be held up: resting on the plate or another piece, or hanging beneath a held piece by its own studs. Tiles and slopes have smooth tops, so nothing can hang beneath them. Bricks in the same batch may hold each other up.',inputSchema:{type:'object',properties:{bricks:{type:'array',minItems:1,maxItems:100,items:{type:'object',properties:{part:{type:'string'},color:{type:'string'},x:{type:'integer'},y:{type:'integer'},z:{type:'integer'},r:{type:'integer',minimum:0,maximum:3}},required:['part','color','x','y','z','r'],additionalProperties:false}}},required:['bricks'],additionalProperties:false},execute:input=>{if(!Array.isArray(input?.bricks)||input.bricks.length<1||input.bricks.length>100)throw Error('Supply 1–100 bricks');const err=model.addMany(input.bricks);if(err)throw Error(err);hud.dirty=true;hud.draw();return {pieces:model.bricks.length};}});window.addEventListener('pagehide',()=>lifecycle.abort());}
let lastHud=0;function loop(t){followWheel();followAim();hud.draw();if(world.ui&&world.ui.version!==hud.version){world.ui.update(hud.items);world.ui.version=hud.version;world.dirty=true;}world.tick(t);if(!splashGone&&world.ui&&world.frames)hideSplash();if(t-lastHud>1000){lastHud=t;if(state.toast&&t>state.toastUntil){state.toast='';hud.dirty=true;}}hud.draw();requestAnimationFrame(loop);}requestAnimationFrame(loop);
