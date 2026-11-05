// Nov 5: (1) price paid vs check timing — RIPTIDE's 4:00 checkpoint ask (snapshot a few seconds after 4:00) vs Kalshi's
// 1-min candle close at exactly 4:00, for the same rounds and the same side; does the snapshot lag cost cents?
// (2) 91–96¢ favourite lead re-run on an independent price source (Kalshi candle closes, 34 days) instead of checkpoints.
import fs from 'fs';import {et} from '../replay/lib.mjs';
const J=JSON.stringify,feeP=a=>0.07*a*(100-a)/100;
const B=new Map(JSON.parse(fs.readFileSync('lab/xcoin/data/BTC-rounds.json')).filter(r=>r.at).map(r=>[r.t,r]));
const R=JSON.parse(fs.readFileSync('lab/data/rounds.json'));
const stat=b=>{const n=b.length;if(!n)return{n:0};const m=b.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(b.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,n-1));return{n,mean:+m.toFixed(2),se:+(sd/Math.sqrt(n)).toFixed(2)};};
const pnl=(w,a)=>(w?100-a:-a)-feeP(a);
// (1) live-lock rounds (12–24 ET, 75–90, read ≥ ask+fee+3) and all-hours 75–90 favourites
for(const[name,sel]of[['live 4:00 lock',(o,a)=>{if(et(o.t).h<12||!a.f)return null;const c=a.pu>=.5?1:0,k=c?a.ya:a.na;return k>=75&&k<=90&&Math.max(a.pu,1-a.pu)*100>=k+feeP(k)+3?c:null;}],
 ['fav 75–90 all hours',(o,a)=>{const c=a.ya>=a.na?1:0,k=c?a.ya:a.na;return k>=75&&k<=90?c:null;}]]){
 const dAsk=[],dP=[],d3=[],d5=[];for(const o of R){const a=o.at[240],b=B.get(o.t);if(!a||a.ya==null||a.na==null||!b)continue;if(o.src!=='call')continue;const c=sel(o,a);if(c==null)continue;
  const q=b.at[240];if(!q||q.ya==null||q.na==null)continue;const ck=c?a.ya:a.na,cd=c?q.ya:q.na,w=o.up===c;dAsk.push(ck-cd);dP.push(pnl(w,cd)-pnl(w,ck));
  const q3=b.at[180],q5=b.at[300];if(q3&&q3.ya!=null){const k3=c?q3.ya:q3.na;d3.push(pnl(w,k3)-pnl(w,ck));}if(q5&&q5.ya!=null){const k5=c?q5.ya:q5.na;d5.push(pnl(w,k5)-pnl(w,ck));}}
 console.log(`${name} (RIPTIDE checkpoint era): checkpoint ask − candle 4:00 ask ${J(stat(dAsk))}; ¢/ct gain if bought at candle 4:00 ${J(stat(dP))}; at 3:00 ${J(stat(d3))}; at 5:00 ${J(stat(d5))}`);}
// (2) 91–96 favourite, first 2:00–4:00 minute close priced 91–96 (stop if already >96), candle prices
const H=[];for(const b of [...B.values()].sort((x,y)=>x.t-y.t)){for(const s of [120,180,240]){const q=b.at[s];if(!q||q.ya==null||q.na==null)continue;const c=q.ya>=q.na?1:0,k=c?q.ya:q.na;if(k>96)break;if(k>=91){H.push({t:b.t,p:pnl(b.up===c,k),w:b.up===c,k});break;}}}
const cut=H.length?[...B.keys()].sort((a,b)=>a-b)[Math.floor(B.size*.75)]:0;const S=h=>({...stat(h.map(x=>x.p)),win:Math.round(h.filter(x=>x.w).length/h.length*100),ask:Math.round(h.reduce((s,x)=>s+x.k,0)/h.length)});
console.log('91–96 favourite on Kalshi candle closes: whole',J(S(H)),'train',J(S(H.filter(x=>x.t<cut))),'test',J(S(H.filter(x=>x.t>=cut))),'from',new Date(Math.min(...B.keys())).toISOString().slice(0,10));
const NEW=Date.UTC(2026,10,1,23,15);console.log('  after the lead was written (Nov 1 23:15 UTC):',J(S(H.filter(x=>x.t>=NEW))));
