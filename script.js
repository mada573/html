(function(){
"use strict";
var cv=document.getElementById("cv"),ctx=cv.getContext("2d");
var W=0,H=0,DPR=1,cx=0,cy=0;
function rnd(a,b){return a+Math.random()*(b-a);}
var SPEED=200, DEAD=20;

/* 1~5 普通鱼；6~10 不同物种 */
var FISH=[
  {name:"小银鱼",sp:"fish",c:"#cfd8dc",b:"#ffffff",f:"#aebcc4",len:15,asp:2.3,mk:"plain"},
  {name:"沙丁鱼",sp:"fish",c:"#8fa6d6",b:"#e9eefb",f:"#6d84c4",len:20,asp:2.5,mk:"line"},
  {name:"黄花鱼",sp:"fish",c:"#f4c64a",b:"#fff2bf",f:"#dca728",len:26,asp:2.0,mk:"plain"},
  {name:"秋刀鱼",sp:"fish",c:"#33486c",b:"#cdd8e8",f:"#243651",len:31,asp:3.2,mk:"line"},
  {name:"乌头鱼",sp:"fish",c:"#8c99a4",b:"#dde5ea",f:"#6a7681",len:39,asp:2.2,mk:"plain"},
  {name:"灯笼鱼",sp:"lantern",c:"#2c3744",b:"#46586b",f:"#1c2530",glow:"#ffe07a",len:50},
  {name:"水母",  sp:"jelly",  c:"#c98fe0",b:"#efd6ff",f:"#a86fc8",glow:"#e8c4ff",len:60},
  {name:"章鱼",  sp:"octopus",c:"#a83b66",b:"#d76d92",f:"#7e2748",len:76},
  {name:"鲨鱼",  sp:"shark",  c:"#5d7385",b:"#d2dde4",f:"#3f5260",len:104},
  {name:"鲸鱼",  sp:"whale",  c:"#356183",b:"#cfe2ed",f:"#244a66",len:150}
];
var PLEN=[15,20,26,31,39,50,60,76,104,150];   /* 玩家各级体型 */
var PCOL={c:"#e63b3b",b:"#ff9384",f:"#b71c1c"},PASP=2.1,PMK="plain"; /* 玩家固定物种 */
var THRESH=[4,12,24,40,60,84,112,144,180];
var NPC_COUNT=24, WEED_COUNT=15;
function torpMax(l){return l<6?0:(l===6?2:(l===7?3:(l===8?4:5)));}

var state,score,level,player,npcs,weeds,decor,motes,parts,pops,nets,torps;
var netCD,torpCD,deadFish,dieT,deathCause,last,tipHidden;
var aim={x:0,y:0,active:false};

function resize(){DPR=Math.min(window.devicePixelRatio||1,2.5);W=window.innerWidth;H=window.innerHeight;cx=W/2;cy=H/2;
  cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  if(typeof joy!=="undefined"&&joy&&joyId===null)joyRest();}
window.addEventListener("resize",resize);
window.addEventListener("orientationchange",function(){setTimeout(resize,200);});

function maxLen(){return 150;}
function regX(){return cx+maxLen()+90;}function regY(){return cy+maxLen()+90;}

function makeNpc(edible,forceLv){
  var cap=Math.min(10,level+3),lv;
  if(forceLv)lv=Math.min(10,forceLv);
  else if(edible&&level>1)lv=1+Math.floor(Math.random()*(level-1));
  else if(level>1&&Math.random()<0.5)lv=1+Math.floor(Math.random()*(level-1));
  else lv=1+Math.floor(Math.random()*cap);
  var m=maxLen()+90,side=Math.floor(Math.random()*4),wx,wy;
  if(side===0){wx=player.x-(cx+m);wy=player.y+rnd(-1,1)*(cy+m);}
  else if(side===1){wx=player.x+(cx+m);wy=player.y+rnd(-1,1)*(cy+m);}
  else if(side===2){wy=player.y-(cy+m);wx=player.x+rnd(-1,1)*(cx+m);}
  else{wy=player.y+(cy+m);wx=player.x+rnd(-1,1)*(cx+m);}
  var ang=rnd(0,6.28),sp=rnd(60,108)/(0.85+lv*0.06);
  return{lv:lv,x:wx,y:wy,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,base:sp,dir:Math.cos(ang)>=0?1:-1,phase:rnd(0,6.28),turn:rnd(1,3)};
}
function makeWeed(){return{x:rnd(-W*0.85,W*0.85),y:rnd(-H*0.85,H*0.85),ph:rnd(0,6.28),sz:rnd(0.85,1.25)};}
function makeDecor(){var t=Math.random(),type=t<0.4?"kelp":(t<0.7?"rock":"coral");
  return{type:type,x:player.x+rnd(-regX(),regX()),y:player.y+rnd(-regY(),regY()),ph:rnd(0,6.28),sz:rnd(0.7,1.6)};}
function makeNet(){var r=PLEN[level-1]*2.2+46,a=rnd(0,6.28),dd=rnd(0,Math.min(cx,cy)*0.7);
  return{x:player.x+Math.cos(a)*dd,y:player.y+Math.sin(a)*dd,r:r,t:0,done:false,fade:0.4};}
function makeTorp(){var tx=player.x+rnd(-140,140),ty=player.y+rnd(-140,140),ang=rnd(0,6.28),off=Math.max(W,H)*0.85+200;
  var hx=Math.cos(ang),hy=Math.sin(ang);return{x:tx-hx*off,y:ty-hy*off,hx:hx,hy:hy,sp:245,warn:0.6,launched:false,trav:0,ph:0};}

function reset(){
  state="play";score=0;level=1;last=0;tipHidden=false;dieT=0;deadFish=null;deathCause="";
  player={x:0,y:0,dir:1,phase:0,bite:0,up:0};aim.active=false;aim.x=cx;aim.y=cy;
  joyId=null;if(typeof joy!=="undefined"&&joy){joyRest();if(isTouch)joy.classList.add("show");}
  npcs=[];for(var i=0;i<NPC_COUNT;i++)npcs.push(makeNpc(false));
  weeds=[];for(var w=0;w<WEED_COUNT;w++)weeds.push(makeWeed());
  decor=[];for(var d=0;d<14;d++)decor.push(makeDecor());
  motes=[];for(var mo=0;mo<44;mo++)motes.push({x:player.x+rnd(-regX(),regX()),y:player.y+rnd(-regY(),regY()),r:rnd(.6,2.2),v:rnd(2,8)});
  parts=[];pops=[];nets=[];torps=[];netCD=2;torpCD=1.5;
  document.getElementById("over").style.display="none";document.getElementById("tip").style.opacity="1";updateHud();
}
function need(){return level>=10?0:THRESH[level-1]-score;}
function updateHud(){
  document.getElementById("hLv").textContent=level;
  document.getElementById("hScore").textContent=score;
  document.getElementById("hNeed").textContent=level>=10?"已满级":need();
  document.getElementById("hName").textContent="红鱼 Lv."+level;
  var wn=document.getElementById("hWarn");
  if(level>=3&&level<=5){wn.style.display="block";wn.style.color="#ffd56b";wn.textContent="⚠ 警惕渔网（3秒收网）";}
  else if(level>=6){wn.style.display="block";wn.style.color="#ff7a6b";wn.textContent="⚠ 躲避来袭鱼雷";}
  else wn.style.display="none";
}
function die(cause,fish){if(state!=="play")return;state="dying";dieT=0;deathCause=cause;deadFish=fish||null;
  if(cause==="torpedo")burst(player.x,player.y,28,["#ffd36b","#ff7a3a","#ffffff","#ff4d3a"],320);}
function gameOver(){state="over";var T="被吃掉了！",S="遇到了惹不起的大鱼";
  if(deathCause==="net"){T="被捕获！";S="没能在收网前逃出渔网";}else if(deathCause==="torpedo"){T="爆炸！";S="撞上了来袭的鱼雷";}
  document.getElementById("oTitle").textContent=T;document.getElementById("oSub").textContent=S;
  document.getElementById("oLv").textContent=level;document.getElementById("oScore").textContent=score;
  document.getElementById("over").style.display="flex";}
function burst(x,y,n,cols,sp){for(var i=0;i<n;i++){var a=rnd(0,6.28),s=rnd(sp*0.3,sp);
  parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rnd(0,sp*0.3),r:rnd(2,5),life:rnd(.4,.8),max:.8,col:cols[i%cols.length]});}}
