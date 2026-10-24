// Live scan from Node (needs network to Kalshi, ESPN, Polymarket): NODE_USE_ENV_PROXY=1 node lab/sports/scan.mjs
import {createRequire} from 'module';const require=createRequire(import.meta.url);const {sportsEngine}=require('./engine.js');
const get=async u=>{for(let i=0;i<3;i++){try{const r=await fetch(u);if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){if(i==2)throw e;await new Promise(s=>setTimeout(s,800));}}};
const t0=Date.now();const R=await sportsEngine({hrs:36,useVeto:true},{kalshi:get,json:get});
console.log('secs',(Date.now()-t0)/1000,'games',R.games.filter(g=>g.kalshi).length,'legs',R.legs.length,'notes',R.notes.slice(0,8));
const by={};for(const l of R.legs){const k=l.league+' '+l.mk;(by[k]??={n:0,priced:0,two:0,ok:0,gap:0});by[k].n++;if(l.fair!=null){by[k].priced++;by[k].gap+=Math.abs(l.ask-l.fair*100);}if(l.nSrc>=2)by[k].two++;if(l.ok)by[k].ok++;}
for(const[k,v]of Object.entries(by))console.log(k.padEnd(28),'legs',v.n,'priced',v.priced,'2src',v.two,'value',v.ok,'avg gap',(v.gap/Math.max(1,v.priced)).toFixed(2));
const f=x=>x==null?'-':(x*100).toFixed(1);
console.log('--- top by edge (priced)');for(const l of R.legs.filter(l=>l.edge!=null).sort((a,b)=>b.edge-a.edge).slice(0,25))console.log(`${l.ok?'OK':'  '} ${l.league} ${l.mk} | ${l.g.title} | ${l.label} [${l.side}] ask ${l.ask} fair ${f(l.fair)} (dk ${f(l.src.dk)} pm ${f(l.src.pm)}) edge ${l.edge.toFixed(1)} sharp ${l.sharp?Math.round(l.sharp.f)+'/'+Math.round(l.sharp.a):'-'} flags ${l.flags.join(';')} boost ${l.boost.join(';')}`);
console.log('--- sanity spreads at DK line');for(const l of R.legs.filter(l=>l.mk==='SPREAD'&&l.src.dk!=null).slice(0,6))console.log(l.g.title,l.label,l.side,'ask',l.ask,'dk',f(l.src.dk),'pm',f(l.src.pm));
console.log('--- sanity totals');for(const l of R.legs.filter(l=>l.mk==='TOTAL'&&l.src.dk!=null).slice(0,6))console.log(l.g.title,l.label,'ask',l.ask,'dk',f(l.src.dk),'pm',f(l.src.pm));
console.log('--- props priced');for(const l of R.legs.filter(l=>l.mk==='PROP'&&l.fair!=null).slice(0,8))console.log(l.g.title,'|',l.label,l.side,'ask',l.ask,'pm',f(l.src.pm),'edge',l.edge.toFixed(1),l.sharp?'sharp '+Math.round(l.sharp.f)+'/'+Math.round(l.sharp.a):'');
