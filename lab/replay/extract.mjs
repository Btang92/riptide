// Builds lab/replay/lib.mjs from the live version's model code: node lab/replay/extract.mjs <ver>
import fs from 'fs';const ver=process.argv[2];const L=fs.readFileSync(`v/${ver}/index.html`,'utf8').split('\n');
const i=p=>{const k=L.findIndex(l=>l.startsWith(p));if(k<0)throw new Error('missing '+p);return k;};
const take=(a,b)=>L.slice(a,b+1).join('\n');
const out=[take(i('const etFmt='),i('const pad=')),L[i('function erf(')],L[i('function pUp(')],take(i('const FN='),i('function featsILive(')-1),take(i('const sigm='),i('function scoreSet(')+2),
 'export {et,pUp,feats,featsP,featsI,sigm,fitLR,brainP,scoreSet,clamp};'].join('\n');
fs.writeFileSync('lab/replay/lib.mjs',out);console.log('lib.mjs from',ver);