function pop(x,y,txt,col){pops.push({x:x,y:y,txt:txt,col:col,life:1,max:1});}

/* —— 输入：底部虚拟摇杆拖盘 —— */
var st=document.getElementById("stage");
var joy=document.getElementById("joy"),joyKnob=document.getElementById("joyKnob");
var JOY_R=50,JOY_DEAD=6,joyId=null,joyOX=0,joyOY=0;
var isTouch=("ontouchstart" in window)||(window.matchMedia&&window.matchMedia("(pointer:coarse)").matches);

function hideTip(){if(!tipHidden){tipHidden=true;document.getElementById("tip").style.opacity="0";}}
function joyHomeX(){return W*0.5;}
function joyHomeY(){return H-100;}
function bandTop(){return H*0.56;}                 /* 下半区才触发摇杆，上方画面不被遮挡 */
function placeJoy(x,y){joy.style.left=x+"px";joy.style.top=y+"px";}
function setKnob(dx,dy){joyKnob.style.transform="translate("+dx+"px,"+dy+"px)";}
function joyRest(){placeJoy(joyHomeX(),joyHomeY());setKnob(0,0);joy.classList.remove("active");}

function joyStart(x,y){
  joyOX=Math.max(72,Math.min(W-72,x));
  joyOY=Math.max(bandTop()-6,Math.min(H-72,y));
  placeJoy(joyOX,joyOY);setKnob(0,0);aim.active=false;
  joy.classList.add("active","show");hideTip();
}
function joyMove(x,y){
  var dx=x-joyOX,dy=y-joyOY,dist=Math.hypot(dx,dy);
  if(dist>JOY_R){setKnob(dx/dist*JOY_R,dy/dist*JOY_R);}else{setKnob(dx,dy);}
  if(dist<JOY_DEAD){aim.active=false;}
  else{var nx=dx/dist,ny=dy/dist;aim.x=cx+nx*100;aim.y=cy+ny*100;aim.active=true;}
}
function joyEnd(){joyId=null;aim.active=false;joyRest();}

st.addEventListener("touchstart",function(e){
  if(state==="play"&&joyId===null){
    for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];
      if(t.clientY>bandTop()){joyId=t.identifier;joyStart(t.clientX,t.clientY);joyMove(t.clientX,t.clientY);break;}}
  }
  e.preventDefault();
},{passive:false});
st.addEventListener("touchmove",function(e){
  if(joyId!==null){for(var i=0;i<e.changedTouches.length;i++){var t=e.changedTouches[i];
    if(t.identifier===joyId){joyMove(t.clientX,t.clientY);break;}}}
  e.preventDefault();
},{passive:false});
function touchEndH(e){if(joyId===null)return;
  for(var i=0;i<e.changedTouches.length;i++){if(e.changedTouches[i].identifier===joyId){joyEnd();return;}}}
