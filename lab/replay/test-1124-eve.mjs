// Nov 24 evening. Live = 2026-11-18a. Aimed at calls that turn against us by 3:00–5:00.
// A) "Last-minute pullback" filter on 18a: skip the 4:00 bet when, between 3:00 and 4:00,
//    (i) BTC's 1-min move went against our side (any / >0.5σ1 / >1σ1, σ1 = sd of the previous 60 one-min moves),
//    (ii) RIPTIDE's raw read for our side fell (by >0 / >3 / >6 pts), or
//    (iii) our side's Kalshi ask fell by ≥3¢.
//    Also the mirror: bet only when the read ROSE 3:00→4:00. Paired ¢/round vs 18a, quarters, expanding WF Q2–Q4 (incl. 'none').
// B) Live replay since 18a approval (Nov 23 13:49 UTC): what 18a would have bet vs what the server did.
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const side=(a,c)=>c?a.ya:a.na,n=R.length,Qs=(i,N=n)=>[Math.floor(N*i/4),Math.floor(N*(i+1)/4)];
function at(o,s,m=3,lo=75,hi=90){const a=o.at[s];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const c=a.pu>=.5?1:0,ask=side(a,c);
 if(ask<lo||ask>hi)return null;if(Math.max(a.pu,1-a.pu)*100<ask+feeP(ask)+m)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
function fav(o,s,lo,hi){const a=o.at[s];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:0,ask=side(a,c);if(ask<lo||ask>hi)return null;
 if(a.pu!=null&&(a.pu>=.5?1:0)!==c)return null;const won=o.up===c;return{t:o.t,o,c,ask,won,kind:'add',pnl:(won?100-ask:-ask)-feeP(ask)};}
const E18=R.map(o=>at(o,240)||fav(o,240,91,93));
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; 18a ${J(stat(E18.filter(Boolean)))}`);
// features
const F=R.map((o,i)=>{const e=E18[i];if(!e)return null;const c3=M[o.t+120000],c4=M[o.t+180000];const a3=o.at[180];
 const mv=[];for(let k=60;k>=1;k--){const x=M[o.t+180000-k*60000];if(x)mv.push(x[4]-x[3]);}const sd=mv.length>20?Math.sqrt(mv.reduce((s,v)=>s+v*v,0)/mv.length):null;
 const sgn=e.c?1:-1;const m1=c4&&c3?(c4[4]-c3[4])*sgn:null;
 const r3=a3&&a3.pu!=null?(e.c?a3.pu:1-a3.pu):null,r4=e.c?e.o.at[240].pu:1-e.o.at[240].pu;
 const k3=a3&&a3.ya!=null&&a3.na!=null?side(a3,e.c):null;
 return{m1,z1:m1!=null&&sd?m1/sd:null,dr:r3!=null&&r4!=null?(r4-r3)*100:null,dk:k3!=null?e.ask-k3:null};});
{const k=F.filter(Boolean);console.log(`features known: m1 ${k.filter(x=>x.z1!=null).length}, read change ${k.filter(x=>x.dr!=null).length}, ask change ${k.filter(x=>x.dk!=null).length} of ${k.length}`);}
const bucket=(name,g)=>{const B={};E18.forEach((e,i)=>{if(!e||!F[i])return;const k=g(F[i]);if(k==null)return;(B[k]??=[]).push(e);});console.log(`   ${name}: `+Object.entries(B).sort().map(([k,v])=>`${k} ${J(stat(v))}`).join(' | '));};
console.log('\nA) 18a bets split by 3:00→4:00 change (toward our side = +):');
bucket('BTC 1-min move',x=>x.z1==null?null:x.z1<-1?'a <−1σ':x.z1<-.5?'b −1…−.5σ':x.z1<0?'c −.5…0':x.z1<.5?'d 0….5σ':x.z1<1?'e .5…1σ':'f >1σ');
bucket('read change (pts)',x=>x.dr==null?null:x.dr<-6?'a <−6':x.dr<-3?'b −6…−3':x.dr<0?'c −3…0':x.dr<3?'d 0…3':x.dr<6?'e 3…6':'f >6');
bucket('ask change (¢)',x=>x.dk==null?null:x.dk<=-3?'a ≤−3':x.dk<0?'b −2…−1':x.dk===0?'c 0':x.dk<3?'d 1…2':x.dk<6?'e 3…5':'f ≥6');
const rules={none:()=>false,'m1 against':x=>x.m1!=null&&x.m1<0,'m1 < −.5σ':x=>x.z1!=null&&x.z1<-.5,'m1 < −1σ':x=>x.z1!=null&&x.z1<-1,
 'read fell':x=>x.dr!=null&&x.dr<0,'read fell >3':x=>x.dr!=null&&x.dr<-3,'read fell >6':x=>x.dr!=null&&x.dr<-6,'read rose only':x=>x.dr==null||x.dr<=0,'ask fell ≥3':x=>x.dk!=null&&x.dk<=-3,'ask rose ≥3':x=>x.dk!=null&&x.dk>=3};
const V={};for(const[k,g]of Object.entries(rules))V[k]=E18.map((e,i)=>e&&F[i]&&g(F[i])?null:e);
const DD=(A,B,a,b)=>{const X=[];for(let i=a;i<b;i++)X.push((A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));return X;};
console.log('\n   skip rule vs 18a: Δ ¢/round whole | quarters | newer half; removed bets');
for(const k of Object.keys(V).slice(1)){const A=V[k],d=ms(DD(A,E18,0,n)),h=ms(DD(A,E18,Math.floor(n/2),n));const q=[0,1,2,3].map(i=>{const[a,b]=Qs(i);return f(ms(DD(A,E18,a,b)).m,2);}).join('/');
 const rm=E18.filter((e,i)=>e&&!A[i]);console.log(`   ${k.padEnd(15)} ${f(d.m)}±${d.se.toFixed(3)} (${(d.m/(d.se||1)).toFixed(1)} SE) | ${q} | ${f(h.m)}±${h.se.toFixed(3)}; removed ${J(stat(rm))}`);}
{const pooled=[],picks=[];let tb=0;for(let qq=1;qq<4;qq++){const[a,b]=Qs(qq);let best='none',bv=0;for(const k of Object.keys(V)){const v=ms(DD(V[k],E18,0,a)).m;if(v>bv){bv=v;best=k;}}
 picks.push(`Q${qq+1} ${best}`);pooled.push(...DD(V[best],E18,a,b));tb+=V[best].slice(a,b).filter(Boolean).length;}
 const p=ms(pooled);console.log(`   WF: ${picks.join(', ')} → ${f(p.m)}±${p.se.toFixed(3)} (${(p.m/(p.se||1)).toFixed(1)} SE; ${tb} test bets)`);}
// B) since approval
{const T=Date.UTC(2026,10,23,13,49);const ix=R.map((o,i)=>i).filter(i=>R[i].t>=T);const b=ix.map(i=>E18[i]).filter(Boolean);
 console.log(`\nB) replay since 18a approval: ${ix.length} rounds; 18a would have bet ${J(stat(b))}: `+b.map(e=>new Date(e.t).toISOString().slice(5,16)+' '+(e.c?'UP':'DN')+' '+e.ask+(e.kind==='add'?'(add)':'')+' '+(e.won?'W':'L')).join('; '));}
