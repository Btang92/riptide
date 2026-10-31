// Generic Kalshi ↔ Polymarket matcher: pairs events by title similarity + settlement date, then outcomes by identical label,
// identical number/range (same direction: "90+" ≠ "above 90"), same person, or near-identical word lists (mention markets; flagged loose).
// Guards: rare words/qualifiers must appear in both titles ("emergency", "Tampa" vs "US"), title numbers must agree, and pairs whose
// prices differ by 25+ points are dropped as probably different questions. Polymarket "Yes" = Kalshi YES.
export function autoPairs(KE,PE){
const SYN={democrats:'dem',democratic:'dem',democrat:'dem',republicans:'rep',republican:'rep',gop:'rep',usa:'us',america:'us',federal:'fed',fomc:'fed',bps:'bp',bp:'bp',basis:'bp',points:'',cut:'cut',cuts:'cut',decrease:'cut',decreases:'cut',hike:'hike',hikes:'hike',increase:'hike',increases:'hike',
  btc:'bitcoin',eth:'ethereum',sol:'solana',president:'president',presidential:'president',pm:'primeminister',says:'say',said:'say',saying:'say',mention:'say',mentions:'say',mentioned:'say',post:'post',posts:'post',
  temperature:'temp',temp:'temp',highest:'high',high:'high',max:'high',nyc:'newyork',ny:'newyork',la:'losangeles',sf:'sanfrancisco',dc:'washington',jan:'january',feb:'february',mar:'march',apr:'april',jun:'june',jul:'july',aug:'august',sep:'september',sept:'september',oct:'october',nov:'november',dec:'december'};
const STOP=new Set('will the be a an of in on to by for and or who what which is are win wins won after before next new end this that it its at from with than as any be been being does do did there their his her he she they we you your our us get gets have has had how much many when where why if yes per'.split(' '));
const CITY=[[/new york city|new york|\bnyc\b/g,'newyork'],[/los angeles/g,'losangeles'],[/san francisco/g,'sanfrancisco'],[/washington,? d\.?c\.?/g,'washingtondc'],[/las vegas/g,'lasvegas'],[/new orleans/g,'neworleans'],[/san antonio/g,'sanantonio'],[/oklahoma city/g,'oklahomacity'],[/salt lake city/g,'saltlakecity']];
const norm=s=>{let t=(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/u\.s\./g,'us').replace(/[’']s\b/g,'');for(const[r,v]of CITY)t=t.replace(r,v);return t;};
const tok=s=>norm(s).replace(/[^a-z0-9.%$ ]/g,' ').split(/\s+/).map(w=>w.replace(/^\.+|\.+$/g,'')).map(w=>SYN[w]??w).filter(w=>w&&!STOP.has(w));
const nums=s=>(norm(s).replace(/,/g,'').match(/\d+(\.\d+)?/g)||[]).map(Number);
const optKey=s=>{let t=norm(s).replace(/,/g,'').replace(/\((\d+)\+ times\)/g,' $1+ ').replace(/(\d+)\+ times/g,'$1+ ').replace(/\bthe\b/g,' ');
  const cnt=(t.match(/(\d+)\+\s*$/)||[])[1]||'';t=t.replace(/(\d+)\+\s*$/,'');
  const vs=t.split('/').map(x=>x.replace(/[^a-z0-9.%$<>≥≤\- ]/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean).sort();return vs.join('|')+(cnt?'#'+cnt:'');};
const MENT=s=>/\b(say|said|says|mention|mentions)\b/i.test(s),POST=s=>/\bpost(s|ed)?\b/i.test(s);
const STATES='alabama alaska arizona arkansas california colorado connecticut delaware florida georgia hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota mississippi missouri montana nebraska nevada ohio oklahoma oregon pennsylvania tennessee texas utah vermont virginia washington wisconsin wyoming'.split(' ');
const MON={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
const tickDate=t=>{const m=String(t).match(/-(\d{2})([A-Z]{3})(\d{2})(?:[A-Z0-9]*)?$/);if(!m||MON[m[2].toLowerCase()]==null)return null;return Date.UTC(2000+ +m[1],MON[m[2].toLowerCase()],+m[3],20);};
// numeric option: direction + number(s)
const numOpt=s=>{const t=norm(s).replace(/,/g,'');const n=(t.match(/(?<![\d.])-?\d+(\.\d+)?/g)||[]).map(Number);if(!n.length||n.length>2)return null;
  let d=/(or more|or above|or higher|at least|\+|≥|↑)/.test(t)?'ge':/(above|over|more than|>|higher than|greater than)/.test(t)?'gt':/(or below|or less|or lower|at most|≤|↓)/.test(t)?'le':/(below|under|less than|<|fewer than|lower than)/.test(t)?'lt':n.length===2?'rng':'eq';
  let k=/k\b/.test(t)&&n[0]<1000?1000:1;return d+':'+n.map(x=>x*k).join('-');};
const person=s=>{const w=norm(s).replace(/[^a-z ]/g,' ').split(/\s+/).filter(Boolean);return w.length>=2&&w.length<=4?w[0][0]+' '+w.at(-1):null;};
const ts=s=>{const t=Date.parse(s||'');return isFinite(t)?t:null;};
const now=Date.now(),DAY=86400e3;
// exclude noise
const pmSkip=e=>e.tags.some(t=>['up-or-down','5M','15M','1H','4H','sports','esports'].includes(t));
const K=KE.filter(e=>e.m&&e.m.length).map(e=>{const close=Math.max(...e.m.map(m=>ts(m.close)||0));const text=e.title+' '+(e.sub||'');return{...e,tk:new Set(tok(text)),nm:new Set(nums(e.title)),close,td:tickDate(e.t)};});
const P=PE.filter(e=>!pmSkip(e)&&e.m.length).map(e=>{const end=ts(e.end)||Math.max(...e.m.map(m=>ts(m.end)||0));return{...e,tk:new Set(tok(e.title)),nm:new Set(nums(e.title)),endT:end};});
// idf over both corpora
const DF=new Map();for(const x of[...K,...P])for(const w of x.tk)DF.set(w,(DF.get(w)||0)+1);const N=K.length+P.length,idf=w=>Math.log(1+N/(1+(DF.get(w)||0)));
const IDX=new Map();K.forEach((k,i)=>{for(const w of k.tk)if((DF.get(w)||0)<3000)(IDX.get(w)??IDX.set(w,[]).get(w)).push(i);});
const sim=(a,b)=>{let i=0,na=0,nb=0;for(const w of a){const f=idf(w);na+=f*f;if(b.has(w))i+=f*f;}for(const w of b){const f=idf(w);nb+=f*f;}return i/Math.sqrt(na*nb||1);};
// a rare word (place, qualifier, name) in one title but not the other means a different question: "US" vs "Tampa", "emergency" cut
const QUAL=new Set(['not','no','fail','fails','emergency','first','only','exactly','all','every','without','chinese','american','official','officially','facto','pareto','agent','intermarket','inter','monthly','weekly','daily','annual','annualized','core','seasonally','primary','runoff','nominee','nomination','general','special','senate','house','governor','mayor','vp','vice']);
const asym=(a,b)=>{for(const w of a){if(b.has(w)||/^\d/.test(w))continue;if((DF.get(w)||0)<=40||QUAL.has(w))return w;}for(const w of b){if(a.has(w)||/^\d/.test(w))continue;if((DF.get(w)||0)<=40||QUAL.has(w))return w;}return null;};
const unit=s=>/%/.test(s)?'%':/\$/.test(s)?'$':'';
const dateOk=(k,p)=>{if(k.td&&p.endT&&MENT(k.title)&&Math.abs(k.td-p.endT)<=2.2*DAY)return true;if(!k.close||!p.endT)return false;const horizon=Math.max(DAY,Math.min(p.endT,k.close)-now);const tol=Math.min(31*DAY,Math.max(1.5*DAY,horizon*.1));return Math.abs(k.close-p.endT)<=tol||Math.abs(Math.min(...k.m.map(m=>ts(m.close)||Infinity))-p.endT)<=tol;};
const mid=(m)=>{const a=+m.ya,b=+m.yb;return isFinite(a)&&isFinite(b)&&a>0?(a+b)/2:null;};
const pmid=m=>{const b=+m.bb,a=+m.ba;if(isFinite(a)&&isFinite(b)&&a>0&&a-b<=.06)return(a+b)/2;try{return +JSON.parse(m.p)[0];}catch(e){return null;}};
const out=[];const stats={events:0,pairs:0,rejPrice:0};
for(const p of P){const cand=new Map();for(const w of p.tk){const L=IDX.get(w);if(!L)continue;for(const i of L)cand.set(i,1);}
  const scored=[];for(const i of cand.keys()){const k=K[i];const s=sim(p.tk,k.tk);if(s<(MENT(p.title)?.2:.35))continue;if(!dateOk(k,p))continue;
    // numbers in titles (years, thresholds) must not conflict
    const pn=[...p.nm].filter(x=>x<1900||x>2100),kn=[...k.nm].filter(x=>x<1900||x>2100);if(pn.length&&kn.length&&!pn.some(x=>k.nm.has(x)))continue;
    if(MENT(p.title)||MENT(k.title)){if(!(MENT(p.title)&&MENT(k.title))||POST(p.title)!==POST(k.title))continue;
      // same speaker (first rare word of each title appears in the other), same state for rallies, same topic words (companies/foods/countries/nicknames)
      const sp=[...p.tk].find(w=>(DF.get(w)||0)<=400&&!/^\d/.test(w)&&!['say','post','rally','midterm','week','october','november','december','during'].includes(w));if(!sp||!k.tk.has(sp))continue;
      const ps=STATES.filter(x=>p.tk.has(x)),ks=STATES.filter(x=>k.tk.has(x));if(ps.join()!==ks.join())continue;
      if(['companies','foods','countries','nicknames','rally','week','month'].some(w=>p.tk.has(w)!==k.tk.has(w)))continue;
      if(/(january|february|march|april|may|june|july|august|september|october|november|december)/.test(norm(p.title))&&!['january','february','march','april','may','june','july','august','september','october','november','december'].some(m=>p.tk.has(m)&&k.tk.has(m)))continue;
      scored.push({k,s:Math.max(s,.6)});continue;}
    const odd=asym(p.tk,k.tk);if(odd&&s<.97)continue;scored.push({k,s});}
  scored.sort((a,b)=>b.s-a.s);
  for(const{k,s}of scored.slice(0,3)){
    // option matching
    const pairs=[];const used=new Set();
    const pOpts=p.m.map(m=>({m,lab:p.m.length>1?(m.g||m.q):(m.g||'')}));const kOpts=k.m.map(m=>({m,lab:k.m.length>1?(m.ys||m.title):(m.ys||'')}));
    if(pOpts.length===1&&kOpts.length===1){if(s<.75)continue;pairs.push([pOpts[0].m,kOpts[0].m,'binary']);}
    else{for(const po of pOpts){const a=optKey(po.lab),an=numOpt(po.lab),ap=person(po.lab);let hit=null,how='';
      for(const ko of kOpts){if(used.has(ko.m.t))continue;const b=optKey(ko.lab);
        if(a&&a===b){hit=ko;how='same label';break;}
        if(s>=.6&&an&&an===numOpt(ko.lab)&&an.split(':')[0]!=='eq'&&unit(po.lab)===unit(ko.lab)){hit=ko;how='same number';break;}
        if(ap&&ap===person(ko.lab)&&!numOpt(po.lab)&&!numOpt(ko.lab)){hit=ko;how='same name';break;}}
      if(!hit&&a){const[av,ac='']=a.split('#'),A=new Set(av.split('|'));for(const ko of kOpts){if(used.has(ko.m.t))continue;const[bv,bc='']=optKey(ko.lab).split('#');if(ac!==bc)continue;const Bs=new Set(bv.split('|'));
        const sub=[...A].every(x=>Bs.has(x))||[...Bs].every(x=>A.has(x));if(sub&&[...A].some(x=>Bs.has(x))){hit=ko;how='close wording';break;}}}
      if(hit){used.add(hit.m.t);pairs.push([po.m,hit.m,how]);}}
      const ment=MENT(p.title);const need=ment?(Math.min(pOpts.length,kOpts.length)>3?2:1):Math.min(pOpts.length,kOpts.length)>=3?Math.max(2,Math.ceil(.3*Math.min(pOpts.length,kOpts.length))):1;
      if(pairs.length<need||(!ment&&need===1&&s<.55)||(!ment&&s<.5&&(pairs.length<4||pairs.length<.5*Math.min(pOpts.length,kOpts.length))))continue;}
    let n=0;for(const[pm,km,how]of pairs){const a=pmid(pm),b=mid(km);if(a!=null&&b!=null&&Math.abs(a-b)>.25){stats.rejPrice++;continue;}
      out.push({pm:pm.slug,q:pm.q,pe:p.slug,pTitle:p.title,pOpt:pm.g||'',kx:km.t,ke:k.t,kTitle:k.title,kOpt:km.ys||'',kc:k.c,sim:+s.toFixed(2),how,rule:'auto',loose:(how==='close wording'||/temperature|rain|snow/i.test(k.title))||undefined});n++;}
    if(n){stats.events++;stats.pairs+=n;break;}}}
// one Kalshi market per Polymarket market and vice versa (keep highest similarity)
out.sort((a,b)=>b.sim-a.sim);const seenP=new Set(),seenK=new Set(),fin=[];for(const x of out){if(seenP.has(x.pm)||seenK.has(x.kx))continue;seenP.add(x.pm);seenK.add(x.kx);fin.push(x);}
return{pairs:fin,stats};}
