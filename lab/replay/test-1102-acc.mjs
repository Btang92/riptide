// Nov 2: winner-call accuracy (Brandon: "better up and down calls"). At each checkpoint compare RIPTIDE's raw read, Kalshi's favourite,
// and a blend fit on the older 75%; score on the newest 25%. Also: rounds where read and Kalshi disagree.
import {R} from './sim.mjs';const lg=p=>Math.log(p/(1-p)),cl=p=>Math.min(.995,Math.max(.005,p));
const cut=Math.floor(R.length*.75),TR=R.slice(0,cut),TE=R.slice(cut);
const fit=(X,y)=>{let w=[0,0,0];for(let k=0;k<500;k++){const g=[0,0,0];X.forEach((x,i)=>{const p=1/(1+Math.exp(-(w[0]+w[1]*x[0]+w[2]*x[1])));g[0]+=p-y[i];g[1]+=(p-y[i])*x[0];g[2]+=(p-y[i])*x[1];});w=w.map((v,j)=>v-.5*g[j]/X.length);}return w;};
const se=(k,n)=>Math.sqrt(k/n*(1-k/n)/n)*100;
for(const s of [120,180,240,300,480,600]){const rows=set=>set.map(o=>{const a=o.at[s];if(!a||a.ya==null||a.na==null||a.pu==null)return null;return{m:cl((a.ya+100-a.na)/200),p:cl(a.pu),y:o.up};}).filter(Boolean);
 const tr=rows(TR),te=rows(TE);const w=fit(tr.map(r=>[lg(r.m),lg(r.p)]),tr.map(r=>r.y));const bl=r=>w[0]+w[1]*lg(r.m)+w[2]*lg(r.p)>0?1:0;
 const acc=(f,set)=>{const k=set.filter(r=>f(r)===r.y).length;return `${(k/set.length*100).toFixed(1)}%±${se(k,set.length).toFixed(1)}`;};
 const rd=r=>r.p>=.5?1:0,kf=r=>r.m>=.5?1:0;const dis=te.filter(r=>rd(r)!==kf(r)),disAll=[...tr,...te].filter(r=>rd(r)!==kf(r));
 console.log(`${s/60}:00 test n=${te.length} | RIPTIDE read ${acc(rd,te)} | Kalshi favourite ${acc(kf,te)} | blend ${acc(bl,te)} (w mid ${w[1].toFixed(2)}, read ${w[2].toFixed(2)}) | disagree ${dis.length} test rounds: read right ${dis.filter(r=>rd(r)===r.y).length}; all-history disagreements ${disAll.length}, read right ${(disAll.filter(r=>rd(r)===r.y).length/disAll.length*100).toFixed(0)}%`);}
