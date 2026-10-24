/* RIPTIDE sportsbook engine. Every Kalshi game market (moneyline, spread, total, team total, player props) is priced
   against outside markets: DraftKings (via ESPN) and Polymarket (+ optional Odds API books for moneylines), then checked
   against sharp money (Polymarket top sports traders' positions, big Kalshi trades, line moves), injuries and news.
   io = {kalshi(url)->json, json(url)->json}. Paper picks only. */
async function sportsEngine(cfg,io){
const KX="https://api.elections.kalshi.com/trade-api/v2",ESPN="https://site.api.espn.com/apis/site/v2/sports",GAMMA="https://gamma-api.polymarket.com",DATA="https://data-api.polymarket.com",ODDS="https://api.the-odds-api.com/v4";
const P=(k,stat,unit)=>({k,stat,unit});
const LEAGUES=[
 {id:"NFL",game:"KXNFLGAME",espn:"football/nfl",pm:"nfl",odds:"americanfootball_nfl",spread:"KXNFLSPREAD",total:"KXNFLTOTAL",tt:"KXNFLTEAMTOTAL",props:[P("KXNFLPASSYDS","Passing yards","pass yds"),P("KXNFLRSHYDS","Rushing yards","rush yds"),P("KXNFLRECYDS","Receiving yards","rec yds"),P("KXNFLREC","Receptions","rec"),P("KXNFLTD","Touchdowns","TD"),P("KXNFLPASSTDS","Passing TDs","pass TD")]},
 {id:"NCAAF",name:"College football",game:"KXNCAAFGAME",espn:"football/college-football",q:["&groups=80&limit=300","&groups=81&limit=300"],pm:"cfb",odds:"americanfootball_ncaaf",spread:"KXNCAAFSPREAD",total:"KXNCAAFTOTAL",tt:"KXNCAAFTEAMTOTAL",props:[]},
 {id:"NBA",game:"KXNBAGAME",espn:"basketball/nba",pm:"nba",odds:"basketball_nba",spread:"KXNBASPREAD",total:"KXNBATOTAL",tt:"KXNBATEAMTOTAL",props:[P("KXNBAPTS","Points","pts"),P("KXNBAREB","Rebounds","reb"),P("KXNBAAST","Assists","ast"),P("KXNBA3PT","Threes","3PM"),P("KXNBASTL","Steals","stl"),P("KXNBABLK","Blocks","blk"),P("KXNBAPRA","Pts+Reb+Ast","PRA")]},
 {id:"NCAAB",name:"College basketball",game:"KXNCAAMBGAME",espn:"basketball/mens-college-basketball",q:["&groups=50&limit=300"],pm:"cbb",odds:"basketball_ncaab",props:[]},
 {id:"NHL",game:"KXNHLGAME",espn:"hockey/nhl",pm:"nhl",odds:"icehockey_nhl",spread:"KXNHLSPREAD",total:"KXNHLTOTAL",tt:"KXNHLTEAMTOTAL",props:[P("KXNHLGOAL","Goals","G"),P("KXNHLPTS","Points","pts"),P("KXNHLAST","Assists","ast")]},
 {id:"MLB",game:"KXMLBGAME",espn:"baseball/mlb",pm:"mlb",odds:"baseball_mlb",props:[]},
 {id:"WNBA",game:"KXWNBAGAME",espn:"basketball/wnba",pm:"wnba",odds:"basketball_wnba",props:[]},
 {id:"EPL",name:"Premier League",game:"KXEPLGAME",espn:"soccer/eng.1",pm:"epl",odds:"soccer_epl",draw:1,spread:"KXEPLSPREAD",total:"KXEPLTOTAL",props:[]},
 {id:"MLS",game:"KXMLSGAME",espn:"soccer/usa.1",pm:"mls",odds:"soccer_usa_mls",draw:1,spread:"KXMLSSPREAD",total:"KXMLSTOTAL",props:[]},
 {id:"UFC",game:"KXUFCFIGHT",espn:"mma/ufc",pm:"ufc",odds:"mma_mixed_martial_arts",fighters:1,props:[]}].filter(L=>!cfg.only||cfg.only.includes(L.id));
const PMSTAT={Points:"points",Rebounds:"rebounds",Assists:"assists",Threes:"threes",Steals:"steals",Blocks:"blocks"};
const now=Date.now(),horizon=now+(cfg.hrs||48)*3600e3,notes=[],feeC=a=>(cfg.fee??.07)*a*(100-a)/100,maxGap=cfg.maxSpread??4;
const cents=(m,k)=>m[k]!=null?+m[k]:(m[k+"_dollars"]!=null&&m[k+"_dollars"]!==""?Math.round(parseFloat(m[k+"_dollars"])*100):null);
const etDate=t=>new Date(t).toLocaleDateString("en-CA",{timeZone:"America/New_York"}),ymd=t=>etDate(t).replace(/-/g,"");
const MON={JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12"};
const kDate=et=>{const m=et.match(/-(\d\d)([A-Z]{3})(\d\d)/);return m?`20${m[1]}-${MON[m[2]]}-${m[3]}`:null;};
const suffix=et=>et.slice(et.indexOf("-")+1);
const dayDiff=(a,b)=>Math.abs((Date.parse(a)-Date.parse(b))/864e5);
const parse=x=>{try{return typeof x==="string"?JSON.parse(x):x;}catch(_){return null;}};
// ---- names ----
const STOP=new Set(["the","fc","sc","cf","afc","of","de","club","university"]);
const ALIAS={la:"los angeles",ny:"new york",sf:"san francisco",kc:"kansas city",tb:"tampa bay",gb:"green bay",ne:"new england",lv:"las vegas",okc:"oklahoma city",utd:"united",man:"manchester",wolves:"wolverhampton",spurs:"tottenham"};
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/\bst\./g,"state").replace(/[^a-z0-9() ]/g," ");
const toks=(s,keep)=>norm(s).replace(/[()]/g," ").split(/\s+/).filter(w=>w&&(keep||!STOP.has(w))).flatMap(w=>ALIAS[w]?ALIAS[w].split(" "):[w]);
function nameScore(label,team){const L=toks(label),Lk=toks(label,1);if(!Lk.length)return 0;let best=0;
  for(const v of [team.name,team.loc,team.nick,...(team.alt||[])]){if(!v)continue;const T=toks(v),Tk=toks(v,1);if(!Tk.length)continue;
    let hit=0;for(const w of Lk){if(Tk.includes(w))hit++;else if(w.length===1&&Tk.some(t=>t[0]===w))hit+=.8;}
    let s=hit/Lk.length;if(L.length&&T.length&&L.join(" ")===T.join(" "))s=1.2;
    const pq=norm(label).match(/\(([a-z]+)\)/),tq=norm(v).match(/\(([a-z]+)\)/);if((pq||tq)&&(!pq||!tq||pq[1]!==tq[1]))s*=.6;best=Math.max(best,s);}
  if(team.abbr&&norm(label).replace(/ /g,"")===norm(team.abbr))best=Math.max(best,1.1);return best;}
function assign(labels,teams){let best=null,bs=-1;const perm=(arr,k=0)=>{if(k===arr.length){let s=0,min=9;labels.forEach((l,i)=>{const v=nameScore(l,teams[arr[i]]);s+=v;min=Math.min(min,v);});if(min>=.5&&s>bs){bs=s;best=arr.slice();}return;}
  for(let i=k;i<arr.length;i++){[arr[k],arr[i]]=[arr[i],arr[k]];perm(arr,k+1);[arr[k],arr[i]]=[arr[i],arr[k]];}};
  if(labels.length<=teams.length){const combos=[];const pick=(st,cur)=>{if(cur.length===labels.length){combos.push(cur.slice());return;}for(let i=st;i<teams.length;i++){cur.push(i);pick(i+1,cur);cur.pop();}};pick(0,[]);for(const c of combos)perm(c);}
  return best?{map:best,score:bs}:null;}
const teamOf=(label,g)=>{let bi=-1,bs=.5;g.teams.forEach((t,i)=>{const s=nameScore(label,t);if(s>bs){bs=s;bi=i;}});return bi<0?null:bi;};
const pname=s=>norm(s).replace(/\b(jr|sr|ii|iii|iv)\b/g,"").replace(/\s+/g," ").trim();
const isTie=l=>/^(tie|draw)$/i.test(String(l||"").trim());
const american=o=>{const x=parseFloat(String(o).replace("+",""));if(!isFinite(x)||x===0)return null;return x>0?100/(x+100):-x/(-x+100);};
const nv2=(a,b)=>{const x=american(a),y=american(b);return x&&y?x/(x+y):null;};
const lineNum=s=>{const x=parseFloat(String(s||"").replace(/^[ou]/i,""));return isFinite(x)?x:null;};
const pmPrice=m=>{const bb=+m.bestBid,ba=+m.bestAsk;if(isFinite(bb)&&isFinite(ba)&&ba>0&&ba-bb<=.06)return(bb+ba)/2;const pr=parse(m.outcomePrices);if(!(isFinite(bb)&&isFinite(ba)))return pr?+pr[0]:null;return null;}; // price of outcome[0]; null if book too wide
// ---- collect ----
const games=[],legs=[],unmatched=[];
const days=[];for(let t=now-12*3600e3;t<=horizon;t+=864e5)days.push(ymd(t));if(!days.includes(ymd(horizon)))days.push(ymd(horizon));
// Kalshi is shared with the BTC engine: keep sportsbook traffic gentle (2 at a time, 300 ms apart) and stop at the first sign of rate limiting.
let kLive=0,kLast=0,kErr=0;const KQ_GAP=cfg.kGap??600,KQ_MAX=cfg.kMax??1;
const kq=async u=>{if(kErr>=3)throw new Error("Kalshi is rate-limiting; sportsbook paused so BTC prices keep flowing");
  while(kLive>=KQ_MAX||Date.now()-kLast<KQ_GAP)await new Promise(r=>setTimeout(r,40));kLive++;kLast=Date.now();
  try{const d=await io.kalshi(u);kErr=0;return d;}catch(e){kErr++;if(/429|too many/i.test(e.message))kErr=3;throw e;}finally{kLive--;}};
const kAll=async series=>{const out=[];let cur="";for(let pg=0;pg<8;pg++){const d=await kq(`${KX}/markets?series_ticker=${series}&status=open&limit=1000${cur?"&cursor="+cur:""}`);out.push(...(d.markets||[]));cur=d.cursor;if(!cur)break;}return out;};
const book=(m)=>{const ya=cents(m,"yes_ask"),na=cents(m,"no_ask");return{ya,na,ok:ya!=null&&na!=null&&ya>0&&na>0&&ya<100&&na<100&&ya+na-100<=maxGap};};
const doLeague=async L=>{const LN=L.name||L.id;
  let kms=[];try{kms=await kAll(L.game);}catch(e){notes.push(`${LN}: Kalshi ${e.message}`);return;}
  if(!kms.length)return;
  // ESPN games
  const eg=[],seen=new Set();for(const d of new Set(days))for(const q of [].concat(L.q||"")){try{const j=await io.json(`${ESPN}/${L.espn}/scoreboard?dates=${d}${q}`);
    for(const ev of j.events||[])for(const c of (L.fighters?ev.competitions:[ev.competitions[0]])||[]){const gid=c.id||ev.id;if(seen.has(gid))continue;seen.add(gid);const st=Date.parse(c.date||ev.date);
      if(!(st>now-15*60e3&&st<horizon)||(c.status||ev.status)?.type?.state!=="pre")continue;
      const teams=c.competitors.map(t=>{const T=t.team||{},A=t.athlete||{};return{id:T.id||A.id,loc:T.location||A.displayName,nick:T.shortDisplayName||T.name||A.shortName,name:T.displayName||A.displayName,abbr:T.abbreviation,alt:[T.name,A.shortName,A.lastName].filter(Boolean),side:t.homeAway||t.order};});
      const hi=teams.findIndex(t=>t.side==="home"),ai=teams.findIndex(t=>t.side==="away");
      const o=c.odds?.[0];let dk=null;
      if(o){dk={prov:o.provider?.name||"DraftKings",ml:{},mlOpen:{},spread:null,total:null};const ml=o.moneyline;
        if(ml&&ml.home?.close?.odds){const h=american(ml.home.close.odds),a=american(ml.away?.close?.odds),dr=L.draw?american(ml.draw?.close?.odds??o.drawOdds?.moneyLine):0;
          const ho=american(ml.home.open?.odds),ao=american(ml.away?.open?.odds),dro=L.draw?american(ml.draw?.open?.odds):0;
          if(h&&a&&(!L.draw||dr)){const s=h+a+(dr||0),so=(ho&&ao)?ho+ao+(dro||0):null;if(hi>=0){dk.ml[hi]=h/s;if(so)dk.mlOpen[hi]=ho/so;}if(ai>=0){dk.ml[ai]=a/s;if(so)dk.mlOpen[ai]=ao/so;}if(L.draw){dk.ml.draw=dr/s;if(so&&dro)dk.mlOpen.draw=dro/so;}}}
        const ps=o.pointSpread;if(ps&&ps.home?.close?.line!=null&&hi>=0&&ai>=0){const hl=lineNum(ps.home.close.line),p=nv2(ps.home.close.odds,ps.away?.close?.odds);if(hl!=null&&p!=null)dk.spread={home:hi,away:ai,homeLine:hl,pHome:p,openLine:lineNum(ps.home.open?.line)};}
        const tt=o.total;if(tt&&tt.over?.close?.line){const ln=lineNum(tt.over.close.line),p=nv2(tt.over.close.odds,tt.under?.close?.odds);if(ln!=null&&p!=null)dk.total={line:ln,pOver:p,openLine:lineNum(tt.over.open?.line)};}}
      eg.push({league:L,lid:L.id,lname:LN,id:gid,eventId:ev.id,start:st,teams,dk,title:L.fighters?teams.map(t=>t.name).join(" vs "):`${teams[ai]?.name} @ ${teams[hi]?.name}`});}}
    catch(e){notes.push(`${LN}: ESPN ${d} ${e.message}`);}}
  // Polymarket game events (all market types)
  const pmev=[];try{for(let off=0;off<800;off+=100){const j=await io.json(`${GAMMA}/events?tag_slug=${L.pm}&closed=false&end_date_min=${new Date(now-864e5).toISOString()}&end_date_max=${new Date(horizon+2*864e5).toISOString()}&limit=100&offset=${off}`);
      pmev.push(...j.filter(e=>(e.markets||[]).some(m=>m.sportsMarketType==="moneyline")));if(j.length<100)break;}}catch(e){notes.push(`${LN}: Polymarket ${e.message}`);}
  let oa=[];if(cfg.oddsKey){try{oa=await io.json(`${ODDS}/sports/${L.odds}/odds?apiKey=${encodeURIComponent(cfg.oddsKey)}&bookmakers=pinnacle,draftkings,fanduel,betmgm,williamhill_us,betonlineag,bovada,lowvig,betrivers,espnbet&markets=h2h&oddsFormat=decimal`);}catch(e){notes.push(`${LN}: Odds API ${e.message}`);}}
  for(const g of eg){
    g.pm=null;let best=-1;for(const e of pmev){const ds=(e.slug.match(/(\d{4}-\d{2}-\d{2})/)||[])[1];if(ds&&dayDiff(ds,etDate(g.start))>1.01)continue;const st=Date.parse(e.startTime||e.startDate||"");if(isFinite(st)&&Math.abs(st-g.start)>6*3600e3)continue;
      const mls=e.markets.filter(m=>m.sportsMarketType==="moneyline"&&!m.closed);if(!mls.length)continue;let by={},sc=0,mlMap={};
      if(mls.length===1){const m=mls[0],oc=parse(m.outcomes),pr=parse(m.outcomePrices);if(!oc||oc.length!==2)continue;const a=assign(oc,g.teams);if(!a)continue;sc=a.score;oc.forEach((o,i)=>{by[a.map[i]]=+pr[i];});mlMap[m.slug]={two:Object.fromEntries(oc.map((o,i)=>[o,a.map[i]]))};}
      else{const lab=[],ms=[];for(const m of mls){const q=m.question||"";if(/draw/i.test(q)){by.draw=+parse(m.outcomePrices)[0];mlMap[m.slug]={yn:"draw"};continue;}const nm=(q.match(/^Will (.+?) win/)||[])[1];if(nm){lab.push(nm);ms.push(m);}}
        if(!lab.length)continue;const a=assign(lab,g.teams);if(!a)continue;sc=a.score;ms.forEach((m,i)=>{by[a.map[i]]=+parse(m.outcomePrices)[0];mlMap[m.slug]={yn:a.map[i]};});}
      const tot=Object.values(by).reduce((x,y)=>x+y,0);if(tot<.5||sc<=best)continue;for(const k in by)by[k]/=tot;best=sc;
      // index other full-game markets
      const sp=[],to=[],tt=[],pr=[];
      for(const m of e.markets){if(m.closed)continue;const t=m.sportsMarketType,q=m.question||"",ln=+m.line;
        if(t==="spreads"){const mm=q.match(/^Spread: (.+) \((-?[\d.]+)\)$/);if(!mm)continue;const ti=teamOf(mm[1],g);if(ti==null)continue;const oc=parse(m.outcomes);const p0=pmPrice(m);if(p0==null)continue;const pT=norm(oc[0])===norm(mm[1])||teamOf(oc[0],g)===ti?p0:1-p0;sp.push({ti,line:Math.abs(+mm[2]),p:pT,slug:m.slug,yesOut:oc[0]===mm[1]||teamOf(oc[0],g)===ti?oc[0]:oc[1]});}
        else if(t==="totals"){const p0=pmPrice(m);if(p0==null||!isFinite(ln))continue;const oc=parse(m.outcomes);to.push({line:ln,p:/over/i.test(oc[0])?p0:1-p0,slug:m.slug,yesOut:/over/i.test(oc[0])?oc[0]:oc[1]});}
        else if(t==="team_totals"){const mm=q.match(/^(.+?) Team Total: O\/U ([\d.]+)/);if(!mm)continue;const ti=teamOf(mm[1],g);const p0=pmPrice(m);if(ti==null||p0==null)continue;const oc=parse(m.outcomes);tt.push({ti,line:+mm[2],p:/over/i.test(oc[0])?p0:1-p0,slug:m.slug,yesOut:/over/i.test(oc[0])?oc[0]:oc[1]});}
        else if(Object.values(PMSTAT).includes(t)){const mm=q.match(/^(.+?): .+ O\/U ([\d.]+)/);if(!mm)continue;const p0=pmPrice(m);if(p0==null)continue;const oc=parse(m.outcomes);pr.push({stat:t,player:pname(mm[1]),line:+mm[2],p:/^(yes|over)$/i.test(oc[0])?p0:1-p0,slug:m.slug,yesOut:/^(yes|over)$/i.test(oc[0])?oc[0]:oc[1]});}}
      g.pm={slug:e.slug,by,mlMap,sp,to,tt,pr};}
    g.oa=null;if(oa.length){for(const ev of oa){if(Math.abs(Date.parse(ev.commence_time)-g.start)>6*3600e3)continue;const a=assign([ev.home_team,ev.away_team],g.teams);if(!a)continue;
        const per={};let nb=0;for(const bk of ev.bookmakers||[]){const mk=(bk.markets||[]).find(x=>x.key==="h2h");if(!mk)continue;const inv=mk.outcomes.map(o=>1/o.price),s=inv.reduce((x,y)=>x+y,0);nb++;
          mk.outcomes.forEach((o,i)=>{const k=o.name===ev.home_team?a.map[0]:o.name===ev.away_team?a.map[1]:"draw";(per[k]??=[]).push(inv[i]/s);});}
        const by={};for(const k in per){const v=per[k].sort((x,y)=>x-y);by[k]=v[v.length>>1];}g.oa={by,n:nb};break;}}
    games.push(g);}
  // Kalshi moneyline events → ESPN games; remember the suffix so spreads/totals/props join the same game
  const bySuf={};const evs={};for(const m of kms)(evs[m.event_ticker]??=[]).push(m);
  for(const[et,ms]of Object.entries(evs)){const kd=kDate(et);const labs=ms.map(m=>m.yes_sub_title||(m.title||"").replace(/ wins$| is the result$/,""));const real=labs.map((l,i)=>[l,i]).filter(([l])=>!isTie(l));
    let best=null,bs=-1;for(const g of eg){if(kd&&dayDiff(kd,etDate(g.start))>1.01)continue;const a=assign(real.map(x=>x[0]),g.teams);if(a&&a.score>bs){bs=a.score;best={g,a};}}
    if(!best){const occ=Date.parse(ms[0].occurrence_datetime||"");if(!isFinite(occ)||occ<horizon+4*3600e3)unmatched.push(`${LN}: ${labs.join(" / ")}`);continue;}
    const g=best.g;g.kalshi=true;bySuf[suffix(et)]=g;
    ms.forEach((m,i)=>{const ti=isTie(labs[i])?"draw":best.a.map[real.findIndex(x=>x[1]===i)];if(ti==null)return;const b=book(m);if(b.ya==null||b.ya<=0||b.ya>=100)return;
      const src={};if(g.dk&&g.dk.ml[ti]!=null)src.dk=g.dk.ml[ti];if(g.pm&&g.pm.by[ti]!=null)src.pm=g.pm.by[ti];if(g.oa&&g.oa.by[ti]!=null)src.books=g.oa.by[ti];
      const pmRef=g.pm?Object.entries(g.pm.mlMap).map(([slug,v])=>v.two?{slug,out:Object.keys(v.two).find(k=>v.two[k]===ti)}:v.yn===ti?{slug,out:"Yes"}:null).filter(x=>x&&x.out):[];
      add({m,g,mk:"ML",side:"yes",ask:b.ya,ti,label:ti==="draw"?"Tie":g.teams[ti].name,short:ti==="draw"?"Tie":g.teams[ti].nick||g.teams[ti].name,src,pmRef,
        move:g.dk&&g.dk.mlOpen[ti]!=null&&g.dk.ml[ti]!=null?{from:g.dk.mlOpen[ti],to:g.dk.ml[ti]}:null,nBooks:g.oa?g.oa.n:0});});}
  // spreads, totals, team totals
  const extra=[[L.spread,"SPREAD"],[L.total,"TOTAL"],[cfg.teamTotals?L.tt:null,"TT"]].filter(x=>x[0]);
  for(const[series,mk]of extra){let ms=[];try{ms=await kAll(series);}catch(e){notes.push(`${LN} ${mk}: ${e.message}`);continue;}
    for(const m of ms){const g=bySuf[suffix(m.event_ticker)];if(!g)continue;const b=book(m);if(!b.ok)continue;const line=+m.floor_strike;if(!isFinite(line))continue;const t=m.yes_sub_title||m.title||"";
      if(mk==="SPREAD"){const mm=t.match(/^(.+?) wins? by (?:over|more than) /i);if(!mm)continue;const ti=teamOf(mm[1],g);if(ti==null)continue;const oi=g.teams.findIndex((_,k)=>k!==ti);
        let pY=[];const src={};const ps=g.pm&&g.pm.sp.find(x=>x.ti===ti&&Math.abs(x.line-line)<.01);if(ps)src.pm=ps.p;
        if(g.dk&&g.dk.spread){const d=g.dk.spread,tl=ti===d.home?d.homeLine:-d.homeLine;if(Math.abs(tl+line)<.01)src.dk=ti===d.home?d.pHome:1-d.pHome;}
        const T=g.teams[ti],O=g.teams[oi];
        add({m,g,mk,side:"yes",ask:b.ya,ti,line,label:`${T.name} −${line}`,short:`${T.nick||T.name} −${line}`,src,pmRef:ps?[{slug:ps.slug,out:ps.yesOut}]:[]});
        add({m,g,mk,side:"no",ask:b.na,ti:oi,line,label:`${O.name} +${line}`,short:`${O.nick||O.name} +${line}`,src:inv(src),pmRef:ps?[{slug:ps.slug,out:"!"+ps.yesOut}]:[],note:`NO on “${t}”`});}
      else if(mk==="TOTAL"){const src={};const pt=g.pm&&g.pm.to.find(x=>Math.abs(x.line-line)<.01);if(pt)src.pm=pt.p;if(g.dk&&g.dk.total&&Math.abs(g.dk.total.line-line)<.01)src.dk=g.dk.total.pOver;
        add({m,g,mk,side:"yes",ask:b.ya,line,label:`Over ${line}`,short:`O ${line}`,src,pmRef:pt?[{slug:pt.slug,out:pt.yesOut}]:[]});
        add({m,g,mk,side:"no",ask:b.na,line,label:`Under ${line}`,short:`U ${line}`,src:inv(src),pmRef:pt?[{slug:pt.slug,out:"!"+pt.yesOut}]:[],note:`NO on “${t}”`});}
      else{const mm=t.match(/^(.+?) over /i);if(!mm)continue;const ti=teamOf(mm[1],g);if(ti==null)continue;const src={};const pt=g.pm&&g.pm.tt.find(x=>x.ti===ti&&Math.abs(x.line-line)<.01);if(pt)src.pm=pt.p;const T=g.teams[ti];
        add({m,g,mk,side:"yes",ask:b.ya,ti,line,label:`${T.name} over ${line}`,short:`${T.nick||T.name} o${line}`,src,pmRef:pt?[{slug:pt.slug,out:pt.yesOut}]:[]});
        add({m,g,mk,side:"no",ask:b.na,ti,line,label:`${T.name} under ${line}`,short:`${T.nick||T.name} u${line}`,src:inv(src),pmRef:pt?[{slug:pt.slug,out:"!"+pt.yesOut}]:[],note:`NO on “${t}”`});}}}
  // player props
  for(const pp of (L.props||[]).filter(pp=>cfg.kalshiOnlyProps||PMSTAT[pp.stat])){let ms=[];try{ms=await kAll(pp.k);}catch(e){notes.push(`${LN} ${pp.stat}: ${e.message}`);continue;}
    for(const m of ms){const g=bySuf[suffix(m.event_ticker)];if(!g)continue;const b=book(m);if(!b.ok)continue;const line=+m.floor_strike;if(!isFinite(line))continue;
      const who=(m.yes_sub_title||m.title||"").split(":")[0].trim();if(!who)continue;const n=Math.round(line+.5);const src={};
      const st=PMSTAT[pp.stat];const pr=st&&g.pm&&g.pm.pr.find(x=>x.stat===st&&x.player===pname(who)&&Math.abs(x.line-line)<.01);if(pr)src.pm=pr.p;
      const team=m.ticker.split("-")[2]?.slice(0,3);
      add({m,g,mk:"PROP",side:"yes",ask:b.ya,player:who,stat:pp.stat,line,label:`${who} ${n}+ ${pp.stat.toLowerCase()}`,short:`${who} ${n}+ ${pp.unit}`,src,pmRef:pr?[{slug:pr.slug,out:pr.yesOut}]:[],teamAbbr:team});
      add({m,g,mk:"PROP",side:"no",ask:b.na,player:who,stat:pp.stat,line,label:`${who} under ${line} ${pp.stat.toLowerCase()}`,short:`${who} u${line} ${pp.unit}`,src:inv(src),pmRef:pr?[{slug:pr.slug,out:"!"+pr.yesOut}]:[],teamAbbr:team,note:`NO on “${m.title}”`});}}};
for(const L of LEAGUES){if(kErr>=3){notes.push("Stopped early: Kalshi asked to slow down. BTC prices take priority; try again in a few minutes.");break;}await doLeague(L);}
function inv(s){const o={};for(const k in s)o[k]=1-s[k];return o;}
function add(x){const vals=Object.values(x.src);const fair=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;const spread=vals.length>1?Math.max(...vals)-Math.min(...vals):0;
  const cost=x.ask+feeC(x.ask),edge=fair==null?null:fair*100-cost,prevY=cents(x.m,"previous_yes_ask");
  legs.push({...x,id:x.m.ticker+":"+x.side,ticker:x.m.ticker,mtitle:x.m.title,fair,spread,cost,edge,nSrc:vals.length+(x.nBooks?x.nBooks-1:0),start:x.g.start,league:x.g.lname,
    kMove:prevY!=null&&x.side==="yes"?cents(x.m,"yes_ask")-prevY:null,flags:[],boost:[]});}
// ---- sharp money: Polymarket top sports traders ----
let leaders=[];try{const a=await io.json(`${DATA}/v1/leaderboard?category=SPORTS&timePeriod=MONTH&orderBy=PNL&limit=50`),b=await io.json(`${DATA}/v1/leaderboard?category=SPORTS&timePeriod=ALL&orderBy=PNL&limit=50`);
  const seen=new Set();for(const u of [...a,...b])if(!seen.has(u.proxyWallet)){seen.add(u.proxyWallet);leaders.push(u);}}catch(e){notes.push("Polymarket leaderboard: "+e.message);}
const bySlug={};for(const l of legs)for(const r of l.pmRef||[])(bySlug[r.slug]??=[]).push({l,out:r.out});
if(leaders.length&&Object.keys(bySlug).length){const res=await Promise.allSettled(leaders.map(u=>io.json(`${DATA}/positions?user=${u.proxyWallet}&limit=500&sizeThreshold=1`).then(ps=>[u,ps])));
  for(const r of res){if(r.status!=="fulfilled")continue;const[u,ps]=r.value;const nm=u.userName||u.proxyWallet.slice(0,8);
    for(const p of ps||[]){const refs=bySlug[p.slug];if(!refs||p.redeemable)continue;const v=+p.currentValue||0;if(v<50)continue;
      for(const{l,out}of refs){const neg=out.startsWith("!"),o=neg?out.slice(1):out;const backs=(p.outcome===o)!==neg;const s=(l.sharp??={f:0,a:0,fn:[],an:[]});if(backs){s.f+=v;if(!s.fn.includes(nm))s.fn.push(nm);}else{s.a+=v;if(!s.an.includes(nm))s.an.push(nm);}}}}}
// ---- intel for the most interesting legs ----
const score=l=>(l.edge??-9)+(l.sharp?Math.min(4,Math.abs(l.sharp.f-l.sharp.a)/5000):0);
const cand=legs.filter(l=>l.fair!=null&&Math.abs(l.ask-l.fair*100)<=15).sort((a,b)=>score(b)-score(a)).slice(0,cfg.maxIntel||40);
const sumCache={},injCache={};
const intelOne=async l=>{const g=l.g;l.intel=true;
  try{if(!(g.eventId in sumCache))sumCache[g.eventId]=io.json(`${ESPN}/${g.league.espn}/summary?event=${g.eventId}`);const S=await sumCache[g.eventId];
    const injOf=t=>{const blk=(S.injuries||[]).find(x=>x.team&&(x.team.id==t.id||x.team.displayName===t.name));return(blk?.injuries||[]).filter(i=>/out|doubtful|questionable/i.test(i.status||"")).map(i=>({n:i.athlete?.displayName,pos:i.athlete?.position?.abbreviation,st:i.status,fresh:Date.parse(i.date||0)>now-12*3600e3}));};
    const all=g.teams.map(injOf);
    if(l.mk==="PROP"){const me=pname(l.player);for(const lst of all)for(const i of lst)if(pname(i.n)===me)l.playerInj=i;}
    else if(l.ti!=null&&l.ti!=="draw"){l.inj={own:all[l.ti].filter(i=>!/questionable/i.test(i.st)),opp:all.filter((_,k)=>k!==l.ti).flat().filter(i=>!/questionable/i.test(i.st))};}
    else l.inj={own:[],opp:all.flat().filter(i=>!/questionable/i.test(i.st))};
    const names=g.teams.map(t=>t.name);l.news=(S.news?.articles||[]).filter(a=>(a.categories||[]).some(c=>names.includes(c.description)||(l.player&&pname(c.description||"")===pname(l.player)))&&Date.parse(a.published||0)>now-48*3600e3).slice(0,3).map(a=>({h:a.headline,t:a.published,u:a.links?.web?.href}));
    if(l.mk==="ML"&&l.ti!=="draw"&&S.predictor){const side=g.teams[l.ti].side==="home"?S.predictor.homeTeam:S.predictor.awayTeam;if(side?.gameProjection)l.espnProj=+side.gameProjection/100;}}catch(e){}
  if(cand.indexOf(l)<(cfg.maxTrades??20))try{const d=await kq(`${KX}/markets/trades?ticker=${l.ticker}&limit=1000&min_ts=${Math.floor((now-24*3600e3)/1000)}`);let f=0,a=0;
    for(const t of d.trades||[]){const c=+(t.count_fp??t.count??0),yp=t.yes_price_dollars!=null?+t.yes_price_dollars:(t.yes_price||0)/100,usd=t.taker_side==="yes"?c*yp:c*(1-yp);if(usd<(cfg.bigTrade||250))continue;if((t.taker_side==="yes")===(l.side==="yes"))f+=usd;else a+=usd;}
    l.big={f,a};}catch(e){}};
for(let i=0;i<cand.length;i+=8)await Promise.all(cand.slice(i,i+8).map(intelOne));
// ---- verdicts ----
for(const l of legs){if(l.edge==null)continue;const sv=cfg.sharpVeto||5000;
  if(l.sharp){const net=l.sharp.f-l.sharp.a;if(net<=-sv&&l.sharp.an.length>l.sharp.fn.length)l.flags.push(`top bettors are on the other side ($${Math.round(l.sharp.a/1000)}k)`);else if(net>=sv/2&&l.sharp.fn.length>=l.sharp.an.length)l.boost.push(`top bettors on it ($${Math.round(l.sharp.f/1000)}k, ${l.sharp.fn.length})`);}
  if(l.move){const d=l.move.to-l.move.from;if(d<=-(cfg.moveVeto||.03))l.flags.push(`line moved ${Math.round(-d*1000)/10} pts against since open`);else if(d>=.02)l.boost.push(`line moved +${Math.round(d*1000)/10} pts its way`);}
  if(l.big&&l.big.a-l.big.f>=(cfg.bigVeto||2000))l.flags.push(`big Kalshi money on the other side ($${Math.round((l.big.a-l.big.f)/100)/10}k)`);else if(l.big&&l.big.f-l.big.a>=(cfg.bigVeto||2000))l.boost.push(`big Kalshi money on it ($${Math.round((l.big.f-l.big.a)/100)/10}k)`);
  if(l.playerInj&&l.side==="yes"&&/out|doubtful/i.test(l.playerInj.st))l.flags.push(`${l.player} is listed ${l.playerInj.st.toLowerCase()}`);
  if(l.playerInj&&/questionable/i.test(l.playerInj.st))l.flags.push(`${l.player} is questionable`);
  if(l.inj&&l.inj.own.some(i=>i.fresh)&&l.spread*100>(cfg.agree??4)/2)l.flags.push(`fresh injury news and prices still unsettled`);
  if(Math.abs(l.ask-l.fair*100)>15)l.flags.push(`Kalshi price ${Math.round(Math.abs(l.ask-l.fair*100))} pts away from other markets: likely breaking news or a mismatch`);
  const need=l.mk==="PROP"?(cfg.minSrcProp??1):(cfg.minSrc??2);
  l.ok=l.edge>=(cfg.edge??2)&&l.nSrc>=need&&l.spread*100<=(cfg.agree??4)&&(!cfg.useVeto||!l.flags.length);}
return{legs,games,unmatched,notes,leaders:leaders.length};}
if(typeof module!=="undefined")module.exports={sportsEngine};
