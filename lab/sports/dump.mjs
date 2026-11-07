// Dumps today's priced Kalshi sports legs (with fair chance, edge, sharp money, expert picks) for the Bet of the Day run.
// Usage: NODE_USE_ENV_PROXY=1 node lab/sports/dump.mjs out.json [hours=36]
import {createRequire} from 'module';import {readFileSync,writeFileSync} from 'fs';
const require=createRequire(import.meta.url);const {sportsEngine}=require('./engine.js');
const get=async u=>{for(let i=0;i<3;i++){try{const r=await fetch(u);if(r.status===429){await new Promise(s=>setTimeout(s,1500));continue;}if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){if(i==2)throw e;await new Promise(s=>setTimeout(s,800));}}};
let picks=[];try{const o=JSON.parse(readFileSync(new URL('../../picks/latest.json',import.meta.url)));if(Date.now()-Date.parse(o.at)<36*3600e3)picks=o.picks||[];}catch(e){}
const R=await sportsEngine({hrs:+(process.argv[3]||36),useVeto:true,picks,oddsKey:process.env.ODDS_KEY||""},{kalshi:get,json:get});
const legs=R.legs.filter(l=>l.fair!=null&&l.start>Date.now()).map(l=>({id:l.id,league:l.league,game:l.g.title,start:new Date(l.start).toISOString(),mk:l.mk,label:l.label,player:l.player||null,
  ask:l.ask,cost:l.cost,fair:+(l.fair*100).toFixed(1),edge:+l.edge.toFixed(2),nSrc:l.nSrc,src:Object.fromEntries(Object.entries(l.src||{}).filter(([k,v])=>v!=null).map(([k,v])=>[k,+(v*100).toFixed(1)])),
  sharp:l.sharp?{for:Math.round(l.sharp.f),against:Math.round(l.sharp.a),who:l.sharp.fn.slice(0,4)}:null,picks:(l.picks||[]).map(p=>p.src),flags:l.flags,boost:l.boost,ok:!!l.ok}));
writeFileSync(process.argv[2],JSON.stringify({at:new Date().toISOString(),notes:R.notes,legs}));
console.log('legs',legs.length,'with expert picks',legs.filter(l=>l.picks.length).length,'with sharp money',legs.filter(l=>l.sharp).length,'notes',R.notes.slice(0,5));
