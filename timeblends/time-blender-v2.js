/* =====================================================================
   TIME BLENDER v2: character module for Timeblends
   ---------------------------------------------------------------------
   Drop-in replacement for the block in demo/time-blender-demo.html that
   starts at  "/* ===== Time Blender, posed like the Knight"  and ends
   right before  "/* ===== Fifteen smooth 2D factory rooms".
   Same function names, same pose fields, same local coordinates:
   y points up, the feet stand on y=0, the glass head is centred near
   (2,59) and hiltPos() still gives the sword hilt for the rune aura.
   New, all optional: poseFor() also understands the states 'heal',
   'hurt' and 'ko', and the extra inputs o.heal, o.hurt, o.ko and o.fill.
   ===================================================================== */
const TAU=Math.PI*2;
const OUT='#2a1830';
/* style switches: the measuring marks on the glass and the small copper rim on top of the head */
const HERO_STYLE={marks:true,rim:true};
const HC={hat:['#f0a868','#d98348','#b8613a'],
 cape:['#f2a565','#e48d50','#c9723e','#9a512c'],capeD:'#7d4224',capeIn:['#5c2a1e','#7d4224'],capeRim:'#ffd29a',
 leg:'#2e1a36',legN:'#4a2f5c',legF:'#33203f',boot:'#1c1226',bootH:'#4a3358',
 tunic:['#86609a','#5e3d6c','#3c2447'],skirt:['#6a4a78','#4a3054','#2f1c38'],
 belly:['#fff6d8','#f0e2a8','#c9b878'],
 cop:'#d98348',copD:'#a35a30',copL:'#f0a868',copDD:'#6e3426',
 collar:'#8a3e36',collarD:'#5a2630',collarH:'#b8613a',
 glass:['#f4faf6','#c3d6d0'],glassIn:['#fbfffd','#dfece8','#b3cbc9'],
 liq:['#ffe27a','#e8ae3c'],liqDeep:['#ffe88a','#ffd24d','#f0a836','#c06a1c'],
 gold:['#fff7bd','#f6cf4c','#c48f26'],glow:'#ffd84a'};
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=u=>u*u*(3-2*u);
/* smooth noise in about -1..1, so cloth and liquid never loop visibly */
const wob=(t,s)=>Math.sin(t*1.31+s)*.55+Math.sin(t*2.73+s*1.7)*.3+Math.sin(t*4.17+s*.6)*.15;
function ik(sx,sy,hx,hy,l1,l2,sign){let dx=hx-sx,dy=hy-sy,d=Math.hypot(dx,dy);const m=l1+l2-.01;if(d>m){dx*=m/d;dy*=m/d;d=m}
 if(d<.01)d=.01;const a=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-a*a)),ux=dx/d,uy=dy/d;
 return [sx+ux*a+sign*(-uy)*h,sy+uy*a+sign*ux*h,sx+dx,sy+dy]}
function limb(c,pts,w,col,ol){c.lineCap='round';c.lineJoin='round';c.strokeStyle=OUT;c.lineWidth=w+ol*2;c.beginPath();c.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]);c.stroke();
 c.strokeStyle=col;c.lineWidth=w;c.stroke()}
function lgrad(c,x0,y0,x1,y1,stops){const g=c.createLinearGradient(x0,y0,x1,y1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g}
function rgrad(c,x,y,r0,r1,stops){const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g}
function rrect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function fillOut(c,fill,lw){c.fillStyle=fill;c.fill();c.strokeStyle=OUT;c.lineWidth=lw||3;c.lineJoin='round';c.stroke()}
function hiltPos(P){const a=P.hilt.ang;return [-5+Math.cos(a)*11,31+Math.sin(a)*11,a]}

/* ---------- legs: thin dark purple, with small pointed boots ---------- */
function heroLeg(c,P,f,far,OL){
 const h0=far?-2:1.5,hy=15,k=ik(h0,hy,f[0],f[1]+3.2,7,8,1),col=far?HC.legF:HC.legN;
 c.lineCap='round';c.lineJoin='round';
 c.strokeStyle=OUT;c.lineWidth=(far?5.6:6.4)+OL*1.6;c.beginPath();c.moveTo(h0,hy);c.lineTo(k[0],k[1]);c.stroke();
 c.lineWidth=(far?4.6:5.2)+OL*1.6;c.beginPath();c.moveTo(k[0],k[1]);c.lineTo(k[2],k[3]);c.stroke();
 c.strokeStyle=col;c.lineWidth=far?5.6:6.4;c.beginPath();c.moveTo(h0,hy);c.lineTo(k[0],k[1]);c.stroke();
 c.lineWidth=far?4.6:5.2;c.beginPath();c.moveTo(k[0],k[1]);c.lineTo(k[2],k[3]);c.stroke();
 if(!far){c.strokeStyle='rgba(160,120,190,.45)';c.lineWidth=1.3;c.beginPath();c.moveTo(lerp(h0,k[0],.25)+1.6,lerp(hy,k[1],.25));c.lineTo(k[0]+1.5,k[1]);c.lineTo(lerp(k[0],k[2],.7)+1.3,lerp(k[1],k[3],.7));c.stroke()}
 /* boot: a soft wedge with an upturned pointed toe */
 const x=f[0],y=f[1];c.beginPath();c.moveTo(x-3.4,y+.2);c.lineTo(x+5.4,y+.2);c.quadraticCurveTo(x+9.6,y+.4,x+9.4,y+3.4);
 c.quadraticCurveTo(x+6.4,y+2.6,x+4.2,y+4.6);c.quadraticCurveTo(x+.6,y+6.6,x-2.6,y+5.2);c.quadraticCurveTo(x-4.6,y+3.6,x-3.4,y+.2);c.closePath();
 fillOut(c,far?HC.boot:lgrad(c,0,y+6,0,y,[HC.bootH,HC.boot]),OL*.8);
 if(!far){c.strokeStyle='rgba(200,170,220,.35)';c.lineWidth=1;c.beginPath();c.moveTo(x+.5,y+4.6);c.quadraticCurveTo(x+4.8,y+3.6,x+7.8,y+2.6);c.stroke()}}

/* ---------- the long bronze cape: one outline used for both the lining and the outside ---------- */
function capePath(c,P,inner){
 const sp=P.sp,t=P.t||0,fl=P.flutter==null?1:P.flutter,lift=P.lift||0,drop=inner?-1.6-2.2*(P.flare||0):0;
 const xF=3.5-8*sp+(inner?-.8:0),hem=4+12*sp+drop+(P.hemDrop?-P.hemDrop:0),tx=-18-P.trail+(inner?-1.2:0),ty=hem-2+lift,sw=P.sway||0;
 c.beginPath();c.moveTo(8.5,45);c.bezierCurveTo(9.6,37,xF+3.2,30,xF,22);c.bezierCurveTo(xF-.5,16,xF-1,hem+4,xF-1,hem);
 /* pointed hem: valleys and tips that ripple from the front towards the tail */
 const N=3;for(let i=1;i<=N*2;i++){const u=i/(N*2),x=lerp(xF-1,tx+sw,u),base=lerp(hem,ty,u*u)+lift*u*.25,
  w=wob(t*(1.4+sp*2.6)-u*3.2,i*.9)*(.4+1.6*u)*fl,tip=(i%2)?-4.6-1.2*u:.6;c.lineTo(x+w*.25,base+tip+w)}
 c.bezierCurveTo(tx+12+sw*.4,ty+14+P.trail*.35,-21-P.trail*.45,36+P.trail*.15,-10,44.5);
 c.quadraticCurveTo(-1,48.5,8.5,45);c.closePath()}
function heroCapeBack(c,P,OL){
 /* the darker lining shows under the hem when the cape flares */
 capePath(c,P,true);c.fillStyle=lgrad(c,0,44,0,0,HC.capeIn);c.fill();c.strokeStyle=OUT;c.lineWidth=OL+.4;c.lineJoin='round';c.stroke()}
function heroCape(c,P,OL){
 capePath(c,P,false);c.fillStyle=lgrad(c,0,46,0,0,HC.cape);c.fill();
 c.save();c.clip();
 /* light from the glass head on the shoulders, shade towards the back and the hem */
 c.fillStyle=rgrad(c,4,42,2,26,['rgba(255,224,170,.5)','rgba(255,200,140,.18)','rgba(255,200,140,0)']);c.fillRect(-60,-10,90,70);
 c.fillStyle=lgrad(c,6,0,-34-P.trail,0,['rgba(60,20,24,0)','rgba(60,20,24,.08)','rgba(60,20,24,.42)']);c.fillRect(-60,-10,90,70);
 c.fillStyle=lgrad(c,0,22,0,-4,['rgba(70,25,20,0)','rgba(70,25,20,.34)']);c.fillRect(-60,-10,90,70);
 c.restore();
 capePath(c,P,false);c.strokeStyle=OUT;c.lineWidth=OL+.6;c.lineJoin='round';c.stroke();
 /* warm rim light along the shoulder edge */
 c.strokeStyle=HC.capeRim;c.globalAlpha=.55;c.lineWidth=1.5;c.lineCap='round';c.beginPath();c.moveTo(-8.5,43.2);c.quadraticCurveTo(-1,46.8,7,43.8);c.stroke();c.globalAlpha=1;
 /* clasp: a small bronze button at the throat */
 c.beginPath();c.arc(7.2,41.8,2.7,0,TAU);fillOut(c,rgrad(c,6.4,42.8,.4,3.2,[HC.gold[0],HC.gold[1],HC.copD]),1.5)}

/* ---------- the golden hilt (the blade stays hidden behind the body) ---------- */
function heroHilt(c,P){
 const [gx,gy,a]=hiltPos(P),dx=Math.cos(a),dy=Math.sin(a),px=-dy,py=dx,fl=P.flash||0;
 c.save();c.lineCap='round';c.shadowColor=HC.glow;c.shadowBlur=8+14*fl;
 c.strokeStyle=OUT;c.lineWidth=8.4;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx+dx*9,gy+dy*9);c.stroke();
 c.lineWidth=7.6;c.beginPath();c.moveTo(gx-px*6.4,gy-py*6.4);c.lineTo(gx+px*6.4,gy+py*6.4);c.stroke();c.shadowBlur=0;
 /* grip wrapped in dark leather with gold bands */
 c.strokeStyle='#6e4422';c.lineWidth=4.2;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx+dx*8.4,gy+dy*8.4);c.stroke();
 c.strokeStyle=HC.gold[2];c.lineWidth=1.1;for(const u of[2.4,4.6,6.8]){c.beginPath();c.moveTo(gx+dx*u-px*2.1,gy+dy*u-py*2.1);c.lineTo(gx+dx*(u+1)+px*2.1,gy+dy*(u+1)+py*2.1);c.stroke()}
 /* cross guard with rolled ends */
 c.strokeStyle=lgrad(c,gx-px*6,gy-py*6,gx+px*6,gy+py*6,[HC.gold[2],HC.gold[0],HC.gold[1],HC.gold[2]]);c.lineWidth=4.6;c.beginPath();c.moveTo(gx-px*6.2,gy-py*6.2);c.lineTo(gx+px*6.2,gy+py*6.2);c.stroke();
 for(const s of[-1,1]){c.beginPath();c.arc(gx+px*6.6*s,gy+py*6.6*s,2.2,0,TAU);fillOut(c,HC.gold[1],1.4)}
 /* pommel: a drop of the yellow time liquid */
 const ox=gx+dx*11,oy=gy+dy*11;c.beginPath();c.arc(ox,oy,3.8,0,TAU);fillOut(c,rgrad(c,ox-1,oy+1,.3,4,['#fffbe0',HC.glow,'#d8901c']),1.8);
 c.fillStyle='rgba(255,255,255,.9)';c.beginPath();c.arc(ox-1.1,oy+1.2,1,0,TAU);c.fill();
 if(fl>0){c.globalCompositeOperation='lighter';c.fillStyle=rgrad(c,gx+dx*4,gy+dy*4,0,16,['rgba(255,240,170,'+.75*fl+')','rgba(255,200,60,0)']);c.beginPath();c.arc(gx+dx*4,gy+dy*4,16,0,TAU);c.fill()}
 c.restore()}

