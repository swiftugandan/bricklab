import * as T from 'three';
import {OrbitControls} from '../vendor/OrbitControls.js';
import {RoundedBoxGeometry} from '../vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {PARTS,part,dims,UNIT,LIMIT} from './model.js';
const dummy=new T.Object3D(),color=new T.Color();
export class Workshop{
 async init(canvas,input,model){
 this.model=model;this.scene=new T.Scene();this.scene.background=new T.Color('#16212c');this.scene.fog=new T.Fog('#16212c',70,135);
 this.renderer=new T.WebGPURenderer({canvas,antialias:true,forceWebGL:new URLSearchParams(location.search).get('renderer')==='webgl'});
 await this.renderer.init();this.backend=this.renderer.backend.isWebGPUBackend?'WebGPU':'WebGL 2';
 this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
 this.camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,200);this.camera.position.set(34,30,42);
 this.controls=new OrbitControls(this.camera,input);this.controls.target.set(0,2.2,0);this.controls.enableDamping=true;this.controls.dampingFactor=.12;this.controls.minDistance=13;this.controls.maxDistance=90;this.controls.maxPolarAngle=Math.PI*.47;this.controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.PAN};this.controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};
 this.scene.add(new T.HemisphereLight('#dcefff','#354255',3));const sun=new T.DirectionalLight('#fff0d4',4);sun.position.set(-20,40,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:100});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;this.scene.add(sun);const fill=new T.DirectionalLight('#92d8ff',1.3);fill.position.set(20,15,-20);this.scene.add(fill);
 const ground=new T.Mesh(new T.PlaneGeometry(500,500),new T.MeshStandardMaterial({color:'#1d2a36',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.72;ground.receiveShadow=true;this.scene.add(ground);
 const base=new T.Mesh(new RoundedBoxGeometry(32.25,.62,32.25,2,.14),new T.MeshStandardMaterial({color:'#56797a',roughness:.7}));base.position.y=-.36;base.receiveShadow=true;base.castShadow=true;this.scene.add(base);this.base=base;
 const studs=new T.InstancedMesh(new T.CylinderGeometry(.285,.3,.14,12),new T.MeshStandardMaterial({color:'#698b89',roughness:.55}),1024);let n=0;for(let x=-16;x<16;x++)for(let z=-16;z<16;z++){dummy.position.set(x+.5,.04,z+.5);dummy.updateMatrix();studs.setMatrixAt(n++,dummy.matrix);}studs.receiveShadow=true;this.scene.add(studs);
 const grid=new T.GridHelper(32,32,'#8bc0b7','#719992');grid.position.y=.011;grid.material.transparent=true;grid.material.opacity=.18;this.scene.add(grid);this.grid=grid;
 this.geometries=new Map();this.batches=new Map();this.material=new T.MeshStandardMaterial({roughness:.3,metalness:.02});
 for(const p of PARTS){const geo=this.geometry(p);this.geometries.set(p.id,geo);const mesh=new T.InstancedMesh(geo,this.material,LIMIT);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.userData.ids=[];this.scene.add(mesh);this.batches.set(p.id,mesh);}
 this.ghost=new T.Mesh(this.geometries.get('b24'),new T.MeshStandardMaterial({color:'#f4c747',transparent:true,opacity:.55,depthWrite:false}));this.ghost.visible=false;this.ghost.renderOrder=5;this.scene.add(this.ghost);
 this.outline=new T.Box3Helper(new T.Box3(),'#ffe085');this.outline.visible=false;this.scene.add(this.outline);
 this.ray=new T.Raycaster();this.plane=new T.Plane(new T.Vector3(0,1,0),0);this.dirty=true;this.frames=0;this.frameMs=0;this.lastTime=0;
 this.controls.addEventListener('change',()=>this.dirty=true);this.resize();this.sync();model.onChange(()=>this.sync());
 }
 geometry(p){const h=p.h*UNIT;let body;if(p.round){body=new T.CylinderGeometry(p.w/2-.04,p.w/2-.04,h-.035,24);body.translate(0,h/2,0);}else if(p.slope){body=new T.BoxGeometry(p.w-.045,h-.035,p.d-.045);const pos=body.attributes.position;for(let i=0;i<pos.count;i++){if(pos.getY(i)>0&&pos.getZ(i)>0)pos.setY(i,-h/2+.16);}body.computeVertexNormals();body.translate(0,h/2,0);}else{body=new RoundedBoxGeometry(p.w-.045,h-.035,p.d-.045,2,.035);body.translate(0,h/2,0);}const geos=[body.index?body.toNonIndexed():body];if(!p.tile&&!p.slope){for(let x=0;x<p.w;x++)for(let z=0;z<p.d;z++){const g=new T.CylinderGeometry(.285,.295,.15,12).toNonIndexed();g.translate(x-(p.w-1)/2,h+.055,z-(p.d-1)/2);geos.push(g);}}// A single indexed-free geometry per part is shared by every colour.
 const out=mergeGeometries(geos.map(g=>g.index?g.toNonIndexed():g));geos.forEach(g=>g.dispose());return out;}
 sync(){for(const mesh of this.batches.values()){mesh.count=0;mesh.userData.ids=[];}for(const b of this.model.bricks){const mesh=this.batches.get(b.part),d=dims(b);dummy.position.set(b.x+d.w/2,b.y*UNIT,b.z+d.d/2);dummy.rotation.set(0,b.r*Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(mesh.count,dummy.matrix);mesh.setColorAt(mesh.count,color.set(b.color));mesh.userData.ids.push(b.id);mesh.count++;}for(const mesh of this.batches.values()){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}this.dirty=true;}
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.dirty=true;}
 hit(x,y){this.ray.setFromCamera(new T.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),this.camera);const hits=this.ray.intersectObjects([...this.batches.values()].filter(m=>m.count),false);if(hits.length){const hit=hits[0];return {point:hit.point,id:hit.object.userData.ids[hit.instanceId],normal:hit.face.normal};}const point=new T.Vector3();return this.ray.ray.intersectPlane(this.plane,point)?{point,id:null}:null;}
 preview(b,valid){if(!b){this.ghost.visible=false;this.dirty=true;return;}const d=dims(b);this.ghost.geometry=this.geometries.get(b.part);this.ghost.position.set(b.x+d.w/2,b.y*UNIT,b.z+d.d/2);this.ghost.rotation.y=b.r*Math.PI/2;this.ghost.material.color.set(valid?b.color:'#ff485d');this.ghost.visible=true;this.dirty=true;}
 select(id){const b=this.model.bricks.find(b=>b.id===id);this.outline.visible=!!b;if(b){const d=dims(b);this.outline.box.set(new T.Vector3(b.x-.04,b.y*UNIT-.04,b.z-.04),new T.Vector3(b.x+d.w+.04,(b.y+d.h)*UNIT+.2,b.z+d.d+.04));}this.dirty=true;}
 home(view='iso'){this.controls.target.set(0,2.2,0);const p=view==='top'?[0,52,.01]:view==='front'?[0,16,51]:[34,30,42];this.camera.position.set(...p);this.controls.update();this.dirty=true;}
 zoom(factor){this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();this.dirty=true;}
 tick(time){this.controls.update();if(this.dirty){const start=performance.now();this.renderer.render(this.scene,this.camera);this.frameMs=performance.now()-start;this.frames++;this.dirty=false;}}
}
