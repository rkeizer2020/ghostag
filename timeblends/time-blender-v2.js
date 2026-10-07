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
 heroHilt(c,P);
 heroLeg(c,P,P.footN,false,OL);
 heroBody(c,P,OL);
 heroCape(c,P,OL);
 if(typeof UPG!=='undefined'&&UPG.harness&&typeof harnessBack==='function'){harnessBack(c,P);harnessFront(c,P)}
 heroHead(c,P,OL);
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
 /* tall purple face plate over the front of the glass, with a dark slit */
 c.beginPath();c.moveTo(cx+1,cy-16);c.lineTo(cx+15,cy-15);c.quadraticCurveTo(cx+21,cy-6,cx+20,cy+6);c.lineTo(cx+18,cy+19);c.lineTo(cx+4,cy+21);c.quadraticCurveTo(cx-2,cy+4,cx+1,cy-16);c.closePath();
 fillOut(c,lgrad(c,cx,0,cx+21,0,HN.armor),OL);
 c.save();c.clip();c.fillStyle=lgrad(c,0,cy-16,0,cy+21,['rgba(70,25,20,.35)','rgba(70,25,20,0)','rgba(255,224,170,.25)']);c.fillRect(cx-4,cy-18,28,42);c.restore();
 c.strokeStyle='rgba(255,220,170,.6)';c.lineWidth=1.2;c.beginPath();c.moveTo(cx+18.4,cy+16);c.lineTo(cx+19.4,cy+4);c.stroke();
 c.fillStyle='#1c1226';c.beginPath();c.moveTo(cx+6,cy+15);c.lineTo(cx+16,cy+14.4);c.lineTo(cx+15.6,cy+11.4);c.lineTo(cx+13.4,cy+11.4);c.lineTo(cx+13,cy-3);c.lineTo(cx+10.4,cy-3);c.lineTo(cx+10.8,cy+11.6);c.lineTo(cx+6,cy+12);c.closePath();c.fill();
 c.beginPath();rrect(c,cx+6.4,cy+1,2.2,8,1);c.fill();
 c.fillStyle='rgba(255,226,140,.7)';c.fillRect(cx+11.2,cy+.5,1.4,9);
 /* flat copper hat: it rests on the top edge of the face plate (cx+4,cy+21)-(cx+18,cy+19) and ends flush with its front */
 if(HARNESS_STYLE.funnel){const ax=cx+4,ay=cy+21,L=Math.hypot(14,2),ux=14/L,uy=-2/L,nx=2/L,ny=14/L,q=(s,h)=>[ax+ux*s+nx*h,ay+uy*s+ny*h],F=L;
  const poly=pts=>{c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath()};
  poly([q(-16,0),q(F,0),q(F+1.6,5.6),q(-21,5.6)]);fillOut(c,lgrad(c,...q(0,0),...q(0,5.6),[HN.cop[3],HN.cop[2],HN.cop[1]]),OL);
  poly([q(-21,5.6),q(F+1.6,5.6),q(F+1.2,8),q(-20.6,8)]);fillOut(c,lgrad(c,...q(-21,0),...q(F,0),[HN.cop[1],HN.cop[0],'#ffe3c8',HN.cop[0]]),OL*.85);
  c.strokeStyle='rgba(255,230,200,.6)';c.lineWidth=1;c.beginPath();c.moveTo(...q(-14,1.6));c.lineTo(...q(F-1.5,1.6));c.stroke()}
 /* copper horn at the lower front of the plate */
 c.save();c.translate(cx+17,cy-10);c.rotate(-.55);
 c.beginPath();c.moveTo(-3,-3.4);c.lineTo(-3,3.4);c.lineTo(8,7);c.lineTo(8,-7);c.closePath();fillOut(c,lgrad(c,0,-7,0,7,[HN.cop[0],HN.cop[1],HN.cop[2]]),OL*.85);
 c.beginPath();c.ellipse(8,0,2.6,7,0,0,TAU);fillOut(c,lgrad(c,6,0,10,0,[HN.cop[2],HN.cop[1]]),1.6);c.beginPath();c.ellipse(8.3,0,1.3,4.8,0,0,TAU);c.fillStyle='#2a1830';c.fill();c.restore()}

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
 /* the swing: the body keeps doing whatever it was doing, only the hilt glints and the liquid jolts */
 if(o.atk!=null&&o.atk>=0){const a=o.atk;P.flash=a<.5?Math.sin(a/.5*Math.PI):0;P.slosh+=Math.sin(Math.min(1,a/.6)*Math.PI)*.7;P.wave+=.5*(1-a)}
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

