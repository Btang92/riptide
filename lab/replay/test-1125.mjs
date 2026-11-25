// Nov 25 morning. Live = 2026-11-18a. Since Nov 25 03:15 UTC the app's LEARNED BRAIN (getBrain) is in charge of live calls:
// prob = brain P(UP) at the 4:00 call (pB), which bypasses the calibration nudge, and the bet margin becomes max(3, brain ECE·100).
// The lab has always scored 18a on the RAW read. Question: does the brain change which rounds get bet, and is that better or worse?
// A) Rebuild getBrain causally: refit once per UTC day on the trailing 30 days of settled rounds (features at 4:00, as the app's history
//    replay computes them at the call time), same candidates (base / pattern / indicator / full), same selection rule (beat raw and base
//    on log-loss by 0.002 and on accuracy on the newest 25% of the training rows). Score each following day out of sample.
// B) 18a with brain prob + brain margin vs 18a raw: paired ¢/round, quarters, newer half, newest 25%; bets added/removed; log-loss.
import fs from 'node:fs';import {R,feeP,stat} from './sim.mjs';import {sigm,fitLR,brainP,scoreSet} from './lib.mjs';
const J=JSON.stringify,f=(v,d=3)=>(v>=0?'+':'')+v.toFixed(d);
const ms=d=>{if(!d.length)return{m:0,se:0,n:0};const m=d.reduce((s,v)=>s+v,0)/d.length;return{m,se:d.length>1?Math.sqrt(d.reduce((s,v)=>s+(v-m)**2,0)/(d.length-1)/d.length):0,n:d.length};};
const n=R.length,S=240,DAY=86400000;
const KINDS={base:{p:0,i:0},pattern:{p:1,i:0},indicator:{p:0,i:1},full:{p:1,i:1}};
const X=(a,K)=>{let x=a.f;if(K.p){if(!a.fp)return null;x=x.concat(a.fp);}if(K.i){if(!a.fi)return null;x=x.concat(a.fi);}return x;};
function getBrain(rows){if(rows.length<200)return null;const cut=Math.floor(rows.length*.75),tr=rows.slice(0,cut),te=rows.slice(cut);
 const T=te.filter(r=>r.a.fp&&r.a.fi),yT=T.map(r=>r.y);const sc={raw:scoreSet(T.map(r=>sigm(r.a.f[0])),yT)},mods={};
 for(const[k,K]of Object.entries(KINDS)){const t=tr.filter(r=>X(r.a,K));if(t.length<150)continue;const m=fitLR(t.map(r=>X(r.a,K)),t.map(r=>r.y));sc[k]=scoreSet(T.map(r=>brainP(m,X(r.a,K))),yT);}
 const beats=(p,q)=>p&&q&&p.ll<q.ll-0.002&&p.acc>=q.acc;const ok=Object.keys(KINDS).filter(k=>sc[k]&&beats(sc[k],sc.raw)&&(k==='base'||beats(sc[k],sc.base)));
 const kind=ok.sort((p,q)=>sc[p].ll-sc[q].ll)[0]||null;if(!kind)return{kind:null};
 const K=KINDS[kind],all=rows.filter(r=>X(r.a,K)),m=fitLR(all.map(r=>X(r.a,K)),all.map(r=>r.y));return{kind,ece:sc[kind].ece,p:a=>brainP(m,X(a,K))};}
// daily refit
const ok=o=>{const a=o.at[S];return a&&a.f&&a.pu!=null;};
const PB=new Array(n).fill(null),KIND=new Array(n).fill(null),MARG=new Array(n).fill(3);const kinds={};
let d0=Math.floor(R[0].t/DAY)+10;const dEnd=Math.floor(R[n-1].t/DAY);
for(let d=d0;d<=dEnd;d++){const T=d*DAY;const rows=R.filter(o=>ok(o)&&o.t+900000<=T&&o.t>=T-30*DAY).map(o=>({a:o.at[S],y:o.up}));
 const B=getBrain(rows);const k=B?B.kind||'none':'none';kinds[k]=(kinds[k]||0)+1;
 for(let i=0;i<n;i++){const o=R[i];if(o.t<T||o.t>=T+DAY||!ok(o))continue;KIND[i]=k;if(B&&B.kind){PB[i]=B.p(o.at[S]);MARG[i]=Math.max(3,B.ece*100);}}}
