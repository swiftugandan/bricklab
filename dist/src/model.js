// Domain model: integer stud coordinates; one plate is the vertical unit.
export const UNIT=.32, LIMIT=2000, SIZE=32;
// Gravity is opt-in: a new workshop lets pieces float until gravity is switched on in Workshop settings.
export const DEFAULT_GRAVITY=false;
export const COLORS=[['Sunflower','#f4c747'],['Coral','#ef6454'],['Ocean','#2895a6'],['Azure','#397bd6'],['Leaf','#65a45b'],['Cream','#eee7d3'],['Snow','#f6f7f8'],['Ink','#29333d'],['Stone','#8c9ba6'],['Cocoa','#85593f'],['Lilac','#ac83d0'],['Rose','#ed9db5']];
export const GROUPS=['Bricks','Plates','Tiles','Slopes','Round','Studs','Holes','Links'];
// Side faces in the piece's own frame before rotation: x runs along its width, z along its depth.
const X=['x-','x+'],Z=['z-','z+'],ALL=[...X,...Z];
// Rectangular families named "depth × width". Ids keep the original scheme (b24 is a 2 × 4 brick) so saved projects still load.
const sized=(prefix,group,h,sizes,extra={})=>sizes.map(([d,w])=>({id:`${prefix}${d}${w}`,name:`${d} × ${w}`,group,w,d,h,...extra}));
export const PARTS=[
 ...sized('b','Bricks',3,[[1,1],[1,2],[1,3],[1,4],[1,6],[1,8],[2,2],[2,3],[2,4],[2,6]]),
 ...sized('p','Plates',1,[[1,1],[1,2],[1,3],[1,4],[1,6],[2,2],[2,3],[2,4],[2,6],[4,4],[6,6]]),
 ...sized('t','Tiles',1,[[1,1],[1,2],[1,4],[2,2],[2,4]],{tile:true}),{id:'tr22',name:'2 × 2 round',group:'Tiles',w:2,d:2,h:1,tile:true,round:true},
 // Slopes fall away along their depth (z), from a full-height back edge to a low front edge.
 {id:'s12',name:'1 × 2',group:'Slopes',w:1,d:2,h:3,slope:true},{id:'s13',name:'1 × 3',group:'Slopes',w:1,d:3,h:3,slope:true},{id:'s22',name:'2 × 2',group:'Slopes',w:2,d:2,h:3,slope:true},{id:'s23',name:'2 × 3',group:'Slopes',w:2,d:3,h:3,slope:true},{id:'s24',name:'2 × 4',group:'Slopes',w:4,d:2,h:3,slope:true},
 {id:'r11',name:'1 × 1 brick',group:'Round',w:1,d:1,h:3,round:true},{id:'r22',name:'2 × 2 brick',group:'Round',w:2,d:2,h:3,round:true},{id:'rp11',name:'1 × 1 plate',group:'Round',w:1,d:1,h:1,round:true},{id:'rp22',name:'2 × 2 plate',group:'Round',w:2,d:2,h:1,round:true},{id:'c11',name:'1 × 1 cone',group:'Round',w:1,d:1,h:3,round:true,cone:true},{id:'d22',name:'2 × 2 dome',group:'Round',w:2,d:2,h:3,round:true,dome:true},
 // Side studs slot into side holes. Opposite-side pieces carry them on their long faces (both x faces for a 1 × 1).
 {id:'n11o',name:'1 × 1, 2 sides',group:'Studs',w:1,d:1,h:3,sideStuds:X},{id:'n11a',name:'1 × 1, 4 sides',group:'Studs',w:1,d:1,h:3,sideStuds:ALL},{id:'n12o',name:'1 × 2, 2 sides',group:'Studs',w:2,d:1,h:3,sideStuds:Z},{id:'n14o',name:'1 × 4, 2 sides',group:'Studs',w:4,d:1,h:3,sideStuds:Z},{id:'n22a',name:'2 × 2, 4 sides',group:'Studs',w:2,d:2,h:3,sideStuds:ALL},
 {id:'h11o',name:'1 × 1, 2 sides',group:'Holes',w:1,d:1,h:3,sideHoles:X},{id:'h11a',name:'1 × 1, 4 sides',group:'Holes',w:1,d:1,h:3,sideHoles:ALL},{id:'h12o',name:'1 × 2, 2 sides',group:'Holes',w:2,d:1,h:3,sideHoles:Z},{id:'h14o',name:'1 × 4, 2 sides',group:'Holes',w:4,d:1,h:3,sideHoles:Z},{id:'h22a',name:'2 × 2, 4 sides',group:'Holes',w:2,d:2,h:3,sideHoles:ALL},
 // Links carry studs on one side and holes on the opposite side, so identical pieces slot into each other sideways.
 // Holes face +x/+z and studs face -x/-z; "in a grid" links do both, so they join in rows and columns.
 {id:'l11r',name:'1 × 1, in a row',group:'Links',w:1,d:1,h:3,sideStuds:['x-'],sideHoles:['x+']},{id:'l11g',name:'1 × 1, in a grid',group:'Links',w:1,d:1,h:3,sideStuds:['x-','z-'],sideHoles:['x+','z+']},
 {id:'l12e',name:'1 × 2, end to end',group:'Links',w:2,d:1,h:3,sideStuds:['x-'],sideHoles:['x+']},{id:'l12s',name:'1 × 2, side by side',group:'Links',w:2,d:1,h:3,sideStuds:['z-'],sideHoles:['z+']},
 {id:'l14s',name:'1 × 4, side by side',group:'Links',w:4,d:1,h:3,sideStuds:['z-'],sideHoles:['z+']},{id:'l22g',name:'2 × 2, in a grid',group:'Links',w:2,d:2,h:3,sideStuds:['x-','z-'],sideHoles:['x+','z+']}];
