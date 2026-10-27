import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(process.env.VERIFY_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), ".."));

export const REQUIRED_HEADERS = [
  "Content-Security-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Strict-Transport-Security",
  "Permissions-Policy",
];

const read = (...parts) => readFileSync(join(ROOT, ...parts), "utf8");
const walk = (dir) =>
  existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : [];
const sourceFiles = () => ["src", "pages", "scripts", "tests"].flatMap((d) => walk(join(ROOT, d))).filter((f) => /\.(ts|tsx|mjs|js)$/.test(f));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export const checks = [
  ["required governance files exist", () => {
    for (const file of ["LICENSE", "NOTICE", "SECURITY.md", "README.md", "docs/threat-model.md"]) {
      assert(existsSync(join(ROOT, file)), "missing " + file);
      assert(read(file).trim().length > 200, file + " is empty or a stub");
    }
    return "5 files";
  }],
  ["content security policy is strict", () => {
    const headers = JSON.parse(read("vercel.json")).headers.flatMap((r) => r.headers);
    const csp = headers.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    assert(csp, "no Content-Security-Policy in vercel.json");
    for (const directive of ["default-src 'none'", "script-src 'self'", "style-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'"]) {
      assert(csp.includes(directive), "CSP is missing " + directive);
    }
    assert(!/unsafe-inline|unsafe-eval|unsafe-hashes|\*|https?:/.test(csp), "CSP must not allow unsafe-*, wildcards or remote origins");
    return "no unsafe sources";
  }],
  ["security headers are present", () => {
    const headers = JSON.parse(read("vercel.json")).headers.flatMap((r) => r.headers);
    const keys = new Set(headers.map((h) => h.key));
    for (const h of REQUIRED_HEADERS) assert(keys.has(h), "missing header " + h);
    const perms = headers.find((h) => h.key === "Permissions-Policy")?.value ?? "";
    assert(/camera=\(\)/.test(perms) && /geolocation=\(\)/.test(perms), "Permissions-Policy must block camera and geolocation");
    assert(/microphone=\((self)?\)/.test(perms), "microphone may only be allowed for self");
    return keys.size + " headers";
  }],
  ["no HTML injection, eval or inline styles in source", () => {
    for (const file of sourceFiles()) {
      if (file.includes(join("scripts", "verify"))) continue;
      const body = readFileSync(file, "utf8");
      assert(!/dangerouslySetInnerHTML|\.innerHTML\s*=|outerHTML\s*=|insertAdjacentHTML/.test(body), "HTML injection API in " + file);
      assert(!/\beval\(|new Function\(/.test(body), "eval or Function() in " + file);
      assert(!/\sstyle=\{/.test(body), "inline style prop in " + file);
    }
    return sourceFiles().length + " files";
  }],
  ["external links are https and isolated", () => {
    const inline = read("src", "lib", "inline.ts");
    assert(/url\.protocol !== "https:"/.test(inline) && /url\.username \|\| url\.password/.test(inline), "safeHref must allow only https without credentials");
    const blocks = read("src", "components", "Blocks.tsx");
    assert(/rel="noopener noreferrer"/.test(blocks), "external links must use rel=noopener noreferrer");
    return "https only";
  }],
  ["no learner personal data in repository content", () => {
    const files = walk(join(ROOT, "content", "source"));
    assert(files.length > 0, "content/source is empty");
    for (const f of files) {
      assert(!/tisha/i.test(readFileSync(f, "utf8")), "learner name in " + f);
      assert(!/Lernprofil|Fehlerlog\.md$|00_Start/.test(f), "personal file copied: " + f);
    }
    return files.length + " files";
  }],
  ["dependencies are pinned and minimal", () => {
    const pkg = JSON.parse(read("package.json"));
    const runtime = Object.keys(pkg.dependencies ?? {});
    assert(runtime.sort().join(",") === "next,next-auth,react,react-dom", "unexpected runtime dependency: " + runtime.join(","));
    for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
      assert(/^\d+\.\d+\.\d+$/.test(version), `${name} must be pinned to an exact version, found ${version}`);
    }
    assert(existsSync(join(ROOT, "package-lock.json")), "package-lock.json missing");
    return runtime.length + " runtime packages";
  }],
  ["workflows pin actions and restrict tokens", () => {
    const dir = join(ROOT, ".github", "workflows");
    const files = walk(dir).filter((f) => /\.ya?ml$/.test(f));
    assert(files.length > 0, "no workflows");
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      for (const use of body.match(/uses:\s*\S+/g) ?? []) assert(/@[0-9a-f]{40}\b/.test(use), "action not pinned to a commit SHA: " + use);
      assert(/^permissions:\s*\n\s+contents: read/m.test(body), "workflow must default to read-only permissions: " + f);
      if (/actions\/checkout/.test(body)) assert(/persist-credentials: false/.test(body), "checkout must not persist credentials: " + f);
    }
    return files.length + " workflows";
  }],
  ["course routes require server-side authorization", () => {
    const config = read("next.config.ts");
    assert(!/output:\s*["']export["']/.test(config), "static export would publish protected lessons");
    for (const file of walk(join(ROOT, "pages")).filter((file) => file.endsWith(".tsx"))) {
      const name = file.split(/[\\/]/).pop();
      if (name.startsWith("_") || ["signin.tsx", "404.tsx", "500.tsx"].includes(name)) continue;
      const body = readFileSync(file, "utf8");
      assert(/export const getServerSideProps = protect\(/.test(body) || /export const getServerSideProps = protect</.test(body), "unprotected course route: " + file);
      assert(!/getStaticProps|getStaticPaths/.test(body), "static course route: " + file);
    }
    const protect = read("src", "server", "protect.ts");
    assert(/getServerSession/.test(protect) && /canAccess/.test(protect) && /private, no-store/.test(protect), "server authorization or private caching missing");
    return "request-time checks; no static course pages";
  }],
  ["no committed secrets", () => {
    const patterns = [/AKIA[0-9A-Z]{16}/, /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, /gh[pousr]_[A-Za-z0-9]{20,}/, /xox[baprs]-[A-Za-z0-9-]{10,}/, /sk-[A-Za-z0-9]{20,}/];
    const files = [...sourceFiles(), ...walk(join(ROOT, "content", "source")), join(ROOT, "vercel.json")];
    for (const f of files) {
      const body = readFileSync(f, "utf8");
      for (const p of patterns) assert(!p.test(body), "possible secret in " + f);
    }
    assert(!existsSync(join(ROOT, ".env")), ".env file must not exist in the repository");
    return files.length + " files";
  }],
];

export function run() {
  let failed = 0;
  for (const [name, fn] of checks) {
    try {
      console.log("  pass  " + name.padEnd(48) + (fn() ?? ""));
    } catch (err) {
      failed++;
      console.log("  FAIL  " + name.padEnd(48) + err.message);
    }
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  return failed;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(run() ? 1 : 0);
}