/* ---------- small body: skirt, belt, chest and a light belly plate ---------- */
function heroBody(c,P,OL){
 const br=1+(P.breath||0)*.035;
 /* tunic skirt */
 c.beginPath();c.moveTo(-6.8,27.5);c.quadraticCurveTo(-8.6,19,-8.2,12.4);c.lineTo(11,12.4);c.quadraticCurveTo(10.8,20,9.6,27.5);c.closePath();
 fillOut(c,lgrad(c,10,0,-8,0,HC.skirt),OL);
 c.strokeStyle='rgba(20,8,26,.55)';c.lineWidth=1.2;c.beginPath();c.moveTo(5.4,13);c.lineTo(5,21);c.stroke();
 c.save();c.translate(0,26);c.scale(1,br);c.translate(0,-26);
 /* chest */
 rrect(c,-6.8,28.5,16.6,16,6);fillOut(c,lgrad(c,10,0,-7,0,HC.tunic),OL);
 /* belly plate with stitching and two rivets */
 rrect(c,.4,29.8,8.4,11.6,3.4);fillOut(c,lgrad(c,0,41,0,30,HC.belly),1.6);
 c.strokeStyle='rgba(120,90,50,.55)';c.lineWidth=.8;c.setLineDash([1.4,1.4]);rrect(c,1.9,31.3,5.4,8.6,2.2);c.stroke();c.setLineDash([]);
 c.fillStyle=HC.copD;for(const y of[33,38]){c.beginPath();c.arc(4.6,y,.9,0,TAU);c.fill()}
 c.restore();
 /* copper belt with a gold buckle */
 rrect(c,-7.6,25.4,18.4,4.4,2);fillOut(c,lgrad(c,0,29.8,0,25.4,[HC.copDD,HC.copD,HC.cop]),1.8);
 c.strokeStyle='rgba(255,210,150,.6)';c.lineWidth=.9;c.beginPath();c.moveTo(-6.4,29);c.lineTo(9.6,29);c.stroke();
 rrect(c,3.1,25,5.2,5.2,1.2);fillOut(c,lgrad(c,0,30,0,25,[HC.gold[2],HC.gold[0]]),1.4);c.fillStyle=HC.copDD;c.fillRect(4.8,26.7,1.8,1.8)}

