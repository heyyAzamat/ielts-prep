// @ts-nocheck — canvas drawing code ported as-is from the single-file version
/* Night garden: procedural flowers drawn on a canvas, pre-rendered as sprites and swayed every frame. */
import { prefersReducedMotion } from "./util";

export function startGarden(cv: HTMLCanvasElement): () => void {
  let gardenRAF=0;
  const ctx=cv.getContext("2d"); const reduce=prefersReducedMotion();
  let W,H,SD,seed,bg,fg,plants,motes;
  const R=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  const rr=(a,b)=>a+R()*(b-a);
  const TAU=Math.PI*2;
  function spr(w,h,draw,blur=0){const c=document.createElement("canvas");c.width=Math.ceil(w*SD);c.height=Math.ceil(h*SD);const x=c.getContext("2d");x.scale(SD,SD);if(blur)x.filter=`blur(${blur}px)`;draw(x,w,h);return c;}
  const rgba=(c,a)=>`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;

  /* ---- flower sprites ---- */
  function daisy(r,{tilt=.7,petal=[244,242,232],disc=[236,176,52],n=0,blur=0,thin=.14}={}){
    const S=r*2.5; n=n||Math.round(rr(16,26));
    return {c:spr(S,S,(x)=>{
      x.translate(S/2,S/2);
      // тень под цветком
      const sh=x.createRadialGradient(0,r*.15,0,0,r*.15,r*1.1);sh.addColorStop(0,"rgba(0,0,0,.35)");sh.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=sh;x.beginPath();x.ellipse(0,r*.15,r*1.1,r*1.1*tilt,0,0,TAU);x.fill();
      x.scale(1,tilt);
      const order=[...Array(n).keys()].sort((a,b)=>Math.sin(a/n*TAU)-Math.sin(b/n*TAU));
      for(const i of order){
        const a=i/n*TAU+rr(-.08,.08), L=r*rr(.78,1.04), wdt=r*thin*rr(.8,1.25), front=Math.sin(a);
        x.save();x.rotate(a);
        const g=x.createLinearGradient(r*.22,0,L,0);
        const k=.78+front*.12;
        g.addColorStop(0,rgba(petal.map(v=>v*.55),1));g.addColorStop(.35,rgba(petal.map(v=>v*k),1));g.addColorStop(1,rgba(petal.map(v=>Math.min(255,v*(k+.12))),1));
        x.fillStyle=g;
        x.beginPath();x.moveTo(r*.2,0);
        x.bezierCurveTo(r*.35,-wdt,L*.85,-wdt*1.05,L,-wdt*.15);
        x.quadraticCurveTo(L*1.01,0,L,wdt*.15);
        x.bezierCurveTo(L*.85,wdt*1.05,r*.35,wdt,r*.2,0);x.fill();
        x.strokeStyle=rgba(petal.map(v=>v*.6),.35);x.lineWidth=.5;
        x.beginPath();x.moveTo(r*.3,0);x.lineTo(L*.92,0);x.stroke();
        x.beginPath();x.moveTo(r*.35,-wdt*.35);x.quadraticCurveTo(L*.6,-wdt*.5,L*.9,-wdt*.25);x.stroke();
        x.restore();
      }
      // диск из соцветий (филлотаксис)
      const rd=r*.28;
      const dg=x.createRadialGradient(-rd*.3,-rd*.4,0,0,0,rd*1.1);
      dg.addColorStop(0,rgba(disc.map(v=>Math.min(255,v*1.25)),1));dg.addColorStop(.7,rgba(disc,1));dg.addColorStop(1,rgba(disc.map(v=>v*.45),1));
      x.fillStyle=dg;x.beginPath();x.arc(0,0,rd,0,TAU);x.fill();
      const N=Math.round(rd*rd*.9);
      for(let k=0;k<N;k++){const ang=k*2.39996,rad=rd*Math.sqrt(k/N)*.95;const px=Math.cos(ang)*rad,py=Math.sin(ang)*rad;
        const lum=1.15-(py/rd)*.35-(rad/rd)*.25;x.fillStyle=rgba(disc.map(v=>Math.min(255,v*lum)),.9);x.beginPath();x.arc(px,py,Math.max(.45,rd*.07),0,TAU);x.fill();
        x.fillStyle="rgba(60,30,0,.35)";x.beginPath();x.arc(px+.3,py+.3,Math.max(.2,rd*.025),0,TAU);x.fill();}
    },blur),ax:S/2,ay:S/2,r};
  }
  function cosmos(r,{tilt=.75,col=[226,190,205],blur=0,n=0}={}){
    const S=r*2.5; n=n||Math.round(rr(5,8));
    return {c:spr(S,S,(x)=>{
      x.translate(S/2,S/2);x.scale(1,tilt);
      for(let i=0;i<n;i++){
        const a=i/n*TAU+rr(-.1,.1), L=r*rr(.85,1.02), wd=r*rr(.34,.44);
        x.save();x.rotate(a);
        const g=x.createRadialGradient(0,0,r*.1,0,0,L);
        g.addColorStop(0,rgba(col.map(v=>v*.45),1));g.addColorStop(.3,rgba(col.map(v=>v*.85),1));g.addColorStop(1,rgba(col.map(v=>Math.min(255,v*1.08)),1));
        x.fillStyle=g;x.beginPath();x.moveTo(0,0);
        x.bezierCurveTo(L*.3,-wd*.9,L*.95,-wd,L,-wd*.35);
        x.lineTo(L*.93,-wd*.12);x.lineTo(L*1.0,0);x.lineTo(L*.93,wd*.12);x.lineTo(L,wd*.35);
        x.bezierCurveTo(L*.95,wd,L*.3,wd*.9,0,0);x.fill();
        x.strokeStyle=rgba(col.map(v=>v*.55),.3);x.lineWidth=.4;
        for(let v=-2;v<=2;v++){x.beginPath();x.moveTo(r*.15,0);x.quadraticCurveTo(L*.5,v*wd*.18,L*.92,v*wd*.28);x.stroke();}
        x.restore();
      }
      const rd=r*.2;x.fillStyle="#3a2a0c";x.beginPath();x.arc(0,0,rd,0,TAU);x.fill();
      for(let k=0;k<40;k++){const a=R()*TAU,d=Math.sqrt(R())*rd;x.fillStyle=R()<.5?"#f0c040":"#c88a20";x.beginPath();x.arc(Math.cos(a)*d,Math.sin(a)*d,r*.03,0,TAU);x.fill();}
    },blur),ax:S/2,ay:S/2,r};
  }
  function umbel(r,{col=[238,240,228],blur=0}={}){
    const S=r*2.6, oy=r*1.9;
    return {c:spr(S,S,(x)=>{
      x.translate(S/2,oy);
      const rays=Math.round(rr(12,20));
      const pts=[];
      for(let i=0;i<rays;i++){const a=rr(0,TAU),d=Math.sqrt(R())*r;pts.push({x:Math.cos(a)*d,y:-r*.95+Math.sin(a)*d*.38-(1-d/r)*r*.18,z:Math.sin(a)});}
      pts.sort((a,b)=>a.z-b.z);
      for(const p of pts){
        x.strokeStyle=rgba([150,170,130],.55);x.lineWidth=.55;
        x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(p.x*.3,p.y*.7,p.x,p.y);x.stroke();
        const n=Math.round(rr(10,18)), ur=r*rr(.16,.24);
        for(let k=0;k<n;k++){const a=rr(0,TAU),d=Math.sqrt(R())*ur;const fx=p.x+Math.cos(a)*d,fy=p.y+Math.sin(a)*d*.55-(1-d/ur)*ur*.25;
          x.strokeStyle=rgba([150,170,130],.35);x.lineWidth=.3;x.beginPath();x.moveTo(p.x,p.y+ur*.2);x.lineTo(fx,fy);x.stroke();
          const l=.75+.25*(p.z+1)/2;
          x.fillStyle=rgba(col.map(v=>v*l),.95);x.beginPath();x.arc(fx,fy,r*rr(.028,.045),0,TAU);x.fill();
          if(R()<.4){x.fillStyle="rgba(255,255,255,.9)";x.beginPath();x.arc(fx-.2,fy-.2,r*.015,0,TAU);x.fill();}
        }
      }
    },blur),ax:S/2,ay:oy,r};
  }
  function clock(r,{blur=0}={}){
    const S=r*2.8;
    return {c:spr(S,S,(x)=>{
      x.translate(S/2,S/2);
      const gl=x.createRadialGradient(0,0,0,0,0,r*1.35);gl.addColorStop(0,"rgba(255,255,255,.16)");gl.addColorStop(1,"rgba(255,255,255,0)");x.fillStyle=gl;x.beginPath();x.arc(0,0,r*1.35,0,TAU);x.fill();
      const N=Math.round(rr(110,160));
      const pts=[];for(let i=0;i<N;i++){const y=1-(i+.5)/N*2,rad=Math.sqrt(1-y*y),th=i*2.39996;pts.push([Math.cos(th)*rad,y,Math.sin(th)*rad]);}
      pts.sort((a,b)=>a[2]-b[2]);
      for(const [px,py,pz] of pts){
        if(py>.82&&R()<.6)continue;
        const a=.18+.55*(pz+1)/2, ex=px*r, ey=py*r;
        x.strokeStyle=`rgba(235,238,230,${a*.7})`;x.lineWidth=.35;
        x.beginPath();x.moveTo(px*r*.18,py*r*.18);x.lineTo(ex*.8,ey*.8);x.stroke();
        x.fillStyle=`rgba(120,100,70,${a})`;x.beginPath();x.arc(px*r*.2,py*r*.2,.55,0,TAU);x.fill();
        const L=r*.2;x.strokeStyle=`rgba(250,250,245,${a})`;
        for(let k=0;k<8;k++){const an=k/8*TAU+px;x.beginPath();x.moveTo(ex*.8,ey*.8);x.lineTo(ex*.8+Math.cos(an)*L*(.5+.5*Math.abs(Math.cos(an))),ey*.8+Math.sin(an)*L*.6);x.stroke();}
      }
      x.fillStyle="#6b6048";x.beginPath();x.arc(0,0,r*.13,0,TAU);x.fill();
    },blur),ax:S/2,ay:S/2,r};
  }
  function marigold(r,{blur=0,col=[236,140,40]}={}){
    const S=r*2.4;
    return {c:spr(S,S,(x)=>{
      x.translate(S/2,S/2);x.scale(1,.8);
      for(let ring=3;ring>=1;ring--){
        const n=10+ring*4, L=r*ring/3;
        for(let i=0;i<n;i++){const a=i/n*TAU+ring*.3+rr(-.1,.1);x.save();x.rotate(a);
          const k=.55+ .25*(3-ring)/2+rr(0,.15);
          const g=x.createLinearGradient(0,0,L,0);g.addColorStop(0,rgba(col.map(v=>v*.4),1));g.addColorStop(1,rgba(col.map(v=>Math.min(255,v*(k+.35))),1));
          x.fillStyle=g;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(L*.5,-r*.2,L,-r*.07);
          x.arc(L,0,r*.08,-Math.PI/2,Math.PI/2);x.quadraticCurveTo(L*.5,r*.2,0,0);x.fill();x.restore();}
      }
      x.fillStyle=rgba(col.map(v=>v*.35),1);x.beginPath();x.arc(0,0,r*.14,0,TAU);x.fill();
    },blur),ax:S/2,ay:S/2,r};
  }
  function starflower(r,{blur=0}={}){ // эдельвейс
    const S=r*2.5;
    return {c:spr(S,S,(x)=>{
      x.translate(S/2,S/2);x.scale(1,.8);
      const n=Math.round(rr(8,12));
      for(let i=0;i<n;i++){const a=i/n*TAU+rr(-.12,.12),L=r*rr(.7,1);x.save();x.rotate(a);
        const g=x.createLinearGradient(0,0,L,0);g.addColorStop(0,"rgba(150,160,145,1)");g.addColorStop(1,"rgba(238,240,232,1)");
        x.fillStyle=g;x.beginPath();x.moveTo(0,-r*.05);x.quadraticCurveTo(L*.45,-r*.2,L,0);x.quadraticCurveTo(L*.45,r*.2,0,r*.05);x.fill();
        for(let k=0;k<14;k++){x.fillStyle="rgba(255,255,255,.35)";x.beginPath();x.arc(rr(r*.1,L*.9),rr(-r*.06,r*.06),rr(.3,.8),0,TAU);x.fill();}
        x.restore();}
      for(let k=0;k<30;k++){const a=R()*TAU,d=Math.sqrt(R())*r*.2;x.fillStyle=R()<.5?"#cfd2bf":"#e8e6d6";x.beginPath();x.arc(Math.cos(a)*d,Math.sin(a)*d,rr(.8,1.6),0,TAU);x.fill();}
    },blur),ax:S/2,ay:S/2,r};
  }
  function spike(h,{col=[150,130,190],blur=0}={}){ // вероника / лаванда
    const S=h*.34, Hh=h*1.05;
    return {c:spr(S,Hh,(x)=>{
      x.translate(S/2,Hh);
      for(let k=0;k<70;k++){const t=k/70, y=-t*h, w=S*.28*(1-t*.7);
        const px=rr(-w,w);const l=.55+.45*(1-Math.abs(px)/(w+1))*(1-t*.3);
        x.fillStyle=rgba(col.map(v=>Math.min(255,v*l*(1+t*.25))),.95);x.beginPath();x.ellipse(px,y,rr(1,2.2)*(1-t*.4),rr(1.3,2.6)*(1-t*.4),rr(0,3),0,TAU);x.fill();}
    },blur),ax:S/2,ay:Hh,r:h};
  }
  function glowSprite(r){return spr(r*2,r*2,(x)=>{const g=x.createRadialGradient(r,r,0,r,r,r);g.addColorStop(0,"rgba(255,255,240,.5)");g.addColorStop(.4,"rgba(220,255,230,.15)");g.addColorStop(1,"rgba(220,255,230,0)");x.fillStyle=g;x.fillRect(0,0,r*2,r*2);});}

  /* ---- leaves & grass (drawn) ---- */
  function blade(x,bx,by,len,wid,bend,col,a){
    const tx=bx+bend, ty=by-len;
    const g=x.createLinearGradient(bx,by,tx,ty);g.addColorStop(0,rgba(col.map(v=>v*.35),a));g.addColorStop(.6,rgba(col,a));g.addColorStop(1,rgba(col.map(v=>Math.min(255,v*1.35)),a));
    x.fillStyle=g;x.beginPath();x.moveTo(bx-wid,by);x.quadraticCurveTo(bx-wid*.4+bend*.35,by-len*.55,tx,ty);x.quadraticCurveTo(bx+wid*.4+bend*.4,by-len*.5,bx+wid,by);x.closePath();x.fill();
  }
  function leaf(x,bx,by,len,wid,ang,col,a){
    x.save();x.translate(bx,by);x.rotate(ang);
    const g=x.createLinearGradient(0,-wid,0,wid);g.addColorStop(0,rgba(col.map(v=>Math.min(255,v*1.3)),a));g.addColorStop(.5,rgba(col,a));g.addColorStop(1,rgba(col.map(v=>v*.45),a));
    x.fillStyle=g;x.beginPath();x.moveTo(0,0);x.bezierCurveTo(len*.3,-wid,len*.75,-wid*.8,len,0);x.bezierCurveTo(len*.75,wid*.7,len*.3,wid,0,0);x.fill();
    x.strokeStyle=rgba(col.map(v=>Math.min(255,v*1.5)),a*.45);x.lineWidth=.6;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(len*.5,-wid*.1,len*.95,0);x.stroke();
    for(let k=1;k<5;k++){const t=k/5;x.beginPath();x.moveTo(len*t,-wid*.05);x.lineTo(len*(t+.1),-wid*.55*(1-t*.5));x.moveTo(len*t,0);x.lineTo(len*(t+.1),wid*.5*(1-t*.5));x.stroke();}
    x.restore();
  }
  function fern(x,bx,by,len,ang,col,a){
    x.save();x.translate(bx,by);x.rotate(ang);
    x.strokeStyle=rgba(col,a);x.lineWidth=1;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(len*.5,-len*.08,len,len*.05);x.stroke();
    for(let k=2;k<22;k++){const t=k/22, px=len*t, py=-len*.08*Math.sin(t*Math.PI)+len*.05*t*t, L=len*.2*(1-t)*(1-t*.2)+2;
      leaf(x,px,py,L,L*.22,-1.0-t*.2,col,a);leaf(x,px,py,L,L*.22,1.0+t*.2,col.map(v=>v*.8),a);}
    x.restore();
  }

  /* ---- scene ---- */
  function build(){
    SD=Math.min(2,devicePixelRatio||1); W=cv.clientWidth; H=cv.clientHeight; cv.width=W*SD; cv.height=H*SD; seed=11;
    const LX=W/2, LY=H*.8;
    const lit=(px,py)=>Math.max(0,1-Math.hypot((px-LX)*.9,(py-LY)*1.4)/(Math.max(W,700)*.55));
    const profile=x=>{const e=Math.abs(x/W-.5)*2;return .1+Math.pow(e,1.4)*.42+.05*Math.sin(x*.013);}; // высота растительности

    /* статичный фон */
    bg=spr(W,H,(x)=>{
      // туманная поляна
      for(let i=0;i<140;i++){const px=LX+rr(-W*.28,W*.28),py=H*rr(.5,.82),rad=rr(30,120)*(W/1200+.5);
        const g=x.createRadialGradient(px,py,0,px,py,rad);const c=R()<.3?[110,170,170]:[45,105,110];
        g.addColorStop(0,rgba(c,rr(.03,.08)));g.addColorStop(1,rgba(c,0));x.fillStyle=g;x.fillRect(px-rad,py-rad,rad*2,rad*2);}
      for(let i=0;i<40;i++){const px=LX+rr(-W*.3,W*.3),py=H*rr(.5,.75);const g=x.createRadialGradient(px,py,0,px,py,rr(20,60));g.addColorStop(0,"rgba(5,10,12,.35)");g.addColorStop(1,"rgba(5,10,12,0)");x.fillStyle=g;x.fillRect(0,0,W,H);}
      // дальний план: размытые силуэты
      x.filter="blur(2.2px)";
      for(let i=0;i<W/3;i++){const px=rr(0,W),h=H*profile(px)*rr(.6,1.1)+H*.08,a=.25+lit(px,H-h)*.4;
        x.strokeStyle=rgba([70,95,80],a);x.lineWidth=rr(.6,1.4);x.beginPath();x.moveTo(px,H);x.quadraticCurveTo(px+rr(-10,10),H-h*.5,px+rr(-14,14),H-h);x.stroke();
        if(R()<.35){x.fillStyle=rgba([200,210,190],a*.7);x.beginPath();x.arc(px+rr(-14,14),H-h,rr(1.5,4),0,TAU);x.fill();}}
      x.filter="none";
      // кусты и листья средне-дальнего плана
      for(let i=0;i<W/2.2;i++){const px=rr(0,W),py=H-H*profile(px)*rr(.1,.55),l=lit(px,py);
        leaf(x,px,py,rr(10,28),rr(3,7),rr(-2.6,-.5),[40+l*60,70+l*80,45+l*40],.35+l*.5);}
      // густая листва у земли
      for(let i=0;i<W/1.6;i++){const px=rr(-20,W+20),py=H-H*profile(px)*rr(0,.35)*Math.pow(R(),.6),l=lit(px,py);
        leaf(x,px,py+rr(0,30),rr(18,48),rr(5,12),rr(-2.9,-.25),[28+l*70,52+l*95,36+l*45],.55+l*.4);}
      // папоротники
      for(let i=0;i<W/90;i++){const px=rr(0,W),l=lit(px,H*.85);fern(x,px,H*rr(.86,.98),rr(60,130),rr(-2.4,-.7),[40+l*70,80+l*90,55+l*40],.5+l*.4);}
      // мох и земля
      const gg=x.createLinearGradient(0,H*.78,0,H);gg.addColorStop(0,"rgba(10,18,14,0)");gg.addColorStop(.4,"rgba(12,22,16,.8)");gg.addColorStop(1,"rgba(8,14,10,1)");x.fillStyle=gg;x.fillRect(0,H*.78,W,H*.22);
      for(let i=0;i<W*5;i++){const px=rr(0,W),py=H*(1-Math.pow(R(),1.6)*.2),l=lit(px,py);
        const c=R()<.08?[150,120,60]:[30+l*110,50+l*140,30+l*50];
        x.fillStyle=rgba(c,rr(.25,.8));x.beginPath();x.arc(px,py,rr(.4,1.8),0,TAU);x.fill();}
      // освещённая поляна
      x.globalCompositeOperation="lighter";
      const lg=x.createRadialGradient(LX,H*.9,0,LX,H*.9,W*.22);lg.addColorStop(0,"rgba(190,230,140,.28)");lg.addColorStop(.5,"rgba(120,190,120,.08)");lg.addColorStop(1,"rgba(0,0,0,0)");
      x.fillStyle=lg;x.fillRect(0,0,W,H);
      x.globalCompositeOperation="source-over";
      // мелкие цветы в траве
      for(let i=0;i<W/14;i++){const px=rr(0,W),py=H*rr(.88,1),l=lit(px,py);
        const s=R()<.45?marigold(rr(3,6)):daisy(rr(2.5,4.5),{tilt:.5});
        x.globalAlpha=.35+l*.65;x.drawImage(s.c,px-s.ax,py-s.ay,s.c.width/SD,s.c.height/SD);x.globalAlpha=1;}
    });

    /* живые растения */
    const glow=glowSprite(60);
    plants=[];
    const count=Math.round(W/10);
    for(let i=0;i<count;i++){
      const px=rr(-20,W+20), e=Math.abs(px/W-.5)*2;
      const h=H*profile(px)*rr(.55,1.25)+H*.05;
      const near=R()<.18;
      const l=lit(px,H-h);
      const t=R();
      let head=null, kind;
      const sc=(near?2.2:1.55)*(W<600?.75:1)*(.8+R()*.5);
      if(t<.26){kind="daisy";head=daisy(rr(7,13)*sc,{tilt:rr(.45,.9),petal:R()<.2?[236,226,206]:[245,244,236]});}
      else if(t<.42){kind="umbel";head=umbel(rr(12,22)*sc);}
      else if(t<.54){kind="clock";head=clock(rr(9,15)*sc);}
      else if(t<.62){kind="cosmos";head=cosmos(rr(8,13)*sc,{col:R()<.5?[222,196,210]:[236,232,222]});}
      else if(t<.7){kind="star";head=starflower(rr(7,12)*sc);}
      else if(t<.78){kind="spike";head=spike(rr(20,40)*sc,{col:R()<.5?[150,135,195]:[190,200,215]});}
      else if(t<.84){kind="marigold";head=marigold(rr(6,10)*sc);}
      else kind="grass";
      plants.push({x:px,h,kind,head,near,l,ph:R()*TAU,bend:rr(-30,30),sw:rr(.6,1.4),
        leaves:Array.from({length:kind==="grass"?0:Math.round(rr(1,4))},()=>({t:rr(.1,.6),len:rr(8,20)*sc,s:R()<.5?-1:1})),
        wid:rr(1.2,3.2)*sc,glow:l>.55&&kind!=="grass"?glow:null});
    }
    plants.sort((a,b)=>(a.near-b.near)||(a.l-b.l));
    // размытый передний план (боке)
    fg=spr(W,H,(x)=>{
      for(let i=0;i<W/40;i++){const px=R()<.5?rr(-40,W*.3):rr(W*.7,W+40);
        blade(x,px,H+20,H*rr(.25,.5),rr(4,9),rr(-60,60),[25,45,30],.9);}
      for(let i=0;i<W/80;i++){const px=R()<.5?rr(-20,W*.25):rr(W*.75,W+20);leaf(x,px,H+10,rr(60,110),rr(14,22),rr(-2.4,-.8),[22,40,28],.95);}
    },5);
    motes=Array.from({length:Math.round(W/12)},()=>({x:LX+rr(-W*.35,W*.35),y:H*rr(.3,.95),r:rr(.5,1.8),v:rr(.05,.25),ph:rr(0,TAU)}));
  }

  function draw(t){
    ctx.setTransform(SD,0,0,SD,0,0); ctx.clearRect(0,0,W,H);
    const growT=reduce?1:Math.min(1,(t-t0)/2600);
    px+=(tpx-px)*.05; py+=(tpy-py)*.05;
    ctx.drawImage(bg,px*-6,py*-3,W,H);
    const wind=reduce?0:Math.sin(t/3100)*.6+Math.sin(t/1300)*.25;
    for(const p of plants){
      const g0=Math.max(0,Math.min(1,growT*1.7-(1-p.l)*.5-(p.near?.2:0)));
      const ease=1-Math.pow(1-g0,3); if(ease<=0.01)continue;
      const depth=p.near?1.6:.6+p.l*.4;
      const sway=reduce?0:(Math.sin(t/1700+p.ph)*3+wind*4)*p.sw*(p.near?1.3:1);
      const bx=p.x+px*depth*16, by=H+py*depth*6+4;
      const hh=p.h*ease, tx=bx+p.bend*.6+sway, ty=by-hh;
      const cA=.35+p.l*.65;
      const sc=[48+p.l*90,72+p.l*110,52+p.l*60];
      if(p.kind==="grass"){
        blade(ctx,bx,by,hh*1.1,p.wid,p.bend+sway*1.5,sc,cA);
        if(R()<0){}
        continue;
      }
      // стебель
      ctx.strokeStyle=rgba(sc,cA);ctx.lineWidth=p.near?1.8:1.1;
      ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo(bx+p.bend*.15,by-hh*.55,tx,ty);ctx.stroke();
      // листья на стебле
      for(const lf of p.leaves){const lx=bx+(tx-bx)*lf.t*lf.t+p.bend*.15*lf.t*(1-lf.t)*2, ly=by-hh*lf.t;
        leaf(ctx,lx,ly,lf.len*ease,lf.len*.22,lf.s>0?-.6+sway*.01:-2.5+sway*.01,sc,cA*.9);}
      // соцветие
      if(p.head){
        const s=p.head, w=s.c.width/SD, h=s.c.height/SD, gs=ease*ease;
        if(p.glow){ctx.globalCompositeOperation="lighter";ctx.globalAlpha=(p.l-.5)*1.4*gs;const gr=s.r*3.2;ctx.drawImage(p.glow,tx-gr,ty-gr,gr*2,gr*2);ctx.globalCompositeOperation="source-over";}
        ctx.globalAlpha=Math.min(1,.25+p.l*.9)*Math.min(1,gs*1.4);
        ctx.save();ctx.translate(tx,ty);ctx.rotate((sway+p.bend*.3)*.006);ctx.scale(gs,gs);
        ctx.drawImage(s.c,-s.ax,-s.ay,w,h);ctx.restore();
        ctx.globalAlpha=1;
      }
    }
    // передний план
    const fw=reduce?0:Math.sin(t/2600)*3;
    ctx.globalAlpha=Math.min(1,growT*2);ctx.drawImage(fg,px*-30+fw,py*-10,W,H);ctx.globalAlpha=1;
    // светлячки над поляной
    ctx.globalCompositeOperation="lighter";
    for(const m of motes){
      const y=reduce?m.y:((m.y-(t*m.v/40))%(H*.9)+H*.9)%(H*.9)+H*.1;
      const x=m.x+(reduce?0:Math.sin(t/2000+m.ph)*14)+px*10;
      const tw=reduce?.6:Math.pow(Math.abs(Math.sin(t/1100+m.ph)),2);
      const a=tw*Math.min(1,(y/H-.1)*2.4)*.9;
      const g=ctx.createRadialGradient(x,y,0,x,y,m.r*5);g.addColorStop(0,`rgba(255,255,235,${a})`);g.addColorStop(1,"rgba(255,255,235,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,m.r*5,0,TAU);ctx.fill();
    }
    ctx.globalCompositeOperation="source-over";
    // виньетка и переход в страницу
    const vg=ctx.createRadialGradient(W/2,H*.78,Math.min(W,H)*.15,W/2,H*.7,Math.max(W,H)*.75);
    vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.8)");ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
    const bt=ctx.createLinearGradient(0,H*.93,0,H);bt.addColorStop(0,"rgba(0,0,0,0)");bt.addColorStop(1,"rgba(0,0,0,1)");ctx.fillStyle=bt;ctx.fillRect(0,H*.93,W,H*.07);
  }
  let t0=performance.now(), px=0,py=0,tpx=0,tpy=0;
  const pm=e=>{tpx=e.clientX/innerWidth-.5;tpy=e.clientY/innerHeight-.5;};
  addEventListener("pointermove",pm,{passive:true});
  build();
  const loop=t=>{draw(t);if(!reduce)gardenRAF=requestAnimationFrame(loop);};
  gardenRAF=requestAnimationFrame(loop);
  let rt; const ro=new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(()=>{if(cv.clientWidth!==W||cv.clientHeight!==H){build();if(reduce)draw(0);}},150);});ro.observe(cv);
  return ()=>{cancelAnimationFrame(gardenRAF);ro.disconnect();clearTimeout(rt);removeEventListener("pointermove",pm);};
}