// How a piece is named outside its catalog tab, e.g. "Brick 2 × 4" or "Side studs 1 × 1, 2 sides".
const SINGULAR={Bricks:'Brick',Plates:'Plate',Tiles:'Tile',Slopes:'Slope',Round:'Round',Studs:'Side studs',Holes:'Holes',Links:'Link'};
export const fullName=p=>`${SINGULAR[p.group]} ${p.name}`;
const BY_ID=new Map(PARTS.map(p=>[p.id,p]));
export const part=id=>BY_ID.get(id);
export function dims(b){const p=part(b.part);return b.r%2?{w:p.d,d:p.w,h:p.h}:{w:p.w,d:p.d,h:p.h};}
export function bounds(b){const d=dims(b);return {...d,x:b.x,z:b.z,y:b.y,x2:b.x+d.w,z2:b.z+d.d,y2:b.y+d.h};}
export function overlap(a,b){return a.x<b.x2&&a.x2>b.x&&a.z<b.z2&&a.z2>b.z&&a.y<b.y2&&a.y2>b.y;}
// Physics. Studded tops (bricks, plates, rounds and the baseplate) grip the piece above, so the two hold each other up.
// Smooth tops (tiles, slopes and domes) carry weight but grip nothing, so nothing can hang beneath them.
// Side studs slot into a facing side hole on the same course, and that grip holds both pieces like a top stud does.
// A piece is held when a chain of grips and resting contacts reaches the baseplate; anything else falls.
export const UNHELD='Nothing is holding this up. Rest it on the plate or on another piece.';
export const SIDE_CLASH='Side studs need a matching hole or open space.';
export const topStuds=p=>!p.tile&&!p.slope&&!p.dome;
export const studded=b=>topStuds(part(b.part));
// Rotating a piece a quarter turn (as the scene does, about +y) carries each local face to the next world face.
const TURN={'x+':'z-','z-':'x-','x-':'z+','z+':'x+'},OPPOSITE={'x+':'x-','x-':'x+','z+':'z-','z-':'z+'};
const turn=(f,r)=>{for(let i=0;i<r;i++)f=TURN[f];return f;};
export function sideFaces(b){const p=part(b.part);return {studs:new Set((p.sideStuds||[]).map(f=>turn(f,b.r))),holes:new Set((p.sideHoles||[]).map(f=>turn(f,b.r)))};}
// Where a piece p turned r goes when the pointer lands on target at world point (null target: the plate). The face hit is
// the one whose plane the point is furthest out past (or least far in from), measured in world units, so studs count as
// the top, hole bores as their wall, and the faces' small inset from the stud grid doesn't matter. A hit on the top (or
// the underside) stacks the piece on top; a hit on a wall sets it flush against that face, on the target's course or as
// high up a taller wall as the point, so side studs meet the holes they face.
export function anchor(target,point,p,r){const d=r%2?{w:p.d,d:p.w,h:p.h}:{w:p.w,d:p.d,h:p.h},x=Math.floor(point.x-d.w/2+.5),z=Math.floor(point.z-d.d/2+.5);if(!target)return {x,y:0,z};
 const a=bounds(target),gap={top:point.y-a.y2*UNIT,bottom:a.y*UNIT-point.y,'x-':a.x-point.x,'x+':point.x-a.x2,'z-':a.z-point.z,'z+':point.z-a.z2},f=Object.keys(gap).reduce((m,k)=>gap[k]>gap[m]?k:m);
 if(f==='top'||f==='bottom')return {x,y:a.y2,z};const y=Math.max(a.y,Math.min(a.y2-d.h,Math.floor(point.y/UNIT-d.h/2+.5)));
 return f==='x-'?{x:a.x-d.w,y,z}:f==='x+'?{x:a.x2,y,z}:f==='z-'?{x,y,z:a.z-d.d}:{x,y,z:a.z2};}