/* ---------- the head: a living glass measuring bulb with yellow time liquid ---------- */
function heroHead(c,P,OL){
 const t=P.t||0,cx=2,cy=59,rx=17.5,ry=18,hurt=P.hurtFx||0,glow=P.glow||0,fill=P.fill==null?1:P.fill;
 c.save();c.translate(1,40);c.rotate(-P.tilt);c.translate(-1,-40+P.bob);
 /* copper neck ring */
 c.beginPath();c.ellipse(2,43,9,4.6,0,0,TAU);fillOut(c,lgrad(c,0,47.6,0,38.4,[HC.collarH,HC.collar,HC.collarD]),OL*.9);
 c.fillStyle=HC.copL;for(const x of[-3.5,2,7.5]){c.beginPath();c.arc(x,42.4+(x==2?-.9:0),.85,0,TAU);c.fill()}
 /* short glass neck and copper rim on top (switch off with HERO_STYLE.rim=false) */
 if(HERO_STYLE.rim){
  rrect(c,cx-7.2,cy+ry-3.2,14.4,5.6,2);fillOut(c,lgrad(c,0,cy+ry-3.2,0,cy+ry+2.4,[HC.copDD,HC.copD,HC.cop,HC.copL]),OL*.8);
  c.fillStyle=HC.copL;for(const x of[-4.4,0,4.4]){c.beginPath();c.arc(cx+x,cy+ry-.6,.75,0,TAU);c.fill()}
  c.beginPath();c.ellipse(cx,cy+ry+2.3,5.4,1.1,0,0,TAU);c.fillStyle='#3a2342';c.fill()}
 /* glass interior */
 const bulb=()=>{c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,TAU)};
 c.save();bulb();c.fillStyle=lgrad(c,cx-8,cy+16,cx+10,cy-16,HC.glassIn);c.fill();c.clip();
 /* far wall of the glass, seen through the bulb */
 c.fillStyle='rgba(120,150,170,.18)';c.beginPath();c.ellipse(cx+2.5,cy+3,rx*.78,ry*.7,0,0,TAU);c.fill();
 /* the liquid: its level follows fill (health) and P.liqY, its surface sloshes */
 const lv=cy-ry+2*ry*(.1+.34*fill)+(P.liqY||0),sl=(P.slosh||0)*.2,wv=P.wave==null?.5:P.wave;
 const sy=x=>lv+sl*(x-cx)+Math.sin((x-cx)*.3+t*3.1)*.75*(.35+wv)+Math.sin(x*.62-t*4.6)*.2*(.3+wv);
 c.beginPath();c.moveTo(cx-rx-2,sy(cx-rx-2));for(let x=cx-rx;x<=cx+rx+2;x+=2)c.lineTo(x,sy(x));c.lineTo(cx+rx+2,cy-ry-2);c.lineTo(cx-rx-2,cy-ry-2);c.closePath();
 c.fillStyle=lgrad(c,0,lv+2,0,cy-ry,HC.liqDeep);c.fill();
 /* warm light inside the liquid */
 c.globalCompositeOperation='lighter';c.fillStyle=rgrad(c,cx+3,lv-8,1,15,['rgba(255,250,200,'+(.16+.45*glow)+')','rgba(255,220,120,0)']);c.fillRect(cx-rx,cy-ry,2*rx,2*ry);c.globalCompositeOperation='source-over';
 /* the surface seen from just above: a thin bright band */
 c.beginPath();c.moveTo(cx-rx-2,sy(cx-rx-2));for(let x=cx-rx;x<=cx+rx+2;x+=2)c.lineTo(x,sy(x));
 for(let x=cx+rx+2;x>=cx-rx-2;x-=2)c.lineTo(x,sy(x)+1.7+Math.sin(x*.4+t*2)*.25);c.closePath();c.fillStyle='rgba(255,244,190,.6)';c.fill();
 c.strokeStyle='rgba(201,120,31,.55)';c.lineWidth=.9;c.beginPath();c.moveTo(cx-rx-2,sy(cx-rx-2));for(let x=cx-rx;x<=cx+rx+2;x+=2)c.lineTo(x,sy(x));c.stroke();
 /* the soul light: a small spark that pulses and sometimes blinks */
 const so=P.soul==null?1:P.soul;
 if(so>.02&&lv>cy-ry+5){const qx=cx+3.5+wob(t*.7,1)*2.2,qy=Math.min(lv-4.5,cy-6)+wob(t*.6,4)*1.6,R=(2.6+glow*2)*so;
  c.globalCompositeOperation='lighter';c.fillStyle=rgrad(c,qx,qy,0,R*3.4,['rgba(255,255,235,'+.85*so+')','rgba(255,230,140,'+.35*so+')','rgba(255,200,60,0)']);c.beginPath();c.arc(qx,qy,R*3.4,0,TAU);c.fill();
  c.fillStyle='rgba(255,255,245,'+.95*so+')';c.beginPath();c.moveTo(qx,qy+R*1.3);c.lineTo(qx+R*.32,qy);c.lineTo(qx,qy-R*1.3);c.lineTo(qx-R*.32,qy);c.closePath();c.fill();
  c.beginPath();c.moveTo(qx-R*1.1,qy);c.lineTo(qx,qy+R*.28);c.lineTo(qx+R*1.1,qy);c.lineTo(qx,qy-R*.28);c.closePath();c.fill();c.globalCompositeOperation='source-over'}
 /* rising bubbles; faster and more of them while healing */
 const nb=6+Math.round((P.fizz||0)*6);
 for(let i=0;i<nb;i++){const per=1.5+(i%5)*.33-(P.fizz||0)*.6,ph=((t/per)+i*.173)%1,bot=cy-ry+2,top=lv-1.2,y=lerp(bot,top,ph);if(top-bot<3)break;
  const x=cx+[-9,-4,1,6,10,-1,-7,3,8,-11,5,-3][i%12]*Math.sqrt(Math.max(0,1-Math.pow((y-cy)/ry,2)))+Math.sin(t*3+i*2)*1.1,r=.7+(i%3)*.45+ph*.4,a=Math.min(1,ph*5)*(1-Math.pow(ph,6));
  c.strokeStyle='rgba(255,255,255,'+.8*a+')';c.lineWidth=.75;c.beginPath();c.arc(x,y,r,0,TAU);c.stroke();c.fillStyle='rgba(255,255,255,'+.7*a+')';c.beginPath();c.arc(x-r*.35,y+r*.35,r*.35,0,TAU);c.fill()}
 /* thickness of the glass: tinted towards the edge */
 c.fillStyle=rgrad(c,cx-2,cy+3,rx*.55,rx*1.05,['rgba(60,36,80,0)','rgba(60,36,80,.06)','rgba(48,28,64,.34)']);c.fillRect(cx-rx-2,cy-ry-2,2*rx+4,2*ry+4);
 /* measuring marks along the front (switch off with HERO_STYLE.marks=false) */
 if(HERO_STYLE.marks){c.strokeStyle='rgba(42,24,48,.5)';c.lineWidth=.9;c.lineCap='round';
  for(let k=-4;k<=4;k++){const y=cy+k*3.5,e=cx+rx*.8*Math.sqrt(Math.max(0,1-Math.pow((y-cy)/(ry*.86),2))),L=k%2?2.2:4;c.beginPath();c.moveTo(e-L,y);c.lineTo(e,y);c.stroke()}}
 /* focused light from the liquid at the bottom of the glass */
 c.fillStyle='rgba(255,246,190,.75)';c.beginPath();c.ellipse(cx+6.5,cy-ry+3.4,4.2,1.3,-.35,0,TAU);c.fill();
 /* hit flash and quick cracks */
 if(hurt>0){c.fillStyle='rgba(255,255,255,'+.65*hurt+')';c.fillRect(cx-rx-2,cy-ry-2,2*rx+4,2*ry+4);
  c.strokeStyle='rgba(255,255,255,'+hurt+')';c.lineWidth=1.2;c.beginPath();c.moveTo(cx+9,cy+11);c.lineTo(cx+4,cy+6);c.lineTo(cx+7,cy+2);c.lineTo(cx+1,cy-3);c.moveTo(cx+4,cy+6);c.lineTo(cx-1,cy+7.5);c.stroke()}
 c.restore();
 /* outline, rim lights and highlights */
 bulb();c.strokeStyle=OUT;c.lineWidth=OL+.6;c.stroke();
 c.lineCap='round';c.strokeStyle='rgba(255,226,150,'+(.55+.35*glow)+')';c.lineWidth=1.5;c.beginPath();c.ellipse(cx,cy,rx-2,ry-2,0,-1.05,.45);c.stroke();
 c.strokeStyle='rgba(190,215,240,.55)';c.lineWidth=1.2;c.beginPath();c.ellipse(cx,cy,rx-1.8,ry-1.8,0,2.1,3.1);c.stroke();
 c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=2.4;c.beginPath();c.ellipse(cx,cy,rx-4,ry-4,0,1.72,2.45);c.stroke();
 c.fillStyle='rgba(255,255,255,.92)';c.beginPath();c.ellipse(cx-7.5,cy+9.5,2.3,4.8,.55,0,TAU);c.fill();
 c.beginPath();c.arc(cx-1.5,cy+14,1.2,0,TAU);c.fill();
 /* the little white label on the back, with an hourglass mark */
 c.save();c.translate(cx-12.5,cy-1.5);c.rotate(.5);rrect(c,-6,-2.6,12,5.2,1.4);fillOut(c,lgrad(c,0,-2.6,0,2.6,['#ded2ae','#fbf4dc']),1.5);
 c.strokeStyle='rgba(42,24,48,.6)';c.lineWidth=.8;c.beginPath();c.moveTo(-4.2,1.4);c.lineTo(-1.8,1.4);c.lineTo(-4.2,-1.4);c.lineTo(-1.8,-1.4);c.closePath();c.stroke();
 c.beginPath();c.moveTo(-.4,.7);c.lineTo(4.2,.7);c.moveTo(-.4,-.8);c.lineTo(2.8,-.8);c.stroke();c.restore();
 /* healing glow around the head */
 if(glow>0){c.globalCompositeOperation='lighter';c.fillStyle=rgrad(c,cx,cy,rx*.6,rx*2.1,['rgba(255,226,110,'+.3*glow+')','rgba(255,200,60,0)']);c.beginPath();c.arc(cx,cy,rx*2.1,0,TAU);c.fill();c.globalCompositeOperation='source-over'}
 if(typeof UPG!=='undefined'&&UPG.harness&&typeof harnessMask==='function')harnessMask(c,[cx,cy]);
 c.restore()}

