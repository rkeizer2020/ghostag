/* =====================================================================
   SUNRISE FORGE v2: the forge at the end of room 15, in the style of the Time Blender
   ---------------------------------------------------------------------
   Drop-in replacement for  function drawForge(c,cam,t){...}  in demo/time-blender-demo.html
   (the block that starts at "function drawForge" and ends right before "const FORGE_ITEMS").
   It only needs OUT, TAU, rrect, fillOut and lgrad, which the game already has (old or v2
   character code), plus the game's own room, FORGE_ROOM, FX, WW, FLOOR, nearForge, forgeOpen.
   forgeArt(c,x,floorY,t,near) draws the forge on its own, so it also works on a test page.
   ===================================================================== */
const FG={cop:['#f6c39a','#eda26e','#d98348','#b8613a','#7d3f28'],brick:['#7a3e3e','#5c2c33','#401d27'],mortar:'rgba(28,14,24,.55)',
 slate:['#b4c8de','#8aa6c4','#5b7aa0','#3c5272'],steel:['#a9b4c6','#6e7a90','#454e62'],leather:['#8a5e9a','#5e3d6c','#3c2447'],wood:['#6b4636','#4a2f2c'],
 glass:['#f4faf6','#c3d6d0'],liq:['#ffe88a','#ffd24d','#f0a836','#c06a1c'],gold:['#fff7bd','#f6cf4c','#c48f26'],fire:['#fff4c2','#ffd25a','#ff9a3a','#e0532a','#8a2420']};
let FORGE_GLOW=0;
const fgRad=(c,x,y,r0,r1,stops)=>{const g=c.createRadialGradient(x,y,r0,x,y,r1);stops.forEach((s,i)=>g.addColorStop(i/(stops.length-1),s));return g};
function fgRivets(c,pts,r){for(const [x,y] of pts){c.beginPath();c.arc(x,y,r||2.2,0,TAU);c.fillStyle=FG.cop[4];c.fill();c.beginPath();c.arc(x-.6,y-.6,(r||2.2)*.5,0,TAU);c.fillStyle=FG.cop[0];c.fill()}}
function fgGear(c,x,y,R,n,a,cols){c.save();c.translate(x,y);c.rotate(a);c.beginPath();for(let i=0;i<n*2;i++){const a0=i/(n*2)*TAU,r=i%2?R:R*1.22;c.lineTo(Math.cos(a0-.12)*r,Math.sin(a0-.12)*r);c.lineTo(Math.cos(a0+.12)*r,Math.sin(a0+.12)*r)}c.closePath();
 fillOut(c,lgrad(c,0,-R,0,R,cols),2.4);c.beginPath();c.arc(0,0,R*.38,0,TAU);fillOut(c,cols[cols.length-1],2);c.restore()}

