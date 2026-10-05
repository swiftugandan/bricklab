import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {PARTS,part,dims,UNIT,LIMIT,topStuds} from './model.js';
const dummy=new T.Object3D(),color=new T.Color();
// Turns a geometry inside out (reversed winding, inward normals) so a tube reads as the wall of a hole.
function inward(g){g=g.index?g.toNonIndexed():g;for(const attr of Object.values(g.attributes)){const n=attr.itemSize,arr=attr.array;for(let i=0;i<attr.count;i+=3)for(let j=0;j<n;j++){const t=arr[(i+1)*n+j];arr[(i+1)*n+j]=arr[(i+2)*n+j];arr[(i+2)*n+j]=t;}}const nor=g.attributes.normal.array;for(let i=0;i<nor.length;i++)nor[i]=-nor[i];return g;}
export class Workshop{
 async init(canvas,input,model){
 this.model=model;this.scene=new T.Scene();this.scene.background=new T.Color('#16212c');this.scene.fog=new T.Fog('#16212c',70,135);
 this.renderer=new T.WebGPURenderer({canvas,antialias:true,forceWebGL:new URLSearchParams(location.search).get('renderer')==='webgl'});
 await this.renderer.init();this.backend=this.renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2';
 this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;// Tone mapping applies to the whole frame, studio UI included, so it's Khronos Neutral: it keeps designed colours true and only rolls off highlights.
 this.renderer.toneMapping=T.NeutralToneMapping;this.renderer.toneMappingExposure=1;
 this.camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,200);this.camera.position.set(34,30,42);
 this.controls=new OrbitControls(this.camera,input);this.controls.target.set(0,2.2,0);this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.minDistance=13;this.controls.maxDistance=90;this.controls.maxPolarAngle=Math.PI*.47;this.controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN};this.controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};
 this.scene.add(new T.HemisphereLight('#dcefff','#354255',3));const sun=new T.DirectionalLight('#fff0d4',4);sun.position.set(-20,40,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:100});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;this.scene.add(sun);const fill=new T.DirectionalLight('#92d8ff',1.3);fill.position.set(20,15,-20);this.scene.add(fill);
 const ground=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshStandardMaterial({color:'#1d2a36',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.72;ground.receiveShadow=true;this.scene.add(ground);
 const base=new T.Mesh(new RoundedBoxGeometry(32.25,.62,32.25,2,.14),new T.MeshStandardMaterial({color:'#56797a',roughness:.7}));base.position.y=-.36;base.receiveShadow=true;base.castShadow=true;this.scene.add(base);this.base=base;
 const studs=new T.InstancedMesh(new T.CylinderGeometry(.285,.3,.14,12),new T.MeshStandardMaterial({color:'#698b89',roughness:.55}),1024);let n=0;for(let x=-16;x<16;x++)for(let z=-16;z<16;z++){dummy.position.set(x+.5,.04,z+.5);dummy.updateMatrix();studs.setMatrixAt(n++,dummy.matrix);}studs.receiveShadow=true;this.scene.add(studs);
 const grid=new T.GridHelper(32,32,'#8bc0b7','#719992');grid.position.y=.011;grid.material.transparent=true;grid.material.opacity=.18;this.scene.add(grid);this.grid=grid;
 this.geometries=new Map();this.batches=new Map();this.material=new T.MeshStandardMaterial({roughness:.3,metalness:.02,vertexColors:true});
 for(const p of PARTS){const geo=this.geometry(p);this.geometries.set(p.id,geo);const mesh=new T.InstancedMesh(geo,this.material,LIMIT);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.ids=[];this.scene.add(mesh);this.batches.set(p.id,mesh);}
 this.ghost=new T.Mesh(this.geometries.get('b24'),new T.MeshStandardMaterial({color:'#f4c747',transparent:true,opacity:.55,depthWrite:false}));this.ghost.visible=false;this.ghost.renderOrder=5;this.scene.add(this.ghost);
 this.outline=new T.Box3Helper(new T.Box3(),'#ffe085');this.outline.visible=false;this.scene.add(this.outline);
 this.ray=new T.Raycaster();this.plane=new T.Plane(new T.Vector3(0,1,0),0);this.dirty=true;this.frames=0;this.frameMs=0;this.lastTime=0;
 this.controls.addEventListener('change',()=>this.dirty=true);this.resize();this.sync();model.onChange(()=>this.sync());
 }
 // One merged, non-indexed geometry per part, shared by every colour. A vertex colour of 1 lets the instance colour show;
 // hole interiors use a dark vertex colour so they read as openings whatever colour the brick is.
 geometry(p){const h=p.h*UNIT,hw=(p.w-.045)/2,hd=(p.d-.045)/2,parts=[];
 const add=(g,shade=1)=>{g=g.index?g.toNonIndexed():g;g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(shade),3));parts.push(g);};
 let body;if(p.cone){body=new T.CylinderGeometry(.2,p.w/2-.04,h-.035,24);body.translate(0,h/2,0);}
 else if(p.dome){const r=p.w/2-.04,base=h*.3;body=mergeGeometries([new T.CylinderGeometry(r,r,base,32).translate(0,base/2,0).toNonIndexed(),new T.SphereGeometry(r,32,12,0,Math.PI*2,0,Math.PI/2).scale(1,(h-.035-base)/r,1).translate(0,base,0).toNonIndexed()]);}
 else if(p.round){body=new T.CylinderGeometry(p.w/2-.04,p.w/2-.04,h-.035,24);body.translate(0,h/2,0);}
 else if(p.slope){body=new T.BoxGeometry(p.w-.045,h-.035,p.d-.045);const pos=body.attributes.position;for(let i=0;i<pos.count;i++){if(pos.getY(i)>0&&pos.getZ(i)>0)pos.setY(i,-h/2+.16);}body.computeVertexNormals();body.translate(0,h/2,0);}
 else if(!p.sideHoles){body=new RoundedBoxGeometry(p.w-.045,h-.035,p.d-.045,2,.035);body.translate(0,h/2,0);}
 if(body)add(body);
 if(topStuds(p)){const r=p.cone?.15:.285;for(let x=0;x<p.w;x++)for(let z=0;z<p.d;z++){const g=new T.CylinderGeometry(r,r+.01,.15,12);g.translate(x-(p.w-1)/2,h+.055,z-(p.d-1)/2);add(g);}}
 // Side features sit at mid-height, one per stud cell along each face. Each face: outward offset, cells along it, and the turn that points +z outward.
 const faces={'x+':[hw,p.d,Math.PI/2],'x-':[-hw,p.d,-Math.PI/2],'z+':[hd,p.w,0],'z-':[-hd,p.w,Math.PI]},R=.27,mid=(h-.035)/2;
 const cells=face=>Array.from({length:faces[face][1]},(_,k)=>k-(faces[face][1]-1)/2);
 // Moves a feature built around the origin (facing +z) onto a face cell, `out` units outside the face.
 const place=(g,face,along,out,shade=1)=>{const [edge,,turn]=faces[face],isX=face[0]==='x',sign=edge<0?-1:1;g.rotateY(turn);g.translate(isX?edge+sign*out:along,mid,isX?along:edge+sign*out);add(g,shade);};
 for(const face of p.sideStuds||[])for(const along of cells(face))place(new T.CylinderGeometry(.25,.25,.15,20).rotateX(Math.PI/2),face,along,.075);
 if(p.sideHoles){const holes=new Set(p.sideHoles),W=p.w-.045,D=p.d-.045,Ht=h-.035;
  // Top and bottom, then each side as a flat face with a round cut-out wherever it has holes.
  add(new T.PlaneGeometry(W,D).rotateX(-Math.PI/2).translate(0,Ht,0));add(new T.PlaneGeometry(W,D).rotateX(Math.PI/2));
  for(const face of Object.keys(faces)){const width=face[0]==='x'?D:W,shape=new T.Shape().moveTo(-width/2,-Ht/2).lineTo(width/2,-Ht/2).lineTo(width/2,Ht/2).lineTo(-width/2,Ht/2).closePath();
   if(holes.has(face))for(const along of cells(face))shape.holes.push(new T.Path().absarc(face[0]==='x'?-along:along,0,R,0,Math.PI*2,true));
   place(new T.ShapeGeometry(shape,24),face,0,0);}
  // Holes on both faces of one axis, and nowhere else, run straight through; any other hole is a recess with a dark back.
  const through=axis=>holes.has(axis+'-')&&holes.has(axis+'+')&&![...holes].some(f=>f[0]!==axis);
  for(const axis of ['x','z'])if(through(axis))for(const along of cells(axis+'+')){const g=inward(new T.CylinderGeometry(R,R,axis==='x'?W:D,24,1,true));g.rotateX(Math.PI/2);place(g,axis+'+',along,-(axis==='x'?hw:hd),.55);}
  for(const face of holes)if(!through(face[0]))for(const along of cells(face)){const depth=.28,g=inward(new T.CylinderGeometry(R,R,depth,24,1,true));g.rotateX(Math.PI/2);place(g,face,along,-depth/2,.5);place(new T.CircleGeometry(R,24),face,along,-depth,.22);}}
 const out=mergeGeometries(parts);parts.forEach(g=>g.dispose());return out;}
 // The piece being moved is left out while it's carried, so only its ghost shows and it can't be stacked onto itself.
 carrying(id){this.hidden=id;this.sync();}
 sync(){for(const mesh of this.batches.values()){mesh.count=0;mesh.userData.ids=[];}for(const b of this.model.bricks){if(b.id===this.hidden)continue;const mesh=this.batches.get(b.part),d=dims(b);dummy.position.set(b.x+d.w/2,b.y*UNIT,b.z+d.d/2);dummy.rotation.set(0,b.r*Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);mesh.setColorAt(mesh.count,color.set(b.color));mesh.userData.ids.push(b.id);mesh.count++;}for(const mesh of this.batches.values()){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}this.dirty=true;}
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;}
 hit(x,y){this.ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),this.camera);const hits=this.ray.intersectObjects([...this.batches.values()].filter(m=>m.count),false);if(hits.length){const hit=hits[0];return {point:hit.point,id:hit.object.userData.ids[hit.instanceId],normal:hit.face.normal};}const point=new T.Vector3();return this.ray.ray.intersectPlane(this.plane,point)?{point,id:null}:null;}
 preview(b,valid){if(!b){this.ghost.visible=false;this.dirty=true;return;}const d=dims(b);this.ghost.geometry=this.geometries.get(b.part);this.ghost.position.set(b.x+d.w/2,b.y*UNIT,b.z+d.d/2);this.ghost.rotation.y=b.r*Math.PI/2;this.ghost.material.color.set(valid?b.color:'#ff485d');this.ghost.visible=true;this.dirty=true;}
 select(id){const b=this.model.bricks.find(b=>b.id===id);this.outline.visible=!!b;if(b){const d=dims(b);this.outline.box.set(new T.Vector3(b.x-.04,b.y*UNIT-.04,b.z-.04),new T.Vector3(b.x+d.w+.04,(b.y+d.h)*UNIT+.2,b.z+d.d+.04));}this.dirty=true;}
 // Where a piece's top centre lands on screen, in CSS pixels; the piece wheel sits there and follows it.
 screenOf(b){const d=dims(b);this.camera.updateMatrixWorld();const v=new T.Vector3(b.x+d.w/2,(b.y+d.h)*UNIT,b.z+d.d/2).project(this.camera);return {x:(v.x+1)/2*innerWidth,y:(1-v.y)/2*innerHeight};}
 home(view='iso'){this.controls.target.set(0,2.2,0);const p=view==='top'?[0,52,.01]:view==='front'?[0,16,51]:[34,30,42];this.camera.position.set(...p);this.controls.update();this.dirty=true;}
 zoom(factor){this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();this.dirty=true;}
 // Draws the build, then the studio UI over it without clearing colour. Snapshots pass false to capture the build alone.
 render(withUI=true){const r=this.renderer;r.render(this.scene,this.camera);if(withUI&&this.ui){r.autoClearColor=false;r.render(this.ui.scene,this.ui.camera);r.autoClearColor=true;}}
 tick(time){this.controls.update();if(this.dirty){const start=performance.now();this.render();this.frameMs=performance.now()-start;this.frames++;this.dirty=false;}}
}