function drawHero(c,P){
 const OL=2.6;c.save();c.rotate(-P.lean);
 heroCapeBack(c,P,OL);
 heroLeg(c,P,P.footF,true,OL);
 if(!P.swing)heroHilt(c,P);
 heroLeg(c,P,P.footN,false,OL);
 heroBody(c,P,OL);
 heroCape(c,P,OL);
 if(typeof UPG!=='undefined'&&UPG.harness&&typeof harnessBack==='function'){harnessBack(c,P);harnessFront(c,P)}
 if(P.swing)heroSword(c,P);
 heroHead(c,P,OL);
 c.restore()}

/* ---------- the golden sword while swinging: it comes out from behind, whips over the top and ends low in front ---------- */
function heroSword(c,P){const b=P.swingAng,al=P.swing,sx=3,sy=37,dx=Math.cos(b),dy=Math.sin(b),px=-dy,py=dx,gx=sx+dx*12,gy=sy+dy*12,L=30;
 c.save();c.globalAlpha=al;
 /* motion smear behind the blade */
 if(P.smear>0){c.globalCompositeOperation='lighter';const span=1.1*P.smear;c.beginPath();c.moveTo(sx+Math.cos(b)*12,sy+Math.sin(b)*12);
  for(let i=0;i<=12;i++){const a=b+span*i/12;c.lineTo(sx+Math.cos(a)*(12+L),sy+Math.sin(a)*(12+L))}
  for(let i=12;i>=0;i--){const a=b+span*i/12;c.lineTo(sx+Math.cos(a)*14,sy+Math.sin(a)*14)}c.closePath();
  const g=c.createRadialGradient(sx,sy,10,sx,sy,12+L);g.addColorStop(0,'rgba(255,214,90,0)');g.addColorStop(.6,'rgba(255,214,90,'+.18*P.smear+')');g.addColorStop(1,'rgba(255,236,150,'+.45*P.smear+')');c.fillStyle=g;c.fill();c.globalCompositeOperation='source-over'}
 /* blade */
 c.shadowColor=HC.glow;c.shadowBlur=10;c.beginPath();c.moveTo(gx+px*2.2,gy+py*2.2);c.lineTo(gx+dx*(L-5)+px*1.6,gy+dy*(L-5)+py*1.6);c.lineTo(gx+dx*L,gy+dy*L);c.lineTo(gx+dx*(L-5)-px*1.6,gy+dy*(L-5)-py*1.6);c.lineTo(gx-px*2.2,gy-py*2.2);c.closePath();
 fillOut(c,lgrad(c,gx-px*2,gy-py*2,gx+px*2,gy+py*2,[HC.gold[2],HC.gold[0],HC.gold[1]]),1.5);c.shadowBlur=0;
 c.strokeStyle='rgba(255,255,240,.85)';c.lineWidth=.9;c.beginPath();c.moveTo(gx+dx*2+px*.6,gy+dy*2+py*.6);c.lineTo(gx+dx*(L-4)+px*.4,gy+dy*(L-4)+py*.4);c.stroke();
 /* grip, guard and pommel */
 c.lineCap='round';c.strokeStyle=OUT;c.lineWidth=6.4;c.beginPath();c.moveTo(gx,gy);c.lineTo(gx-dx*8,gy-dy*8);c.stroke();c.strokeStyle='#6e4422';c.lineWidth=3.6;c.stroke();
 c.strokeStyle=OUT;c.lineWidth=6.6;c.beginPath();c.moveTo(gx-px*5.6,gy-py*5.6);c.lineTo(gx+px*5.6,gy+py*5.6);c.stroke();c.strokeStyle=HC.gold[1];c.lineWidth=3.8;c.stroke();
 c.beginPath();c.arc(gx-dx*10,gy-dy*10,3.2,0,TAU);fillOut(c,rgrad(c,gx-dx*10-.8,gy-dy*10+.8,.3,3.4,['#fffbe0',HC.glow,'#d8901c']),1.6);
 c.restore()}

/* ---- the harness, after the right-hand drawing: funnel, purple face plate with a slit and a copper horn,
   round back tank with vents and a blue wind-up key, a thick blue hose, a big copper shoulder plate and a round
   plate (both with a triangle), a chest strap, a coat pocket with a V, and an orange flask with a cork at the back ---- */
const HARNESS_STYLE={funnel:true}; /* funnel = the flat copper hat */
const HN={armor:['#7d4224','#a35a30','#cf7a42','#eb9556','#f4ab6c'],tank:['#f4ab6c','#cf7a42','#a35a30','#6e3a22'],plate:['#f2a565','#cf7a42','#8a4626'],
 blue:['#b4c8de','#8aa6c4','#5b7aa0','#3c5272'],cop:['#f7cba9','#eda98a','#d4826f','#a65c58'],leather:'#6e4422',bag:['#8a5e9a','#5e3d6c','#3c2447','#2a1830']};
