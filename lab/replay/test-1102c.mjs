// Nov 2: :45-round check at the 4:00 read (favourite 50–99¢ and the live 4:00 lock), whole history, halves, and new rounds.
import fs from 'fs';import {R,feeP,stat,paired} from './sim.mjs';import {et} from './lib.mjs';
const M=JSON.parse(fs.readFileSync('lab/data/candles.json'));const J=JSON.stringify,iso=t=>new Date(t).toISOString().slice(0,16);
const trendZ=o=>{const e=o.t+240000-60000;const c=[];for(let i=60;i>=0;i--){const x=M[e-i*60000];if(x)c.push(x[4]);}if(c.length<45)return null;
 let v=0;for(let i=1;i<c.length;i++){const z=Math.log(c[i]/c[i-1]);v+=z*z;}return Math.log(c.at(-1)/c[0])/Math.sqrt(v);};
const bet=(o,c,ask)=>{const won=(o.up===1)===(c===1);return{t:o.t,pnl:(won?100-ask:-ask)-feeP(ask),won,ask};};
const fav=o=>{const a=o.at[240];if(!a||a.ya==null||a.na==null)return null;const c=a.ya>=a.na?1:-1,ask=c>0?a.ya:a.na;if(ask<50||ask>=100)return null;return bet(o,c,ask);};
const live=o=>{if(et(o.t).h<12)return null;const a=o.at[240];if(!a||!a.f)return null;const pu=a.pu,c=pu>=.5?1:-1,pr=Math.max(pu,1-pu),ask=c>0?a.ya:a.na;if(ask==null||ask<75||ask>90||pr*100<ask+feeP(ask)+3)return null;return bet(o,c,ask);};
const q45=o=>new Date(o.t).getUTCMinutes()===45;
const sets=[['first half',R.slice(0,R.length/2)],['second half',R.slice(R.length/2)],['train 75%',R.slice(0,R.length*.75|0)],['test 25%',R.slice(R.length*.75|0)],['after Nov 1 23:15',R.filter(o=>o.t>Date.UTC(2026,10,1,23,15))],['whole',R]];
for(const[n,s]of sets){const f45=s.filter(q45).map(fav).filter(Boolean),fo=s.filter(o=>!q45(o)).map(fav).filter(Boolean);
 const d45=s.filter(o=>q45(o)&&(trendZ(o)??0)<-1).map(fav).filter(Boolean);
 const L=s.map(live).filter(Boolean),Ls=s.filter(o=>!q45(o)).map(live).filter(Boolean),p=paired(s,Ls,L);
 console.log(`${n.padEnd(18)} fav@4:00 :45 ${J(stat(f45))} other ${J(stat(fo))} | :45+downtrend ${J(stat(d45))} | live skip :45 vs live ${p.perRound}±${p.se} (live :45 bets ${L.length-Ls.length})`);}
console.log('new :45 rounds:',R.filter(o=>o.t>Date.UTC(2026,10,1,23,15)&&q45(o)).map(o=>{const b=fav(o),z=trendZ(o);return `${iso(o.t)} z${z?.toFixed(1)} ${b?b.ask+'¢ '+(b.won?'W':'L'):'-'}`;}).join(', '));