st.addEventListener("touchend",touchEndH);
st.addEventListener("touchcancel",touchEndH);

/* 桌面端：鼠标按住下半区拖动摇杆；也保留指向操作 */
var mouseDown=false;
st.addEventListener("mousedown",function(e){if(state!=="play")return;
  if(e.clientY>bandTop()){mouseDown=true;joyStart(e.clientX,e.clientY);joyMove(e.clientX,e.clientY);}
  else{hideTip();aim.x=e.clientX;aim.y=e.clientY;aim.active=true;}});
st.addEventListener("mousemove",function(e){if(state!=="play")return;
  if(mouseDown){joyMove(e.clientX,e.clientY);}
  else if(e.buttons===0&&!isTouch){hideTip();aim.x=e.clientX;aim.y=e.clientY;aim.active=true;}});
window.addEventListener("mouseup",function(){if(mouseDown){mouseDown=false;aim.active=false;joyRest();}});
st.addEventListener("mouseleave",function(){if(!mouseDown)aim.active=false;});

document.addEventListener("gesturestart",function(e){e.preventDefault();});
document.addEventListener("dblclick",function(e){e.preventDefault();});
document.getElementById("restart").addEventListener("click",reset);

/* —— 鱼/物种绘制 —— */
function drawFish(sx,sy,len,asp,col,dir,mk,phase,mouth){
  var h=len/asp;ctx.save();ctx.translate(sx,sy);ctx.scale(dir,1);var wig=Math.sin(phase)*0.35;
  ctx.fillStyle=col.f;ctx.beginPath();ctx.moveTo(-len*0.78,0);ctx.lineTo(-len*1.28,-h*(0.78+wig));
  ctx.quadraticCurveTo(-len*0.96,0,-len*1.28,h*(0.78-wig));ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(-len*0.1,-h*0.92);ctx.quadraticCurveTo(len*0.3,-h*1.5,len*0.5,-h*0.8);
  ctx.quadraticCurveTo(len*0.2,-h*0.7,-len*0.1,-h*0.92);ctx.fill();
  ctx.beginPath();ctx.moveTo(len*0.18,h*0.35);ctx.quadraticCurveTo(len*0.05,h*1.12,len*0.42,h*0.9);
  ctx.quadraticCurveTo(len*0.45,h*0.5,len*0.18,h*0.35);ctx.fill();
  var g=ctx.createLinearGradient(0,-h,0,h);g.addColorStop(0,col.c);g.addColorStop(0.55,col.c);g.addColorStop(1,col.b);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(len,0);ctx.quadraticCurveTo(len*0.4,-h,-len*0.55,-h*0.55);
  ctx.quadraticCurveTo(-len*0.85,0,-len*0.55,h*0.55);ctx.quadraticCurveTo(len*0.4,h,len,0);ctx.closePath();ctx.fill();
  ctx.save();ctx.beginPath();ctx.moveTo(len,0);ctx.quadraticCurveTo(len*0.4,-h,-len*0.55,-h*0.55);
  ctx.quadraticCurveTo(-len*0.85,0,-len*0.55,h*0.55);ctx.quadraticCurveTo(len*0.4,h,len,0);ctx.closePath();ctx.clip();
  if(mk==="line"){ctx.strokeStyle="rgba(255,255,255,.30)";ctx.lineWidth=Math.max(1.2,h*0.12);ctx.beginPath();ctx.moveTo(-len*0.6,h*0.05);ctx.lineTo(len*0.95,h*0.05);ctx.stroke();}
  else if(mk==="spot"){ctx.fillStyle="rgba(60,40,20,.4)";for(var s=0;s<9;s++){var rx=(Math.sin(s*12.9)*0.5+0.2)*len,ry=Math.cos(s*7.3)*h*0.7;ctx.beginPath();ctx.arc(rx,ry,h*0.13,0,6.29);ctx.fill();}}
  ctx.restore();
  var mo=Math.max(0,Math.min(1,mouth||0));ctx.fillStyle="rgba(40,12,10,.85)";
  ctx.beginPath();ctx.moveTo(len*0.96,-h*0.05-h*0.18*mo);ctx.lineTo(len*0.62,0);ctx.lineTo(len*0.96,h*0.05+h*0.55*mo);ctx.closePath();ctx.fill();
  var ex=len*0.6,ey=-h*0.2,er=Math.max(2,h*0.22);ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(ex,ey,er,0,6.29);ctx.fill();
  ctx.fillStyle="#101820";ctx.beginPath();ctx.arc(ex+er*0.25,ey,er*0.55,0,6.29);ctx.fill();ctx.restore();
}
function drawLantern(sx,sy,len,col,dir,phase,mouth){var h=len*0.8;ctx.save();ctx.translate(sx,sy);ctx.scale(dir,1);
  var wig=Math.sin(phase)*0.3;ctx.fillStyle=col.f;ctx.beginPath();ctx.moveTo(-len*0.68,0);ctx.lineTo(-len*1.02,-h*0.5*(1+wig));ctx.lineTo(-len*1.02,h*0.5*(1-wig));ctx.closePath();ctx.fill();
  var g=ctx.createRadialGradient(-len*0.1,-h*0.2,len*0.2,0,0,len);g.addColorStop(0,col.b);g.addColorStop(1,col.c);
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,len*0.82,h*0.78,0,0,6.29);ctx.fill();
  ctx.strokeStyle=col.f;ctx.lineWidth=Math.max(2,len*0.05);ctx.beginPath();ctx.moveTo(len*0.4,-h*0.55);ctx.quadraticCurveTo(len*1.05,-h*1.15,len*1.12,-h*0.5);ctx.stroke();
  var bx=len*1.12,by=-h*0.5,br=len*0.16+Math.sin(phase*3)*2;var gg=ctx.createRadialGradient(bx,by,1,bx,by,br*2.6);gg.addColorStop(0,col.glow);gg.addColorStop(1,"rgba(255,224,122,0)");
  ctx.fillStyle=gg;ctx.beginPath();ctx.arc(bx,by,br*2.6,0,6.29);ctx.fill();ctx.fillStyle=col.glow;ctx.beginPath();ctx.arc(bx,by,br,0,6.29);ctx.fill();
  var mo=Math.max(0,Math.min(1,mouth||0));ctx.fillStyle="#15100e";ctx.beginPath();ctx.moveTo(len*0.78,-h*0.05);ctx.lineTo(len*0.84,h*0.08+h*0.4*mo);ctx.lineTo(len*0.4,h*0.2);ctx.lineTo(len*0.46,-h*0.12);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff";for(var i=0;i<4;i++){var tx=len*0.46+i*len*0.1;ctx.beginPath();ctx.moveTo(tx,0);ctx.lineTo(tx+len*0.04,h*0.13);ctx.lineTo(tx+len*0.08,0);ctx.closePath();ctx.fill();}
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(len*0.38,-h*0.26,len*0.12,0,6.29);ctx.fill();ctx.fillStyle="#101820";ctx.beginPath();ctx.arc(len*0.41,-h*0.26,len*0.06,0,6.29);ctx.fill();ctx.restore();}
function drawJelly(sx,sy,len,col,phase){ctx.save();ctx.translate(sx,sy);var pulse=1+Math.sin(phase*2)*0.08,bw=len*0.9,bh=len*0.7*pulse;
  ctx.strokeStyle=col.f;ctx.lineWidth=Math.max(2,len*0.06);ctx.lineCap="round";ctx.globalAlpha=0.7;
  for(var i=-3;i<=3;i++){var ox=i*bw*0.22,sw=Math.sin(phase*2+i)*len*0.12;ctx.beginPath();ctx.moveTo(ox,bh*0.2);ctx.quadraticCurveTo(ox+sw,bh*0.8,ox+sw*0.4,bh*1.5);ctx.stroke();}ctx.globalAlpha=1;
  var g=ctx.createRadialGradient(0,-bh*0.2,len*0.1,0,0,bw);g.addColorStop(0,col.b);g.addColorStop(0.7,col.c);g.addColorStop(1,"rgba(201,143,224,0.35)");
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,bw,bh,0,Math.PI,0);ctx.lineTo(bw,bh*0.12);ctx.quadraticCurveTo(0,bh*0.46,-bw,bh*0.12);ctx.closePath();ctx.fill();
  ctx.strokeStyle=col.glow;ctx.globalAlpha=0.6;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,bw,bh,0,Math.PI,0);ctx.stroke();ctx.globalAlpha=0.5;
  ctx.fillStyle=col.f;for(var d=-1;d<2;d++){ctx.beginPath();ctx.arc(d*bw*0.3,-bh*0.2,len*0.06,0,6.29);ctx.fill();}ctx.globalAlpha=1;ctx.restore();}
