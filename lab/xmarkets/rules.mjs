// Election rules (high confidence): party/candidate Senate & governor races, chamber control, balance of power, House seats,
// named-candidate 2028 nominations/presidency and France 2027. Kalshi ticker codes are never trusted alone: titles must name the
// same state/district (Kalshi's SENATELA-26 is the Kentucky race). Polymarket "Yes" = Kalshi YES.
export function rulePairs(KE,PM){
const EV=new Map(KE.map(e=>[e.event_ticker,e]));
const ST={alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",connecticut:"CT",delaware:"DE",florida:"FL",georgia:"GA",hawaii:"HI",idaho:"ID",illinois:"IL",indiana:"IN",iowa:"IA",kansas:"KS",kentucky:"KY",louisiana:"LA",maine:"ME",maryland:"MD",massachusetts:"MA",michigan:"MI",minnesota:"MN",mississippi:"MS",missouri:"MO",montana:"MT",nebraska:"NE",nevada:"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND",ohio:"OH",oklahoma:"OK",oregon:"OR",pennsylvania:"PA","rhode island":"RI","south carolina":"SC","south dakota":"SD",tennessee:"TN",texas:"TX",utah:"UT",vermont:"VT",virginia:"VA",washington:"WA","west virginia":"WV",wisconsin:"WI",wyoming:"WY"};
const nm=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z ]/g,"").replace(/\s+/g," ").trim();
const live=m=>m&&m.status==="active";
const party=(e,p)=>{const D=p==="D";const ms=e.markets.filter(m=>D?/-(D|DEM)$/.test(m.ticker):/-(R|GOP)$/.test(m.ticker));return ms.length===1?ms[0]:null;};
// A serious third candidate (e.g. an independent the Democrats back) makes "Democrats win" ambiguous → skip that side.
const thirdSerious=e=>e.markets.some(m=>!/-(D|DEM|R|GOP)$/.test(m.ticker)&&+m.yes_bid_dollars>=.08);
const byName=(e,name)=>{const n=nm(name);const ms=e.markets.filter(m=>{const s=nm(m.yes_sub_title);return s===n||(s.split(" ").at(-1)===n.split(" ").at(-1)&&s.split(" ")[0][0]===n.split(" ")[0][0]);});return ms.length===1?ms[0]:null;};
// The ticker code alone is not trusted (Kalshi's SENATELA-26 is the Kentucky race): the event title must name the state and office.
const raceEvent=(state,office,yr="26")=>{const st=ST[state];const c=office==="senate"?[`SENATE${st}-${yr}`,`SENATE${st}S-${yr}`]:[`GOVPARTY${st}-${yr}`,`GOV${st}-${yr}`];
  const f=c.map(t=>EV.get(t)).filter(e=>e&&nm(e.title).startsWith(state+" ")&&nm(e.title).includes(office));return f.length===1?f[0]:null;};
const pairs=[],why={};const PMV=PM;
const add=(p,m,rule)=>{if(!live(m))return;pairs.push({pm:p.slug,q:p.q,kx:m.ticker,ke:m.event_ticker,kTitle:EV.get(m.event_ticker)?.title||"",kOpt:m.yes_sub_title||"",rule});why[rule]=(why[rule]||0)+1;};
for(const p of PM.values()){const q=p.q.trim();let r;
  if(r=q.match(/^Will the (Democrats|Republicans) win the (.+?) (Senate|governor) race in 2026\?$/i)){const e=raceEvent(r[2].toLowerCase(),r[3].toLowerCase());if(!e)continue;
    const pa=r[1].startsWith("D")?"D":"R";if(thirdSerious(e))continue;const m=party(e,pa);if(m)add(p,m,"party race");continue;}
  if(r=q.match(/^Will (.+?) win the (.+?) (Senate|governor) (?:race|election) in 2026\?$/i)||q.match(/^Will (.+?) win the 2026 (.+?) (Senate|governor) (?:race|election)\?$/i)){const e=raceEvent(r[2].toLowerCase(),r[3].toLowerCase());if(!e)continue;const m=byName(e,r[1]);if(m)add(p,m,"candidate race");continue;}
  if(r=q.match(/^Will the (Democratic|Republican) Party control the (House|Senate) after the 2026 Midterm elections\?$/i)){const e=EV.get(r[2].toLowerCase()==="house"?"CONTROLH-2026":"CONTROLS-2026");if(e){const m=party(e,r[1][0]);if(m)add(p,m,"chamber control");}continue;}
  if(r=q.match(/^2026 Balance of Power: ([DR]) Senate, ([DR]) House$/i)){const e=EV.get("KXBALANCEPOWERCOMBO-27FEB");const m=e?.markets.find(x=>x.ticker.endsWith("-"+r[2]+r[1]));if(m)add(p,m,"balance of power");continue;}
  if(r=q.match(/^Will the (Democratic|Republican) Party win the ([A-Z]{2})-(\d{1,2}) House seat\?$/i)){const n=+r[3];const re=new RegExp(`^${r[2]}-0?${n} House winner\\?$`,"i");const es=KE.filter(e=>re.test(e.title.trim()));if(es.length!==1)continue;if(thirdSerious(es[0]))continue;const m=party(es[0],r[1][0]);if(m)add(p,m,"House seat");continue;}
  const NAMED=[[/^Will (.+?) win the 2028 US Presidential Election\?$/i,"KXPRESPERSON-28"],[/^Will (.+?) win the 2028 Democratic presidential nomination\?$/i,"KXPRESNOMD-28"],[/^Will (.+?) win the 2028 Republican presidential nomination\?$/i,"KXPRESNOMR-28"],[/^Will (.+?) win the 2027 French presidential election\?$/i,"KXFRENCHPRES-27"]];
  for(const[re,et]of NAMED){if(r=q.match(re)){const e=EV.get(et);const m=e&&byName(e,r[1]);if(m)add(p,m,"named candidate");break;}}
}
return pairs;}
