// Builds xmarkets/map.json: every Kalshi market that has an equivalent Polymarket market (except sports, which the sportsbook prices).
// 1) downloads all open non-sports Kalshi events and Polymarket events (public APIs, ~5 min; cached in lab/data/xm/ for 3 hours)
// 2) election rules (rules.mjs), then the generic matcher (auto.mjs) for everything else: mentions (what Trump/others will say),
//    culture, companies, tech/AI, weather, economics, world events.
// Usage (repo root): node lab/xmarkets/build.mjs
import fs from 'fs';import {rulePairs} from './rules.mjs';import {autoPairs} from './auto.mjs';
const KX="https://api.elections.kalshi.com/trade-api/v2",GAMMA="https://gamma-api.polymarket.com",D='lab/data/xm/';fs.mkdirSync(D,{recursive:true});
const sl=ms=>new Promise(r=>setTimeout(r,ms));
const j=async u=>{for(let a=0;a<6;a++){try{const r=await fetch(u);if(r.status===429){await sl(1500*(a+1));continue;}if(!r.ok)throw new Error(r.status);return await r.json();}catch(e){await sl(1000);}}throw new Error("failed "+u);};
const fresh=f=>fs.existsSync(D+f)&&Date.now()-fs.statSync(D+f).mtimeMs<3*3600e3;
if(!fresh('kalshi.json')){const KE=[];let cur="";for(let p=0;p<400;p++){const d=await j(`${KX}/events?status=open&limit=200&with_nested_markets=true${cur?"&cursor="+cur:""}`);
  for(const e of d.events||[])if(e.category!=="Sports")KE.push({t:e.event_ticker,s:e.series_ticker,c:e.category,title:e.title,sub:e.sub_title,m:e.markets.filter(m=>m.status==="active").map(m=>({t:m.ticker,title:m.title,ys:m.yes_sub_title,close:m.close_time,exp:m.expected_expiration_time||m.expiration_time,ya:m.yes_ask_dollars,yb:m.yes_bid_dollars}))});
  cur=d.cursor;if(!cur||!(d.events||[]).length)break;await sl(100);}fs.writeFileSync(D+'kalshi.json',JSON.stringify(KE));}
if(!fresh('poly.json')){const PE=new Map();let cur="";for(let pg=0;pg<3000;pg++){const R=await j(`${GAMMA}/events/keyset?closed=false&active=true&limit=100${cur?"&after_cursor="+cur:""}`);const d=R.events||[];if(!d.length)break;cur=R.next_cursor;
  for(const e of d){const tags=(e.tags||[]).map(t=>t.slug);if(tags.includes("sports")||tags.includes("esports"))continue;
    PE.set(e.slug,{slug:e.slug,title:e.title,end:e.endDate,tags,m:(e.markets||[]).filter(m=>!m.closed&&m.active!==false).map(m=>({slug:m.slug,q:m.question,g:m.groupItemTitle,end:m.endDate,p:m.outcomePrices,bb:m.bestBid,ba:m.bestAsk}))});}
  if(!cur)break;await sl(60);}fs.writeFileSync(D+'poly.json',JSON.stringify([...PE.values()]));}
const KE=JSON.parse(fs.readFileSync(D+'kalshi.json')),PE=JSON.parse(fs.readFileSync(D+'poly.json'));
// election rules work on Kalshi's API shape
const KEapi=KE.map(e=>({event_ticker:e.t,title:e.title,category:e.c,markets:e.m.map(m=>({ticker:m.t,event_ticker:e.t,status:"active",yes_sub_title:m.ys,yes_bid_dollars:m.yb,title:m.title}))}));
const PMq=new Map();for(const e of PE)for(const m of e.m)if(m.slug)PMq.set(m.slug,{slug:m.slug,q:m.q,event:e.slug,end:m.end});
const rp=rulePairs(KEapi,PMq).map(p=>({...p,cat:"Elections"}));
const cat=new Map(KE.map(e=>[e.t,e.c]));const pe=new Map();for(const e of PE)for(const m of e.m)pe.set(m.slug,e.slug);
const {pairs:ap,stats}=autoPairs(KE,PE);
const seenP=new Set(rp.map(p=>p.pm)),seenK=new Set(rp.map(p=>p.kx));const pairs=rp.map(p=>({...p,pe:pe.get(p.pm)}));
for(const a of ap){if(seenP.has(a.pm)||seenK.has(a.kx))continue;seenP.add(a.pm);seenK.add(a.kx);pairs.push({pm:a.pm,q:a.q,pe:a.pe,pOpt:a.pOpt||undefined,kx:a.kx,ke:a.ke,kTitle:a.kTitle,kOpt:a.kOpt,cat:a.kc,rule:"auto",how:a.how,loose:a.loose});}
fs.mkdirSync("xmarkets",{recursive:true});
fs.writeFileSync("xmarkets/map.json",JSON.stringify({at:new Date().toISOString(),note:"Polymarket Yes = Kalshi YES. rule = election rules (high confidence); auto = generic matcher (check both rule pages; loose = wording or data source may differ).",pairs}));
const by={};for(const p of pairs)by[p.cat]=(by[p.cat]||0)+1;
console.log(`kalshi events ${KE.length}, polymarket events ${PE.length}; pairs ${pairs.length} (rules ${rp.length}, auto ${pairs.length-rp.length})`,by,stats);