function drawOctopus(sx,sy,len,col,dir,phase){ctx.save();ctx.translate(sx,sy);ctx.scale(dir,1);
  ctx.strokeStyle=col.c;ctx.lineWidth=Math.max(3,len*0.12);ctx.lineCap="round";
  for(var i=-3;i<=3;i++){var base=i*len*0.13,sw=Math.sin(phase*2+i*0.8)*len*0.18;ctx.beginPath();ctx.moveTo(base*0.4,len*0.18);ctx.quadraticCurveTo(base-len*0.25+sw,len*0.7,base-len*0.45+sw,len*1.1);ctx.stroke();}
  var g=ctx.createRadialGradient(-len*0.1,-len*0.2,len*0.15,0,0,len);g.addColorStop(0,col.b);g.addColorStop(1,col.c);
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-len*0.05,len*0.6,len*0.7,0,0,6.29);ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(-len*0.22,-len*0.08,len*0.15,0,6.29);ctx.arc(len*0.22,-len*0.08,len*0.15,0,6.29);ctx.fill();
  ctx.fillStyle="#101820";ctx.beginPath();ctx.arc(-len*0.2,-len*0.06,len*0.07,0,6.29);ctx.arc(len*0.24,-len*0.06,len*0.07,0,6.29);ctx.fill();ctx.restore();}
