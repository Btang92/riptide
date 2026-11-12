// Nov 12: CALIBRATED READ GATE under the 4:00 lock.
// Live rule = raw read at 4:00 (side by read), 75–90¢, read ≥ ask+fee+3, 12–24 ET.
// Idea: the gate compares the RAW read with the price. If the raw read is over/under-confident at 4:00,
// a recalibrated read (Platt: sigm(a+b·logit read)), a read–price blend (w·logit read + (1−w)·logit mid),
// or a 2-input LR [logit read, logit mid] should pick better rounds. All fitted on older rounds only.
// Scored: paired ¢/round vs live, expanding walk-forward Q2–Q4 (fit + variant choice on everything before the quarter).
// Part B: weekly rechecks — all hours vs 12–24 (fixed), edge-sized stake.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';const J=JSON.stringify;
const n=R.length,Qs=i=>[Math.floor(n*i/4),Math.floor(n*(i+1)/4)];
const sig=z=>1/(1+Math.exp(-z)),lg=p=>{p=Math.min(.995,Math.max(.005,p));return Math.log(p/(1-p));};
const f=(x,d=2)=>(x>=0?'+':'')+x.toFixed(d);
const A=o=>{const a=o.at[240];return a&&a.f&&a.ya!=null&&a.na!=null&&a.pu!=null&&a.ya>0&&a.ya<100?a:null;};
const mid=a=>{const m=(a.ya+(100-a.na))/2/100;return Math.min(.99,Math.max(.01,m));};
// fit LR on [x...] → y with tiny L2 (Newton, 2–3 dims)
function lr(X,y,l2=1e-3){const d=X[0].length+1;let w=Array(d).fill(0);if(d===2)w[1]=1;
 for(let it=0;it<30;it++){const g=Array(d).fill(0),H=Array.from({length:d},()=>Array(d).fill(0));
  for(let k=0;k<X.length;k++){const x=[1,...X[k]];const p=sig(x.reduce((s,v,i)=>s+v*w[i],0));for(let i=0;i<d;i++){g[i]+=(p-y[k])*x[i];for(let j=0;j<d;j++)H[i][j]+=p*(1-p)*x[i]*x[j];}}
  for(let i=1;i<d;i++){g[i]+=l2*w[i];H[i][i]+=l2;}
  // solve H·s=g
  const M=H.map((r,i)=>[...r,g[i]]);for(let i=0;i<d;i++){let p=i;for(let r=i+1;r<d;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;[M[i],M[p]]=[M[p],M[i]];for(let r=0;r<d;r++)if(r!==i){const c=M[r][i]/M[i][i];for(let k=i;k<=d;k++)M[r][k]-=c*M[i][k];}}
  w=w.map((v,i)=>v-M[i][d]/M[i][i]);}
 return w;}
// prob makers: given training set, return fn(a)→P(up)
const MAK={
 raw:()=>a=>a.pu,
 platt:tr=>{const S=tr.filter(A);const w=lr(S.map(o=>[lg(A(o).pu)]),S.map(o=>o.up));return a=>sig(w[0]+w[1]*lg(a.pu));},
 lr2:tr=>{const S=tr.filter(A);const w=lr(S.map(o=>[lg(A(o).pu),lg(mid(A(o)))]),S.map(o=>o.up));return a=>sig(w[0]+w[1]*lg(a.pu)+w[2]*lg(mid(a)));},
 b25:()=>a=>sig(.25*lg(a.pu)+.75*lg(mid(a))),b50:()=>a=>sig(.5*lg(a.pu)+.5*lg(mid(a))),b75:()=>a=>sig(.75*lg(a.pu)+.25*lg(mid(a))),
};
const VARS=[];for(const k of Object.keys(MAK))for(const m of(k==='raw'?[3]:[0,1,2,3,5]))VARS.push({k,m,id:`${k} m${m}`});
const HRS={'12–24':h=>h>=12,'all':h=>true};
const pnl=(o,P,m,hf)=>{const a=A(o);if(!a||!hf(et(o.t).h))return null;const pu=P(a),c=pu>=.5?1:0,ask=c?a.ya:a.na;if(ask<75||ask>90)return null;
 if(Math.max(pu,1-pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask,edge:Math.max(pu,1-pu)*100-ask-feeP(ask)};};
const diff=(S,P,m,hf,P0)=>S.map(o=>(pnl(o,P,m,hf)?.pnl||0)-(pnl(o,P0,3,hf)?.pnl||0));
const ms=d=>{const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length)};};
const ll=(S,P)=>{let s=0,k=0;for(const o of S){const a=A(o);if(!a)continue;const p=Math.min(.99,Math.max(.01,P(a)));s-=o.up?Math.log(p):Math.log(1-p);k++;}return s/k;};
console.log(`${n} rounds ${new Date(R[0].t).toISOString().slice(0,16)} → ${new Date(R[n-1].t).toISOString().slice(0,16)}`);
const raw=MAK.raw();
// log-loss walk-forward
{const out={};for(const k of Object.keys(MAK)){let s=[];for(let i=1;i<4;i++){const [a,b]=Qs(i);s.push(ll(R.slice(a,b),MAK[k](R.slice(0,a))));}out[k]=s.map(x=>x.toFixed(4)).join('/');}
 out.kalshiMid=[1,2,3].map(i=>{const[a,b]=Qs(i);return ll(R.slice(a,b),mid).toFixed(4);}).join('/');console.log('log-loss @4:00 Q2/Q3/Q4 (fit on older):',J(out));
 const w=lr(R.slice(0,Qs(3)[0]).filter(A).map(o=>[lg(A(o).pu),lg(mid(A(o)))]),R.slice(0,Qs(3)[0]).filter(A).map(o=>o.up));console.log('lr2 weights (fit Q1–Q3): bias',w[0].toFixed(3),'read',w[1].toFixed(3),'mid',w[2].toFixed(3));
 const p=lr(R.slice(0,Qs(3)[0]).filter(A).map(o=>[lg(A(o).pu)]),R.slice(0,Qs(3)[0]).filter(A).map(o=>o.up));console.log('platt (fit Q1–Q3): a',p[0].toFixed(3),'b',p[1].toFixed(3));}
