// Files a report and/or notebook with the server (research key can only do this, nothing else).
// Usage: RIPTIDE_SERVER=… RIPTIDE_KEY=… node lab/post.mjs report.json [notebook.json]   (use - for no report)
import { readFileSync } from "node:fs";
import { postJSON } from "./http.mjs";
const S = process.env.RIPTIDE_SERVER, K = process.env.RIPTIDE_KEY, [rep, nb] = process.argv.slice(2);
const body = { key: K };
if (rep && rep !== "-") body.report = JSON.parse(readFileSync(rep, "utf8"));
if (nb) body.notebook = JSON.parse(readFileSync(nb, "utf8"));
const j = await postJSON(S, body);
if (j.auth === false) { console.error("server refused the key: " + j.why); process.exit(1); }
console.log(JSON.stringify(j));
