// Downloads RIPTIDE's data from the 24/7 server into lab/data/ (not committed).
// Usage: RIPTIDE_SERVER=<exec url> RIPTIDE_KEY=<research key> node lab/pull.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { getJSON } from "./http.mjs";
const S = process.env.RIPTIDE_SERVER, K = process.env.RIPTIDE_KEY;
if (!S || !K) { console.error("Set RIPTIDE_SERVER and RIPTIDE_KEY"); process.exit(1); }
const get = async q => { const j = await getJSON(`${S}?key=${encodeURIComponent(K)}&${q}`); if (j.auth === false) throw new Error("server refused the key: " + j.why); return j; };
mkdirSync(new URL("./data/", import.meta.url), { recursive: true });
const save = (n, o) => writeFileSync(new URL(`./data/${n}.json`, import.meta.url), JSON.stringify(o));
const status = await get("action=status"); save("status", status);
const calls = await get("action=calls&since=0"); save("calls", calls.calls);
const cps = await get("action=checkpoints&since=0"); save("checkpoints", cps.cps);
const kh = await get("action=khist&since=0"); save("khist", kh.rounds);
const rs = await get("action=research"); save("research", rs);
console.log(JSON.stringify({ calls: calls.calls.length, checkpoints: cps.cps.length, kalshiRounds: kh.rounds.length, live: rs.ver, notebook: !!rs.notebook }));