function hTri(c,x,y,s,rot){c.save();c.translate(x,y);c.rotate(rot||0);c.beginPath();c.moveTo(-s*.75,-s);c.lineTo(s,0);c.lineTo(-s*.75,s);c.closePath();c.strokeStyle=OUT;c.lineWidth=1.6;c.lineJoin='round';c.stroke();c.restore()}
function harnessBack(c,P){const OL=2.6,t=P.t||0;
 /* rolled papers sticking up behind the tank */
 c.save();c.translate(-19,40);c.rotate(.35);rrect(c,-3,-4,6,14,1.5);fillOut(c,lgrad(c,-3,0,3,0,['#d9cfae','#fbf4dc']),1.5);c.restore();
 /* orange flask with a cork, hanging low on the back */
 c.save();c.translate(-19,14);c.rotate(.55);
 rrect(c,-2.6,4,5.2,6,1.2);fillOut(c,lgrad(c,-3,0,3,0,['#c3d6d0','#f4faf6']),1.4);
 rrect(c,-2.2,9,4.4,3.6,1.2);fillOut(c,lgrad(c,0,9,0,12.6,['#8a5a2a','#c48a52']),1.3);
 c.beginPath();c.arc(0,-1.5,7,0,TAU);c.fillStyle='rgba(225,240,240,.92)';c.fill();c.save();c.clip();c.fillStyle=lgrad(c,0,-1,0,-8.5,['#f6b25a','#e07a2c']);c.fillRect(-8,-9,16,7.6);
 c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.arc(-2.5,-4.5,1,0,TAU);c.arc(1.5,-6,.7,0,TAU);c.fill();c.restore();
 c.beginPath();c.arc(0,-1.5,7,0,TAU);c.strokeStyle=OUT;c.lineWidth=1.9;c.stroke();
 c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.ellipse(-3.4,1.4,1.3,2.6,-.6,0,TAU);c.fill();c.restore();
 /* round back tank */
 const tx=-15,ty=33;c.beginPath();c.arc(tx,ty,11.5,0,TAU);fillOut(c,rgrad(c,tx-4,ty+5,1,13,HN.tank),OL);
 c.beginPath();c.arc(tx,ty,11.5,-.35,.9);c.strokeStyle='rgba(255,200,150,.35)';c.lineWidth=1.4;c.stroke();
 c.strokeStyle=OUT;c.lineWidth=2;c.lineCap='round';for(const [x,y] of[[-6,4],[-1,4],[-6,0]]){c.beginPath();c.moveTo(tx+x-2.2,ty+y);c.lineTo(tx+x+1.4,ty+y);c.stroke()}
 c.beginPath();c.arc(tx-1,ty-5,3.2,0,TAU);fillOut(c,HN.cop[2],1.4);
 /* thick ribbed blue hose from the tank up over the shoulder */
 const hose=[[-21,39],[-33,52],[-20,68],[-8,60]],bz=u=>{const m=1-u;return[m*m*m*hose[0][0]+3*m*m*u*hose[1][0]+3*m*u*u*hose[2][0]+u*u*u*hose[3][0],m*m*m*hose[0][1]+3*m*m*u*hose[1][1]+3*m*u*u*hose[2][1]+u*u*u*hose[3][1]]};
 c.lineCap='round';c.strokeStyle=OUT;c.lineWidth=9.5;c.beginPath();c.moveTo(...hose[0]);c.bezierCurveTo(...hose[1],...hose[2],...hose[3]);c.stroke();
 c.strokeStyle=HN.blue[2];c.lineWidth=6.4;c.stroke();c.strokeStyle=HN.blue[0];c.lineWidth=2;c.globalAlpha=.7;c.beginPath();c.moveTo(-21.6,40);c.bezierCurveTo(-32.4,52.6,-19.6,67.4,-8.4,60.6);c.stroke();c.globalAlpha=1;
 c.strokeStyle='rgba(42,24,48,.55)';c.lineWidth=1.1;for(let k=1;k<8;k++){const [x,y]=bz(k/8),[x2,y2]=bz(k/8+.01),a=Math.atan2(y2-y,x2-x)+Math.PI/2;c.beginPath();c.moveTo(x-Math.cos(a)*3.1,y-Math.sin(a)*3.1);c.lineTo(x+Math.cos(a)*3.1,y+Math.sin(a)*3.1);c.stroke()}
 /* blue wind-up key on top of the tank, slowly turning */
 const kw=Math.cos(t*2.2);c.save();c.translate(tx-9,ty+4);c.rotate(1.05);
 c.strokeStyle=OUT;c.lineWidth=5;c.beginPath();c.moveTo(0,0);c.lineTo(0,7);c.stroke();c.strokeStyle=HN.blue[1];c.lineWidth=3;c.stroke();
 c.translate(0,9);c.scale(Math.max(.2,Math.abs(kw)),1);
 for(const s of[1,-1]){c.beginPath();c.ellipse(s*5.4,2.2,5,4.4,s*.35,0,TAU);fillOut(c,lgrad(c,0,-3,0,7,s*kw>0?[HN.blue[0],HN.blue[1]]:[HN.blue[1],HN.blue[2]]),1.8);
  c.beginPath();c.ellipse(s*6,2.6,1.6,1.4,0,0,TAU);c.fillStyle=HN.blue[3];c.fill()}
 rrect(c,-2.6,-1.6,5.2,5,1.4);fillOut(c,HN.blue[1],1.6);c.restore();}
function harnessFront(c,P){const OL=2.6;
 /* chest strap with a copper buckle */
 c.strokeStyle=OUT;c.lineWidth=5.6;c.lineCap='round';c.beginPath();c.moveTo(10,41);c.quadraticCurveTo(5,29,-8,24.6);c.stroke();c.strokeStyle=HN.leather;c.lineWidth=3.4;c.stroke();
 rrect(c,3.2,29.4,4.4,4.4,1);fillOut(c,HN.cop[1],1.3);
 /* round plate with a triangle, behind the shoulder plate */
 c.beginPath();c.arc(-5,38,8,0,TAU);fillOut(c,rgrad(c,-7,41,1,10,HN.plate),OL*.85);hTri(c,-5,38,3.4,-.4);
 /* big copper shoulder plate with a triangle */
 c.save();c.translate(8,33);c.rotate(-.22);
 c.beginPath();c.moveTo(-10,-7);c.lineTo(9,-8.5);c.quadraticCurveTo(13,-8.5,13,-4);c.lineTo(12,7);c.quadraticCurveTo(11.6,10,8,10);c.lineTo(-9,9);c.quadraticCurveTo(-12,9,-12,5);c.lineTo(-12.4,-3.6);c.quadraticCurveTo(-12.4,-7,-10,-7);c.closePath();
 fillOut(c,lgrad(c,0,-8.5,0,10,[HN.cop[3],HN.cop[2],HN.cop[1],HN.cop[0]]),OL);
 c.strokeStyle='rgba(255,230,190,.55)';c.lineWidth=1.3;c.beginPath();c.moveTo(-9.6,7.6);c.lineTo(8,8.4);c.stroke();
 c.strokeStyle='rgba(42,24,48,.35)';c.lineWidth=1.1;c.beginPath();c.moveTo(-10.6,-3.4);c.lineTo(11.4,-4.6);c.stroke();
 hTri(c,1,2.4,4,-.25);c.restore();
 /* purple bag worn over the shoulder, hanging at the back under the upper arm; it swings back when running */
 const t=P.t||0,sw=Math.sin(t*2.1)*.04+Math.sin(t*9)*.05*(P.sp||0)-.12*(P.sp||0);
 c.save();c.translate(-11,26);c.rotate(sw+.08);
 c.beginPath();c.moveTo(-6.4,-1);c.lineTo(6.6,-1);c.quadraticCurveTo(8.2,-1,8,-3);c.lineTo(7.4,-10.6);c.quadraticCurveTo(7,-12.6,4.8,-12.6);c.lineTo(-4.6,-12.6);c.quadraticCurveTo(-6.8,-12.6,-7,-10.6);c.lineTo(-7.8,-3);c.quadraticCurveTo(-8,-1,-6.4,-1);c.closePath();
 fillOut(c,lgrad(c,-8,0,8,0,[HN.bag[2],HN.bag[1],HN.bag[0]]),OL*.85);
 c.fillStyle='rgba(20,8,26,.35)';c.beginPath();c.ellipse(0,-12,6.4,1.4,0,0,TAU);c.fill();
 /* flap with a copper V, and a bit of light on the top edge */
 c.beginPath();c.moveTo(-7.2,-1.6);c.lineTo(7.4,-1.6);c.lineTo(6.6,-5.4);c.lineTo(0,-8.6);c.lineTo(-6.6,-5.4);c.closePath();fillOut(c,lgrad(c,0,-8.6,0,-1.6,[HN.bag[2],HN.bag[0]]),1.6);
 c.strokeStyle='rgba(220,190,235,.5)';c.lineWidth=1;c.beginPath();c.moveTo(-5.6,-2.6);c.lineTo(5.8,-2.6);c.stroke();
 c.strokeStyle=HN.cop[1];c.lineWidth=1.6;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(-2.2,-4.4);c.lineTo(0,-7);c.lineTo(2.2,-4.4);c.stroke();
 c.restore()}
