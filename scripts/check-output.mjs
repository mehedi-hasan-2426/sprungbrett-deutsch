import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(process.argv[2] ? resolve(process.argv[2]) : join(ROOT, "out"));

if (!existsSync(OUT)) {
  console.error("no build output at " + OUT);
  process.exit(1);
}

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const files = walk(OUT);
const problems = [];

for (const file of files.filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  const name = relative(OUT, file);
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    if (!/\ssrc=/.test(tag) && !/type="application\/json"/.test(tag)) problems.push(`${name}: inline executable script ${tag.slice(0, 80)}`);
  }
  if (/<style[\s>]/i.test(html)) problems.push(`${name}: inline <style> element`);
  if (/\sstyle="/i.test(html)) problems.push(`${name}: inline style attribute`);
  if (/\son[a-z]+="/i.test(html)) problems.push(`${name}: inline event handler`);
  if (/javascript:/i.test(html)) problems.push(`${name}: javascript: URL`);
  for (const a of html.match(/<a\b[^>]*href="https?:[^"]*"[^>]*>/gi) ?? []) {
    if (!/rel="noopener noreferrer"/.test(a)) problems.push(`${name}: external link without rel=noopener noreferrer`);
  }
}

for (const file of files.filter((f) => /\.(html|js|json|txt)$/.test(f))) {
  if (/tisha/i.test(readFileSync(file, "utf8"))) problems.push(`${relative(OUT, file)}: learner name in build output`);
}

for (const file of files.filter((f) => f.endsWith(".js"))) {
  const js = readFileSync(file, "utf8");
  if (/\beval\(|new Function\(/.test(js)) problems.push(`${relative(OUT, file)}: eval or Function() would need 'unsafe-eval'`);
}

if (problems.length) {
  for (const p of problems) console.error("  " + p);
  console.error(`\nbuild output: ${problems.length} CSP or privacy problem(s)`);
  process.exit(1);
}
console.log(`build output: ${files.length} files scanned, compatible with the strict CSP, no learner name`);
