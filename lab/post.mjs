// Files a report and/or notebook with the server (research key can only do this, nothing else).
// Usage: RIPTIDE_SERVER=… RIPTIDE_KEY=… node lab/post.mjs report.json [notebook.json]
import { readFileSync } from "node:fs";
const S = process.env.RIPTIDE_SERVER, K = process.env.RIPTIDE_KEY, [rep, nb] = process.argv.slice(2);
const body = { key: K };
if (rep) body.report = JSON.parse(readFileSync(rep, "utf8"));
if (nb) body.notebook = JSON.parse(readFileSync(nb, "utf8"));
const r = await fetch(S, { method: "POST", body: JSON.stringify(body), redirect: "follow" });
console.log(r.status, (await r.text()).slice(0, 200));