function drawShark(sx,sy,len,col,dir,phase,mouth){var h=len/2.0;ctx.save();ctx.translate(sx,sy);ctx.scale(dir,1);var wig=Math.sin(phase)*0.3;
  ctx.fillStyle=col.c;ctx.beginPath();ctx.moveTo(-len*0.8,0);ctx.lineTo(-len*1.25,-h*1.05*(1+wig*0.3));ctx.lineTo(-len*1.02,-h*0.1);ctx.lineTo(-len*1.18,h*0.7);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(0,-h*0.78);ctx.lineTo(len*0.25,-h*1.5);ctx.lineTo(len*0.4,-h*0.7);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(len*0.2,h*0.4);ctx.lineTo(len*0.05,h*1.05);ctx.lineTo(len*0.5,h*0.6);ctx.closePath();ctx.fill();
  var g=ctx.createLinearGradient(0,-h,0,h);g.addColorStop(0,col.c);g.addColorStop(0.58,col.c);g.addColorStop(0.6,col.b);g.addColorStop(1,col.b);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(len,0);ctx.quadraticCurveTo(len*0.5,-h*0.95,-len*0.6,-h*0.55);ctx.quadraticCurveTo(-len*0.9,0,-len*0.6,h*0.5);ctx.quadraticCurveTo(len*0.5,h*0.85,len,0);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(40,55,65,.45)";ctx.lineWidth=Math.max(1,len*0.02);for(var gi=0;gi<3;gi++){ctx.beginPath();ctx.moveTo(len*0.42-gi*len*0.07,-h*0.28);ctx.lineTo(len*0.42-gi*len*0.07,h*0.28);ctx.stroke();}
  var mo=Math.max(0,Math.min(1,mouth||0));ctx.fillStyle="rgba(30,18,16,.85)";ctx.beginPath();ctx.moveTo(len*0.98,h*0.12);ctx.lineTo(len*0.55,h*0.3+h*0.3*mo);ctx.lineTo(len*0.6,h*0.12);ctx.closePath();ctx.fill();
  ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(len*0.6,-h*0.18,Math.max(2,len*0.05),0,6.29);ctx.fill();ctx.fillStyle="#101820";ctx.beginPath();ctx.arc(len*0.61,-h*0.18,Math.max(1,len*0.026),0,6.29);ctx.fill();ctx.restore();}
function drawWhale(sx,sy,len,col,dir,phase){var h=len/2.1;ctx.save();ctx.translate(sx,sy);ctx.scale(dir,1);var wig=Math.sin(phase)*0.25;
  ctx.fillStyle=col.f;ctx.beginPath();ctx.moveTo(-len*0.75,0);ctx.quadraticCurveTo(-len*1.1,-h*0.5*(1+wig),-len*1.3,-h*0.2);ctx.lineTo(-len*0.95,0);ctx.lineTo(-len*1.3,h*0.2);ctx.quadraticCurveTo(-len*1.1,h*0.5*(1-wig),-len*0.75,0);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(len*0.05,h*0.5);ctx.quadraticCurveTo(-len*0.1,h*1.15,len*0.35,h*0.85);ctx.quadraticCurveTo(len*0.3,h*0.6,len*0.05,h*0.5);ctx.fill();
  var g=ctx.createLinearGradient(0,-h,0,h);g.addColorStop(0,col.c);g.addColorStop(0.58,col.c);g.addColorStop(0.6,col.b);g.addColorStop(1,col.b);
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(len,0);ctx.quadraticCurveTo(len*0.7,-h,-len*0.4,-h*0.85);ctx.quadraticCurveTo(-len*0.85,-h*0.2,-len*0.7,0);ctx.quadraticCurveTo(-len*0.85,h*0.2,-len*0.4,h*0.8);ctx.quadraticCurveTo(len*0.7,h*0.95,len,0);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,.22)";ctx.lineWidth=Math.max(1,len*0.02);for(var i=0;i<4;i++){ctx.beginPath();ctx.moveTo(len*0.6,h*0.2+i*h*0.16);ctx.lineTo(len*0.1,h*0.25+i*h*0.16);ctx.stroke();}
  ctx.fillStyle="#101820";ctx.beginPath();ctx.arc(len*0.62,-h*0.1,Math.max(2,len*0.045),0,6.29);ctx.fill();
  ctx.strokeStyle="rgba(30,40,50,.5)";ctx.lineWidth=Math.max(1.5,len*0.03);ctx.beginPath();ctx.moveTo(len*0.98,h*0.05);ctx.quadraticCurveTo(len*0.7,h*0.22,len*0.4,h*0.18);ctx.stroke();ctx.restore();}
function drawCreature(sx,sy,len,cfg,dir,phase,mouth){
  if(cfg.sp==="lantern")drawLantern(sx,sy,len,cfg,dir,phase,mouth);
  else if(cfg.sp==="jelly")drawJelly(sx,sy,len,cfg,phase);
  else if(cfg.sp==="octopus")drawOctopus(sx,sy,len,cfg,dir,phase);
  else if(cfg.sp==="shark")drawShark(sx,sy,len,cfg,dir,phase,mouth);
  else if(cfg.sp==="whale")drawWhale(sx,sy,len,cfg,dir,phase);
  else drawFish(sx,sy,len,cfg.asp,cfg,dir,cfg.mk,phase,mouth);
}

function drawKelp(sx,sy,sz,ph){var hgt=120*sz;ctx.save();ctx.globalAlpha=0.35;ctx.strokeStyle="#1f5a45";ctx.lineWidth=8*sz;ctx.lineCap="round";
  for(var b=-1;b<2;b++){var ox=b*14*sz,sw=Math.sin(ph+b)*22*sz;ctx.beginPath();ctx.moveTo(sx+ox,sy);ctx.quadraticCurveTo(sx+ox+sw,sy-hgt*0.55,sx+ox+sw*0.4,sy-hgt);ctx.stroke();}ctx.restore();}