function harnessMask(c,hc){const OL=2.6,[cx,cy]=hc;
 /* strap round the back of the glass */
 c.strokeStyle=OUT;c.lineWidth=4.4;c.lineCap='round';c.beginPath();c.moveTo(cx+4,cy-6);c.quadraticCurveTo(cx-8,cy-9,cx-16.5,cy-3);c.stroke();c.strokeStyle=HN.leather;c.lineWidth=2.6;c.stroke();
 /* copper funnel on top, tilted back (switch off with HARNESS_STYLE.funnel=false) */
 /* flat copper hat: lies flat on top of the glass where it always was; its front end runs in under the
    back edge of the face plate (the plate is drawn after it) and its top is level with the plate's top */
 if(HARNESS_STYLE.funnel){const y0=cy+13.6,y1=cy+18.8,y2=cy+21,xb=cx-16.4,xf=cx+6;
  c.beginPath();c.moveTo(xb+2,y0);c.lineTo(xf,y0);c.lineTo(xf,y1);c.lineTo(xb,y1);c.closePath();fillOut(c,lgrad(c,0,y0,0,y1,[HN.cop[3],HN.cop[2],HN.cop[1]]),OL);
  c.beginPath();c.moveTo(xb,y1);c.lineTo(xf,y1);c.lineTo(xf,y2);c.lineTo(xb+.6,y2);c.closePath();fillOut(c,lgrad(c,xb,0,xf,0,[HN.cop[1],HN.cop[0],'#ffe3c8',HN.cop[0]]),OL*.85);
  c.strokeStyle='rgba(255,230,200,.6)';c.lineWidth=1;c.beginPath();c.moveTo(xb+4,y0+1.6);c.lineTo(xf-2,y0+1.6);c.stroke()}
 /* face plate in the style of the first gas mask: rounded top at the back, a bulging front, narrow at the bottom.
    Same height as before (cy-16 .. cy+21) so the flat hat still meets its top, in the shoulder plate's copper */
 c.beginPath();c.moveTo(cx+3,cy+19);c.quadraticCurveTo(cx+3.4,cy+21.2,cx+6,cy+21);c.lineTo(cx+13,cy+19.6);c.quadraticCurveTo(cx+20,cy+12.8,cx+20,cy+.4);
 c.lineTo(cx+17,cy-13.3);c.quadraticCurveTo(cx+14,cy-16.6,cx+6,cy-16);c.quadraticCurveTo(cx-1,cy-.9,cx+3,cy+19);c.closePath();
 fillOut(c,lgrad(c,0,cy-16,0,cy+21,[HN.cop[3],HN.cop[2],HN.cop[1],HN.cop[0]]),OL);
 c.strokeStyle='rgba(255,226,190,.6)';c.lineWidth=1.2;c.lineCap='round';c.beginPath();c.moveTo(cx+14.6,cy+17.4);c.quadraticCurveTo(cx+18.4,cy+12,cx+18.4,cy+3);c.stroke();
 /* eye: a wide horizontal slit with a warm glow line, and a dark vertical slot below it */
 c.fillStyle='#1c1226';rrect(c,cx+7.4,cy+3.6,10.4,3.8,1.5);c.fill();rrect(c,cx+11.2,cy-8.6,3.8,12.8,1.5);c.fill();
 c.fillStyle='rgba(255,226,140,.85)';c.fillRect(cx+8.6,cy+4.9,8,1.3);
 /* round copper filter with diagonal grooves over the lower front edge */
 c.save();c.translate(cx+18.4,cy-10);c.beginPath();c.ellipse(0,0,6.2,6.8,.3,0,TAU);fillOut(c,lgrad(c,0,-6.8,0,6.8,['#a35a30','#d98348','#f0a868']),2);
 c.beginPath();c.ellipse(0,0,6.2,6.8,.3,0,TAU);c.save();c.clip();c.strokeStyle='rgba(42,24,48,.7)';c.lineWidth=1.3;c.lineCap='round';
 for(const d of[-2.4,0,2.4]){c.beginPath();c.moveTo(d-2,-4);c.lineTo(d+2,4);c.stroke()}
 c.strokeStyle='rgba(255,236,200,.55)';c.lineWidth=1;c.beginPath();c.ellipse(0,0,4.9,5.5,.3,1.9,3);c.stroke();c.restore();c.restore()}

/* ---- the rune aura (unchanged): a shield outline with two stacked chevrons; it draws itself (p 0..1) and fades (a) ---- */
const RUNE=[[[-.8,-.45],[-.8,-.7],[0,-1],[.8,-.7],[.8,.2],[0,1],[-.8,.2],[-.8,-.1]],[[-.45,-.38],[0,.02],[.45,-.38]],[[-.45,.06],[0,.46],[.45,.06]]];
function drawCurl(c,x,y,R,rot,dir,p,a,lw){if(a<=.01)return;const s=R*1.25;c.save();c.translate(x,y);c.rotate(Math.sin(rot)*.3);c.scale(dir*s,s);
 c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(0,0,0,0,0,1.7);gl.addColorStop(0,'rgba(255,214,90,'+.35*a+')');gl.addColorStop(1,'rgba(255,190,40,0)');c.fillStyle=gl;c.beginPath();c.arc(0,0,1.7,0,TAU);c.fill();c.globalCompositeOperation='source-over';
 c.lineCap='round';c.lineJoin='round';c.lineWidth=(lw||2.1)/s;c.strokeStyle='rgba(255,232,120,'+a+')';c.shadowColor='rgba(255,200,50,'+a+')';c.shadowBlur=10;
 let tot=0;const segs=[];for(const st of RUNE)for(let k=1;k<st.length;k++){const l=Math.hypot(st[k][0]-st[k-1][0],st[k][1]-st[k-1][1]);segs.push([st[k-1],st[k],l,k===1]);tot+=l}
 let left=tot*p;c.beginPath();for(const [p0,p1,l,first] of segs){if(left<=0)break;const f=Math.min(1,left/l);if(first)c.moveTo(p0[0],p0[1]);c.lineTo(p0[0]+(p1[0]-p0[0])*f,p0[1]+(p1[1]-p0[1])*f);left-=l}c.stroke();
 c.shadowBlur=0;c.fillStyle='rgba(255,248,200,'+a+')';for(const [sx,sy,ss,ph] of[[1.25,-.9,.22,0],[-1.2,.75,.17,2],[1.05,.95,.13,4]]){const tw=ss*(.6+.4*Math.sin(rot*6+ph));c.beginPath();c.moveTo(sx,sy-tw);c.lineTo(sx+tw*.3,sy);c.lineTo(sx,sy+tw);c.lineTo(sx-tw*.3,sy);c.closePath();c.fill();c.beginPath();c.moveTo(sx-tw,sy);c.lineTo(sx,sy+tw*.3);c.lineTo(sx+tw,sy);c.lineTo(sx,sy-tw*.3);c.closePath();c.fill()}
 c.restore()}

/* ---------- poses ----------
   st: 'idle' | 'walk' | 'up' | 'mid' | 'fall' | 'land'  (as before)  plus  'heal' | 'hurt' | 'ko'
   o:  { t, ph, speed, atk }  (as before)  plus optional
       heal 0..1 (progress of holding X), hurt 0..1 (1 = just hit, counts down), ko 0..1, fill 0..1 (liquid level, e.g. HP.hp/HP.max) */
