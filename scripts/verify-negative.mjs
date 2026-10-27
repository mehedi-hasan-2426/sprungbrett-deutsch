import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT } from "./verify.mjs";

const SKIP = new Set(["node_modules", ".next", "out", ".git"]);
const edit = (dir, file, fn) => writeFileSync(join(dir, file), fn(readFileSync(join(dir, file), "utf8")));

const mutations = [
  ["required governance files exist", (d) => unlinkSync(join(d, "SECURITY.md"))],
  ["content security policy is strict", (d) => edit(d, "vercel.json", (s) => s.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'"))],
  ["security headers are present", (d) => edit(d, "vercel.json", (s) => s.replace(/\{ "key": "X-Frame-Options"[^}]*\},\s*/, ""))],
  ["no HTML injection, eval or inline styles in source", (d) => writeFileSync(join(d, "src", "bad.tsx"), "export const X = () => <div " + "dangerouslySetInnerHTML" + "={{ __html: location.hash }} />;\n")],
  ["external links are https and isolated", (d) => edit(d, "src/lib/inline.ts", (s) => s.replace('url.protocol !== "https:"', "false"))],
  ["no learner personal data in repository content", (d) => writeFileSync(join(d, "content", "source", "leak.md"), "Hallo " + "Ti" + "sha\n")],
  ["dependencies are pinned and minimal", (d) => edit(d, "package.json", (s) => s.replace('"next":', '"left-pad": "^1.3.0",\n    "next":'))],
  ["workflows pin actions and restrict tokens", (d) => edit(d, ".github/workflows/ci.yml", (s) => s.replace(/actions\/checkout@[0-9a-f]{40}/, "actions/checkout@v5"))],
  ["course routes require server-side authorization", (d) => edit(d, "pages/karten.tsx", (s) => s.replace("export const getServerSideProps = protect", "export const getServerSideProps = unprotected"))],
  ["no committed secrets", (d) => writeFileSync(join(d, "src", "leak.ts"), `export const t = "${"gh" + "p_" + "a".repeat(36)}";\n`)],
];

let failed = 0;
for (const [name, mutate] of mutations) {
  const dir = mkdtempSync(join(tmpdir(), "sprungbrett-neg-"));
  try {
    cpSync(ROOT, dir, { recursive: true, filter: (src) => !SKIP.has(src.split(/[\\/]/).pop() ?? "") });
    mutate(dir);
    const result = spawnSync(process.execPath, [join(ROOT, "scripts", "verify.mjs")], { env: { ...process.env, VERIFY_ROOT: dir }, encoding: "utf8" });
    const caught = result.status !== 0 && result.stdout.includes("FAIL  " + name);
    console.log((caught ? "  pass  " : "  MISS  ") + "detects violation: " + name);
    if (!caught) failed++;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\n${mutations.length - failed}/${mutations.length} violations detected`);
if (failed) process.exit(1);
