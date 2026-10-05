import * as T from 'three';
// Builds the HUD's display list out of the same plastic as the bricks: panels and buttons are moulded tiles, labels and
// icons are printed decals, catalog pieces are real part geometry and colour swatches are round plates. It renders in
// its own scene over the build, with an orthographic camera measured in CSS pixels so the HUD's layout maps 1:1.
const FONT='Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',DPR=()=>Math.min(devicePixelRatio,2);
// Tile thickness in pixels by role; buttons stand proud of the panels they sit on.
const DEPTH={panel:6,button:7,card:5,swatch:5,toast:7};
// Accepts #rgb, #rrggbb, #rrggbbaa or a CSS name; returns a colour and an opacity.
function parse(css){if(css==='white')css='#ffffff';const hex=css.slice(1);const full=hex.length===3?[...hex].map(c=>c+c).join(''):hex;return {color:new T.Color('#'+full.slice(0,6)),opacity:full.length===8?parseInt(full.slice(6),16)/255:1};}
const ICONS={build:[[-8,-4],[8,-4],[8,7],[-8,7],[-8,-4],[-5,-4],[-5,-8],[-1,-8],[-1,-4],[3,-4],[3,-8],[7,-8],[7,-4]],select:[[-6,-9],[-6,8],[-1,4],[3,10],[6,8],[2,2],[9,2],[-6,-9]],move:[[-9,0],[9,0],[5,-4],[9,0],[5,4],[9,0],[-9,0],[-5,-4],[-9,0],[-5,4],[0,0],[0,-9],[-4,-5],[0,-9],[4,-5],[0,0],[0,9],[-4,5],[0,9],[4,5]],paint:[[-7,2],[3,-8],[8,-3],[-2,7],[-7,2],[-8,8],[-4,9]],erase:[[-8,3],[1,-7],[9,0],[1,9],[-3,9],[-8,3],[-2,-3],[6,4]],rotate:[[7,-3],[3,-8],[-3,-8],[-8,-3],[-8,4],[-3,8],[3,8],[7,5]],undo:[[7,7],[7,0],[3,-4],[-8,-4],[-3,-9],[-8,-4],[-3,1]],redo:[[-7,7],[-7,0],[-3,-4],[8,-4],[3,-9],[8,-4],[3,1]],home:[[-8,0],[0,-8],[8,0],[6,0],[6,8],[-6,8],[-6,0]],plus:[[-7,0],[7,0],[0,0],[0,-7],[0,7]],minus:[[-7,0],[7,0]],close:[[-6,-6],[6,6],[0,0],[6,-6],[-6,6]],camera:[[-9,-5],[-4,-5],[-2,-8],[3,-8],[5,-5],[9,-5],[9,7],[-9,7],[-9,-5]],grid:[[-8,-8],[8,-8],[8,8],[-8,8],[-8,-8],[0,-8],[0,8],[-8,0],[8,0]],copy:[[-3,-8],[8,-8],[8,3],[3,3],[3,8],[-8,8],[-8,-3],[3,-3],[3,3]],raise:[[0,8],[0,-8],[-5,-3],[0,-8],[5,-3]],lower:[[0,-8],[0,8],[-5,3],[0,8],[5,3]],delete:[[-7,-5],[7,-5],[5,8],[-5,8],[-7,-5],[-3,-5],[-3,-8],[3,-8],[3,-5]],use:[[6,-8],[8,-6],[-2,4],[-6,8],[-8,8],[-8,6],[-4,2],[6,-8]]};
// Paints a line icon centred on (0,0) of a 24px box into ctx.
function drawIcon(c,type,color){c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1.8;c.lineCap='round';c.lineJoin='round';const p=ICONS[type];if(p){c.beginPath();c.moveTo(...p[0]);for(const pt of p.slice(1))c.lineTo(...pt);c.stroke();}
 if(type==='rotate'){c.beginPath();c.moveTo(7,-9);c.lineTo(7,-3);c.lineTo(1,-3);c.stroke();}if(type==='menu')for(const x of [-7,0,7]){c.beginPath();c.arc(x,0,2.2,0,7);c.fill();}if(type==='camera'){c.beginPath();c.arc(0,1,3,0,7);c.stroke();}
 if(type==='settings'){c.beginPath();c.arc(0,0,5,0,7);c.stroke();c.beginPath();c.arc(0,0,1.8,0,7);c.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;c.beginPath();c.moveTo(Math.cos(a)*6.5,Math.sin(a)*6.5);c.lineTo(Math.cos(a)*9,Math.sin(a)*9);c.stroke();}}}