for(const [hn,hf] of Object.entries(HRS)){
 console.log(`\n=== hours ${hn} === live whole ${J(stat(R.map(o=>pnl(o,raw,3,hf)).filter(Boolean)))}`);
 // fixed-fold view: fit on older 75%, score newest 25%
 const [c]=Qs(3),tr=R.slice(0,c),te=R.slice(c);const rows=[];
 for(const v of VARS){const P=MAK[v.k](tr);const dTr=ms(diff(tr,MAK[v.k](tr),v.m,hf,raw)),dTe=ms(diff(te,P,v.m,hf,raw));rows.push({v,dTr,dTe,b:stat(te.map(o=>pnl(o,P,v.m,hf)).filter(Boolean))});}
 rows.sort((a,b)=>b.dTr.m-a.dTr.m);console.log('  top 8 by train (in-sample fit) → newest 25%:');
 for(const r of rows.slice(0,8))console.log(`   ${r.v.id.padEnd(9)} train Δ ${f(r.dTr.m,3)}±${r.dTr.se.toFixed(3)} → test Δ ${f(r.dTe.m,3)}±${r.dTe.se.toFixed(3)} test bets ${J(r.b)}`);
 console.log(`   live test bets ${J(stat(te.map(o=>pnl(o,raw,3,hf)).filter(Boolean)))}`);
 // expanding walk-forward
 const D=[],T=[],TL=[];for(let i=1;i<4;i++){const[a,b]=Qs(i),old=R.slice(0,a),q=R.slice(a,b);let best=null,bv=-1e9;
  for(const v of VARS){const m=ms(diff(old,MAK[v.k](old),v.m,hf,raw)).m;if(m>bv){bv=m;best=v;}}
  const P=MAK[best.k](old),d=diff(q,P,best.m,hf,raw);D.push(...d);T.push(...q.map(o=>pnl(o,P,best.m,hf)).filter(Boolean));TL.push(...q.map(o=>pnl(o,raw,3,hf)).filter(Boolean));
  console.log(`  WF Q${i+1} pick ${best.id} (train ${f(bv,3)}) → Δ ${f(ms(d).m,3)}±${ms(d).se.toFixed(3)}`);}
 const p=ms(D);console.log(`  WF pooled Δ ${f(p.m,3)}±${p.se.toFixed(3)} ¢/round; chosen ${J(stat(T))} vs live ${J(stat(TL))}`);
 // fixed variants walk-forward (no choice), for the record
 for(const id of['platt m3','platt m0','lr2 m0','lr2 m3','b50 m0','b50 m3','b75 m3']){const v=VARS.find(x=>x.id===id);const D2=[],T2=[];for(let i=1;i<4;i++){const[a,b]=Qs(i),old=R.slice(0,a),q=R.slice(a,b),P=MAK[v.k](old);D2.push(...diff(q,P,v.m,hf,raw));T2.push(...q.map(o=>pnl(o,P,v.m,hf)).filter(Boolean));}
  const p2=ms(D2);console.log(`   fixed ${id.padEnd(9)} WF Δ ${f(p2.m,3)}±${p2.se.toFixed(3)} bets ${J(stat(T2))}`);}
}
// Part B rechecks
console.log('\n=== Part B rechecks ===');
const FWD=Date.UTC(2026,10,11,11,15);const h12=HRS['12–24'],hA=HRS.all;
for(const [nm,S] of[['whole',R],['Q2–Q4',R.slice(Qs(1)[0])],['since Nov 1',R.filter(o=>o.t>=Date.UTC(2026,10,1,17))],['forward since Nov 11 11:15',R.filter(o=>o.t>=FWD)]]){
 const d=ms(S.map(o=>(pnl(o,raw,3,hA)?.pnl||0)-(pnl(o,raw,3,h12)?.pnl||0)));
 console.log(`  all hours vs 12–24 ${nm} (${S.length} rounds): Δ ${f(d.m,3)}±${d.se.toFixed(3)} (${(d.m/d.se).toFixed(1)} SE) all ${J(stat(S.map(o=>pnl(o,raw,3,hA)).filter(Boolean)))} live ${J(stat(S.map(o=>pnl(o,raw,3,h12)).filter(Boolean)))}`);}
