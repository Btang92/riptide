// Nov 25 morning. Re-check of the hour-block lead under 18a (Nov 20: skip 18–20 ET whole +0.081±0.053, newest quarter +0.002).
// Autopsy keeps flagging 16–20 ET as the weakest block (30+ runs). Candidates: skip any single 2-h ET block (12 of them), skip 16–20,
// skip 17–20. Paired ¢/round vs 18a, quarters, rounds after Nov 20 only (forward), and expanding WF Q2–Q4 choosing among all candidates + none.
import {R,feeP,stat} from './sim.mjs';import {et} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=(i,N=n)=>[Math.floor(N*i/4),Math.floor(N*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,c,ask,won,pnl:(won?100-ask:-ask)-feeP(ask)};}
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));const H=R.map(o=>et(o.t+240000).h);
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}`);
const C={none:[]};for(let b=0;b<24;b+=2)C[`skip ${b}–${b+2}`]=[b,b+1];C['skip 16–20']=[16,17,18,19];C['skip 17–20']=[17,18,19];
const V={};for(const[k,hs]of Object.entries(C))V[k]=E18.map((e,i)=>e&&hs.includes(H[i])?null:e);
const DD=(A,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(E18[i]?E18[i].pnl:0));return X;};
const T20=R.findIndex(o=>o.t>=Date.UTC(2026,10,20,12));
console.log('   rule: Δ ¢/round whole | quarters | since Nov 20 12:00 (forward); removed bets');
for(const k of Object.keys(V).slice(1)){const A=V[k],d=ms(DD(A,0,n)),fw=ms(DD(A,T20,n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,a,b)).m,2);}).join('/');
 const rm=E18.filter((e,i)=>e&&!A[i]),rmf=E18.slice(T20).filter((e,i)=>e&&!A[T20+i]);
 console.log(`   ${k.padEnd(11)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q} | fwd ${f(fw.m)}±${fw.se.toFixed(3)}; removed ${J(stat(rm))}; fwd removed ${J(stat(rmf))}`);}
{const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);let best='none',bv=0;for(const k of Object.keys(V)){const v=ms(DD(V[k],0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${qq+1} ${best}`);pooled.push(...DD(V[best],a,b));tb+=V[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);}