// A rounded rectangle centred on the origin, as a Shape.
function rounded(w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));const s=new T.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
const STROKES=new Set(['#f4c747','#ffffff']);
export class StudioUI{
 constructor(geometries){this.geometries=geometries;this.scene=new T.Scene();this.camera=new T.OrthographicCamera(0,1,0,-1,-4000,4000);this.camera.position.z=2000;
  // Balanced so a flat tile facing the viewer shows close to its designed colour (ambient ≈ 0.5, sun ≈ 0.45 of albedo),
  // with the sun low and to the upper left so bevels shade and highlights skim off rather than glare across every face.
  this.scene.add(new T.AmbientLight('#ffffff',Math.PI*.5));this.sun=new T.DirectionalLight('#ffffff',2.4);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.bias=-.0004;this.sun.shadow.normalBias=.6;
  // The UI only changes when it's rebuilt, so its shadows are re-rendered then rather than on every orbiting frame.
  this.sun.shadow.autoUpdate=false;this.scene.add(this.sun,this.sun.target);
  this.cache={geometry:new Map(),material:new Map(),texture:new Map()};this.pools=new Map();this.decal=new T.PlaneGeometry(1,1);this.version=-1;}
 resize(w,h){this.w=w;this.h=h;Object.assign(this.camera,{left:0,right:w,top:0,bottom:-h});this.camera.updateProjectionMatrix();
  // Light from the upper left and in front, so tiles shade like the bricks and cast short shadows down and to the right.
  this.sun.target.position.set(w/2,-h/2,0);this.sun.position.set(w/2-1300,-h/2+1500,1600);const s=Math.max(w,h);Object.assign(this.sun.shadow.camera,{left:-s,right:s,top:s,bottom:-s,near:1,far:5000});this.sun.shadow.camera.updateProjectionMatrix();
  for(const g of this.cache.geometry.values())g.dispose();this.cache.geometry.clear();this.sun.shadow.needsUpdate=true;}
 geometry(key,make){let g=this.cache.geometry.get(key);if(!g){g=make();this.cache.geometry.set(key,g);}return g;}
 material(key,make){let m=this.cache.material.get(key);if(!m){m=make();this.cache.material.set(key,m);}return m;}
 // Meshes are pooled per geometry so a redraw (a hover, a toast) only moves and recolours what already exists.
 mesh(geometry,material,{cast=false,receive=false}={}){let pool=this.pools.get(geometry);if(!pool){pool={list:[],used:0};this.pools.set(geometry,pool);}let m=pool.list[pool.used++];if(!m){m=new T.Mesh(geometry,material);pool.list.push(m);this.scene.add(m);}m.material=material;m.castShadow=cast;m.receiveShadow=receive;m.visible=true;m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.set(1,1,1);m.renderOrder=0;return m;}
 plastic(css){return this.material('plastic'+css,()=>{const {color,opacity}=parse(css);return new T.MeshStandardMaterial({color,roughness:.8,metalness:0,transparent:opacity<.9,opacity:opacity<.9?opacity:1});});}
 flat(css){return this.material('flat'+css,()=>{const {color,opacity}=parse(css);return new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity>=1});});}
 // A tile: a rounded slab with a soft bevel, its back face at z=0 and its face at z=depth.
 tileGeometry(w,h,r,depth){const k=`tile${w.toFixed(1)}x${h.toFixed(1)}r${r}d${depth}`;return this.geometry(k,()=>{const bevel=Math.min(1.6,depth/3,w/4,h/4);const g=new T.ExtrudeGeometry(rounded(w-bevel*2,h-bevel*2,Math.max(0,r-bevel)),{depth:depth-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:6});g.translate(0,0,bevel);return g;});}
 // A wheel segment: a curved tile spanning `span` radians centred on angle 0, between radii r0 and r1, with a small gap each side.
 sectorGeometry(r0,r1,span,depth){const k=`sector${r0}-${r1}-${span.toFixed(3)}d${depth}`;return this.geometry(k,()=>{const bevel=1.4,gap=2.5,a0=-span/2+gap/r0,a1=span/2-gap/r0,b0=-span/2+gap/r1,b1=span/2-gap/r1,s=new T.Shape();
  s.moveTo((r1-bevel)*Math.cos(b0),(r1-bevel)*Math.sin(b0));s.absarc(0,0,r1-bevel,b0,b1,false);s.lineTo((r0+bevel)*Math.cos(a1),(r0+bevel)*Math.sin(a1));s.absarc(0,0,r0+bevel,a1,a0,true);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:depth-bevel*2,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:10});g.translate(0,0,bevel);return g;});}
 ringGeometry(w,h,r,width){const k=`ring${w.toFixed(1)}x${h.toFixed(1)}r${r}w${width}`;return this.geometry(k,()=>{const s=rounded(w+width*2,h+width*2,r+width);s.holes.push(rounded(w,h,r));return new T.ShapeGeometry(s,8);});}
 // Printed text or icons: a canvas texture on a flat decal, unlit so it reads crisply on any tile.
 texture(key,width,height,paint){let t=this.cache.texture.get(key);if(!t){const dpr=DPR(),canvas=document.createElement('canvas');canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);const c=canvas.getContext('2d');c.scale(dpr,dpr);paint(c);t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=T.LinearFilter;t.userData={width,height};this.cache.texture.set(key,t);}return t;}
 print(texture,x,y,z,order=1){const m=this.mesh(this.decal,this.material('decal'+texture.uuid,()=>new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false})));m.scale.set(texture.userData.width,texture.userData.height,1);m.position.set(x,-y,z);m.renderOrder=order;return m;}
 update(items){for(const pool of this.pools.values())pool.used=0;
  // Each item rests on the topmost tile under its centre, so labels sit on buttons and buttons sit on panels.
  // Draw order runs in layers: what's behind a dialog, then the dimming scrim over it, then the dialog. Printed decals don't
  // write depth, so they rely on this order rather than the depth buffer to sit under the scrim.
  let layer=0;const decal=()=>1+layer*3;
  const stack=[],under=(x,y)=>{for(let i=stack.length-1;i>=0;i--){const t=stack[i];if(x>=t.x&&x<=t.x+t.w&&y>=t.y&&y<=t.y+t.h)return t.top;}return 0;};
  for(const it of items){
   if(it.kind==='scrim'){const top=Math.max(0,...stack.map(t=>t.top))+40,m=this.mesh(this.decal,this.flat(it.color));m.scale.set(this.w,this.h,1);m.position.set(this.w/2,-this.h/2,top);m.renderOrder=2+layer*3;layer++;stack.push({x:0,y:0,w:this.w,h:this.h,top});continue;}
   if(it.kind==='tile'){const base=under(it.x+it.w/2,it.y+it.h/2);
    if(!it.fill){if(it.stroke&&STROKES.has(it.stroke.toLowerCase()))this.mesh(this.ringGeometry(it.w,it.h,it.r,2),this.flat(it.stroke)).position.set(it.x+it.w/2,-(it.y+it.h/2),base+.6);continue;}
    const depth=DEPTH[it.role]||DEPTH.panel,lift=it.pressed?-2.5:it.hover?2:0,z=base+lift;const m=this.mesh(this.tileGeometry(it.w,it.h,it.r,depth),this.plastic(it.fill),{cast:true,receive:true});m.position.set(it.x+it.w/2,-(it.y+it.h/2),z);
    if(it.stroke&&STROKES.has(it.stroke.toLowerCase()))this.mesh(this.ringGeometry(it.w-4,it.h-4,Math.max(0,it.r-2),2),this.flat(it.stroke)).position.set(it.x+it.w/2,-(it.y+it.h/2),z+depth+.3);
    stack.push({x:it.x,y:it.y,w:it.w,h:it.h,top:z+depth});continue;}
   if(it.kind==='sector'){const base=under(it.cx,it.cy),lift=it.pressed?-2.5:it.hover?3:0,depth=DEPTH.button,m=this.mesh(this.sectorGeometry(it.r0,it.r1,it.span,depth),this.plastic(it.fill),{cast:true,receive:true});m.position.set(it.cx,-it.cy,base+lift);m.rotation.z=-it.angle;stack.push({x:it.cx-it.r1,y:it.cy-it.r1,w:it.r1*2,h:it.r1*2,top:base+lift+depth});continue;}
   if(it.kind==='swatch'){const base=under(it.x+it.w/2,it.y+it.h/2),r=Math.min(it.w,it.h)/2-1,lift=it.selected?3:it.hover?1.5:0;
    // A round plate: a disc with one stud on top.
    const g=this.geometry(`swatch${r.toFixed(1)}`,()=>{const plate=new T.CylinderGeometry(r,r,5,36).rotateX(Math.PI/2).translate(0,0,2.5).toNonIndexed(),stud=new T.CylinderGeometry(r*.5,r*.5,2.6,28).rotateX(Math.PI/2).translate(0,0,6.2).toNonIndexed();const merged=new T.BufferGeometry();for(const name of ['position','normal','uv']){const a=plate.attributes[name],b=stud.attributes[name];const arr=new Float32Array(a.array.length+b.array.length);arr.set(a.array);arr.set(b.array,a.array.length);merged.setAttribute(name,new T.BufferAttribute(arr,a.itemSize));}return merged;});
    const m=this.mesh(g,this.plastic(it.color),{cast:true,receive:true});m.position.set(it.x+it.w/2,-(it.y+it.h/2),base+lift);
    if(it.selected)this.mesh(this.ringGeometry(r*2,r*2,r,2),this.flat('#ffffff')).position.set(it.x+it.w/2,-(it.y+it.h/2),base+lift+5.2);
    stack.push({x:it.x,y:it.y,w:it.w,h:it.h,top:base+lift+7.5});continue;}
   if(it.kind==='piece'){const geometry=this.geometries.get(it.part);if(!geometry)continue;if(!geometry.boundingSphere)geometry.computeBoundingSphere();
    // Seen from above and in front, turned 45° so two side faces show, like the bricks on the plate.
    const base=under(it.x,it.y),s=it.scale*1.55,m=this.mesh(geometry,this.material('piece'+it.color,()=>new T.MeshStandardMaterial({color:it.color,roughness:.35,metalness:.02,vertexColors:true})),{cast:true,receive:false});
    m.rotation.set(Math.PI*.21,-Math.PI/4,0);m.scale.setScalar(s);const centre=geometry.boundingSphere.center.clone().multiplyScalar(s).applyEuler(m.rotation);m.position.set(it.x-centre.x,-(it.y+it.scale*.55)-centre.y,base+geometry.boundingSphere.radius*s*.55-centre.z);continue;}
   if(it.kind==='text'){const font=`${it.weight} ${it.size}px ${FONT}`,measure=this.measure||(this.measure=document.createElement('canvas').getContext('2d'));measure.font=font;const width=Math.ceil(measure.measureText(it.str).width)+4,height=Math.ceil(it.size*1.5);
    const tex=this.texture(`text|${font}|${it.color}|${it.str}`,width,height,c=>{c.font=font;c.fillStyle=it.color;c.textBaseline='middle';c.fillText(it.str,2,height/2);});
    const x=it.align==='center'?it.x:it.align==='right'?it.x-width/2+2:it.x+width/2-2;this.print(tex,x,it.y,under(it.x,it.y)+.4,decal());continue;}
   if(it.kind==='icon'){const tex=this.texture(`icon|${it.type}|${it.color}`,24,24,c=>{c.translate(12,12);drawIcon(c,it.type,it.color);});this.print(tex,it.x,it.y,under(it.x,it.y)+.4,decal());}}
  for(const pool of this.pools.values())for(let i=pool.used;i<pool.list.length;i++)pool.list[i].visible=false;
  this.sun.shadow.needsUpdate=true;}
}
