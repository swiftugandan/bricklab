// Domain model: integer stud coordinates; one plate is the vertical unit.
export const UNIT=.32, LIMIT=2000, SIZE=32;
export const COLORS=[['Sunflower','#f4c747'],['Coral','#ef6454'],['Ocean','#2895a6'],['Azure','#397bd6'],['Leaf','#65a45b'],['Cream','#eee7d3'],['Snow','#f6f7f8'],['Ink','#29333d'],['Stone','#8c9ba6'],['Cocoa','#85593f'],['Lilac','#ac83d0'],['Rose','#ed9db5']];
export const PARTS=[
{id:'b24',name:'2 × 4',group:'Bricks',w:4,d:2,h:3},{id:'b22',name:'2 × 2',group:'Bricks',w:2,d:2,h:3},{id:'b12',name:'1 × 2',group:'Bricks',w:2,d:1,h:3},{id:'b11',name:'1 × 1',group:'Bricks',w:1,d:1,h:3},{id:'b14',name:'1 × 4',group:'Bricks',w:4,d:1,h:3},{id:'b16',name:'1 × 6',group:'Bricks',w:6,d:1,h:3},
{id:'p24',name:'2 × 4',group:'Plates',w:4,d:2,h:1},{id:'p22',name:'2 × 2',group:'Plates',w:2,d:2,h:1},{id:'p44',name:'4 × 4',group:'Plates',w:4,d:4,h:1},{id:'p12',name:'1 × 2',group:'Plates',w:2,d:1,h:1},{id:'p14',name:'1 × 4',group:'Plates',w:4,d:1,h:1},{id:'p11',name:'1 × 1',group:'Plates',w:1,d:1,h:1},
{id:'t22',name:'2 × 2',group:'Tiles',w:2,d:2,h:1,tile:true},{id:'t12',name:'1 × 2',group:'Tiles',w:2,d:1,h:1,tile:true},{id:'t24',name:'2 × 4',group:'Tiles',w:4,d:2,h:1,tile:true},
{id:'s22',name:'Slope 2 × 2',group:'Special',w:2,d:2,h:3,slope:true},{id:'s24',name:'Slope 2 × 4',group:'Special',w:4,d:2,h:3,slope:true},{id:'r11',name:'Round 1 × 1',group:'Special',w:1,d:1,h:3,round:true},{id:'r22',name:'Round 2 × 2',group:'Special',w:2,d:2,h:3,round:true}];
export const part=id=>PARTS.find(p=>p.id===id);
export function dims(b){const p=part(b.part);return b.r%2?{w:p.d,d:p.w,h:p.h}:{w:p.w,d:p.d,h:p.h};}
export function bounds(b){const d=dims(b);return {...d,x:b.x,z:b.z,y:b.y,x2:b.x+d.w,z2:b.z+d.d,y2:b.y+d.h};}
export function overlap(a,b){return a.x<b.x2&&a.x2>b.x&&a.z<b.z2&&a.z2>b.z&&a.y<b.y2&&a.y2>b.y;}
export class Model{
 constructor(){this.bricks=[];this.past=[];this.future=[];this.name='Sunshine studio';this.revision=0;this.listeners=new Set();}
 onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 snapshot(){return {name:this.name,bricks:this.bricks.map(b=>({...b}))};}
 emit(){this.revision++;for(const fn of this.listeners)fn();}
 transaction(fn){const old=this.snapshot();fn();this.past.push(old);if(this.past.length>80)this.past.shift();this.future=[];this.emit();}
 valid(b,ignore=null){if(!part(b.part)||!Number.isInteger(b.x)||!Number.isInteger(b.z)||!Number.isInteger(b.y)||!Number.isInteger(b.r)||b.r<0||b.r>3||!COLORS.some(c=>c[1]===b.color))return 'Invalid brick';const a=bounds(b);if(a.x< -16||a.z< -16||a.x2>16||a.z2>16||a.y<0||a.y2>96)return 'Outside the build plate';if(this.bricks.some(o=>o.id!==ignore&&overlap(a,bounds(o))))return 'Space is occupied';return null;}
 add(b){if(this.bricks.length>=LIMIT)return 'The 2,000-piece limit is reached';const err=this.valid(b);if(err)return err;this.transaction(()=>this.bricks.push({...b,id:crypto.randomUUID()}));return null;}
 update(id,patch){const b=this.bricks.find(b=>b.id===id);if(!b)return 'Choose a brick first';const next={...b,...patch};const err=this.valid(next,id);if(err)return err;this.transaction(()=>Object.assign(b,patch));return null;}
 remove(id){if(!this.bricks.some(b=>b.id===id))return;this.transaction(()=>this.bricks=this.bricks.filter(b=>b.id!==id));}
 undo(){if(!this.past.length)return false;this.future.push(this.snapshot());Object.assign(this,this.past.pop());this.emit();return true;}
 redo(){if(!this.future.length)return false;this.past.push(this.snapshot());Object.assign(this,this.future.pop());this.emit();return true;}
 replace(data){const clean=validateProject(data);this.transaction(()=>Object.assign(this,clean));}
 serialize(){return {format:'bricklab',version:1,...this.snapshot()};}
}
export function validateProject(data){if(data?.format!=='bricklab'||data.version!==1||!Array.isArray(data.bricks)||data.bricks.length>LIMIT)throw Error('This is not a supported Bricklab project');const m=new Model();const ids=new Set();for(const raw of data.bricks){if(typeof raw.id!=='string'||ids.has(raw.id))throw Error('Invalid or duplicate brick ID');const b={id:raw.id,part:raw.part,x:raw.x,y:raw.y,z:raw.z,r:raw.r,color:raw.color};const err=m.valid(b);if(err)throw Error(err);m.bricks.push(b);ids.add(b.id);}return {name:String(data.name||'Untitled build').slice(0,60),bricks:m.bricks};}
export function starter(kind='studio'){
 const m=new Model();m.name=kind==='blank'?'Untitled build':kind==='tower'?'Colour tower':'Sunshine studio';
 const add=(p,x,y,z,c,r=0)=>{const b={id:crypto.randomUUID(),part:p,x,y,z,color:COLORS[c][1],r};if(!m.valid(b))m.bricks.push(b);};
 if(kind==='studio'){
 for(let x=-6;x<6;x+=4)for(let z=-4;z<4;z+=4)add('p44',x,0,z,5);
 for(let y=1;y<13;y+=3){for(let x=-6;x<6;x+=2){add('b12',x,y,-4,y===10?2:5);if(x!==-2&&x!==0)add('b12',x,y,3,y===10?2:5);}for(let z=-3;z<3;z+=2){add('b12',-6,y,z,5,1);add('b12',5,y,z,5,1);}}
 // Dark window panes and a recessed teal door.
 for(let y=1;y<10;y+=3){add('b12',-1,y,2,2);add('b12',-4,y,2,y===4?7:2);add('b12',2,y,2,y===4?7:2);}
 for(let x=-6;x<6;x+=2){add('s22',x,13,-4,1,2);add('s22',x,13,2,1);add('b22',x,13,-2,1);add('b22',x,13,0,1);add('s22',x,16,-2,1,2);add('s22',x,16,0,1);}
 for(let z=4;z<13;z+=2){add('t22',-1,0,z,8);}
 add('b22',3,19,-2,5);add('p22',3,22,-2,7);
 for(let y=0;y<12;y+=3)add('r11',9,y,-2,9);
 for(let x=7;x<=9;x+=2)for(let z=-3;z<=-1;z+=2)add('r22',x,12,z,4);
 add('r22',8,15,-2,4);add('p22',-10,0,5,9);add('r11',-10,1,5,4);add('p22',-10,4,5,0);
 add('p22',9,0,7,9);add('r11',9,1,7,4);add('p22',9,4,7,1);
 }else if(kind==='tower'){for(let y=0;y<36;y+=3){for(let x=-3;x<3;x+=2)for(let z=-3;z<3;z+=2)if(x===-3||x===1||z===-3||z===1)add('b22',x,y,z,(y/3)%6);}for(let x=-3;x<3;x+=2)for(let z=-3;z<3;z+=2)add('s22',x,36,z,1);}
 return m.serialize();
}