function poseFor(st,o){o=Object.assign({},o);const t=o.t,sp=o.speed||0,ph=o.ph||0;
 const br=(Math.sin(t*1.9)+1)/2,blink=(t%4.7)<.14?.25:1;
 const P={lean:.02+Math.sin(t*1.1)*.014,tilt:.03+Math.sin(t*1.4)*.03,bob:Math.sin(t*1.9)*1.5,sp:0,breath:br,
  footN:[5+Math.sin(t*.9)*.8,0],footF:[-3-Math.sin(t*.9)*.6,0],trail:2+Math.sin(t*1.4)*2.2,lift:0,sway:Math.sin(t*2.2)*2,flutter:.7,flare:.1,
  slosh:Math.sin(t*2)*.5,wave:.4,liqY:0,fizz:0,glow:0,soul:(.8+.2*Math.sin(t*2.6))*blink,hurtFx:0,flash:0,
  fill:o.fill==null?1:o.fill,squash:1,lunge:0,t,hilt:{ang:2.55+Math.sin(t*1.7)*.05}};
 if(st=='walk'){const A=11*Math.min(1,sp+.1),s=Math.sin(ph),k=Math.cos(ph);
  P.footN=[4+A*s,Math.max(0,k)*(7.5*sp+1.5)];P.footF=[-4-A*s,Math.max(0,-k)*(7.5*sp+1.5)];
  P.sp=sp;P.lean=.04+.15*sp;P.tilt=.04+.05*sp+Math.sin(ph*2)*.012;P.bob=Math.sin(ph*2)*.8*sp;P.trail=6+19*sp;P.sway=Math.sin(ph*2)*2*sp;
  P.flutter=1+2.4*sp;P.flare=.25+.6*sp;P.slosh=-.9*sp+Math.cos(ph*2)*.45;P.wave=.8;P.hilt.ang=2.55+Math.sin(ph*2)*.1*sp;P.lift=3*sp;P.breath=0}
 else if(st=='up'){P.sp=.5;P.footN=[8,11];P.footF=[-6,9];P.lean=.05;P.tilt=-.02;P.bob=0;P.trail=6;P.lift=1;P.hemDrop=3;P.flutter=1.4;P.flare=.4;
  P.hilt.ang=2.2;P.slosh=0;P.liqY=-1.6;P.wave=.25;P.squash=1.05;P.breath=0}
 else if(st=='mid'){P.sp=.5;P.footN=[7,9.5];P.footF=[-5,8.5];P.lean=.06;P.tilt=.02;P.bob=.5;P.trail=6;P.lift=7;P.flutter=1.6;P.flare=.6;
  P.hilt.ang=2.3;P.liqY=.6;P.wave=1;P.breath=0}
 else if(st=='fall'){P.sp=.7;P.footN=[8,5];P.footF=[-6,2];P.lean=.08;P.tilt=.06;P.bob=1;P.trail=4;P.lift=13;P.sway=Math.sin(t*14)*1.6;P.flutter=2.6;P.flare=1;
  P.hilt.ang=2.7;P.slosh=Math.sin(t*9)*.4;P.liqY=2.4;P.wave=1.3;P.squash=1.02;P.breath=0}
 else if(st=='land'){P.footN=[9,0];P.footF=[-7,0];P.lean=.1;P.tilt=.05;P.bob=-2.5;P.trail=1;P.lift=-1;P.flutter=1.2;P.flare=.3;P.squash=.88;
  P.liqY=-1;P.wave=1.8;P.slosh=Math.sin(t*16)*.5;P.breath=0}
 else if(st=='ko'){o.ko=o.ko==null?1:o.ko}
 else if(st=='heal'){o.heal=o.heal==null?1:o.heal}
 else if(st=='hurt'){o.hurt=o.hurt==null?1:o.hurt}
 /* the swing (atk 0..1 over the 26 attack frames): a tiny wind-up, a very fast strike over the top (about 80 ms),
    a short hold and a recovery. It only moves the drawing (lean, lunge, cape, sword); speed and hitbox stay as they are.
    o.long = the long slash: a slightly bigger swing */
 if(o.atk!=null&&o.atk>=0){const a=o.atk,lg=o.long?1:0,W=.1,X=.28,H=.5,Z=.85,rest=-.58,up=2.3+.25*lg,low=-.78-.15*lg;let b,sw,sm=0,k2;
  if(a<W){const u=ease(a/W);b=lerp(rest,up,u);sw=u;P.lean-=.07*u;P.squash*=1+.03*u;P.trail-=2*u}
  else if(a<X){const u=(a-W)/(X-W);b=lerp(up,low,1-Math.pow(1-u,3));sw=1;sm=1-.3*u;k2=Math.sin(u*Math.PI/2);
   P.lean+=(.2+.05*lg)*k2;P.lunge=(4+2*lg)*k2;P.squash*=1-.05*k2;P.trail+=12*k2;P.flutter+=2*k2;P.tilt+=.06*k2}
  else if(a<H){const u=(a-X)/(H-X);b=low-.1*u;sw=1;sm=.7*(1-u);P.lean+=.2+.05*lg-.06*u;P.lunge=4+2*lg;P.squash*=.95+.02*u;P.trail+=12-4*u;P.flutter+=2*(1-u);P.tilt+=.06}
  else{const u=ease(clamp((a-H)/(Z-H),0,1));b=lerp(low-.1,rest,u);sw=1-u;P.lean+=(.14+.05*lg)*(1-u);P.lunge=(4+2*lg)*(1-u);P.trail+=8*(1-u);P.tilt+=.06*(1-u)}
  P.swing=SLASH_BLADE&&sw>.02?sw:0;P.swingAng=b;P.smear=sm;
  P.flash=a<.5?Math.sin(a/.5*Math.PI):0;P.slosh+=Math.sin(Math.min(1,a/.4)*Math.PI)*(1.1+.4*lg);P.wave+=.8*(1-a)}
 /* healing: stands a bit taller, the head glows, bubbles fizz upwards */
 if(o.heal>0){const h=ease(clamp(o.heal,0,1));P.glow=.2+.55*h;P.fizz=1;P.soul=1+.6*h;P.lean-=.03*h;P.tilt-=.05*h;P.bob+=1.2*h+Math.sin(t*9)*.3*h;
  P.lift+=2+3*h;P.flutter+=.8*h;P.wave+=.4*h;P.hilt.ang+=.08*h}
 /* hit: a quick flinch backwards, a white flash and a splash inside the glass */
 if(o.hurt>0){const k=clamp(o.hurt,0,1),e=k*k;P.lean-=.28*e;P.tilt-=.22*e;P.lunge=-4*e;P.hurtFx=e;P.slosh+=Math.sin(t*22)*1.4*k;P.wave+=2.2*k;
  P.footN=[P.footN[0]-3*e,P.footN[1]];P.trail+=5*e;P.flutter+=1.5*k;P.squash*=1-.05*e}
 /* knocked out: slumped, the head hangs forward, the light goes out */
 if(o.ko>0){const k=ease(clamp(o.ko,0,1));P.lean=lerp(P.lean,.16,k);P.tilt=lerp(P.tilt,.42,k);P.bob=lerp(P.bob,-6,k);
  P.footN=[lerp(P.footN[0],8,k),0];P.footF=[lerp(P.footF[0],-6,k),0];P.soul*=1-k;P.fill=Math.min(P.fill,lerp(P.fill,.05,k));
  P.squash=lerp(P.squash,.92,k);P.lift=lerp(P.lift,-2.5,k);P.trail=lerp(P.trail,1,k);P.flutter*=1-.8*k;P.wave*=1-.7*k;P.breath*=1-k;P.hilt.ang=lerp(P.hilt.ang,2.95,k)}
 return P}

/* ---------- the slash: two kinds, picked at random per swing (the hitbox is the same for both) ----------
   short slash (most swings): a flat ">" crescent with comb streaks, then thin diagonal slivers (like the Nail Slash sheet)
   long slash (SLASH_LONG_CHANCE of the swings): a big comet-like swoosh from behind the head around the front
   SLASH_TILT tilts the short slash a little downwards towards the front (0 = level)
   SLASH_BLADE shows the golden blade during the swing */
const SLASH_TILT=.75,SLASH_LONG_CHANCE=.3,SLASH_BLADE=true;
function pickSlashLong(){return Math.random()<SLASH_LONG_CHANCE}
function slashIsLong(seed){return ((seed|0)%100)<SLASH_LONG_CHANCE*100}
/* a seed whose slash kind matches long, so sound and picture agree */
function slashSeed(long){let s;do{s=(Math.random()*9999)|0}while(slashIsLong(s)!==!!long);return s}
function slashFx(c,hx,oy,f,k,seed,S,tilt,long){if(k<0||k>1)return;if(long==null)long=slashIsLong(seed);
 if(long)slashLongFx(c,hx,oy,f,k,seed,S);else slashShortFx(c,hx,oy,f,k,seed,S,tilt)}
/* short slash, after the top row of the Nail Slash sheet:
   1) a flat ">" crescent that snaps open from the front, thick at the point and thin at the ends, with comb streaks trailing behind
   2) then two thin slivers that rise diagonally from low behind to high in front and fade */
