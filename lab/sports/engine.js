/* RIPTIDE sports engine: Kalshi game markets vs market consensus (DraftKings via ESPN, Polymarket, optional Odds API),
   plus intel: injuries/news (ESPN), line moves, Polymarket top sports traders' positions, big Kalshi trades.
   io = {kalshi(url)->json, json(url)->json, log(msg)}; cfg = settings. Paper picks only. */
async function sportsEngine(cfg,io){
const KX="https://api.elections.kalshi.com/trade-api/v2",ESPN="https://site.api.espn.com/apis/site/v2/sports",GAMMA="https://gamma-api.polymarket.com",DATA="https://data-api.polymarket.com",ODDS="https://api.the-odds-api.com/v4";
const LEAGUES=cfg.leagues||[
 {k:"KXNFLGAME",espn:"football/nfl",pm:"nfl",odds:"americanfootball_nfl",name:"NFL"},
 {k:"KXNCAAFGAME",espn:"football/college-football",q:["&groups=80&limit=300","&groups=81&limit=300"],pm:"cfb",odds:"americanfootball_ncaaf",name:"College football"},
 {k:"KXNBAGAME",espn:"basketball/nba",pm:"nba",odds:"basketball_nba",name:"NBA"},
 {k:"KXNCAAMBGAME",espn:"basketball/mens-college-basketball",q:"&groups=50&limit=300",pm:"cbb",odds:"basketball_ncaab",name:"College basketball"},
 {k:"KXNHLGAME",espn:"hockey/nhl",pm:"nhl",odds:"icehockey_nhl",name:"NHL"},
 {k:"KXMLBGAME",espn:"baseball/mlb",pm:"mlb",odds:"baseball_mlb",name:"MLB"},
 {k:"KXWNBAGAME",espn:"basketball/wnba",pm:"wnba",odds:"basketball_wnba",name:"WNBA"},
 {k:"KXEPLGAME",espn:"soccer/eng.1",pm:"epl",odds:"soccer_epl",name:"Premier League",draw:1},
 {k:"KXMLSGAME",espn:"soccer/usa.1",pm:"mls",odds:"soccer_usa_mls",name:"MLS",draw:1},
 {k:"KXUFCFIGHT",espn:"mma/ufc",pm:"ufc",odds:"mma_mixed_martial_arts",name:"UFC",fighters:1}];
const now=Date.now(),horizon=now+(cfg.hrs||48)*3600e3,notes=[],feeC=a=>(cfg.fee??.07)*a*(100-a)/100;
const cents=(m,k)=>m[k]!=null?+m[k]:(m[k+"_dollars"]!=null&&m[k+"_dollars"]!==""?Math.round(parseFloat(m[k+"_dollars"])*100):null);
const etDate=t=>new Date(t).toLocaleDateString("en-CA",{timeZone:"America/New_York"}); // YYYY-MM-DD
const ymd=t=>etDate(t).replace(/-/g,"");
const MON={JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12"};
const kDate=et=>{const m=et.match(/-(\d\d)([A-Z]{3})(\d\d)/);return m?`20${m[1]}-${MON[m[2]]}-${m[3]}`:null;};
const dayDiff=(a,b)=>Math.abs((Date.parse(a)-Date.parse(b))/864e5);
// ---- name matching ----
const STOP=new Set(["the","fc","sc","cf","afc","of","de","club","university"]);
const ALIAS={la:"los angeles",ny:"new york",sf:"san francisco",kc:"kansas city",tb:"tampa bay",gb:"green bay",ne:"new england",lv:"las vegas",okc:"oklahoma city",utd:"united",man:"manchester",wolves:"wolverhampton",spurs:"tottenham",miami_fl:"miami",ole:"ole"};
const norm=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/&/g," and ").replace(/\bst\./g,"state").replace(/[^a-z0-9() ]/g," ");
const toks=(s,keep)=>norm(s).replace(/[()]/g," ").split(/\s+/).filter(w=>w&&(keep||!STOP.has(w))).flatMap(w=>ALIAS[w]?ALIAS[w].split(" "):[w]);
function nameScore(label,team){ // team: {loc,nick,name,abbr,alt[]}
  const L=toks(label),Lk=toks(label,1);if(!Lk.length)return 0;let best=0;
  for(const v of [team.name,team.loc,team.nick,...(team.alt||[])]){if(!v)continue;const T=toks(v),Tk=toks(v,1);if(!Tk.length)continue;
    let hit=0;for(const w of Lk){if(Tk.includes(w))hit++;else if(w.length===1&&Tk.some(t=>t[0]===w))hit+=.8;}
    let s=hit/Lk.length;if(L.length&&T.length&&L.join(" ")===T.join(" "))s=1.2;
    // parenthetical qualifiers like Miami (OH) must agree
    const pq=norm(label).match(/\(([a-z]+)\)/),tq=norm(v).match(/\(([a-z]+)\)/);if((pq||tq)&&(!pq||!tq||pq[1]!==tq[1]))s*=.6;
    best=Math.max(best,s);}
  if(team.abbr&&norm(label).replace(/ /g,"")===norm(team.abbr))best=Math.max(best,1.1);
  return best;}
// best one-to-one assignment of labels to teams (2 or 3 labels; small brute force)
function assign(labels,teams){let best=null,bs=-1;const perm=(arr,k=0)=>{if(k===arr.length){let s=0,min=9;labels.forEach((l,i)=>{const v=nameScore(l,teams[arr[i]]);s+=v;min=Math.min(min,v);});if(min>=.5&&s>bs){bs=s;best=arr.slice();}return;}
  for(let i=k;i<arr.length;i++){[arr[k],arr[i]]=[arr[i],arr[k]];perm(arr,k+1);[arr[k],arr[i]]=[arr[i],arr[k]];}};
  if(labels.length<=teams.length){const idx=teams.map((_,i)=>i);const combos=[];const pick=(st,cur)=>{if(cur.length===labels.length){combos.push(cur.slice());return;}for(let i=st;i<idx.length;i++){cur.push(i);pick(i+1,cur);cur.pop();}};pick(0,[]);for(const c of combos)perm(c);}
  return best?{map:best,score:bs}:null;}
const isTie=l=>/^(tie|draw)$/i.test(String(l||"").trim());
const american=o=>{const x=parseFloat(String(o).replace("+",""));if(!isFinite(x)||x===0)return null;return x>0?100/(x+100):-x/(-x+100);};
const pts=x=>x==null?null:Math.round(x*1000)/10;
// ---- 1. collect per league ----
const games=[],legs=[],unmatched=[];let oddsCredits=null;
const days=[];for(let t=now-12*3600e3;t<=horizon;t+=864e5)days.push(ymd(t));if(!days.includes(ymd(horizon)))days.push(ymd(horizon));
for(const L of LEAGUES){
  let kms=[];try{let cur="";for(let pg=0;pg<6;pg++){const d=await io.kalshi(`${KX}/markets?series_ticker=${L.k}&status=open&limit=1000${cur?"&cursor="+cur:""}`);kms.push(...(d.markets||[]));cur=d.cursor;if(!cur)break;}}catch(e){notes.push(`${L.name}: Kalshi ${e.message}`);continue;}
  if(!kms.length)continue;
  // ESPN games
  const eg=[],seenG=new Set();for(const d of new Set(days))for(const q of [].concat(L.q||"")){try{const j=await io.json(`${ESPN}/${L.espn}/scoreboard?dates=${d}${q}`);
    for(const ev of j.events||[])for(const c of (L.fighters?ev.competitions:[ev.competitions[0]])||[]){if(seenG.has(c.id||ev.id))continue;seenG.add(c.id||ev.id);const st=Date.parse(c.date||ev.date);if(!(st>now-15*60e3&&st<horizon))continue;if((c.status||ev.status)?.type?.state!=="pre")continue;
      const teams=c.competitors.map(t=>{const T=t.team||{},A=t.athlete||{};return{id:T.id||A.id,loc:T.location||A.displayName,nick:T.shortDisplayName||T.name||A.shortName,name:T.displayName||A.displayName,abbr:T.abbreviation,alt:[T.name,A.shortName,A.lastName].filter(Boolean),side:t.homeAway||t.order};});
      const o=c.odds?.[0],ml=o?.moneyline;let dk=null;
      if(ml&&ml.home?.close?.odds){const h=american(ml.home.close.odds),a=american(ml.away?.close?.odds),dr=L.draw?american(ml.draw?.close?.odds??o.drawOdds?.moneyLine):0;
        const ho=american(ml.home.open?.odds),ao=american(ml.away?.open?.odds),dro=L.draw?american(ml.draw?.open?.odds):0;
        if(h&&a&&(!L.draw||dr)){const s=h+a+(dr||0),so=(ho&&ao)?ho+ao+(dro||0):null;const hi=teams.findIndex(t=>t.side==="home"),ai=teams.findIndex(t=>t.side==="away");
          dk={by:{},open:{},prov:o.provider?.name||"DraftKings"};if(hi>=0){dk.by[hi]=h/s;if(so)dk.open[hi]=ho/so;}if(ai>=0){dk.by[ai]=a/s;if(so)dk.open[ai]=ao/so;}if(L.draw){dk.by.draw=dr/s;if(so&&dro)dk.open.draw=dro/so;}}}
      eg.push({league:L,id:c.id||ev.id,eventId:ev.id,start:st,teams,dk,title:L.fighters?teams.map(t=>t.name).join(" vs "):`${teams.find(t=>t.side==="away")?.name} @ ${teams.find(t=>t.side==="home")?.name}`});}}
    catch(e){notes.push(`${L.name}: ESPN ${d} ${e.message}`);}}
  // Polymarket game prices
  const pmev=[];try{for(let off=0;off<600;off+=100){const j=await io.json(`${GAMMA}/events?tag_slug=${L.pm}&closed=false&end_date_min=${new Date(now-864e5).toISOString()}&end_date_max=${new Date(horizon+2*864e5).toISOString()}&limit=100&offset=${off}`);
      pmev.push(...j.filter(e=>(e.markets||[]).some(m=>m.sportsMarketType==="moneyline")));if(j.length<100)break;}}catch(e){notes.push(`${L.name}: Polymarket ${e.message}`);}
  // Odds API consensus (optional)
  let oa=[];if(cfg.oddsKey){try{oa=await io.json(`${ODDS}/sports/${L.odds}/odds?apiKey=${encodeURIComponent(cfg.oddsKey)}&bookmakers=pinnacle,draftkings,fanduel,betmgm,williamhill_us,betonlineag,bovada,lowvig,betrivers,espnbet&markets=h2h&oddsFormat=decimal`);}catch(e){notes.push(`${L.name}: Odds API ${e.message}`);}}
  // ---- match everything to ESPN games ----
  for(const g of eg){
    // Polymarket event: date within a day and outcome names fit the teams
    g.pm=null;let pmBest=-1;for(const e of pmev){const ds=(e.slug.match(/(\d{4}-\d{2}-\d{2})/)||[])[1];if(ds&&dayDiff(ds,etDate(g.start))>1.01)continue;const st=Date.parse(e.startTime||e.startDate||"");if(isFinite(st)&&Math.abs(st-g.start)>6*3600e3)continue;
      const mls=e.markets.filter(m=>m.sportsMarketType==="moneyline"&&!m.closed);if(!mls.length)continue;let by={},mk={};
      const parse=x=>{try{return typeof x==="string"?JSON.parse(x):x;}catch(_){return null;}};
      let sc=0;if(mls.length===1){const m=mls[0],oc=parse(m.outcomes),pr=parse(m.outcomePrices);if(!oc||oc.length!==2)continue;const a=assign(oc,g.teams);if(!a)continue;sc=a.score;oc.forEach((o,i)=>{by[a.map[i]]=+pr[i];});mk[m.slug]={type:"two",oc,team:Object.fromEntries(oc.map((o,i)=>[o,a.map[i]]))};}
      else{const lab=[],ms=[];for(const m of mls){const q=m.question||"";if(/draw/i.test(q)){const pr=parse(m.outcomePrices);by.draw=+pr[0];mk[m.slug]={type:"yn",team:"draw"};continue;}
          const nm=(q.match(/^Will (.+?) win/)||[])[1];if(nm){lab.push(nm);ms.push(m);}}
        if(!lab.length)continue;const a=assign(lab,g.teams);if(!a)continue;sc=a.score;ms.forEach((m,i)=>{const pr=parse(m.outcomePrices);by[a.map[i]]=+pr[0];mk[m.slug]={type:"yn",team:a.map[i]};});}
      const tot=Object.values(by).reduce((x,y)=>x+y,0);if(tot<.5||sc<=pmBest)continue;for(const k in by)by[k]/=tot;pmBest=sc;g.pm={slug:e.slug,by,mk};}
    // Odds API consensus
    g.oa=null;if(oa.length){for(const ev of oa){if(Math.abs(Date.parse(ev.commence_time)-g.start)>6*3600e3)continue;const a=assign([ev.home_team,ev.away_team],g.teams);if(!a)continue;
        const per={};let nb=0;for(const bk of ev.bookmakers||[]){const mk=(bk.markets||[]).find(x=>x.key==="h2h");if(!mk)continue;const inv=mk.outcomes.map(o=>1/o.price),s=inv.reduce((x,y)=>x+y,0);nb++;
          mk.outcomes.forEach((o,i)=>{const k=o.name===ev.home_team?a.map[0]:o.name===ev.away_team?a.map[1]:"draw";(per[k]??=[]).push(inv[i]/s);});}
        const by={},spread={};for(const k in per){const v=per[k].sort((x,y)=>x-y);by[k]=v[v.length>>1];spread[k]=v.at(-1)-v[0];}g.oa={by,spread,n:nb};break;}}
    games.push(g);}
  // Kalshi events → ESPN games
  const evs={};for(const m of kms)(evs[m.event_ticker]??=[]).push(m);
  for(const[et,ms]of Object.entries(evs)){const kd=kDate(et);
    const labs=ms.map(m=>m.yes_sub_title||(m.title||"").replace(/ wins$| is the result$/,""));const real=labs.map((l,i)=>[l,i]).filter(([l])=>!isTie(l));
    let best=null,bs=-1;for(const g of eg){if(kd&&dayDiff(kd,etDate(g.start))>1.01)continue;const occ=Date.parse(ms[0].occurrence_datetime||ms[0].expected_expiration_time||"");if(isFinite(occ)&&Math.abs(occ-g.start)>16*3600e3)continue;
      const a=assign(real.map(x=>x[0]),g.teams);if(a&&a.score>bs){bs=a.score;best={g,a};}}
    if(!best){const occ=Date.parse(ms[0].occurrence_datetime||"");if(!isFinite(occ)||occ<horizon+4*3600e3)unmatched.push(`${L.name}: ${labs.join(" / ")}`);continue;}
    const g=best.g;g.kalshi=true;
    ms.forEach((m,i)=>{const ti=isTie(labs[i])?"draw":best.a.map[real.findIndex(x=>x[1]===i)];if(ti==null)return;const ask=cents(m,"yes_ask"),prev=cents(m,"previous_yes_ask"),bid=cents(m,"yes_bid");
      if(ask==null||ask<=0||ask>=100)return;
      const src={};if(g.dk&&g.dk.by[ti]!=null)src.dk=g.dk.by[ti];if(g.pm&&g.pm.by[ti]!=null)src.pm=g.pm.by[ti];if(g.oa&&g.oa.by[ti]!=null)src.books=g.oa.by[ti];
      const vals=Object.values(src);const fair=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null,spread=vals.length>1?Math.max(...vals)-Math.min(...vals):(g.oa&&g.oa.spread[ti])||0;
      const cost=ask+feeC(ask),edge=fair==null?null:fair*100-cost;const team=ti==="draw"?{name:"Draw"}:g.teams[ti];
      const opp=ti==="draw"?null:g.teams.findIndex((_,k)=>k!==ti);
      legs.push({ticker:m.ticker,event:et,g,ti,opp,pick:ti==="draw"?"Draw":team.name,ask,bid,prev,cost,fair,src,nSrc:vals.length+(g.oa?g.oa.n-1:0),spread,edge,league:L.name,start:g.start,
        dkMove:g.dk&&g.dk.open[ti]!=null?g.dk.by[ti]-g.dk.open[ti]:null,kMove:prev!=null?ask-prev:null});});}}
// ---- 2. intel for candidate legs ----
// Polymarket top sports traders (verified on-chain profit): month + all-time leaders
let leaders=[];try{const a=await io.json(`${DATA}/v1/leaderboard?category=SPORTS&timePeriod=MONTH&orderBy=PNL&limit=50`),b=await io.json(`${DATA}/v1/leaderboard?category=SPORTS&timePeriod=ALL&orderBy=PNL&limit=50`);
  const seen=new Set();for(const u of [...a,...b])if(!seen.has(u.proxyWallet)){seen.add(u.proxyWallet);leaders.push(u);}}catch(e){notes.push("Polymarket leaderboard: "+e.message);}
const slugGame={};for(const g of games)if(g.pm)slugGame[g.pm.slug]=g;
const sharp={}; // key gameId|teamIndex -> {for$,against$,forN,againstN,names}
if(leaders.length&&Object.keys(slugGame).length){const res=await Promise.allSettled(leaders.map(u=>io.json(`${DATA}/positions?user=${u.proxyWallet}&limit=500&sizeThreshold=1`).then(ps=>[u,ps])));
  for(const r of res){if(r.status!=="fulfilled")continue;const[u,ps]=r.value;
    for(const p of ps||[]){const g=slugGame[p.eventSlug];if(!g||p.redeemable)continue;const mk=g.pm.mk[p.slug];if(!mk)continue;const v=+p.currentValue||0;if(v<cfg.minPos||v<50)continue;
      const add=(ti,dir)=>{const k=g.id+"|"+ti,s=(sharp[k]??={f:0,a:0,fn:new Set(),an:new Set()});if(dir>0){s.f+=v;s.fn.add(u.userName||u.proxyWallet.slice(0,8));}else{s.a+=v;s.an.add(u.userName||u.proxyWallet.slice(0,8));}};
      if(mk.type==="two"){const ti=mk.team[p.outcome];if(ti==null)continue;add(ti,1);for(let k=0;k<g.teams.length;k++)if(k!==ti)add(k,-1);}
      else{const ti=mk.team;const yes=/^yes$/i.test(p.outcome);add(ti,yes?1:-1);if(yes&&ti!=="draw")for(let k=0;k<g.teams.length;k++)if(k!==ti)add(k,-1);}}}}
for(const l of legs){const s=sharp[l.g.id+"|"+l.ti];l.sharp=s?{f:s.f,a:s.a,fn:[...s.fn],an:[...s.an]}:null;}
// ESPN game summaries (injuries, news, matchup predictor) and big Kalshi trades: legs closest to value or backed by top traders
const cand=legs.filter(l=>l.edge!=null&&l.nSrc>=(cfg.minSrc??2)&&Math.abs(l.ask-l.fair*100)<=15).map(l=>({l,k:l.edge+(l.sharp?Math.min(4,Math.abs(l.sharp.f-l.sharp.a)/5000):0)})).sort((a,b)=>b.k-a.k).slice(0,cfg.maxIntel||40).map(x=>x.l);
const sumCache={};
for(const l of cand){const g=l.g;l.intel=true;
  try{if(!(g.eventId in sumCache))sumCache[g.eventId]=await io.json(`${ESPN}/${g.league.espn}/summary?event=${g.eventId}`);const S=sumCache[g.eventId];
    if(l.ti!=="draw"){const tm=g.teams[l.ti],op=g.teams[l.opp];
      const injOf=t=>{const blk=(S.injuries||[]).find(x=>x.team&&(x.team.id==t.id||x.team.displayName===t.name));return(blk?.injuries||[]).filter(i=>/out|doubtful/i.test(i.status||"")).map(i=>({n:i.athlete?.displayName,pos:i.athlete?.position?.abbreviation,st:i.status,fresh:Date.parse(i.date||0)>now-24*3600e3}));};
      l.inj={own:injOf(tm),opp:op?injOf(op):[]};
      l.news=(S.news?.articles||[]).filter(a=>(a.categories||[]).some(c=>c.description===tm.name||c.description===op?.name)&&Date.parse(a.published||0)>now-48*3600e3).slice(0,3).map(a=>({h:a.headline,t:a.published,u:a.links?.web?.href}));
      const pr=S.predictor;if(pr){const side=tm.side==="home"?pr.homeTeam:pr.awayTeam;if(side?.gameProjection)l.espnProj=+side.gameProjection/100;}}}catch(e){}
  try{const d=await io.kalshi(`${KX}/markets/trades?ticker=${l.ticker}&limit=1000&min_ts=${Math.floor((now-24*3600e3)/1000)}`);let f=0,a=0,nb=0;
    for(const t of d.trades||[]){const c=+(t.count_fp??t.count??0),yp=t.yes_price_dollars!=null?+t.yes_price_dollars:(t.yes_price||0)/100,usd=t.taker_side==="yes"?c*yp:c*(1-yp);if(usd<(cfg.bigTrade||250))continue;nb++;if(t.taker_side==="yes")f+=usd;else a+=usd;}
    l.big={f,a,n:nb};}catch(e){}
}
// ---- 3. verdicts ----
for(const l of legs){l.flags=[];l.boost=[];l.ok=false;if(l.edge==null)continue;
  if(l.sharp){const net=l.sharp.f-l.sharp.a;if(net<=-(cfg.sharpVeto||5000)&&l.sharp.an.length>l.sharp.fn.length)l.flags.push(`top traders against ($${Math.round(l.sharp.a/1000)}k)`);else if(net>=(cfg.sharpVeto||5000)/2&&l.sharp.fn.length>=l.sharp.an.length)l.boost.push(`top traders on it ($${Math.round(l.sharp.f/1000)}k, ${l.sharp.fn.length})`);}
  if(l.dkMove!=null){if(l.dkMove<=-(cfg.moveVeto||.03))l.flags.push(`line moved ${pts(l.dkMove)} pts against since open`);else if(l.dkMove>=.02)l.boost.push(`line moved +${pts(l.dkMove)} pts its way`);}
  if(l.big&&l.big.a-l.big.f>=(cfg.bigVeto||2000))l.flags.push(`big Kalshi money against ($${Math.round((l.big.a-l.big.f)/100)/10}k)`);else if(l.big&&l.big.f-l.big.a>=(cfg.bigVeto||2000))l.boost.push(`big Kalshi money on it ($${Math.round((l.big.f-l.big.a)/100)/10}k)`);
  if(l.inj&&l.inj.own.some(i=>i.fresh)&&l.spread*100>(cfg.agree??4)/2)l.flags.push(`fresh injury news (${l.inj.own.filter(i=>i.fresh).map(i=>i.n).join(", ")}) and prices still unsettled`);
  if(l.fair!=null&&Math.abs(l.ask-l.fair*100)>15)l.flags.push(`Kalshi price ${Math.round(Math.abs(l.ask-l.fair*100))} pts away from the books: likely breaking news, an in-game market or a mismatch`);
  l.ok=l.edge>=(cfg.edge??2)&&l.nSrc>=(cfg.minSrc??2)&&l.spread*100<=(cfg.agree??4)&&(!cfg.useVeto||!l.flags.length);}
return{legs,games,unmatched,notes,leaders:leaders.length,oddsCredits};}
if(typeof module!=="undefined")module.exports={sportsEngine};
