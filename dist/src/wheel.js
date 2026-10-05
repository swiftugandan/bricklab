import {COLORS} from './model.js';
// The piece wheel: eight actions around a selected piece, always in the same direction so a hand can learn them.
// Up raises and down lowers, rotate sits on the clockwise side, and Delete is kept away from the actions people repeat.
// `kind` says how an action behaves: tweaks apply at once and keep the wheel open, the picker opens a colour ring,
// carry actions pick the piece up to drop elsewhere, remove deletes it, and switch hands it to the Build tool.
export const SLOTS=[
 {id:'raise',label:'Raise',key:']',kind:'tweak'},{id:'paint',label:'Paint',key:'p',kind:'picker'},
 {id:'rotate',label:'Rotate',key:'r',kind:'tweak'},{id:'copy',label:'Copy',key:'d',kind:'carry'},
 {id:'lower',label:'Lower',key:'[',kind:'tweak'},{id:'delete',label:'Delete',key:'x',kind:'remove'},
 {id:'move',label:'Move',key:'m',kind:'carry'},{id:'use',label:'Use',key:'u',kind:'switch'}];
export const SEGMENT=Math.PI/4;
// Screen angle of a slot's centre, in radians clockwise from east (screen y points down), starting with north.
export const slotAngle=i=>-Math.PI/2+i*SEGMENT;
// The slot a pointer offset from the centre points at, or -1 inside the dead zone.
export function slotAt(dx,dy,deadZone){if(Math.hypot(dx,dy)<deadZone)return -1;return Math.round((Math.atan2(dy,dx)+Math.PI/2)/SEGMENT+8)%8;}
// The change a tweak makes, or null for slots that aren't tweaks.
export function tweak(id,b){return id==='raise'?{y:b.y+1}:id==='lower'?{y:b.y-1}:id==='rotate'?{r:(b.r+1)%4}:null;}
// Why each tweak would be refused right now, as slot id → message. It asks the model, so the wheel never offers what the
// build would refuse: collisions, plate edges, side-stud clashes and, with gravity on, support.
export function blockedSlots(model,b){const out={};for(const s of SLOTS){if(s.kind!=='tweak')continue;if(s.id==='lower'&&b.y===0){out.lower='The plate is in the way';continue;}const err=model.valid({...b,...tweak(s.id,b)},b.id);if(err)out[s.id]=err;}return out;}
// The wheel's centre: on the piece, slid inward just enough to keep a wheel of the given radius on screen.
export function wheelCentre(x,y,radius,w,h,margin=8){const r=radius+margin,clamp=(v,max)=>Math.max(r,Math.min(max-r,v));return {x:clamp(x,w),y:clamp(y,h)};}
// What a sticky mode is called in its chip, e.g. "Painting Coral".
export function stickyLabel(sticky){const colour=COLORS.find(c=>c[1]===sticky.color)?.[0];return {raise:'Raising',lower:'Lowering',rotate:'Rotating',paint:`Painting ${colour||''}`.trim(),copy:'Copying',delete:'Deleting',move:'Moving',use:'Picking up'}[sticky.id];}