function drawRock(sx,sy,sz){ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle="#0b2230";ctx.beginPath();ctx.ellipse(sx,sy,46*sz,26*sz,0,0,6.29);ctx.fill();
  ctx.beginPath();ctx.ellipse(sx-26*sz,sy+6*sz,24*sz,16*sz,0,0,6.29);ctx.fill();ctx.beginPath();ctx.ellipse(sx+30*sz,sy+8*sz,20*sz,14*sz,0,0,6.29);ctx.fill();ctx.restore();}
function drawCoral(sx,sy,sz,ph){ctx.save();ctx.globalAlpha=0.45;ctx.strokeStyle="#7a3b5a";ctx.lineWidth=7*sz;ctx.lineCap="round";
  for(var a=-2;a<3;a++){ctx.beginPath();ctx.moveTo(sx,sy);ctx.quadraticCurveTo(sx+a*14*sz,sy-30*sz,sx+a*22*sz+Math.sin(ph)*4,sy-58*sz);ctx.stroke();}ctx.restore();}
function drawWeed(sx,sy,sz,ph){ctx.save();var gl=ctx.createRadialGradient(sx,sy-18*sz,2,sx,sy-18*sz,30*sz);gl.addColorStop(0,"rgba(120,255,170,.35)");gl.addColorStop(1,"rgba(120,255,170,0)");
  ctx.fillStyle=gl;ctx.beginPath();ctx.arc(sx,sy-18*sz,30*sz,0,6.29);ctx.fill();ctx.strokeStyle="#3fd47e";ctx.lineWidth=5*sz;ctx.lineCap="round";ctx.fillStyle="#54e88f";
  for(var b=-1;b<2;b++){var ox=b*7*sz,sw=Math.sin(ph+b*1.4)*9*sz;ctx.beginPath();ctx.moveTo(sx+ox,sy+6*sz);ctx.quadraticCurveTo(sx+ox+sw,sy-16*sz,sx+ox+sw*0.5,sy-34*sz);ctx.stroke();
    ctx.beginPath();ctx.ellipse(sx+ox+sw*0.5,sy-34*sz,4.5*sz,7*sz,sw*0.02,0,6.29);ctx.fill();}ctx.restore();}
function drawNet(sx,sy,r,p){var closing=p>0.78,col=p<0.5?"#7fe0ff":(p<0.8?"#ffd56b":"#ff5a4d");ctx.save();ctx.globalAlpha=0.9;ctx.strokeStyle=col;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.arc(sx,sy,r,0,6.29);ctx.stroke();ctx.globalAlpha=0.28;ctx.lineWidth=1;
  for(var i=-2;i<=2;i++){var off=i*r*0.4;ctx.beginPath();ctx.moveTo(sx+off,sy-r*0.95);ctx.lineTo(sx+off,sy+r*0.95);ctx.stroke();ctx.beginPath();ctx.moveTo(sx-r*0.95,sy+off);ctx.lineTo(sx+r*0.95,sy+off);ctx.stroke();}
  ctx.globalAlpha=0.95;ctx.lineWidth=4;ctx.beginPath();ctx.arc(sx,sy,r,-1.57,-1.57+6.28*(1-p));ctx.stroke();
  if(closing){ctx.globalAlpha=0.5;ctx.fillStyle="rgba(255,90,77,.25)";ctx.beginPath();ctx.arc(sx,sy,r*(1-(p-0.78)/0.22*0.6),0,6.29);ctx.fill();}ctx.restore();}
function drawTorp(t){var sx=cx+(t.x-player.x),sy=cy+(t.y-player.y),ang=Math.atan2(t.hy,t.hx);ctx.save();ctx.translate(sx,sy);ctx.rotate(ang);
  ctx.fillStyle="rgba(190,225,255,.5)";for(var i=1;i<5;i++){ctx.globalAlpha=0.4/i;ctx.beginPath();ctx.arc(-16-i*9,Math.sin(t.ph+i)*2,3.5,0,6.29);ctx.fill();}ctx.globalAlpha=1;
  ctx.fillStyle="#3a4756";ctx.beginPath();ctx.ellipse(0,0,17,7,0,0,6.29);ctx.fill();ctx.fillStyle="#576a7d";ctx.beginPath();ctx.ellipse(-2,-2,15,3.4,0,0,6.29);ctx.fill();
  ctx.fillStyle="#e7402f";ctx.beginPath();ctx.moveTo(17,0);ctx.lineTo(9,-6.5);ctx.lineTo(9,6.5);ctx.closePath();ctx.fill();
  ctx.fillStyle="#2a333d";ctx.beginPath();ctx.moveTo(-14,-6);ctx.lineTo(-20,-12);ctx.lineTo(-12,-5);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-14,6);ctx.lineTo(-20,12);ctx.lineTo(-12,5);ctx.closePath();ctx.fill();ctx.restore();}

var bub=[];for(var i=0;i<24;i++)bub.push({x:Math.random(),y:Math.random(),r:Math.random()*3+1,s:Math.random()*0.025+0.008});
function drawBg(){var g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#0a3a55");g.addColorStop(0.5,"#072539");g.addColorStop(1,"#03101c");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=0.05;ctx.fillStyle="#bfe9ff";for(var k=0;k<3;k++){var bx=W*(0.2+k*0.3);ctx.beginPath();ctx.moveTo(bx,-20);ctx.lineTo(bx+90,-20);ctx.lineTo(bx+160,H);ctx.lineTo(bx-40,H);ctx.closePath();ctx.fill();}ctx.restore();
  ctx.fillStyle="rgba(180,225,255,.16)";for(var b=0;b<bub.length;b++){var o=bub[b];o.y-=o.s;if(o.y<-0.02){o.y=1.02;o.x=Math.random();}ctx.beginPath();ctx.arc(o.x*W,o.y*H,o.r,0,6.29);ctx.fill();}}