// The face of box a that touches box o side to side over some shared height, or null.
function facing(a,o){if(a.y>=o.y2||o.y>=a.y2)return null;const xs=a.x<o.x2&&o.x<a.x2,zs=a.z<o.z2&&o.z<a.z2;if(zs&&a.x2===o.x)return 'x+';if(zs&&o.x2===a.x)return 'x-';if(xs&&a.z2===o.z)return 'z+';if(xs&&o.z2===a.z)return 'z-';return null;}
// 'grip' when every side stud between b and o slots into a hole on the same course, 'clash' when a side stud presses on anything else, null when no side stud is involved.
function side(b,o,a=bounds(b),ob=bounds(o)){const f=facing(a,ob);if(!f)return null;const g=OPPOSITE[f],mine=sideFaces(b),theirs=sideFaces(o);if(!mine.studs.has(f)&&!theirs.studs.has(g))return null;const aligned=a.y===ob.y&&a.h===ob.h;return aligned&&(!mine.studs.has(f)||theirs.holes.has(g))&&(!theirs.studs.has(g)||mine.holes.has(f))?'grip':'clash';}
const cell=(x,z)=>(x+SIZE/2)*SIZE+z+SIZE/2;
// Pieces indexed by the stud cells they cover. Falling is vertical, so the index stays valid as pieces drop.
function columns(bricks){const index=new Map();for(const b of bricks){const a=bounds(b);for(let x=a.x;x<a.x2;x++)for(let z=a.z;z<a.z2;z++){const k=cell(x,z);if(!index.has(k))index.set(k,[]);index.get(k).push(b);}}return index;}
const inside=v=>v>=-SIZE/2&&v<SIZE/2;
function contacts(b,index){const a=bounds(b),below=new Set(),above=new Set(),beside=new Set();for(let x=a.x;x<a.x2;x++)for(let z=a.z;z<a.z2;z++)for(const o of index.get(cell(x,z))||[]){if(o===b)continue;const ob=bounds(o);if(ob.y2===a.y)below.add(o);else if(ob.y===a.y2)above.add(o);}
 // Side grips live in the ring of cells just outside each face.
 const ring=[];for(let z=a.z;z<a.z2;z++){if(inside(a.x-1))ring.push(cell(a.x-1,z));if(inside(a.x2))ring.push(cell(a.x2,z));}for(let x=a.x;x<a.x2;x++){if(inside(a.z-1))ring.push(cell(x,a.z-1));if(inside(a.z2))ring.push(cell(x,a.z2));}
 for(const k of ring)for(const o of index.get(k)||[])if(side(b,o,a)==='grip')beside.add(o);return {below,above,beside};}