function forgeArt(c,x,F,t,near){
 near=near||0;const fl=.8+.2*Math.sin(t*9)+.1*Math.sin(t*23),heat=fl*(1+.35*near);
 /* warm light on the room around the forge */
 c.save();c.globalCompositeOperation='lighter';c.fillStyle=fgRad(c,x,F-90,10,340,['rgba(255,160,70,'+.34*heat+')','rgba(255,120,50,'+.12*heat+')','rgba(255,110,40,0)']);c.fillRect(x-360,F-440,720,460);c.restore();

 /* chimney: slate blue pipe with copper bands, up into the ceiling */
 {const px=x+30,pw=46,top=Math.min(-20,F-700);rrect(c,px,top,pw,F-236-top,6);fillOut(c,lgrad(c,px,0,px+pw,0,[FG.slate[3],FG.slate[1],FG.slate[0],FG.slate[2],FG.slate[3]]),3);
  for(let y=F-300;y>top;y-=78){rrect(c,px-5,y,pw+10,12,3);fillOut(c,lgrad(c,0,y,0,y+12,[FG.cop[1],FG.cop[3]]),2.4);fgRivets(c,[[px+4,y+6],[px+pw-4,y+6]],1.6)}}

 /* glass tank of time liquid on a copper stand, piped into the hood */
 {const tx=x+170,tw=54,ty=F-182,th=136,l=ty+th*(.36+.04*Math.sin(t*1.3));
  c.lineCap='round';c.strokeStyle=OUT;c.lineWidth=13;c.beginPath();c.moveTo(tx,ty-4);c.lineTo(tx,F-214);c.quadraticCurveTo(tx,F-226,tx-14,F-226);c.lineTo(x+112,F-226);c.stroke();
  c.strokeStyle=FG.cop[2];c.lineWidth=8;c.stroke();c.strokeStyle='rgba(255,226,190,.55)';c.lineWidth=2.4;c.beginPath();c.moveTo(tx-2,ty-4);c.lineTo(tx-2,F-213);c.quadraticCurveTo(tx-2,F-223,tx-14,F-223);c.lineTo(x+112,F-223);c.stroke();
  for(const lx of[tx-20,tx+20]){rrect(c,lx-4,F-46,8,46,2);fillOut(c,lgrad(c,lx-4,0,lx+4,0,[FG.cop[1],FG.cop[3]]),2.4)}
  rrect(c,tx-34,F-50,68,12,4);fillOut(c,lgrad(c,0,F-50,0,F-38,[FG.cop[1],FG.cop[3]]),2.6);
  c.save();rrect(c,tx-tw/2,ty,tw,th,24);c.fillStyle=lgrad(c,tx-tw/2,0,tx+tw/2,0,['#b9cfca',FG.glass[0],'#d7e7e3']);c.fill();c.clip();
  c.beginPath();c.moveTo(tx-tw,l);for(let xx=tx-tw/2;xx<=tx+tw/2+2;xx+=3)c.lineTo(xx,l+Math.sin(xx*.25+t*3)*1.6);c.lineTo(tx+tw,ty+th+4);c.lineTo(tx-tw,ty+th+4);c.closePath();
  c.fillStyle=lgrad(c,0,l,0,ty+th,FG.liq);c.fill();
  c.globalCompositeOperation='lighter';c.fillStyle=fgRad(c,tx,l+40,4,46,['rgba(255,250,200,.35)','rgba(255,220,120,0)']);c.fillRect(tx-tw,ty,tw*2,th);c.globalCompositeOperation='source-over';
  for(let i=0;i<7;i++){const ph=(t/(1.6+i*.31)+i*.21)%1,by=lerp(ty+th-6,l+2,ph),bx=tx+[-14,-6,2,9,15,-10,5][i]+Math.sin(t*3+i)*2,r=1+(i%3)*.6;
   c.strokeStyle='rgba(255,255,255,'+.8*(1-ph*ph)+')';c.lineWidth=1;c.beginPath();c.arc(bx,by,r,0,TAU);c.stroke()}
  c.strokeStyle='rgba(42,24,48,.5)';c.lineWidth=1.3;for(let k=0;k<7;k++){const yy=ty+20+k*16,L=k%2?6:11;c.beginPath();c.moveTo(tx+tw/2-4-L,yy);c.lineTo(tx+tw/2-4,yy);c.stroke()}
  c.fillStyle='rgba(255,255,255,.75)';rrect(c,tx-tw/2+7,ty+14,5,th-40,2.5);c.fill();
  c.restore();rrect(c,tx-tw/2,ty,tw,th,24);c.strokeStyle=OUT;c.lineWidth=3.4;c.stroke();
  for(const yy of[ty-4,ty+th-8]){rrect(c,tx-tw/2-4,yy,tw+8,12,4);fillOut(c,lgrad(c,0,yy,0,yy+12,[FG.cop[0],FG.cop[2],FG.cop[3]]),2.6)}}

 /* bellows on the left, pumping air into the fire */
 {const p=(Math.sin(t*2.2)+1)/2,h=9+11*p,nx=x-112,ny=F-66,ex=x-178;
  /* purple leather between the boards, with folds */
  c.beginPath();c.moveTo(nx-12,ny-4);c.lineTo(ex,ny-h);for(let k=1;k<=5;k++){const u=k/6;c.lineTo(ex+(k%2?-6:0),lerp(ny-h,ny+h,u))}c.lineTo(ex,ny+h);c.lineTo(nx-12,ny+4);c.closePath();
  fillOut(c,lgrad(c,0,ny-h,0,ny+h,FG.leather),2.6);
  c.strokeStyle='rgba(20,8,26,.45)';c.lineWidth=1.4;for(let k=1;k<=3;k++){const u=k/4,xx=lerp(nx-14,ex,u),hh=lerp(4,h,u);c.beginPath();c.moveTo(xx,ny-hh+1);c.lineTo(xx,ny+hh-1);c.stroke()}
  /* wooden boards with copper handles, hinged at the nozzle */
  c.lineCap='round';for(const s of[-1,1]){const y1=ny+s*(h+1.5);
   c.strokeStyle=OUT;c.lineWidth=9;c.beginPath();c.moveTo(nx-10,ny+s*4);c.lineTo(ex-4,y1);c.stroke();c.strokeStyle=FG.wood[0];c.lineWidth=5;c.stroke();
   c.strokeStyle=OUT;c.lineWidth=7;c.beginPath();c.moveTo(ex-4,y1);c.lineTo(ex-20,y1+s*3);c.stroke();c.strokeStyle=FG.cop[2];c.lineWidth=3.4;c.stroke()}
  /* copper nozzle into the furnace */
  c.beginPath();c.moveTo(nx-16,ny-6);c.lineTo(nx+2,ny-3);c.lineTo(nx+2,ny+3);c.lineTo(nx-16,ny+6);c.closePath();fillOut(c,lgrad(c,0,ny-6,0,ny+6,[FG.cop[0],FG.cop[3]]),2.4);
  if(p>.8){c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(255,210,120,'+(p-.8)*2.5+')';c.beginPath();c.ellipse(nx+8,ny,10,4,0,0,TAU);c.fill();c.restore()}}

 /* the furnace: brick body between copper pillars */
 rrect(c,x-112,F-194,224,172,14);fillOut(c,lgrad(c,0,F-194,0,F-22,FG.brick),3.6);
 c.save();rrect(c,x-112,F-194,224,172,14);c.clip();c.strokeStyle=FG.mortar;c.lineWidth=2;
 for(let r=0;r<8;r++){const y=F-190+r*22;c.beginPath();c.moveTo(x-112,y);c.lineTo(x+112,y);c.stroke();for(let b=0;b<7;b++){const bx=x-112+((b*38+(r%2)*19)%228);c.beginPath();c.moveTo(bx,y);c.lineTo(bx,y+22);c.stroke()}
  for(let b=0;b<6;b++){const bx=x-108+((b*38+(r%2)*19)%220);c.fillStyle='rgba(255,190,150,'+(.05+.05*((r*7+b*3)%3))+')';c.fillRect(bx+3,y+3,30,4)}}
 c.fillStyle=fgRad(c,x,F-70,20,150,['rgba(255,150,60,'+.32*heat+')','rgba(255,120,40,0)']);c.fillRect(x-112,F-194,224,172);c.restore();
 for(const s of[-1,1]){const px=x+s*112-11;rrect(c,px,F-200,22,180,5);fillOut(c,lgrad(c,px,0,px+22,0,[FG.cop[3],FG.cop[1],FG.cop[0],FG.cop[2]]),3);fgRivets(c,[[px+11,F-186],[px+11,F-140],[px+11,F-94],[px+11,F-48]])}

 /* hood: a copper funnel with a flat rim on top, like the hero's hat, and the hero's rune in gold */
 c.beginPath();c.moveTo(x-134,F-192);c.lineTo(x+134,F-192);c.lineTo(x+72,F-238);c.lineTo(x-72,F-238);c.closePath();fillOut(c,lgrad(c,0,F-238,0,F-192,[FG.cop[1],FG.cop[2],FG.cop[3]]),3.4);
 c.strokeStyle='rgba(255,226,190,.5)';c.lineWidth=2;c.beginPath();c.moveTo(x-124,F-196);c.lineTo(x+124,F-196);c.stroke();
 rrect(c,x-82,F-248,164,12,3);fillOut(c,lgrad(c,x-82,0,x+82,0,[FG.cop[2],FG.cop[0],'#ffe3c8',FG.cop[1]]),3);
 fgRivets(c,[[x-100,F-200],[x-50,F-200],[x+50,F-200],[x+100,F-200]],1.8);
 {const ex=x,ey=F-216,s=13,g=.55+.45*Math.sin(t*1.7)*.5+.3*near;c.save();c.translate(ex,ey);c.scale(s,s);
  c.globalCompositeOperation='lighter';c.fillStyle=fgRad(c,0,0,0,1.9,['rgba(255,214,90,'+.4*g+')','rgba(255,190,40,0)']);c.beginPath();c.arc(0,0,1.9,0,TAU);c.fill();c.globalCompositeOperation='source-over';
  c.lineCap='round';c.lineJoin='round';c.lineWidth=2.4/s;c.strokeStyle='rgba(255,232,120,'+(.7+.3*g)+')';c.shadowColor='rgba(255,200,50,.9)';c.shadowBlur=8;
  c.beginPath();c.moveTo(-.8,-.45);c.lineTo(-.8,-.7);c.lineTo(0,-1);c.lineTo(.8,-.7);c.lineTo(.8,.2);c.lineTo(0,1);c.lineTo(-.8,.2);c.closePath();c.stroke();
  c.beginPath();c.moveTo(-.45,-.38);c.lineTo(0,.02);c.lineTo(.45,-.38);c.moveTo(-.45,.06);c.lineTo(0,.46);c.lineTo(.45,.06);c.stroke();c.restore()}

 /* clock above the fire mouth: the forge keeps the time of the sunrise */
 {const cx=x,cy=F-164,R=17;c.beginPath();c.arc(cx,cy,R+5,0,TAU);fillOut(c,lgrad(c,0,cy-R,0,cy+R,[FG.cop[0],FG.cop[2],FG.cop[4]]),3);
  c.beginPath();c.arc(cx,cy,R,0,TAU);fillOut(c,fgRad(c,cx-4,cy-5,2,R,['#fffbe8','#f0e2a8']),2);
  c.strokeStyle=OUT;for(let k=0;k<12;k++){const a=k/12*TAU,r0=k%3?R-4:R-6;c.lineWidth=k%3?1.2:2;c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a)*(R-1.5),cy+Math.sin(a)*(R-1.5));c.stroke()}
  const hA=-Math.PI/2+t*.05,mA=-Math.PI/2+t*.6;c.lineCap='round';c.lineWidth=3;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(hA)*8,cy+Math.sin(hA)*8);c.stroke();
  c.lineWidth=2;c.strokeStyle='#8a3e36';c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(mA)*13,cy+Math.sin(mA)*13);c.stroke();c.beginPath();c.arc(cx,cy,2.4,0,TAU);fillOut(c,FG.gold[1],1.4)}

 /* the fire mouth: copper arch with a gold keystone, flames and glowing coals */
 {const L=x-56,R=x+56,B=F-28,T=F-94,P=F-146;
  const arch=()=>{c.beginPath();c.moveTo(L,B);c.lineTo(L,T);c.quadraticCurveTo(x,P,R,T);c.lineTo(R,B);c.closePath()};
  arch();c.fillStyle='#1a0c12';c.fill();c.save();arch();c.clip();
  c.fillStyle=fgRad(c,x,B-10,6,110,['rgba(255,220,120,'+.9*heat+')','rgba(255,120,40,'+.55*heat+')','rgba(140,30,20,0)']);c.fillRect(L,P,R-L,B-P);
  for(let layer=0;layer<3;layer++){const col=[FG.fire[3],FG.fire[2],FG.fire[0]][layer],sc=[1,.75,.45][layer];
   for(let i=0;i<7;i++){const fx=L+8+i*16,h=(46+22*Math.sin(t*7+i*1.7+layer)+12*Math.sin(t*13+i*2.3))*sc*(1+.25*near),w=12*sc+4;
    c.beginPath();c.moveTo(fx-w,B);c.quadraticCurveTo(fx-w*.6,B-h*.55,fx+Math.sin(t*5+i)*3,B-h);c.quadraticCurveTo(fx+w*.6,B-h*.55,fx+w,B);c.closePath();c.fillStyle=col;c.globalAlpha=.85;c.fill()}}
  c.globalAlpha=1;
  for(let i=0;i<9;i++){const cx2=L+6+i*12.5,g=.6+.4*Math.sin(t*4+i*1.3);c.beginPath();c.ellipse(cx2,B-3,7,4.5,0,0,TAU);c.fillStyle='rgb('+(160+80*g|0)+','+(50+60*g|0)+',30)';c.fill();c.strokeStyle='rgba(28,10,16,.7)';c.lineWidth=1.2;c.stroke()}
  c.restore();
  arch();c.lineJoin='round';c.strokeStyle=OUT;c.lineWidth=17;c.stroke();c.strokeStyle=lgrad(c,0,P,0,B,[FG.cop[0],FG.cop[2],FG.cop[3]]);c.lineWidth=11;c.stroke();
  c.strokeStyle='rgba(255,230,190,.5)';c.lineWidth=2;c.beginPath();c.moveTo(L-3,B-4);c.lineTo(L-3,T);c.quadraticCurveTo(x,P-6,R+3,T);c.stroke();
  c.beginPath();c.moveTo(x-9,P+18);c.lineTo(x+9,P+18);c.lineTo(x+12,P+4);c.lineTo(x-12,P+4);c.closePath();fillOut(c,lgrad(c,0,P+4,0,P+18,[FG.gold[0],FG.gold[1],FG.gold[2]]),2.4);
  c.strokeStyle=OUT;c.lineWidth=1.4;c.beginPath();c.moveTo(x-4,P+7);c.lineTo(x+4,P+7);c.lineTo(x-4,P+15);c.lineTo(x+4,P+15);c.closePath();c.stroke()}

 /* plinth with glowing vents */
 rrect(c,x-136,F-28,272,28,6);fillOut(c,lgrad(c,0,F-28,0,F,[FG.cop[1],FG.cop[3],FG.cop[4]]),3.2);
 for(let k=-3;k<=3;k++){if(k===0)continue;const vx=x+k*34-9;rrect(c,vx,F-19,18,7,3);c.fillStyle=fgRad(c,vx+9,F-15,1,12,['rgba(255,200,90,'+.9*heat+')','#3a1418']);c.fill();c.strokeStyle=OUT;c.lineWidth=1.6;c.stroke()}
 fgGear(c,x,F-12,9,8,t*.5,[FG.cop[0],FG.cop[2],FG.cop[3]]);

 /* anvil on a banded stump, with a glowing ingot, and a hammer leaning on it */
 {const ax=x-236;rrect(c,ax-24,F-50,48,50,6);fillOut(c,lgrad(c,ax-24,0,ax+24,0,[FG.wood[1],FG.wood[0],FG.wood[1]]),3);
  for(const yy of[F-42,F-14]){rrect(c,ax-26,yy,52,7,2);fillOut(c,lgrad(c,0,yy,0,yy+7,[FG.cop[1],FG.cop[3]]),2)}
  c.beginPath();c.moveTo(ax-30,F-52);c.lineTo(ax+28,F-52);c.lineTo(ax+22,F-58);c.lineTo(ax+14,F-60);c.lineTo(ax+14,F-66);c.lineTo(ax+34,F-70);c.lineTo(ax+34,F-80);c.lineTo(ax-38,F-80);
  c.quadraticCurveTo(ax-56,F-80,ax-66,F-74);c.quadraticCurveTo(ax-46,F-72,ax-16,F-66);c.lineTo(ax-16,F-60);c.lineTo(ax-24,F-58);c.closePath();fillOut(c,lgrad(c,0,F-80,0,F-52,FG.steel),3);
  c.strokeStyle='rgba(235,240,255,.6)';c.lineWidth=2;c.beginPath();c.moveTo(ax-54,F-77);c.quadraticCurveTo(ax-40,F-79,ax+32,F-78);c.stroke();
  const ig=.7+.3*Math.sin(t*3);rrect(c,ax-14,F-87,30,8,3);c.fillStyle=lgrad(c,0,F-87,0,F-79,['rgb(255,'+(220*ig|0)+',140)','#ff7a2a']);c.fill();c.strokeStyle=OUT;c.lineWidth=2;c.stroke();
  c.save();c.globalCompositeOperation='lighter';c.fillStyle=fgRad(c,ax+1,F-84,1,26,['rgba(255,170,70,'+.5*ig+')','rgba(255,120,40,0)']);c.beginPath();c.arc(ax+1,F-84,26,0,TAU);c.fill();c.restore();
  c.save();c.translate(ax+34,F-2);c.rotate(-.32);rrect(c,-3,-56,6,56,3);fillOut(c,lgrad(c,-3,0,3,0,FG.wood),2.2);rrect(c,-11,-66,22,12,3);fillOut(c,lgrad(c,0,-66,0,-54,FG.steel),2.4);c.restore()}

 /* sparks and a few of the hero's runes rising from the fire */
 c.save();c.globalCompositeOperation='lighter';
 for(let i=0;i<16;i++){const ph=(t*(.35+(i%5)*.06)+i*.137)%1,sx=x+Math.sin(i*12.9)*44+Math.sin(t*2+i)*10*ph,sy=F-40-ph*(200+40*Math.sin(i)),a=(1-ph)*(.6+.4*near),r=1.1+(i%3)*.5;
  c.fillStyle='rgba(255,'+(200+40*(i%2))+',120,'+a+')';c.beginPath();c.arc(sx,sy,r,0,TAU);c.fill()}
 c.restore();
 if(typeof drawCurl==='function')for(let i=0;i<2;i++){const ph=(t*.18+i*.5)%1,a=Math.min(1,ph/.2)*(1-ph)*(.5+.4*near);drawCurl(c,x-30+i*58+Math.sin(t+i)*6,F-250-ph*120,7,t+i,i?1:-1,Math.min(1,ph*2.2),a)}
}

/* the game's forge hook: same name and arguments as before */
function drawForge(c,cam,t){if(room!==FORGE_ROOM)return;const x=FX-cam;if(x<-400||x>WW+400)return;
 const near=nearForge()&&!forgeOpen;FORGE_GLOW+=((near?1:0)-FORGE_GLOW)*.08;forgeArt(c,x,FLOOR,t,FORGE_GLOW);
 if(near){const py=FLOOR-290+Math.sin(t*3)*3;c.save();rrect(c,x-84,py-19,168,38,8);fillOut(c,lgrad(c,0,py-19,0,py+19,['#4a3050','#2b1d33']),3);
  c.strokeStyle=FG.cop[1];c.lineWidth=2;rrect(c,x-79,py-14,158,28,5);c.stroke();fgRivets(c,[[x-72,py],[x+72,py]],2);
  c.textAlign='center';c.textBaseline='middle';c.font='600 16px '+(typeof SERIF!=='undefined'?SERIF:'Georgia,serif');c.fillStyle='#fff3cf';c.fillText('Z  ·  FORGE',x,py+1);c.restore()}}
/* ===================== end of SUNRISE FORGE v2 ===================== */