console.log(`${n} rounds → ${new Date(R[n-1].t).toISOString().slice(0,16)}; daily refits ${J(kinds)}`);
{const last=[];for(let i=n-1;i>=0&&last.length<8;i--)if(KIND[i]&&(!last.length||last.at(-1)[0]!==new Date(R[i].t).toISOString().slice(5,10)))last.push([new Date(R[i].t).toISOString().slice(5,10),KIND[i]]);console.log('   recent days: '+last.map(x=>x.join(' ')).join(', '));}
// log-loss where brain active
{const ix=[];for(let i=0;i<n;i++)if(PB[i]!=null)ix.push(i);const y=ix.map(i=>R[i].up);const cl=p=>Math.min(.99,Math.max(.01,p));
 const sb=scoreSet(ix.map(i=>cl(PB[i])),y),sr=scoreSet(ix.map(i=>cl(R[i].at[S].pu)),y);
 const mk=ix.map(i=>{const a=R[i].at[S];return a.ya!=null&&a.na!=null?cl((a.ya+100-a.na)/200):null;});const ik=ix.filter((i,j)=>mk[j]!=null);
 const sk=scoreSet(mk.filter(v=>v!=null),ik.map(i=>R[i].up)),sbk=scoreSet(ik.map(i=>cl(PB[i])),ik.map(i=>R[i].up)),srk=scoreSet(ik.map(i=>cl(R[i].at[S].pu)),ik.map(i=>R[i].up));
 console.log(`\nA) out-of-sample rounds with a brain in charge: ${ix.length}. log-loss brain ${sb.ll.toFixed(4)} vs raw ${sr.ll.toFixed(4)}; acc ${(sb.acc*100).toFixed(1)}% vs ${(sr.acc*100).toFixed(1)}%; ECE ${sb.ece.toFixed(3)} vs ${sr.ece.toFixed(3)}`);
 console.log(`   same rounds with Kalshi price (${ik.length}): Kalshi mid ${sk.ll.toFixed(4)}, brain ${sbk.ll.toFixed(4)}, raw ${srk.ll.toFixed(4)}; brain flips raw side in ${ix.filter(i=>(PB[i]>=.5)!==(R[i].at[S].pu>=.5)).length} rounds`);}
// bet rules
const side=(a,c)=>c?a.ya:a.na;
function rule(o,i,useB){const a=o.at[S];if(!a||!a.f||a.ya==null||a.na==null||a.pu==null)return null;const pu=useB&&PB[i]!=null?PB[i]:a.pu,m=useB&&PB[i]!=null?MARG[i]:3;
 const c=pu>=.5?1:0,ask=side(a,c),prob=Math.max(pu,1-pu),won=o.up===c;
 const f93=ask>=91&&ask<=93&&ask===Math.max(a.ya,a.na);
 if(!f93){if(ask<75||ask>90)return null;if(prob*100<ask+feeP(ask)+m)return null;}
 return{t:o.t,c,ask,won,kind:f93?'add':'live',pnl:(won?100-ask:-ask)-feeP(ask)};}
const E18=R.map((o,i)=>rule(o,i,false)),EB=R.map((o,i)=>rule(o,i,true));
const first=PB.findIndex(v=>v!=null||false);const i0=KIND.findIndex(k=>k!=null);
const idx=[];for(let i=i0;i<n;i++)idx.push(i);const N=idx.length,Q=q=>idx.slice(Math.floor(N*q/4),Math.floor(N*(q+1)/4));
const D=(A,B,ix)=>ix.map(i=>(A[i]?A[i].pnl:0)-(B[i]?B[i].pnl:0));
console.log(`\nB) scored from ${new Date(R[i0].t).toISOString().slice(0,10)} (${N} rounds; brain in charge in ${idx.filter(i=>PB[i]!=null).length})`);
console.log(`   18a raw   ${J(stat(idx.map(i=>E18[i]).filter(Boolean)))}`);
console.log(`   18a brain ${J(stat(idx.map(i=>EB[i]).filter(Boolean)))}`);
{const d=ms(D(EB,E18,idx));console.log(`   brain vs raw Δ ${f(d.m)}±${d.se.toFixed(3)} ¢/round (${(d.m/(d.se||1)).toFixed(1)} SE)`);
 console.log('   quarters: '+[0,1,2,3].map(q=>{const ix=Q(q),dd=ms(D(EB,E18,ix));return `${new Date(R[ix[0]].t).toISOString().slice(5,10)} ${f(dd.m,2)}±${dd.se.toFixed(2)} (brain ${stat(ix.map(i=>EB[i]).filter(Boolean)).n} / raw ${stat(ix.map(i=>E18[i]).filter(Boolean)).n} bets)`;}).join(' | '));
 const nw=Q(3),dd=ms(D(EB,E18,nw));console.log(`   newest 25%: Δ ${f(dd.m)}±${dd.se.toFixed(3)}; brain ${J(stat(nw.map(i=>EB[i]).filter(Boolean)))} raw ${J(stat(nw.map(i=>E18[i]).filter(Boolean)))}`);
 const only=idx.filter(i=>EB[i]&&!E18[i]),gone=idx.filter(i=>E18[i]&&!EB[i]),both=idx.filter(i=>E18[i]&&EB[i]),flip=both.filter(i=>E18[i].c!==EB[i].c);
 console.log(`   added by brain ${J(stat(only.map(i=>EB[i])))}; removed by brain ${J(stat(gone.map(i=>E18[i])))}; both ${both.length} (side differs ${flip.length})`);
 for(const k of ['base','pattern','indicator','full']){const ix=idx.filter(i=>KIND[i]===k);if(!ix.length)continue;const d2=ms(D(EB,E18,ix));console.log(`     days with ${k} brain: ${ix.length} rounds Δ ${f(d2.m)}±${d2.se.toFixed(3)}`);}}
// live check since brain took charge
{const T=Date.UTC(2026,10,25,3,15);const ix=idx.filter(i=>R[i].t>=T);console.log(`\nC) since brain took charge live (${ix.length} rounds): replay brain ${J(stat(ix.map(i=>EB[i]).filter(Boolean)))} raw ${J(stat(ix.map(i=>E18[i]).filter(Boolean)))}; replay kind ${[...new Set(ix.map(i=>KIND[i]))].join('/')}`);}