// Everything that can hold b up: whatever it sits on, what it hangs from if its own studs grip the piece above, and side grips.
function holders(b,index){const {below,above,beside}=contacts(b,index);return [...below,...(studded(b)?above:[]),...beside];}
function held(target,index){const seen=new Set([target]),stack=[target];while(stack.length){const b=stack.pop();if(b.y===0)return true;for(const o of holders(b,index))if(!seen.has(o)){seen.add(o);stack.push(o);}}return false;}
function heldSet(bricks,index){const out=new Set(),queue=bricks.filter(b=>b.y===0);queue.forEach(b=>out.add(b));while(queue.length){const b=queue.pop();const {below,above,beside}=contacts(b,index);for(const o of [...above,...beside])if(!out.has(o)){out.add(o);queue.push(o);}for(const o of below)if(studded(o)&&!out.has(o)){out.add(o);queue.push(o);}}return out;}
// Unions loose pieces into rigid groups. `joined(a,o)` decides which contacts bind two pieces together.
function groups(loose,index,joined){const parent=new Map(loose.map(b=>[b,b])),root=b=>{while(parent.get(b)!==b){parent.set(b,parent.get(parent.get(b)));b=parent.get(b);}return b;};for(const b of loose){const {below,above,beside}=contacts(b,index);for(const o of below)if(parent.has(o)&&joined(o,b))parent.set(root(o),root(b));for(const o of above)if(parent.has(o)&&joined(b,o))parent.set(root(o),root(b));for(const o of beside)if(parent.has(o))parent.set(root(o),root(b));}const out=new Map();for(const b of loose){const r=root(b);if(!out.has(r))out.set(r,[]);out.get(r).push(b);}return [...out.values()];}
// How far a group can drop before one of its pieces lands on the plate or on a piece outside the group.
function clearance(group,index){const members=new Set(group);let drop=Infinity;for(const m of group){const a=bounds(m);drop=Math.min(drop,a.y);for(let x=a.x;x<a.x2;x++)for(let z=a.z;z<a.z2;z++)for(const o of index.get(cell(x,z))||[]){if(members.has(o))continue;const ob=bounds(o);if(ob.y2<=a.y)drop=Math.min(drop,a.y-ob.y2);}}return drop;}
// Drops every unheld piece until the whole build is held. Gripped pieces fall as one rigid group, lowest group first.
// If every group is blocked by another falling group, groups in contact fall together for that step.
// Returns the input array untouched when nothing needs to fall.
export function settle(bricks){
 let index=columns(bricks);if(heldSet(bricks,index).size===bricks.length)return {bricks,fallen:0};
 const start=new Map(bricks.map(b=>[b.id,b.y])),work=bricks.map(b=>({...b}));index=columns(work);
 for(;;){const holding=heldSet(work,index);if(holding.size===work.length)break;const loose=work.filter(b=>!holding.has(b));
  const fall=list=>{let moved=false;for(const g of list.sort((a,b)=>Math.min(...a.map(m=>m.y))-Math.min(...b.map(m=>m.y)))){const d=clearance(g,index);if(d>0){g.forEach(m=>m.y-=d);moved=true;}}return moved;};
  if(!fall(groups(loose,index,studded)))fall(groups(loose,index,()=>true));}
 return {bricks:work,fallen:work.filter(b=>b.y!==start.get(b.id)).length};
}
export class Model{
 constructor({gravity=DEFAULT_GRAVITY}={}){this.bricks=[];this.past=[];this.future=[];this.name='Untitled build';this.revision=0;this.fallen=0;this.gravity=gravity;this.listeners=new Set();}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 // Snapshots carry the gravity setting so undo never restores floating pieces into a world where gravity is on.
 snapshot(){return {name:this.name,gravity:this.gravity,bricks:this.bricks.map(b=>({...b}))};}
 emit(){this.revision++;for(const fn of this.listeners)fn();}
 // With gravity on, every edit ends by settling, so whatever lost its support falls; `fallen` counts the pieces that moved.
 transaction(fn){const old=this.snapshot();fn();({bricks:this.bricks,fallen:this.fallen}=this.gravity?settle(this.bricks):{bricks:this.bricks,fallen:0});this.past.push(old);if(this.past.length>80)this.past.shift();this.future=[];this.emit();}
 // Shape, colour, plate bounds and collisions, checked against `others`.
 fits(b,ignore=null,others=this.bricks){if(!part(b.part)||!Number.isInteger(b.x)||!Number.isInteger(b.z)||!Number.isInteger(b.y)||!Number.isInteger(b.r)||b.r<0||b.r>3||!COLORS.some(c=>c[1]===b.color))return 'Invalid brick';const a=bounds(b);if(a.x< -16||a.z< -16||a.x2>16||a.z2>16||a.y<0||a.y2>96)return 'Outside the build plate';let clash=false;for(const o of others){if(o.id===ignore||o===b)continue;const ob=bounds(o);if(overlap(a,ob))return 'Space is occupied';clash||=side(b,o,a,ob)==='clash';}return clash?SIDE_CLASH:null;}
 // Fits, and with gravity on is held once placed. `ignore` is the piece being replaced, so a move can't lean on the spot it leaves.
 valid(b,ignore=null){const err=this.fits(b,ignore);if(err||!this.gravity)return err;const after=this.bricks.filter(o=>o.id!==ignore);after.push(b);return held(b,columns(after))?null:UNHELD;}
 add(b){if(this.bricks.length>=LIMIT)return 'The 2,000-piece limit is reached';const err=this.valid(b);if(err)return err;this.transaction(()=>this.bricks.push({...b,id:crypto.randomUUID()}));return null;}
 // Places a batch atomically. Pieces in the batch may hold each other up.
 addMany(list){if(this.bricks.length+list.length>LIMIT)return 'The 2,000-piece limit is reached';const after=[...this.bricks],added=[];for(const raw of list){const b={part:raw.part,x:raw.x,y:raw.y,z:raw.z,r:raw.r,color:raw.color,id:crypto.randomUUID()};const err=this.fits(b,null,after);if(err)return err;after.push(b);added.push(b);}if(this.gravity){const index=columns(after);if(!added.every(b=>held(b,index)))return UNHELD;}this.transaction(()=>this.bricks=after);return null;}
 update(id,patch){const b=this.bricks.find(b=>b.id===id);if(!b)return 'Choose a brick first';const next={...b,...patch};const err=this.valid(next,id);if(err)return err;this.transaction(()=>Object.assign(b,patch));return null;}
 remove(id){if(!this.bricks.some(b=>b.id===id))return;this.transaction(()=>this.bricks=this.bricks.filter(b=>b.id!==id));}
 // Turning gravity on drops floating pieces as one undoable step; undo brings back both the setting and the positions.
 setGravity(on){if(on===this.gravity)return;this.transaction(()=>this.gravity=on);}
 undo(){if(!this.past.length)return false;this.future.push(this.snapshot());Object.assign(this,this.past.pop());this.fallen=0;this.emit();return true;}
 redo(){if(!this.future.length)return false;this.past.push(this.snapshot());Object.assign(this,this.future.pop());this.fallen=0;this.emit();return true;}
 replace(data){const clean=validateProject(data,{gravity:this.gravity});this.transaction(()=>Object.assign(this,clean));}
 // Gravity is a workshop setting, not part of the project, so files never carry it.
 serialize(){return {format:'bricklab',version:1,name:this.name,bricks:this.bricks.map(b=>({...b}))};}
}
export function validateProject(data,{gravity=DEFAULT_GRAVITY}={}){if(data?.format!=='bricklab'||data.version!==1||!Array.isArray(data.bricks)||data.bricks.length>LIMIT)throw Error('This is not a supported Bricklab project');const m=new Model();const ids=new Set();for(const raw of data.bricks){if(typeof raw.id!=='string'||ids.has(raw.id))throw Error('Invalid or duplicate brick ID');const b={id:raw.id,part:raw.part,x:raw.x,y:raw.y,z:raw.z,r:raw.r,color:raw.color};const err=m.fits(b);if(err)throw Error(err);m.bricks.push(b);ids.add(b.id);}
 // With gravity on, floating pieces settle onto whatever is below them rather than failing the import.
 return {name:String(data.name||'Untitled build').slice(0,60),bricks:gravity?settle(m.bricks).bricks:m.bricks};}