function slashShortFx(c,hx,oy,f,k0,seed,S,tilt){const k=k0/.8;if(k>1)return;const R=50*S,cx=hx+f*R*1.05,cy=oy-R*.02,rx=R*1.15,ry=R*.42,tm=2.2,N=48;
 let s=seed;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};
 c.save();c.globalCompositeOperation='lighter';
 {const tl=(tilt==null?SLASH_TILT:tilt)*.22;c.translate(hx,oy);c.rotate(-f*tl);c.translate(-hx,-oy)}
 const pt=(a,d)=>{const nx=Math.cos(a)/rx,ny=Math.sin(a)/ry,l=Math.hypot(nx,ny);return [cx+f*(Math.cos(a)*rx+nx/l*d),cy+Math.sin(a)*ry+ny/l*d]};
 /* 1) the crescent */
 if(k<.6){const kA=k/.6,p=1-Math.pow(1-Math.min(1,kA/.22),2),fade=kA<.55?1:Math.pow(1-(kA-.55)/.45,.8),thin=1-.45*clamp((kA-.4)/.6,0,1);
  const w=a=>28*S*thin*Math.pow(Math.max(0,1-Math.abs(a)/tm),1.15);
  const band=(sc,off)=>{c.beginPath();for(let i=0;i<=N;i++){const a=lerp(-tm*p,tm*p,i/N),q=pt(a,off*S+w(a)*sc*.5);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])}
   for(let i=N;i>=0;i--){const a=lerp(-tm*p,tm*p,i/N),q=pt(a,off*S-w(a)*sc*.5);c.lineTo(q[0],q[1])}c.closePath()};
  band(1.7,2);c.fillStyle='rgba(255,190,60,'+.2*fade+')';c.fill();
  c.shadowColor='#ffd84a';c.shadowBlur=18*S;band(1,0);
  const g=c.createRadialGradient(cx+f*rx,cy,R*.1,cx+f*rx*.6,cy,R*1.5);g.addColorStop(0,'rgba(255,255,245,'+fade+')');g.addColorStop(.6,'rgba(255,238,160,'+fade+')');g.addColorStop(1,'rgba(255,200,70,'+.7*fade+')');c.fillStyle=g;c.fill();
  c.shadowBlur=0;band(.32,5);c.fillStyle='rgba(255,255,252,'+.9*fade+')';c.fill();
  /* comb streaks: three thin parallel lines that carry each end on behind the hero */
  if(p>.85){c.lineCap='round';for(const sg of[-1,1])for(let j=0;j<3;j++){const off=(j-1)*5.5*S,len=.55+.25*j+rnd()*.15,a0=sg*tm*.72;c.strokeStyle='rgba(255,250,220,'+.8*fade*(1-j*.18)+')';c.lineWidth=(2.2-j*.5)*S*thin;
   c.beginPath();for(let i=0;i<=10;i++){const a=a0+sg*len*i/10,q=pt(a,off*(1-i/14));i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])}c.stroke()}}}
 /* 2) the afterimage: two long thin slivers rising from low behind to high in front */
 if(k>.42){const kB=(k-.42)/.58,fade=Math.pow(1-kB,.8)*Math.min(1,kB/.12),sh=f*R*.35*kB;
  for(let j=0;j<2;j++){const x0=hx-f*R*.35+sh+f*j*R*.3,y0=oy+R*.72-j*R*.06,x1=hx+f*R*2.1+sh,y1=oy-R*.2-j*R*.14,mx=(x0+x1)/2+f*R*.08,my=(y0+y1)/2+R*.14,
    w=(j?2:3.4)*S*(1-.4*kB),dx=x1-x0,dy=y1-y0,l=Math.hypot(dx,dy),nx=-dy/l,ny=dx/l;
   c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo(mx+nx*w,my+ny*w,x1,y1);c.quadraticCurveTo(mx-nx*w,my-ny*w,x0,y0);c.closePath();
   c.shadowColor='#ffd84a';c.shadowBlur=10*S;c.fillStyle='rgba(255,250,225,'+fade*(j?.7:1)+')';c.fill()}
  c.shadowBlur=0}
 c.restore()}
function slashLongFx(c,hx,oy,f,k,seed,S){const R=64*S,cx=hx+f*R*.55,cy=oy-R*.12,rx=R*1.32,ry=R*.62,a0=-Math.PI*.95,a1=Math.PI*.7,N=64;
 const head=lerp(a0,a1,1-Math.pow(1-Math.min(1,k/.4),2.2)),tail=lerp(a0,a1-.5,Math.pow(clamp((k-.28)/.72,0,1),1.2)),fade=Math.pow(1-k,.6);if(head-tail<.03)return;
 const thick=u=>34*S*(u<.72?Math.pow(u/.72,1.3):Math.pow(Math.max(0,1-(u-.72)/.28),.75));
 const pt=(a,d)=>{const nx=Math.cos(a)/rx,ny=Math.sin(a)/ry,l=Math.hypot(nx,ny);return [cx+f*(Math.cos(a)*rx+nx/l*d),cy+Math.sin(a)*ry+ny/l*d]};
 const band=(sc,off)=>{c.beginPath();for(let i=0;i<=N;i++){const a=lerp(tail,head,i/N),w=thick((a-a0)/(a1-a0))*sc,q=pt(a,off*S+w*.5);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])}
  for(let i=N;i>=0;i--){const a=lerp(tail,head,i/N),w=thick((a-a0)/(a1-a0))*sc,q=pt(a,off*S-w*.5);c.lineTo(q[0],q[1])}c.closePath()};
 c.save();c.globalCompositeOperation='lighter';c.translate(cx,cy);c.rotate(-f*.16);c.translate(-cx,-cy);
 band(1.6,3);c.fillStyle='rgba(255,190,60,'+.2*fade+')';c.fill();
 c.shadowColor='#ffd84a';c.shadowBlur=26*S;band(1,0);
 const g=c.createRadialGradient(cx,cy,R*.4,cx,cy,R*1.7);g.addColorStop(0,'rgba(255,255,240,'+fade+')');g.addColorStop(.65,'rgba(255,238,160,'+fade+')');g.addColorStop(1,'rgba(255,200,70,'+.75*fade+')');c.fillStyle=g;c.fill();
 c.shadowBlur=0;band(.34,6);c.fillStyle='rgba(255,255,252,'+.92*fade+')';c.fill();
 let s=seed;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};
 /* fine streaks trailing off the outer edge, and sparks thrown from the head */
 c.strokeStyle='rgba(255,250,220,'+.85*fade+')';c.lineCap='round';
 for(let i=0;i<7;i++){const a=lerp(tail,head,.35+rnd()*.6),da=-.25-rnd()*.35,d0=thick((a-a0)/(a1-a0))*.5+2*S;c.lineWidth=(.8+rnd()*1.2)*S;c.beginPath();
  for(let j=0;j<=8;j++){const q=pt(a+da*j/8,d0+j*.6*S);j?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])}c.stroke()}
 for(let i=0;i<9;i++){const q=pt(head-rnd()*.25,(rnd()-.3)*20*S),r=(1+rnd()*1.6)*S*(1-k);c.fillStyle='rgba(255,236,150,'+fade+')';c.beginPath();c.arc(q[0]+f*k*rnd()*30*S,q[1]+k*k*14*S,r,0,TAU);c.fill()}
 c.restore()}
/* the two slash sounds (mp3): short = "slash", long = "axe slash". They are added to the game's SND so they load with the others */
const SLASH_SND={short:'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',long:'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'};
if(typeof SND!=='undefined'){SND.slashShort=SLASH_SND.short;SND.slashLong=SLASH_SND.long}

/* draw the hero at screen position x,y (feet), facing face (1 or -1), at scale S; sq is the squash from the pose */
function heroDraw(c,x,y,face,P,lean,sq,S){c.save();c.translate(x+face*S*(P.lunge||0),y);c.scale(face*S*(1+(1-sq)*.5),-S*sq);drawHero(c,P);c.restore()}
/* ===================== end of TIME BLENDER v2 ===================== */