function wrap(it,m){var sx=cx+(it.x-player.x),sy=cy+(it.y-player.y);if(sx<-m)it.x+=W+2*m;else if(sx>W+m)it.x-=W+2*m;if(sy<-m)it.y+=H+2*m;else if(sy>H+m)it.y-=H+2*m;}

function loop(t){
  requestAnimationFrame(loop);if(!last)last=t;var dt=Math.min((t-last)/1000,0.05);last=t;drawBg();
  var play=(state==="play"),m=maxLen()+90,pl=PLEN[level-1],moving=false;

  if(play&&aim.active){var dx=aim.x-cx,dy=aim.y-cy,dist=Math.hypot(dx,dy);
    if(dist>DEAD){var nx=dx/dist,ny=dy/dist;player.x+=nx*SPEED*dt;player.y+=ny*SPEED*dt;player.dir=nx>=0?1:-1;moving=true;}}
  if(play){player.phase+=dt*(moving?9:4);player.bite=Math.max(0,player.bite-dt*3.2);player.up=Math.max(0,player.up-dt*1.7);}

  ctx.fillStyle="rgba(190,230,255,.25)";
  for(var mo=0;mo<motes.length;mo++){var pmo=motes[mo];if(play)pmo.y-=pmo.v*dt;wrap(pmo,30);ctx.beginPath();ctx.arc(cx+(pmo.x-player.x),cy+(pmo.y-player.y),pmo.r,0,6.29);ctx.fill();}
  for(var d=0;d<decor.length;d++){var de=decor[d];if(play)de.ph+=dt*1.5;wrap(de,m);var dsx=cx+(de.x-player.x),dsy=cy+(de.y-player.y);
    if(de.type==="kelp")drawKelp(dsx,dsy,de.sz,de.ph);else if(de.type==="rock")drawRock(dsx,dsy,de.sz);else drawCoral(dsx,dsy,de.sz,de.ph);}
  /* 海藻：定额15，不刷新、不循环 */
  for(var w=0;w<weeds.length;w++){var we=weeds[w];if(play)we.ph+=dt*2.2;drawWeed(cx+(we.x-player.x),cy+(we.y-player.y),we.sz,we.ph);}

  /* NPC 移动 + 可吃鱼遇近躲避 */
  for(var i=0;i<npcs.length;i++){var n=npcs[i];
    if(play){n.phase+=dt*7;n.turn-=dt;
      if(n.turn<=0){var a=Math.atan2(n.vy,n.vx)+rnd(-0.6,0.6),sp=Math.hypot(n.vx,n.vy);n.vx=Math.cos(a)*sp;n.vy=Math.sin(a)*sp;n.turn=rnd(1.2,3.5);}
      if(n.lv<level){var ddx=n.x-player.x,ddy=n.y-player.y,dd=Math.hypot(ddx,ddy);if(dd<160&&dd>1){var fs=n.base*1.25;n.vx=ddx/dd*fs;n.vy=ddy/dd*fs;}}
      n.x+=n.vx*dt;n.y+=n.vy*dt;if(n.vx>0.5)n.dir=1;else if(n.vx<-0.5)n.dir=-1;wrap(n,m);}
    var fc=FISH[n.lv-1];drawCreature(cx+(n.x-player.x),cy+(n.y-player.y),fc.len,fc,n.dir,n.phase,0.08);}

  /* NPC 互食：大吃小 */
  if(play){for(var a1=0;a1<npcs.length;a1++){for(var b1=a1+1;b1<npcs.length;b1++){var A=npcs[a1],B=npcs[b1];if(A.lv===B.lv)continue;
    var dA=FISH[A.lv-1].len,dB=FISH[B.lv-1].len;if(Math.hypot(A.x-B.x,A.y-B.y)<(dA+dB)*0.5){var small=A.lv<B.lv?a1:b1;
      burst(npcs[small].x,npcs[small].y,5,["#bcd6e6","#fff"],90);npcs.splice(small,1);if(npcs.length<NPC_COUNT)npcs.push(makeNpc(false));a1--;break;}}}}

  /* 捕网 3~5 级 */
  if(play&&level>=3&&level<=5){netCD-=dt;if(nets.length<2&&netCD<=0){nets.push(makeNet());netCD=rnd(2.2,3.8);}}
  for(var ni=nets.length-1;ni>=0;ni--){var ne=nets[ni];if(play)ne.t+=dt;var prog=Math.min(1,ne.t/3);drawNet(cx+(ne.x-player.x),cy+(ne.y-player.y),ne.r,prog);
    if(play&&ne.t>=3&&!ne.done){ne.done=true;if(Math.hypot(ne.x-player.x,ne.y-player.y)<ne.r)die("net");else burst(ne.x,ne.y,8,["#9fdfff","#fff"],120);}
    if(ne.done){ne.fade-=dt;if(ne.fade<=0)nets.splice(ni,1);}}

  /* 鱼雷 6 级+，数量随等级 */
  if(play&&level>=6){torpCD-=dt;if(torps.length<torpMax(level)&&torpCD<=0){torps.push(makeTorp());torpCD=rnd(1.1,2.2);}}
  for(var ti=torps.length-1;ti>=0;ti--){var tp=torps[ti];tp.ph+=dt*14;
    if(play){if(!tp.launched){tp.warn-=dt;if(tp.warn<=0)tp.launched=true;}else{tp.x+=tp.hx*tp.sp*dt;tp.y+=tp.hy*tp.sp*dt;tp.trav+=tp.sp*dt;}}
    if(!tp.launched){var blink=0.4+0.4*Math.abs(Math.sin(tp.ph*0.4));ctx.save();ctx.globalAlpha=blink;ctx.strokeStyle="#ff5a4d";ctx.lineWidth=2;ctx.setLineDash([10,8]);
      var ax=cx+(tp.x-player.x),ay=cy+(tp.y-player.y);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(ax+tp.hx*1600,ay+tp.hy*1600);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
    else{drawTorp(tp);if(play&&Math.hypot(tp.x-player.x,tp.y-player.y)<pl*0.5+13)die("torpedo");if(tp.trav>Math.max(W,H)*1.9+500)torps.splice(ti,1);}}

  /* 玩家吃海藻 / 吃鱼 */
  if(play){
    for(var w2=weeds.length-1;w2>=0;w2--){var ew=weeds[w2];if(Math.hypot(ew.x-player.x,ew.y-player.y)<pl*0.55+15){score+=1;player.bite=1;
      burst(ew.x,ew.y,7,["#54e88f","#bfffd9"],150);pop(ew.x,ew.y,"+1","#8effc0");var lvw=false;while(level<10&&score>=THRESH[level-1]){level++;lvw=true;}
      weeds.splice(w2,1);if(lvw)doUpgrade();updateHud();pl=PLEN[level-1];}}
    for(var j=npcs.length-1;j>=0;j--){var e2=npcs[j];var hit=(pl+FISH[e2.lv-1].len)*0.6;if(Math.hypot(e2.x-player.x,e2.y-player.y)<hit){
      if(e2.lv<level){score+=e2.lv;player.bite=1;burst(e2.x,e2.y,12,["#cfe6ff","#fff","#9fd0ff"],190);pop(e2.x,e2.y,"+"+e2.lv,"#ffe79a");
        var lu=false;while(level<10&&score>=THRESH[level-1]){level++;lu=true;}npcs.splice(j,1);if(npcs.length<NPC_COUNT)npcs.push(makeNpc(true));if(lu)doUpgrade();updateHud();pl=PLEN[level-1];}
      else if(e2.lv>level)die("fish",e2);}}
  }

  /* 玩家本体 + 死亡动画 */
  var ps=1;
  if(state==="dying"){dieT+=dt;ps=Math.max(0,1-dieT/0.7);
    if(deathCause==="fish"&&deadFish){deadFish.x+=(player.x-deadFish.x)*Math.min(1,dt*5);deadFish.y+=(player.y-deadFish.y)*Math.min(1,dt*5);deadFish.dir=(player.x>=deadFish.x)?1:-1;
      var dfc=FISH[deadFish.lv-1];drawCreature(cx+(deadFish.x-player.x),cy+(deadFish.y-player.y),dfc.len,dfc,deadFish.dir,player.phase,Math.min(1,dieT*2));}
    if(deathCause==="net"){var rr=(pl*2.4)*Math.max(0,1-dieT/0.8);drawNet(cx,cy,Math.max(8,rr),1);}
    if(deathCause==="fish"&&dieT<0.4&&Math.random()<0.6)burst(player.x,player.y,4,["#ff7a6b","#ffd0c8","#bfe9ff"],160);
    if(dieT>=0.9)gameOver();}
  if(state!=="over"&&ps>0.02){
    if(player.up>0){ctx.save();var ring=(1-player.up)*pl*2.4+pl;ctx.globalAlpha=player.up*0.7;ctx.strokeStyle="#ffe79a";ctx.lineWidth=4;ctx.beginPath();ctx.arc(cx,cy,ring,0,6.29);ctx.stroke();ctx.restore();}
    drawFish(cx,cy,pl*ps,PASP,PCOL,player.dir,PMK,player.phase,0.1+player.bite*0.75);}

  for(var pi=parts.length-1;pi>=0;pi--){var pp=parts[pi];pp.life-=dt;if(pp.life<=0){parts.splice(pi,1);continue;}pp.x+=pp.vx*dt;pp.y+=pp.vy*dt;pp.vy+=40*dt;
    ctx.globalAlpha=Math.max(0,pp.life/pp.max);ctx.fillStyle=pp.col;ctx.beginPath();ctx.arc(cx+(pp.x-player.x),cy+(pp.y-player.y),pp.r,0,6.29);ctx.fill();ctx.globalAlpha=1;}
  ctx.textAlign="center";ctx.font="bold 16px -apple-system,sans-serif";
  for(var qi=pops.length-1;qi>=0;qi--){var q=pops[qi];q.life-=dt;q.y-=26*dt;if(q.life<=0){pops.splice(qi,1);continue;}
    ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.col;ctx.fillText(q.txt,cx+(q.x-player.x),cy+(q.y-player.y));ctx.globalAlpha=1;}
  ctx.textAlign="start";
}
function doUpgrade(){player.up=1;pop(player.x,player.y-PLEN[level-1]-14,"升级! Lv."+level,"#ffe79a");burst(player.x,player.y,16,["#ffe79a","#fff","#8effc0"],200);
  if(level<10){for(var k=0;k<2;k++){var tl=Math.min(10,level+1+Math.floor(Math.random()*3));npcs.push(makeNpc(false,tl));}}}

resize();reset();requestAnimationFrame(loop);
})();
