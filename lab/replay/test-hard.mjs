// Brandon (Oct 24): figure out the "hard days". Can we tell BEFORE a call that the market is in a choppy,
// reversing phase (favourites losing), and skip? Uses only information available at the call.
// Hardness signals: favourite-loss rate over the previous N settled rounds; choppiness (efficiency ratio) of the
// last 60/240 min; strike crossings in the previous round; volatility vs its 24h norm; trend over 4h.
import fs from 'fs';import {R,feeP} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));
const fav=o=>{const a=o.at[120];if(!a||!(a.ya>0&&a.na>0))return null;const up=a.ya+100-a.na>=100,ask=up?a.ya:a.na,won=(o.up===1)===up;return{ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};};
const closes=(end,n)=>{const o=[];for(let i=n-1;i>=0;i--){const x=M[end-i*60000];if(x)o.push(x[4]);}return o;};
const er=c=>{let s=0;for(let i=1;i<c.length;i++)s+=Math.abs(c[i]-c[i-1]);return s>0?Math.abs(c.at(-1)-c[0])/s:null;};
const vol=c=>{let v=0;for(let i=1;i<c.length;i++){const z=Math.log(c[i]/c[i-1]);v+=z*z;}return Math.sqrt(v/(c.length-1));};
const rows=[];const hist=[];
for(const o of R){const f=fav(o);const end=o.t+120000-60000;
  const prevF=hist.slice(-32);const lr=n=>{const h=prevF.slice(-n);return h.length>=n?h.filter(x=>!x).length/n:null;};
  const c60=closes(end,60),c240=closes(end,240),c1440=closes(end,1440);
  // strike crossings in the previous round: minute closes vs that round's open
  const p0=M[o.t-900000];let cross=null;if(p0){cross=0;let side=null;for(let i=0;i<15;i++){const x=M[o.t-900000+i*60000];if(!x)continue;const s=x[4]>=p0[3];if(side!=null&&s!==side)cross++;side=s;}}
  const r={t:o.t,f,h:et(o.t).h,wd:et(o.t).wd,lr4:lr(4),lr8:lr(8),lr16:lr(16),lr32:lr(32),er60:c60.length>50?er(c60):null,er240:c240.length>200?er(c240):null,
    vr:c60.length>50&&c1440.length>1200?vol(c60)/vol(c1440):null,tr4:c240.length>200?Math.abs(Math.log(c240.at(-1)/c240[0]))/(vol(c1440||c240)*Math.sqrt(240)):null,cross};
  rows.push(r);if(f)hist.push(f.won);}
const st=v=>{const n=v.length;if(!n)return'n 0';const m=v.reduce((a,x)=>a+x.pnl,0)/n,sd=Math.sqrt(v.reduce((a,x)=>a+(x.pnl-m)**2,0)/Math.max(1,n-1));return`n ${String(n).padStart(4)} fav right ${(v.filter(x=>x.won).length/n*100).toFixed(1)}% ${(m>=0?'+':'')+m.toFixed(1)}±${(sd/Math.sqrt(n)).toFixed(1)}¢`;};
const half=Math.floor(rows.length/2),A=rows.slice(0,half),B=rows.slice(half);
const band=(lo,hi)=>r=>r.f&&r.f.ask>=lo&&r.f.ask<=hi;
console.log('Favourite at 2:00, split by hardness signal (cut points = terciles of the FIRST half; second half is unseen)');
for(const k of['lr4','lr8','lr16','lr32','er60','er240','vr','tr4','cross']){
  const v=A.map(r=>r[k]).filter(x=>x!=null).sort((a,b)=>a-b);const q1=v[Math.floor(v.length/3)],q2=v[Math.floor(v.length*2/3)];
  console.log(`\n${k}  (low ≤ ${(+q1).toFixed(3)} < mid ≤ ${(+q2).toFixed(3)} < high)`);
  for(const[nm,S]of[['first half',A],['second half',B]])for(const[bn,bf]of[['any price',r=>!!r.f],['75–90¢',band(75,90)]]){
    const g=[S.filter(r=>bf(r)&&r[k]!=null&&r[k]<=q1),S.filter(r=>bf(r)&&r[k]>q1&&r[k]<=q2),S.filter(r=>bf(r)&&r[k]>q2)];
    console.log(`  ${nm.padEnd(11)} ${bn.padEnd(9)} low: ${st(g[0].map(x=>x.f))} | mid: ${st(g[1].map(x=>x.f))} | high: ${st(g[2].map(x=>x.f))}`);}}
// day-to-day persistence: is a hard day followed by a hard day?
const day={};for(const r of rows){if(!r.f)continue;const p=et(r.t),k=`${p.y}-${p.mo}-${p.d}`;(day[k]??=[]).push(r.f.won);}
const D=Object.values(day).filter(v=>v.length>=60).map(v=>v.filter(Boolean).length/v.length);
let sx=0,sy=0,sxy=0,sxx=0,syy=0,n=D.length-1;for(let i=0;i<n;i++){const x=D[i],y=D[i+1];sx+=x;sy+=y;sxy+=x*y;sxx+=x*x;syy+=y*y;}
const corr=(n*sxy-sx*sy)/Math.sqrt((n*sxx-sx*sx)*(n*syy-sy*sy));
console.log(`\nDays: ${D.length}; favourite right per day ranges ${(Math.min(...D)*100).toFixed(0)}–${(Math.max(...D)*100).toFixed(0)}%, mean ${(D.reduce((a,b)=>a+b,0)/D.length*100).toFixed(1)}%; yesterday→today correlation ${corr.toFixed(2)}`);
// within-day: first 6 hours (00–06 ET) hardness vs rest of the day
const mx=[];for(const[k,v]of Object.entries(day)){const rr=rows.filter(r=>r.f&&(()=>{const p=et(r.t);return `${p.y}-${p.mo}-${p.d}`===k;})());const a=rr.filter(r=>r.h<6),b=rr.filter(r=>r.h>=6);if(a.length>15&&b.length>40)mx.push([a.filter(r=>r.f.won).length/a.length,b.filter(r=>r.f.won).length/b.length]);}
{const n=mx.length;const mxm=mx.reduce((s,x)=>s+x[0],0)/n,mym=mx.reduce((s,x)=>s+x[1],0)/n;let c=0,vx=0,vy=0;for(const[x,y]of mx){c+=(x-mxm)*(y-mym);vx+=(x-mxm)**2;vy+=(y-mym)**2;}console.log(`Early morning (00–06 ET) favourite rate vs rest of same day: correlation ${(c/Math.sqrt(vx*vy)).toFixed(2)} over ${n} days`);}
fs.writeFileSync('lab/data/hard-rows.json',JSON.stringify(rows.map(r=>({...r,f:r.f}))));
