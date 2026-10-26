import { COLORS, LENGTH, advance, standings, pickupPosition, type Room, type Player } from "./game";
import { CATS, validCat, type CatSkin } from "./cats";
type Sprite = { x:number;y:number;w:number;h:number };
export type GameArt = { skins: Record<CatSkin,{image:HTMLImageElement;frames:Sprite[]}>; wall: HTMLImageElement; cat: HTMLImageElement; props: HTMLImageElement; boosts: HTMLImageElement; boostFrames: Sprite[]; catFrames: Sprite[]; propFrames: Sprite[] };
type Art = GameArt;
function load(src:string):Promise<HTMLImageElement> { return new Promise((resolve,reject)=>{ const im=new Image(); im.onload=()=>resolve(im); im.onerror=()=>reject(new Error(`Could not load ${src}`)); im.src=src; }); }
function frames(im:HTMLImageElement,columns=4,rows=3):Sprite[] {
  const c=document.createElement("canvas");c.width=im.width;c.height=im.height;
  const ctx=c.getContext("2d")!;ctx.drawImage(im,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data;
  return Array.from({length:columns*rows},(_,i)=>{
    const cw=im.width/columns,x0=Math.round((i%columns)*cw),x1=Math.round((i%columns+1)*cw),y0=Math.round(Math.floor(i/columns)*im.height/rows),y1=Math.round((Math.floor(i/columns)+1)*im.height/rows);
    let left=x1-1,right=x0,top=y1-1,bottom=y0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*im.width+x)*4+3]>35){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    return {x:left,y:top,w:Math.max(1,right-left+1),h:Math.max(1,bottom-top+1)};
  });
}
export async function loadArt():Promise<Art> {
  const [wall,cat,props,boosts]=await Promise.all([load("/assets/alley-background.jpg"),load("/assets/kitty-sheet.png"),load("/assets/props-sheet.png"),load("/assets/boosts-sheet.png")]);
  const variants=await Promise.all(CATS.map(async variant=>{const image=variant.id==="ginger"?cat:await load(variant.asset);return [variant.id,{image,frames:frames(image)}] as const;}));
  const skins=Object.fromEntries(variants) as GameArt["skins"];
  return {skins,wall,cat,props,boosts,boostFrames:frames(boosts,4,2),catFrames:frames(cat),propFrames:frames(props)};
}
function sprite(ctx:CanvasRenderingContext2D,im:HTMLImageElement,frame:Sprite,x:number,baseline:number,width:number,height:number) {
  const scale=Math.min(width/frame.w,height/frame.h);
  ctx.drawImage(im,frame.x,frame.y,frame.w,frame.h,x-frame.w*scale/2,baseline-frame.h*scale,frame.w*scale,frame.h*scale);
}
function tile(ctx:CanvasRenderingContext2D,im:HTMLImageElement,sy:number,sh:number,y:number,h:number,offset:number,w:number) {
  const tw=1280*h/sh, off=((offset%tw)+tw)%tw;
  for(let x=-off;x<w;x+=tw)ctx.drawImage(im,0,sy,1280,sh,x,y,tw+1,h);
}
export function drawRace(canvas:HTMLCanvasElement,room:Room,focusId:string,art:Art,now:number,compact=false,tutorial=false) {
  const box=canvas.getBoundingClientRect(), dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(box.width*dpr)||canvas.height!==Math.round(box.height*dpr)){canvas.width=Math.round(box.width*dpr);canvas.height=Math.round(box.height*dpr);}
  const ctx=canvas.getContext("2d")!; ctx.setTransform(dpr,0,0,dpr,0,0);
  const w=box.width,h=box.height; if(!w||!h)return;
  ctx.imageSmoothingEnabled=false;
  const me=room.players.find(p=>p.id===focusId)||room.players[0];
  const scale=Math.min(1.25,Math.max(.58,w/1000));
  const decorativeTime=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:now;
  const ground=h*.79, anchor=w*.24, camera=me.x;
  ctx.fillStyle="#20242a";ctx.fillRect(0,0,w,h);
  tile(ctx,art.wall,0,505,0,ground,camera*.34*scale,w);
  tile(ctx,art.wall,505,215,ground,h-ground,camera*scale,w);
  const shade=ctx.createLinearGradient(0,0,0,h);shade.addColorStop(0,"rgba(9,16,23,.5)");shade.addColorStop(.7,"rgba(20,27,31,.02)");shade.addColorStop(1,"rgba(9,16,23,.3)");ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  // Wall-mounted decorations travel at a different speed from the running surface.
  const decorOffset=camera*.52;
  for(let n=Math.floor((decorOffset-anchor/scale)/340)-1;n<(decorOffset+(w-anchor)/scale)/340+2;n++){
    const x=anchor+(n*340-decorOffset)*scale;
    const index=((n%4)+4)%4+4;
    const sway=index===5?Math.sin(decorativeTime/950+n)*2:0;
    sprite(ctx,art.props,art.propFrames[index],x+sway,index===5?ground+8*scale:ground-54*scale,index===6?120*scale:90*scale,index===7?230*scale:155*scale);
    if(index===4){const glow=ctx.createRadialGradient(x,ground-125*scale,0,x,ground-125*scale,95*scale);glow.addColorStop(0,"rgba(255,181,74,.12)");glow.addColorStop(1,"rgba(255,181,74,0)");ctx.fillStyle=glow;ctx.fillRect(x-100*scale,ground-225*scale,200*scale,200*scale);}
  }
  const sx=(x:number)=>anchor+(x-camera)*scale;
  for(const ob of room.course.obstacles) {
    const x=sx(ob.x);if(x< -90 ||x>w+90)continue;
    const frame=art.propFrames[ob.kind],width=(ob.w??70)*scale,height=ob.h*scale;
    ctx.drawImage(art.props,frame.x,frame.y,frame.w,frame.h,x-width/2,ground+7*scale-height,width,height);
  }
  for(const obj of room.course.pickups){
    const position=pickupPosition(obj,room.tick),x=sx(position.x);
    if(x< -80||x>w+80||me.collected.includes(obj.id))continue;
    const index=(obj.kind==="mouse"?0:4)+(Math.floor(now/(obj.kind==="mouse"?85:115))%4);
    const y=obj.kind==="mouse"?ground+5*scale:ground-position.y*scale;
    ctx.save();ctx.translate(x,y);ctx.scale(position.facing,1);ctx.shadowColor="#e6bb67";ctx.shadowBlur=7;
    sprite(ctx,art.boosts,art.boostFrames[index],0,0,52*scale,45*scale);ctx.restore();
    ctx.fillStyle="#f7da8e";ctx.font=`${Math.round(12*scale)}px monospace`;ctx.textAlign="center";ctx.fillText("+",x,y-48*scale);
  }
  const finishX=sx(LENGTH);
  if(finishX<w+150&&finishX> -150){
    ctx.fillStyle="#e5bd6f";ctx.fillRect(finishX,ground-230*scale,5*scale,240*scale);
    for(let row=0;row<3;row++)for(let col=0;col<5;col++){ctx.fillStyle=(row+col)%2?"#202529":"#f3e4c2";ctx.fillRect(finishX+5*scale+col*15*scale,ground-230*scale+row*15*scale,15*scale,15*scale);}
    ctx.fillStyle="#f6d88b";ctx.font=`bold ${16*scale}px Georgia`;ctx.textAlign="center";ctx.fillText("FINISH",finishX+43*scale,ground-244*scale);
  }
  const racers=[...room.players.filter(p=>!p.left&&p.id!==focusId),me];
  for(const p of racers){
    const x=sx(p.x);if(x< -120||x>w+120)continue;
    const mine=p.id===focusId;ctx.save();if(!mine)ctx.globalAlpha=.63;
    let frame=room.startAt>now?8:p.finish!==null?9:room.tick<p.slowUntil?10:room.tick<p.grabUntil?7:p.y>8?5:Math.floor(now/(room.tick<p.boostUntil?65:90))%4;
    const y=ground-p.y*scale;
    ctx.fillStyle="rgba(0,0,0,.27)";ctx.beginPath();ctx.ellipse(x,ground+6*scale,36*scale,7*scale,0,0,Math.PI*2);ctx.fill();
    if(room.tick<p.boostUntil){ctx.fillStyle="rgba(255,215,112,.4)";for(let j=0;j<4;j++)ctx.fillRect(x-65*scale-j*15*scale,y-20*scale-j*12*scale,15*scale,2*scale);}
    const appearance=art.skins[validCat(p.skin)];
    sprite(ctx,appearance.image,appearance.frames[frame],x,y+7*scale,115*scale,94*scale);
    ctx.fillStyle=p.color;ctx.fillRect(x-24*scale,y-110*scale,48*scale,3*scale);
    ctx.font=`bold ${Math.max(11,12*scale)}px system-ui`;ctx.textAlign="center";ctx.fillStyle=mine?"#fff1c9":p.color;ctx.fillText(mine?`${p.name} · YOU`:p.name,x,y-119*scale);
    ctx.restore();
  }
  // Foreground leaves drift independently while the whole scene moves forward.
  for(let j=0;j<7;j++){
    const x=((j*197-camera*1.13*scale-decorativeTime*.012)%(w+80)+(w+80))%(w+80)-40;
    const y=ground+25+Math.sin(decorativeTime/700+j)*14;
    sprite(ctx,art.props,art.propFrames[11],x,y,16+4*(j%3),16);
  }
  if(tutorial)return;
  const rank=standings(room).findIndex(p=>p.id===me.id)+1;
  ctx.textAlign="left";ctx.fillStyle="rgba(12,22,27,.8)";ctx.fillRect(15,15,compact?175:215,compact?52:64);
  ctx.fillStyle="#edc77e";ctx.font=`bold ${compact?18:24}px Georgia`;ctx.fillText(`${rank} / ${room.players.length}`,28,compact?39:46);
  ctx.font="11px system-ui";ctx.fillStyle="#d5d9d2";ctx.fillText(`${Math.max(0,Math.ceil((LENGTH-me.x)/10))} m to the crown`,28,compact?57:65);
  const progress=Math.min(1,me.x/LENGTH);
  ctx.fillStyle="rgba(10,19,24,.8)";ctx.fillRect(w*.3,23,w*.45,7);ctx.fillStyle=me.color;ctx.fillRect(w*.3,23,w*.45*progress,7);
  if(now<room.startAt){
    ctx.fillStyle="rgba(9,18,22,.45)";ctx.fillRect(0,0,w,h);
    ctx.textAlign="center";ctx.fillStyle="#f4d28d";ctx.font=`bold ${Math.min(100,h*.28)}px Georgia`;ctx.fillText(String(Math.ceil((room.startAt-now)/1000)),w/2,h*.48);
    ctx.font="16px system-ui";ctx.fillText("Get your paws ready",w/2,h*.58);
  }
  if(me.finish!==null){ctx.textAlign="center";ctx.fillStyle="rgba(12,22,27,.9)";ctx.fillRect(w/2-155,h*.32,310,76);ctx.fillStyle="#f3d38a";ctx.font="bold 24px Georgia";ctx.fillText("Across the line!",w/2,h*.32+31);ctx.font="14px system-ui";ctx.fillText(`${(Math.round(me.finish)/1000).toFixed(2)} seconds`,w/2,h*.32+56);}
}