export function starter(kind='blank'){
 const m=new Model();m.name=kind==='blank'?'Untitled build':kind==='tower'?'Colour tower':'Sunshine studio';
 const add=(p,x,y,z,c,r=0)=>{const b={id:crypto.randomUUID(),part:p,x,y,z,color:COLORS[c][1],r};if(!m.fits(b))m.bricks.push(b);};
 if(kind==='studio'){
 for(let x=-6;x<6;x+=4)for(let z=-4;z<4;z+=4)add('p44',x,0,z,5);
 for(let y=1;y<13;y+=3){for(let x=-6;x<6;x+=2){add('b12',x,y,-4,y===10?2:5);if(x!==-2&&x!==0)add('b12',x,y,3,y===10?2:5);}for(let z=-3;z<3;z+=2){add('b12',-6,y,z,5,1);add('b12',5,y,z,5,1);}}
 // Dark window panes and a recessed teal door.
 for(let y=1;y<10;y+=3){add('b12',-1,y,2,2);add('b12',-4,y,2,y===4?7:2);add('b12',2,y,2,y===4?7:2);}
 // Two ceiling layers with staggered joints tie the walls together so the roof has something to hold it.
 for(let x=-6;x<6;x+=4)for(let z=-4;z<4;z+=2)add('p24',x,13,z,2);
 for(let z=-4;z<4;z+=4){add('p24',-6,14,z,2,1);add('p44',-4,14,z,2);add('p44',0,14,z,2);add('p24',4,14,z,2,1);}
 for(let x=-6;x<6;x+=2){add('s22',x,15,-4,1,2);add('s22',x,15,2,1);add('b22',x,15,-2,1);add('b22',x,15,0,1);add('s22',x,18,-2,1,2);add('s22',x,18,0,1);}
 for(let z=4;z<13;z+=2){add('t22',-1,0,z,8);}
 add('b22',3,21,-2,5);add('p22',3,24,-2,7);
 for(let y=0;y<12;y+=3)add('r11',9,y,-2,9);
 for(let x=7;x<=9;x+=2)for(let z=-3;z<=-1;z+=2)add('r22',x,12,z,4);
 add('r22',8,15,-2,4);add('p22',-10,0,5,9);add('r11',-10,1,5,4);add('p22',-10,4,5,0);
 add('p22',9,0,7,9);add('r11',9,1,7,4);add('p22',9,4,7,1);
 }else if(kind==='tower'){for(let y=0;y<36;y+=3){for(let x=-3;x<3;x+=2)for(let z=-3;z<3;z+=2)if(x===-3||x===1||z===-3||z===1)add('b22',x,y,z,(y/3)%6);}// A plate cap closes the hollow shaft so the centre slope has something to rest on.
 add('p44',-3,36,-3,1);add('p24',-3,36,1,1);add('p24',1,36,-3,1,1);add('p22',1,36,1,1);for(let x=-3;x<3;x+=2)for(let z=-3;z<3;z+=2)add('s22',x,37,z,1);}
 return m.serialize();
}
