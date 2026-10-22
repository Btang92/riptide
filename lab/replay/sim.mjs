import fs from 'fs';import {et,sigm,fitLR,brainP,scoreSet} from './lib.mjs';
export const R=JSON.parse(fs.readFileSync('lab/data/rounds.json'));
export const feeP=a=>0.07*a*(100-a)/100;
const KINDS={base:{p:0,i:0},pattern:{p:1,i:0},indicator:{p:0,i:1},full:{p:1,i:1}};
const X=(a,K)=>{if(!a||!a.f)return null;let x=a.f;if(K.p){if(!a.fp)return null;x=x.concat(a.fp);}if(K.i){if(!a.fi)return null;x=x.concat(a.fi);}return x;};
// replicate getBrain on a training set
export function brain(tr){const rows=tr.map(o=>({a:o.at[120],y:o.up}));const cut=Math.floor(rows.length*.75),a=rows.slice(0,cut),b=rows.slice(cut);
  const T=b.filter(r=>r.a.fp&&r.a.fi),yT=T.map(r=>r.y);const sc={raw:scoreSet(T.map(r=>sigm(r.a.f[0])),yT)};
  for(const[k,K]of Object.entries(KINDS)){const t=a.filter(r=>X(r.a,K));const m=fitLR(t.map(r=>X(r.a,K)),t.map(r=>r.y));sc[k]=scoreSet(T.map(r=>brainP(m,X(r.a,K))),yT);}
  const beats=(p,q)=>p.ll<q.ll-0.002&&p.acc>=q.acc;const ok=Object.keys(KINDS).filter(k=>beats(sc[k],sc.raw)&&(k==='base'||beats(sc[k],sc.base)));
  const kind=ok.sort((p,q)=>sc[p].ll-sc[q].ll)[0]||null;if(!kind)return{kind:null,margin:3,p:a=>a.pu,sc};
  const K=KINDS[kind],all=rows.filter(r=>X(r.a,K)),m=fitLR(all.map(r=>X(r.a,K)),all.map(r=>r.y)),base=fitLR(rows.map(r=>r.a.f),rows.map(r=>r.y));
  return{kind,margin:Math.max(0,sc[kind].ece*100),sc,p:a=>{const x=X(a,K);return x?brainP(m,x):brainP(base,a.f);}};}
export const split=(f0=.75)=>{const c=Math.floor(R.length*f0);return{tr:R.slice(0,c),te:R.slice(c)};};
// rule: {lo,hi,hs,he,times,margin+, exit(fn)}
export function run(te,B,rule){const out=[];
  for(const o of te){const h=et(o.t).h;let bet=null;
    if(rule.hs!=null&&(h<rule.hs||h>=rule.he))continue;
    for(const s of rule.times){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a);const call=pu>=.5?'UP':'DOWN',prob=Math.max(pu,1-pu),ask=call==='UP'?a.ya:a.na;
      if(ask==null||ask<rule.lo||ask>rule.hi||ask<=0||ask>=100)continue;if(prob*100<ask+feeP(ask)+B.margin+(rule.add||0))continue;bet={s,call,ask,prob};break;}
    if(!bet)continue;const won=(o.up===1)===(bet.call==='UP');let pnl=(won?100-bet.ask:-bet.ask)-feeP(bet.ask),exited=null;
    if(rule.exit){for(const s of rule.exitTimes.filter(x=>x>bet.s)){const a=o.at[s];if(!a||!a.f)continue;const pu=B.p(a),ps=bet.call==='UP'?pu:1-pu,bid=100-(bet.call==='UP'?a.na:a.ya);
      if(bid<1)continue;if(rule.exit(ps,bid,s,bet)){pnl=bid-bet.ask-feeP(bet.ask)-feeP(bid);exited={s,bid};break;}}}
    out.push({t:o.t,pnl,won,ask:bet.ask,s:bet.s,exited});}
  return out;}
export function stat(b){const n=b.length;if(!n)return{n:0};const m=b.reduce((s,x)=>s+x.pnl,0)/n,sd=Math.sqrt(b.reduce((s,x)=>s+(x.pnl-m)**2,0)/Math.max(1,n-1));
  return{n,c:+m.toFixed(1),se:+(sd/Math.sqrt(n)).toFixed(1),win:+(b.filter(x=>x.won).length/n*100).toFixed(0),ask:+(b.reduce((s,x)=>s+x.ask,0)/n).toFixed(0),ex:b.filter(x=>x.exited).length};}
// paired difference per round (cents per round, 1 contract), over test rounds
export function paired(te,a,b){const A=new Map(a.map(x=>[x.t,x.pnl])),Bm=new Map(b.map(x=>[x.t,x.pnl]));const d=te.map(o=>(A.get(o.t)||0)-(Bm.get(o.t)||0));const n=d.length,m=d.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(d.reduce((s,x)=>s+(x-m)**2,0)/(n-1));return{perRound:+m.toFixed(2),se:+(sd/Math.sqrt(n)).toFixed(2),total:+(m*n).toFixed(0)};}
export const LIVE={lo:75,hi:90,hs:12,he:24,times:[120,180,240,300]};