// edge-sized stake: double when edge ≥ median of earlier bets; normalise to mean stake 1 within each quarter
for(const [hn,hf] of Object.entries(HRS)){const out=[];for(let i=1;i<4;i++){const[a,b]=Qs(i);const old=R.slice(0,a).map(o=>pnl(o,raw,3,hf)).filter(Boolean).map(x=>x.edge).sort((x,y)=>x-y);const med=old[Math.floor(old.length/2)];
  const q=R.slice(a,b).map(o=>pnl(o,raw,3,hf)).filter(Boolean);const st=q.map(x=>x.edge>=med?2:1),mean=st.reduce((s,v)=>s+v,0)/st.length;q.forEach((x,j)=>out.push({...x,pnl:x.pnl*st[j]/mean-x.pnl}));}
 const flat=[];for(let i=1;i<4;i++){const[a,b]=Qs(i);flat.push(...R.slice(a,b).map(o=>pnl(o,raw,3,hf)).filter(Boolean));}
 const d=ms(out.map(x=>x.pnl)),fl=stat(flat);console.log(`  edge stake ${hn}: WF Q2–Q4 ${out.length} bets, flat ${fl.c}±${fl.se} ¢/bet, sized − flat ${f(d.m)}±${d.se.toFixed(2)} ¢/bet (${(d.m/d.se).toFixed(1)} SE)`);}