/* the slash: a bright crescent (60% of a circle, sharp tips, wide middle) with a hot core, streaks and sparks */
function slashFx(c,hx,oy,f,k,seed,S){if(k<0||k>1)return;const R=54*S,ox=hx+f*(R+12*S),p=Math.min(1,k/.45),fade=Math.pow(1-k,.7),th0=-TAU*.3,th1=TAU*.3,N=44;
 c.save();c.globalCompositeOperation='lighter';
 const pt=(u,r)=>{const a=lerp(th0,th0+(th1-th0)*p,u);return [ox+f*Math.cos(a)*r,oy+Math.sin(a)*r]};
 const band=(w,off)=>{c.beginPath();for(let i=0;i<=N;i++){const u=i/N,th=Math.pow(Math.sin(Math.PI*u),1.25)*w*S,q=pt(u,R+off*S+th*.5);i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1])}
  for(let i=N;i>=0;i--){const u=i/N,th=Math.pow(Math.sin(Math.PI*u),1.25)*w*S,q=pt(u,R+off*S-th*.5);c.lineTo(q[0],q[1])}c.closePath()};
 /* soft outer haze */
 band(44,2);c.fillStyle='rgba(255,190,60,'+.22*fade+')';c.fill();
 /* main body */
 c.shadowColor='#ffd84a';c.shadowBlur=22*S;band(27,0);
 const g=c.createRadialGradient(ox,oy,R*.6,ox,oy,R*1.3);g.addColorStop(0,'rgba(255,255,235,'+fade+')');g.addColorStop(.7,'rgba(255,236,150,'+fade+')');g.addColorStop(1,'rgba(255,200,60,'+fade*.7+')');c.fillStyle=g;c.fill();
 c.shadowBlur=0;
 /* hot white core along the leading edge */
 band(8,8);c.fillStyle='rgba(255,255,250,'+.9*fade+')';c.fill();
 let s=seed;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280};
 c.fillStyle='rgba(255,252,225,'+fade+')';for(let i=0;i<9;i++){const u=.35+rnd()*.65,a=lerp(th0,th0+(th1-th0)*p,u),r0=R*(.86+rnd()*.1),r1=R*(1.12+rnd()*.5),w=1.8*S+rnd()*1.6*S,nx=-Math.sin(a)*f,ny=Math.cos(a);
  const x0=ox+f*Math.cos(a)*r0,y0=oy+Math.sin(a)*r0,x1=ox+f*Math.cos(a+.05*f)*r1,y1=oy+Math.sin(a+.05)*r1;c.beginPath();c.moveTo(x0+nx*w,y0+ny*w);c.lineTo(x1,y1);c.lineTo(x0-nx*w,y0-ny*w);c.closePath();c.fill()}
 /* sparks thrown off the tip */
 for(let i=0;i<7;i++){const a=lerp(th0,th1,.2+rnd()*.8),d=R*(1.05+k*(.5+rnd()*.6)),x=ox+f*Math.cos(a)*d,y=oy+Math.sin(a)*d+k*k*14*S,r=(1+rnd()*1.4)*S*(1-k);
  c.fillStyle='rgba(255,236,150,'+fade+')';c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}
 c.strokeStyle='rgba(255,252,225,'+fade*.9+')';c.lineWidth=2*S;c.beginPath();c.moveTo(ox-f*R*.6,oy);c.lineTo(ox+f*R*1.9*p,oy);c.stroke();
 c.restore()}

/* draw the hero at screen position x,y (feet), facing face (1 or -1), at scale S; sq is the squash from the pose */
function heroDraw(c,x,y,face,P,lean,sq,S){c.save();c.translate(x+face*S*(P.lunge||0),y);c.scale(face*S*(1+(1-sq)*.5),-S*sq);drawHero(c,P);c.restore()}
/* ===================== end of TIME BLENDER v2 ===================== */
