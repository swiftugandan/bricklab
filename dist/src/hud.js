import {PARTS,COLORS,GROUPS,part,fullName} from './model.js';
import {SLOTS,SEGMENT,slotAngle,slotAt,blockedSlots,wheelCentre,stickyLabel} from './wheel.js';
// Wheel radii in pixels: a little larger on touch screens so every slot is a fingertip wide.
const WHEEL={pointer:{inner:40,outer:98,ring:128},touch:{inner:46,outer:112,ring:144}};
const C={panel:'#18232f',line:'#34424e',text:'#edf3f5',muted:'#98aab8',yellow:'#f4c747'},FONT='Inter, ui-sans-serif, system-ui, -apple-system, sans-serif';
// The device's safe-area insets (notch, camera island, home indicator) in CSS pixels, read from env() via a probe.
let probe=null;function safeAreas(){if(!probe){probe=document.createElement('div');probe.style.cssText='position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';document.body.appendChild(probe);}const c=getComputedStyle(probe);return {t:parseFloat(c.paddingTop)||0,r:parseFloat(c.paddingRight)||0,b:parseFloat(c.paddingBottom)||0,l:parseFloat(c.paddingLeft)||0};}
// Lays out the studio's controls and records them as a display list (`items`) plus hit zones. studio-ui.js builds the
// display list out of bricks in 3D; this class only decides what goes where, what is hovered, pressed or focused.
export class HUD{
 constructor(state,actions){this.s=state;this.actions=actions;this.items=[];this.zones=[];this.hover=null;this.pressed=null;this.focus=-1;this.dirty=true;this.version=0;this.ctx=document.createElement('canvas').getContext('2d');this.resize();}
 resize(){this.w=innerWidth;this.h=innerHeight;this.safe=safeAreas();this.dirty=true;}
 // A moulded tile. `role` sets its thickness; `id` lets it lift on hover and press in on click.
 rr(x,y,w,h,r=12,fill=C.panel,stroke=C.line,{role='panel',id=null}={}){this.items.push({kind:'tile',x,y,w,h,r,fill,stroke,role,hover:!!id&&this.hover===id,pressed:!!id&&this.pressed===id});}
 text(str,x,y,size=14,color=C.text,weight=400,align='left'){this.items.push({kind:'text',str:String(str),x,y,size,color,weight,align});}
 icon(type,x,y,color=C.text){this.items.push({kind:'icon',type,x,y,color});}
 piece(p,x,y,scale,color){this.items.push({kind:'piece',part:p.id,x,y,scale,color});}
 swatch(id,name,col,x,y,w,h,selected){this.items.push({kind:'swatch',x,y,w,h,color:col,selected,hover:this.hover===id});this.zones.push({id,label:name,x,y,w,h});}
 button(id,label,x,y,w,h,options={}){const {active=false,disabled=false,icon=null,small=false,fill=null}=options;const over=this.hover===id&&!disabled;this.rr(x,y,w,h,10,fill||(active?C.yellow:over?'#344454':'#24323f'),null,{role:'button',id:disabled?null:id});const fg=disabled?'#677887':active?'#17202a':C.text;if(icon){this.icon(icon,x+w/2,y+18,fg);if(label)this.text(label,x+w/2,y+h-13,small?11:12,fg,550,'center');}else this.text(label,x+w/2,y+h/2,small?12:14,fg,550,'center');this.zones.push({id,label:options.aria||label||id,x,y,w,h,disabled});}
 // The largest size, down to 8px, at which str fits in maxWidth.
 fit(str,maxWidth,size,weight=550){const c=this.ctx;for(;size>8;size-=.5){c.font=`${weight} ${size}px ${FONT}`;if(c.measureText(str).width<=maxWidth)break;}return size;}
 // A catalog name, centred; "1 × 1, 2 sides" splits onto two lines so the size stays legible.
 label(name,x,y,maxWidth,size,color){const lines=name.split(', ');const fs=Math.min(...lines.map(l=>this.fit(l,maxWidth,size)));lines.forEach((l,i)=>this.text(l,x,y+i*(fs+2),fs,color,550,'center'));}
 // Splits text into lines no wider than maxWidth at the given size.
 lines(str,maxWidth,size){const c=this.ctx;c.font=`400 ${size}px ${FONT}`;const out=[];let line='';for(const word of str.split(' ')){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>maxWidth){out.push(line);line=word;}else line=next;}if(line)out.push(line);return out;}
 // Settings rows and footnote, measured up front so cards and the dialog grow to fit their wrapped text.
 settingsLayout(mw){const s=this.s,size=this.w<500?12:13,noteSize=this.w<500?11:13,toggle=84;const rows=[['gravity','Gravity',s.model.gravity,s.model.gravity?'Pieces need something to hold them up, and unsupported pieces fall.':'Pieces stay wherever you put them, even in mid-air.'],['sound','Brick sounds',s.sound,'A soft click when you place, paint or remove a piece.']].map(([id,label,on,about])=>{const lines=this.lines(about,mw-72-toggle-16,size);return {id,label,on,lines,height:Math.max(96,62+(lines.length-1)*size*1.45+20)};});const note=this.lines(`Turning gravity on drops floating pieces into place. Undo brings them back. Settings are saved in this browser. Drawing with ${s.backend||'…'}.${s.rendererNote?' '+s.rendererNote:''}`,mw-48,noteSize);return {rows,note,size,noteSize,toggle,height:84+rows.reduce((t,r)=>t+r.height+12,0)+note.length*noteSize*1.45+30};}
 // The line above the toolbar says what a click will do right now.
 hint(){const s=this.s,slot=this.hover?.startsWith('slot:')?SLOTS.find(x=>'slot:'+x.id===this.hover):null,b=s.wheel&&s.model.bricks.find(b=>b.id===s.wheel.id);
  if(s.carry)return 'Click where it should go  ·  R to turn  ·  Esc puts it back';
  if(slot&&b){const why=blockedSlots(s.model,b)[slot.id];if(why)return `${slot.label}: ${why}`;}
  if(s.wheel)return s.wheel.ring?'Pick a colour  ·  Shift paints every piece you click next':'Pick an action  ·  Shift keeps it going  ·  Esc closes';
  if(s.sticky)return `${stickyLabel(s.sticky)} each piece you click  ·  Esc stops`;
  return s.tool==='build'?'Click to place  ·  Right-click a piece for actions  ·  R to rotate':'Click a piece for actions  ·  Drag empty space to orbit';}
 // The piece wheel: eight curved slots around the piece, a centre naming it, and an outer colour ring for Paint.
 wheel(b,mobile){const s=this.s,{inner,outer,ring}=mobile?WHEEL.touch:WHEEL.pointer,p=part(b.part),blocked=blockedSlots(s.model,b),{x:cx,y:cy}=wheelCentre(s.wheel.x,s.wheel.y,s.wheel.ring?ring+18:outer,this.w,this.h);
  SLOTS.forEach((slot,i)=>{const id='slot:'+slot.id,why=blocked[slot.id],lit=!why&&(s.wheel.hi===i||this.hover===id),a=slotAngle(i),mid=(inner+outer)/2,ix=cx+mid*Math.cos(a),iy=cy+mid*Math.sin(a),fg=why?'#5d6d7a':lit?'#17202a':C.text;
   this.items.push({kind:'sector',cx,cy,r0:inner,r1:outer,angle:a,span:SEGMENT,fill:why?'#1b2631':lit?C.yellow:'#24323f',hover:lit,pressed:this.pressed===id});
   this.icon(slot.id,ix,iy-8,fg);this.text(slot.label,ix,iy+12,11,fg,600,'center');
   this.zones.push({id,label:slot.label+(why?`, unavailable: ${why}`:''),x:cx-outer,y:cy-outer,w:outer*2,h:outer*2,disabled:!!why,contains:(x,y)=>Math.hypot(x-cx,y-cy)<=outer&&slotAt(x-cx,y-cy,inner)===i});});
  const r=inner-4;this.rr(cx-r,cy-r,r*2,r*2,r,'#172330',null,{role:'card'});this.zones.push({id:'wheel:close',label:'Close the wheel',x:cx-r,y:cy-r,w:r*2,h:r*2,contains:(x,y)=>Math.hypot(x-cx,y-cy)<=r});
  this.text(p.name.split(', ')[0],cx,cy-6,this.fit(p.name.split(', ')[0],r*2-8,14,750),C.text,750,'center');this.text(COLORS.find(c=>c[1]===b.color)?.[0]||'',cx,cy+11,10,C.muted,500,'center');
  if(s.wheel.ring)COLORS.forEach(([name,col],i)=>{const a=-Math.PI/2+i*Math.PI*2/12,size=mobile?32:28;this.swatch('wheelcolor:'+col,name,col,cx+ring*Math.cos(a)-size/2,cy+ring*Math.sin(a)-size/2,size,size,b.color===col);});}
 // Zones are rebuilt when the HUD lays out, so lay out any pending change first and never hit-test a stale layout.
 hit(x,y){if(this.dirty)this.draw();return [...this.zones].reverse().find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h&&(!z.contains||z.contains(x,y)));}
 // Which layout fits the window: the desktop studio, or a phone layout (portrait with a dock, landscape with a rail).
 layoutMode(){return this.w<760||this.h<520?(this.w>this.h?'landscape':'portrait'):'desktop';}
 // Rebuilds the display list when something changed; `version` tells the renderer there is a new list to build.
 draw(){if(!this.dirty)return false;this.dirty=false;const s=this.s,w=this.w;this.zones=[];this.items=[];this.mode=this.layoutMode();const touch=this.mode!=='desktop';
 if(touch)this.phone();else this.desktop();
 if(s.aim&&!s.wheel&&!s.modal&&!s.sheet&&!s.menu)this.aimBubble();
 if(s.wheel&&!s.modal){const b=s.model.bricks.find(b=>b.id===s.wheel.id);if(b)this.wheel(b,touch);}
 if(touch&&!s.modal){if(s.sheet)this.sheet();else if(s.menu)this.menu();}
 if(s.modal)this.modal(s.modal);
 const toasting=s.toast&&performance.now()<s.toastUntil,ty=this.toastY;if(toasting){const act=s.toastAction,width=Math.min(w-32,Math.max(220,s.toast.length*7.2+36+(act?80:0))),x=(w-width)/2;this.rr(x,ty,width,42,12,'#263a43','#5f8586',{role:'toast'});if(act){this.text(s.toast,x+18,ty+21,14,C.text,500);this.button(act.id,act.label,x+width-78,ty+6,68,30,{small:true});}else this.text(s.toast,w/2,ty+21,14,C.text,500,'center');}
 if(s.sticky&&!s.modal){const label=stickyLabel(s.sticky),width=Math.min(w-32,Math.max(220,label.length*8+110)),x=(w-width)/2,y=toasting?ty+50:ty;this.rr(x,y,width,44,22,C.yellow,null,{role:'toast'});this.text(label,x+18,y+22,14,'#17202a',650);this.button('sticky:stop','Stop',x+width-74,y+5,64,34,{small:true,fill:'#24323f'});}
 const focused=this.zones[this.focus];if(focused)this.rr(focused.x-3,focused.y-3,focused.w+6,focused.h+6,12,null,'#ffffff');
 this.version++;return true;}
 // The desktop studio: top bar, catalog panel on the left, view controls on the right, toolbar and status along the bottom.
 desktop(){const s=this.s,w=this.w,h=this.h;this.toastY=86;
 this.rr(12,12,w-24,58,14,'#131e2bea','#344553');this.rr(24,24,34,34,9,C.yellow,null,{role:'button'});this.icon('build',41,41,'#202830');this.text('BRICKLAB',70,41,18,C.text,800);if(w>720){this.text('/',193,41,20,C.muted);this.text(s.model.name,216,35,14,C.text,550);this.text(s.saved,216,53,11,C.muted);}
 this.button('settings','',w-378,24,36,34,{icon:'settings',aria:'Workshop settings'});this.button('projects','My builds',w-336,24,104,34,{small:true});this.button('export','Export',w-224,24,90,34,{small:true});this.button('photo','Snapshot',w-126,24,102,34,{small:true});
 const left=20,top=90,pw=236,ph=Math.min(640,h-200);
 this.rr(left,top,pw,ph,16,'#172330f2');this.text('PIECES',left+16,top+24,12,C.muted,700);this.text(`${PARTS.filter(p=>p.group===s.category).length} shapes`,left+pw-16,top+24,12,C.muted,400,'right');
 // Eight tabs wrap onto two rows of four.
 const gw=(pw-24)/4;GROUPS.forEach((g,i)=>this.button('category:'+g,g,left+12+(i%4)*gw,top+44+Math.floor(i/4)*34,gw-3,30,{active:s.category===g,small:true}));
 // Three columns, up to four rows, sized to the space above the colour swatches.
 const ps=PARTS.filter(p=>p.group===s.category),gridTop=top+122,cw=(pw-24)/3,step=Math.min(84,(ph-319)/4);ps.forEach((p,i)=>{const x=left+12+(i%3)*cw,y=gridTop+Math.floor(i/3)*step,on=s.part===p.id,id='part:'+p.id;this.rr(x,y,cw-5,step-6,10,on?'#374238':'#22313e',on?C.yellow:C.line,{role:'card',id});this.piece(p,x+(cw-5)/2,y+(step-6)*.28,Math.min(14,36/(p.w+p.d))*Math.min(1,(step-6)/78),s.color);this.label(p.name,x+(cw-5)/2,y+step-(p.name.includes(',')?30:20),cw-11,11,on?C.yellow:C.text);this.zones.push({id,label:fullName(p),x,y,w:cw-5,h:step-6});});
 const cy=top+ph-181;this.text('COLOUR',left+16,cy,12,C.muted,700);this.text(COLORS.find(v=>v[1]===s.color)?.[0]||'',left+pw-16,cy,12,C.text,500,'right');COLORS.forEach(([name,col],i)=>this.swatch('color:'+col,name,col,left+16+(i%6)*35,cy+20+Math.floor(i/6)*38,29,29,s.color===col));this.text('SELECTED PIECE',left+16,cy+114,11,C.muted,600);const name=fullName(part(s.part));this.text(name,left+16,cy+138,this.fit(name,pw-80,16,600),C.text,600);this.text(`${s.rotation*90}°`,left+pw-16,cy+138,13,C.yellow,600,'right');
 this.rr(w-160,90,140,42,12,'#172330e8');this.text('32 × 32',w-142,111,13,C.text,650);this.text('STUDS',w-70,111,10,C.muted,600);['home','plus','minus','grid'].forEach((v,i)=>this.button(v,'',w-62,150+i*47,42,40,{icon:v,aria:{home:'Reset view',plus:'Zoom in',minus:'Zoom out',grid:'Toggle grid'}[v]}));this.button('view','View',w-62,343,42,34,{small:true});
 // Build places pieces; Select opens the piece wheel, which holds every per-piece action.
 const tools=[['build','Build','B'],['select','Select','V']],n=tools.length,tw=62,ty=h-104,extra=191,tx=Math.max(280,(w-tw*n-extra)/2),th=61;this.rr(tx-8,ty-8,tw*n+extra,th+16,16,'#131e2bf5');tools.forEach(([id,label,key],i)=>this.button('tool:'+id,label,tx+i*tw,ty,tw-5,th,{active:s.tool===id,icon:id,aria:label+' ('+key+')'}));this.button('rotate','Rotate',tx+tw*n+5,ty,57,th,{icon:'rotate',aria:'Rotate (R)'});this.button('undo','',tx+tw*n+73,ty,43,th,{icon:'undo',disabled:!s.model.past.length,aria:'Undo'});this.button('redo','',tx+tw*n+122,ty,43,th,{icon:'redo',disabled:!s.model.future.length,aria:'Redo'});
 const hint=this.hint();this.ctx.font=`400 13px ${FONT}`;const hw=this.ctx.measureText(hint).width+24;this.rr(tx-12,h-141,hw,28,14,'#131e2bd9',null);this.text(hint,tx,h-127,13,C.muted);this.text(`${s.model.bricks.length} pieces`,26,h-28,13,C.text,600);this.text('•',116,h-28,12,C.muted);this.text(s.backend||'Starting renderer',132,h-28,12,C.muted);this.button('sound',s.sound?'Sound on':'Sound off',w-233,h-46,83,31,{small:true});this.text('Autosave',w-70,h-28,12,C.muted,400,'right');this.button('help','?',w-52,h-49,32,32,{aria:'Help and keyboard shortcuts'});}
 // Phones: the build gets the screen. Portrait has a top bar and a thumb dock; landscape has a rail down the left edge.
 // Everything stays inside the safe areas (notch, camera island, home indicator) and every target is at least 44 px.
 phone(){const s=this.s,w=this.w,h=this.h,sf=this.safe,land=this.mode==='landscape';
  if(!land){const top=sf.t+6;this.toastY=top+66;
   this.rr(8,top,w-16,56,18,'#131e2bea',null);this.button('menu:toggle','',16,top+6,44,44,{icon:'menu',aria:'Menu'});
   const tw=w-70-120;this.text(s.model.name,70,top+20,this.fit(s.model.name,tw,15,750),C.text,750);this.text(s.saved,70,top+38,11,C.muted);
   this.button('undo','',w-112,top+6,44,44,{icon:'undo',disabled:!s.model.past.length,aria:'Undo'});this.button('redo','',w-62,top+6,44,44,{icon:'redo',disabled:!s.model.future.length,aria:'Redo'});
   const dockY=h-sf.b-84;this.coachY=dockY-60;this.rr(8,dockY,w-16,76,20,'#131e2bf5',null);
   this.button('tool:build','Build',18,dockY+10,56,56,{icon:'build',active:s.tool==='build',small:true});this.button('tool:select','Select',80,dockY+10,56,56,{icon:'select',active:s.tool==='select',small:true});
   this.pieceChip(144,dockY+10,w-144-84,56,false);this.button('rotate','Turn',w-76,dockY+10,56,56,{icon:'rotate',small:true,aria:'Turn the piece in hand'});
   this.viewButtons(w-56,top+70);}
  else{const x=sf.l+6,bx=x+10;this.toastY=12+sf.t;this.coachY=h-sf.b-64;
   this.rr(x,8,76,h-16-sf.b,20,'#131e2bf5',null);
   this.button('tool:build','Build',bx,18,56,56,{icon:'build',active:s.tool==='build',small:true});this.button('tool:select','Select',bx,82,56,56,{icon:'select',active:s.tool==='select',small:true});
   this.button('rotate','Turn',bx,146,56,56,{icon:'rotate',small:true,aria:'Turn the piece in hand'});this.pieceChip(bx,210,56,56,true);
   // Undo, Redo and the menu sit together in the top-right corner, leaving the rail to the four building controls.
   const rx=w-sf.r-56;this.button('undo','',rx-104,12,44,44,{icon:'undo',disabled:!s.model.past.length,aria:'Undo'});this.button('redo','',rx-52,12,44,44,{icon:'redo',disabled:!s.model.future.length,aria:'Redo'});this.button('menu:toggle','',rx,12,44,44,{icon:'menu',aria:'Menu'});this.viewButtons(rx,64);}
  // The first time you build on a touch screen, a coach mark explains tap to aim, tap to place.
  if(s.coach&&s.tool==='build'&&!s.aim&&!s.sheet&&!s.menu&&!s.modal&&!s.wheel){const text='Tap the plate to aim a brick, then tap Place.',cw=Math.min(w-32,this.textWidth(text,14,650)+36),cx=(w-cw)/2;this.rr(cx,this.coachY,cw,46,16,C.yellow,null,{role:'toast',id:'coach:dismiss'});this.text(text,w/2,this.coachY+23,14,'#17202a',650,'center');this.zones.push({id:'coach:dismiss',label:'Dismiss tip',x:cx,y:this.coachY,w:cw,h:46});}}
 textWidth(str,size,weight=400){this.ctx.font=`${weight} ${size}px ${FONT}`;return this.ctx.measureText(str).width;}
 // The piece in hand: tapping it opens the catalog sheet.
 pieceChip(x,y,w,h,square){const s=this.s,p=part(s.part),id='sheet:toggle',colour=COLORS.find(c=>c[1]===s.color)?.[0]||'';this.rr(x,y,w,h,16,this.hover===id?'#22313e':'#172330',null,{role:'button',id});
  if(square)this.piece(p,x+w/2,y+14,Math.min(9,22/(p.w+p.d)),s.color);
  else{this.piece(p,x+30,y+16,Math.min(10,26/(p.w+p.d)),s.color);const name=fullName(p);this.text(name,x+60,y+21,this.fit(name,w-68,14,700),C.text,700);this.text(colour,x+60,y+39,this.fit(colour,w-68,12,400),C.muted);}
  this.zones.push({id,label:`Choose a piece and colour. In hand: ${colour} ${fullName(p)}`,x,y,w,h});}
 viewButtons(x,y){this.button('home','',x,y,44,44,{icon:'home',aria:'Reset view'});this.button('topview','',x,y+52,44,44,{icon:'grid',aria:'Top view'});}
 // The catalog sheet: from the bottom in portrait, as a panel beside the rail in landscape. It sizes itself to the tab's
 // pieces so nothing scrolls; picking a piece puts it away, picking a colour leaves it open.
 sheet(){const s=this.s,w=this.w,h=this.h,sf=this.safe,land=this.mode==='landscape';
  this.items.push({kind:'scrim',color:'#080f1866'});this.zones.push({id:'sheet:close',label:'Close the catalog',x:0,y:0,w,h});
  const ps=PARTS.filter(p=>p.group===s.category),cols=land?6:4,tabRows=land?1:2,per=land?12:6,pad=16,tileH=land?70:84,tabH=40,rows=Math.ceil(ps.length/cols);
  const pw=land?Math.min(600,w-sf.l-90-sf.r-12):w,px=land?sf.l+88:0,sw=land?Math.min(36,(pw-2*pad-11*8)/12):Math.min(44,(pw-2*pad-5*12)/6),gap=(pw-2*pad-per*sw)/(per-1);
  const content=28+32+tabRows*(tabH+8)+rows*(tileH+8)+(12/per)*(sw+10)+12,ph=land?h:Math.min(h-sf.t-40,content+sf.b),py=land?0:h-ph;
  this.rr(px,py,pw,land?h:ph+30,26,'#16212d',null);this.zones.push({id:'sheet:panel',label:'Catalog',x:px,y:py,w:pw,h:ph});
  this.rr(px+pw/2-24,py+(land?10+sf.t:10),48,6,3,'#4d6172',null,{role:'card'});this.zones.push({id:'sheet:handle',label:'Close the catalog',x:px+pw/2-60,y:py,w:120,h:30});
  let y=py+28+(land?sf.t:0);this.text('Pieces',px+pad,y+10,18,C.text,800);this.text(`${ps.length} shapes`,px+pw-pad,y+10,13,C.muted,400,'right');y+=32;
  const perTab=GROUPS.length/tabRows,tw=(pw-2*pad-(perTab-1)*8)/perTab;GROUPS.forEach((g,i)=>this.button('category:'+g,g,px+pad+(i%perTab)*(tw+8),y+Math.floor(i/perTab)*(tabH+8),tw,tabH,{active:s.category===g,small:true}));y+=tabRows*(tabH+8);
  const cw=(pw-2*pad-(cols-1)*8)/cols;ps.forEach((p,i)=>{const x=px+pad+(i%cols)*(cw+8),yy=y+Math.floor(i/cols)*(tileH+8),on=s.part===p.id,id='part:'+p.id;this.rr(x,yy,cw,tileH,14,on?'#374238':'#22313e',on?C.yellow:null,{role:'card',id});this.piece(p,x+cw/2,yy+tileH*.22,Math.min(11,30/(p.w+p.d))*(tileH/84),s.color);this.label(p.name,x+cw/2,yy+tileH-(p.name.includes(',')?28:16),cw-8,12,on?C.yellow:C.text);this.zones.push({id,label:fullName(p),x,y:yy,w:cw,h:tileH});});y+=rows*(tileH+8);
  COLORS.forEach(([name,col],i)=>this.swatch('color:'+col,name,col,px+pad+(i%per)*(sw+gap),y+2+Math.floor(i/per)*(sw+10),sw,sw,s.color===col));}
 // The ⋯ menu: everything you open once a session, kept out of the way.
 menu(){const w=this.w,h=this.h,sf=this.safe,land=this.mode==='landscape';this.items.push({kind:'scrim',color:'#080f1844'});this.zones.push({id:'menu:close',label:'Close the menu',x:0,y:0,w,h});
  const items=[['projects','My builds','Starter builds and your files'],['export','Export','Download the project or a picture'],['photo','Snapshot','Save a picture of the build'],['settings','Workshop settings','Gravity and sounds'],['help','Help','Gestures and shortcuts']];
  const mw=270,ih=54,x=land?w-sf.r-mw-12:12,y=land?64:sf.t+6+62;this.rr(x,y,mw,items.length*ih+16,20,'#16212d',null);
  items.forEach(([id,label,sub],i)=>{const yy=y+8+i*ih,zid='menu:'+id;this.rr(x+8,yy,mw-16,ih-4,12,this.hover===zid?'#24323f':'#1b2733',null,{role:'card',id:zid});this.text(label,x+22,yy+17,15,C.text,600);this.text(sub,x+22,yy+35,11,C.muted);this.zones.push({id:zid,label,x:x+8,y:yy,w:mw-16,h:ih-4});});}
 // The placement bubble above an aimed ghost: turn, raise, lower, place or cancel.
 aimBubble(){const s=this.s,a=s.aim;if(!a.screen)return;const bw=304,bh=56,x=Math.max(8,Math.min(this.w-bw-8,a.screen.x-bw/2)),y=Math.max(this.toastY+50,a.screen.y-bh-28);
  this.rr(x,y,bw,bh,18,'#172330f5',null,{role:'toast'});this.button('aim:rotate','',x+8,y+6,44,44,{icon:'rotate',aria:'Turn'});this.button('aim:raise','',x+58,y+6,44,44,{icon:'raise',aria:'Raise one plate'});this.button('aim:lower','',x+108,y+6,44,44,{icon:'lower',disabled:a.y===0,aria:'Lower one plate'});
  this.button('aim:place','Place',x+158,y+6,88,44,{active:a.ok,disabled:!a.ok,aria:a.ok?'Place it here':'It can\'t go here'});this.button('aim:cancel','',x+bw-52,y+6,44,44,{icon:'close',aria:'Cancel'});}
 modal(type){const w=this.w,h=this.h,s=this.s;const mw=Math.min(w-24,620),mh=Math.min(h-32,type==='help'?520:type==='settings'?this.settingsLayout(mw).height:440),x=(w-mw)/2,y=(h-mh)/2;this.items.push({kind:'scrim',color:'#080f18c7'});this.zones=[];this.rr(x,y,mw,mh,22,'#1a2734','#4d6172');this.button('close','×',x+mw-50,y+16,32,32);const titles={projects:'Your next great build',export:'Take your build with you',help:'A little help. A lot of possibility.',new:'Start fresh?',settings:'Workshop settings'};this.text(titles[type]||type,x+24,y+37,this.w<500?19:24,C.text,750);
 if(type==='projects'){this.text('Choose a starting point. Your current build stays in undo.',x+24,y+76,this.w<500?12:14,C.muted);const cards=[['blank','Empty plate','Start with a clean canvas',2],['studio','Sunshine studio','A tiny place for big ideas',1],['tower','Colour tower','Build a little higher',0]];// On short screens (a phone on its side) the three starters sit side by side so the dialog fits.
 const short=h<560;cards.forEach(([id,title,sub,col],i)=>{if(short){const cw=(mw-56)/3,xx=x+20+i*(cw+8),yy=y+96;this.rr(xx,yy,cw,112,12,'#253644',null,{role:'card',id:'starter:'+id});this.piece(part(id==='tower'?'b22':'b24'),xx+cw/2,yy+20,7,COLORS[col][1]);this.text(title,xx+cw/2,yy+66,this.fit(title,cw-16,15,650),C.text,650,'center');this.text(sub,xx+cw/2,yy+88,this.fit(sub,cw-16,12,400),C.muted,400,'center');this.zones.push({id:'starter:'+id,label:title,x:xx,y:yy,w:cw,h:112});return;}const yy=y+107+i*80;this.rr(x+20,yy,mw-40,68,12,'#253644',null,{role:'card',id:'starter:'+id});this.piece(part(id==='tower'?'b22':'b24'),x+58,yy+22,7,COLORS[col][1]);this.text(title,x+104,yy+24,16,C.text,650);this.text(sub,x+104,yy+46,12,C.muted);this.zones.push({id:'starter:'+id,label:title,x:x+20,y:yy,w:mw-40,h:68});});this.button('import','Open project file',x+24,y+mh-62,mw-48,38);}
 if(type==='export'){this.text(s.model.name,x+24,y+79,16,C.muted);this.button('download','Download project (.bricklab)',x+24,y+119,mw-48,52);this.text('Editable file • includes every brick, colour and position',x+24,y+187,this.w<500?11:13,C.muted);this.button('photo','Save image (.png)',x+24,y+222,mw-48,52);this.text('A clean picture of your current camera view',x+24,y+291,13,C.muted);this.text('Your work also saves automatically in this browser.',x+24,y+mh-43,this.w<500?11:13,C.muted);}
 if(type==='help'){const rows=[['Place a brick','Build tool, then click the plate or a brick'],['Look around','Drag to orbit · scroll to zoom · right-drag to pan'],['Touch','Tap to aim, tap Place · hold a piece for its wheel · pinch to zoom'],['Change tools','B build · V select'],['Act on a piece','Click it with Select, or right-click it, for the wheel · 1–8 pick'],['Keep going','Hold Shift (or press and hold) when picking · Esc stops'],['Gravity','Off by default; turn it on in Settings · [ ] lower or raise'],['Undo / redo','Ctrl / ⌘ Z · Ctrl / ⌘ Shift Z'],['Quick views','F fit view · T top view · Esc cancel'],['Keep your work','Autosave is local to this browser and device']];const twoCols=h<560,colW=(mw-48)/(twoCols?2:1);rows.forEach(([a,b],i)=>{const col=twoCols?Math.floor(i/5):0,yy=y+(twoCols?80:88)+(twoCols?i%5:i)*(twoCols?46:42),xx=x+24+col*colW;this.text(a,xx,yy,13,C.yellow,600);this.text(b,xx,yy+18,this.fit(b,colW-12,this.w<500?11:12,400),C.muted);});}
 if(type==='settings'){const {rows,note,size,noteSize,toggle}=this.settingsLayout(mw);let yy=y+84;for(const {id,label,on,lines,height} of rows){this.rr(x+20,yy,mw-40,height,12,'#253644',null,{role:'card'});this.text(label,x+36,yy+26,16,C.text,650);lines.forEach((line,i)=>this.text(line,x+36,yy+52+i*size*1.45,size,C.muted));this.button(id,on?'On':'Off',x+mw-36-toggle,yy+(height-36)/2,toggle,36,{active:on,aria:`${label}: ${on?'on':'off'}`});yy+=height+12;}note.forEach((line,i)=>this.text(line,x+24,yy+14+i*noteSize*1.45,noteSize,C.muted));}
 }
}
