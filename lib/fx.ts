// @ts-nocheck — canvas effects ported as-is from the single-file version
/* Fireflies drifting behind the page, and spark bursts for correct answers. */
import { prefersReducedMotion } from "./util";

let fxCv=null;
const sparks=[];
export function burst(x,y,n=24,kind="bright"){
  if(prefersReducedMotion()||!fxCv)return;
  for(let i=0;i<n;i++){const a=Math.random()*6.283,s=(kind==="soft"?.6:1.2)+Math.random()*(kind==="soft"?1.6:3.4);
    sparks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(kind==="soft"?.4:1.2),life:1,decay:.012+Math.random()*.02,r:.8+Math.random()*2,
      hue:Math.random()<.25?"233,169,75":Math.random()<.5?"190,255,225":"255,255,245"});}
  kickFx();
}
export function celebrate(){ if(prefersReducedMotion())return; let k=0; const iv=setInterval(()=>{burst(innerWidth*(.2+Math.random()*.6),innerHeight*(.35+Math.random()*.4),28);if(++k>5)clearInterval(iv);},180); }
let fxRAF=0;
function kickFx(){ if(!fxRAF) fxRAF=requestAnimationFrame(fxLoop); }
function fxLoop(){
  const cv=fxCv,ctx=cv.getContext("2d"),d=Math.min(2,devicePixelRatio||1);
  if(cv.width!==innerWidth*d||cv.height!==innerHeight*d){cv.width=innerWidth*d;cv.height=innerHeight*d;}
  ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);ctx.globalCompositeOperation="lighter";
  for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vx*=.965;s.vy=s.vy*.965-.015;s.life-=s.decay;
    if(s.life<=0){sparks.splice(i,1);continue;}
    const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*5);g.addColorStop(0,`rgba(${s.hue},${s.life})`);g.addColorStop(1,`rgba(${s.hue},0)`);
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,s.r*5,0,6.283);ctx.fill();}
  fxRAF=sparks.length?requestAnimationFrame(fxLoop):0;
  if(!fxRAF)ctx.clearRect(0,0,innerWidth,innerHeight);
}
export function startAmbient(cv, fxCanvas){
  fxCv=fxCanvas;

  const REDUCE=prefersReducedMotion();
  const ctx=cv.getContext("2d");let W,H,d,flies=[];
  let mx=-999,my=-999;
  const onMove=e=>{mx=e.clientX;my=e.clientY;document.body.style.setProperty("--mx",mx+"px");document.body.style.setProperty("--my",my+"px");};
  addEventListener("pointermove",onMove,{passive:true});
  function size(){d=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*d;cv.height=H*d;
    const n=Math.round(Math.min(70,W*H/26000));
    flies=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:-.05-Math.random()*.2,r:.5+Math.random()*1.5,ph:Math.random()*6.28,sp:.4+Math.random()*1.2,warm:Math.random()<.18}));}
  size(); addEventListener("resize",size);
  function frame(t){
    ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,W,H);
    for(const f of flies){
      if(!REDUCE){
        f.vx+=(Math.sin(t/1800+f.ph)*.006); f.vy+=(Math.cos(t/2300+f.ph)*.004);
        const dx=f.x-mx,dy=f.y-my,dist=Math.hypot(dx,dy);
        if(dist<120){f.vx+=dx/dist*.05;f.vy+=dy/dist*.05;}
        f.vx*=.985;f.vy=f.vy*.985-.002; f.x+=f.vx; f.y+=f.vy;
        if(f.y<-10){f.y=H+10;f.x=Math.random()*W;} if(f.x<-10)f.x=W+10; if(f.x>W+10)f.x=-10; if(f.y>H+10)f.y=-10;
      }
      const tw=REDUCE?.6:Math.pow(Math.abs(Math.sin(t/1000*f.sp+f.ph)),3);
      const a=.12+tw*.7, col=f.warm?"233,169,75":"210,255,235";
      const g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,f.r*6);g.addColorStop(0,`rgba(${col},${a})`);g.addColorStop(.3,`rgba(${col},${a*.35})`);g.addColorStop(1,`rgba(${col},0)`);
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,f.r*6,0,6.283);ctx.fill();
    }
    if(!REDUCE)raf=requestAnimationFrame(frame);
  }
  let raf=requestAnimationFrame(frame);
  return ()=>{cancelAnimationFrame(raf);removeEventListener("resize",size);removeEventListener("pointermove",onMove);};
}

