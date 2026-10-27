import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { setTimeout, clearTimeout } from "node:timers";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encode } from "next-auth/jwt";

const { fetch } = globalThis;

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const socket = createServer();
socket.listen(0, "127.0.0.1");
await once(socket, "listening");
const address = socket.address();
assert.ok(address && typeof address !== "string");
const port = address.port;
socket.close();
await once(socket, "close");
const origin = `http://127.0.0.1:${port}`;
const secret = randomBytes(32).toString("base64url");
const child = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1",
    NEXTAUTH_URL: `https://localhost:${port}`, NEXTAUTH_SECRET: secret,
    GOOGLE_CLIENT_ID: "synthetic-client", GOOGLE_CLIENT_SECRET: "synthetic-only",
    ALLOWED_EMAILS: "first@example.com,second@example.org",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await new Promise((accept, reject) => {
    const timer = setTimeout(() => reject(new Error("Production server startup timed out")), 60_000);
    const inspect = (data) => {
      if (data.toString().includes("Ready in")) {
        clearTimeout(timer);
        accept();
      }
    };
    child.stdout.on("data", inspect);
    child.stderr.on("data", inspect);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Production server exited: ${code}`)); });
  });
  const signInHtml = await (await fetch(origin + "/signin")).text();
  const bootstrap = signInHtml.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(bootstrap, "Sign-in page has no Next bootstrap data");
  const { buildId } = JSON.parse(bootstrap);
  assert.match(buildId, /^[A-Za-z0-9_-]{1,128}$/);
  const reading = { id: "5-lesen" };
  const vocab = { id: "1-wortschatz" };
  const routes = ["/", "/karten", "/fortschritt", "/info", "/plan", "/einstufung", "/artikel", "/kurz", "/checkpoint/1", "/material/wortschatz", "/woche/1", `/woche/1/${reading.id}`, `/_next/data/${buildId}/woche/1.json`, `/_next/data/${buildId}/woche/1/${reading.id}.json`];
  const cookie = async (overrides = {}) => {
    const token = await encode({ secret, maxAge: 8 * 60 * 60, token: { sub: "synthetic-first", email: "first@example.com", provider: "google", verified: true, signedInAt: Date.now(), ...overrides } });
    return `__Secure-next-auth.session-token=${token}`;
  };
  const request = (path, sessionCookie) => fetch(origin + path, { redirect: "manual", headers: sessionCookie ? { cookie: sessionCookie } : {} });
  const denied = async (path, sessionCookie) => {
    const response = await request(path, sessionCookie);
    const body = await response.text();
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.ok([200, 307].includes(response.status), `Unexpected denied response: ${path} ${response.status}`);
    assert.ok(response.headers.get("location") === "/signin" || body.includes('"__N_REDIRECT":"/signin"'), `Access not denied: ${path}`);
    assert.ok(!body.includes("Zusatztraining") && !body.includes("Mein Alltag beginnt früh."), `Course content leaked: ${path}`);
  };
  for (const route of routes) await denied(route);
  console.log(`PASS anonymous access blocked for ${routes.length} page/data routes`);
  for (const payload of [
    { email: "other@example.com" }, { email: "first+alias@example.com" }, { verified: false },
    { provider: "other" }, { signedInAt: Date.now() - 8 * 60 * 60 * 1000 }, { signedInAt: Date.now() + 60_000 },
  ]) await denied("/woche/1", await cookie(payload));
  await denied("/woche/1", "__Secure-next-auth.session-token=invalid");
  console.log("PASS disallowed email, alias, unverified provider, expired/future and invalid sessions denied");
  const firstCookie = await cookie();
  const secondCookie = await cookie({ sub: "synthetic-second", email: "second@example.org" });
  for (const active of [firstCookie, secondCookie]) {
    const response = await request(`/woche/1/${vocab.id}`, active);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    const html = await response.text();
    assert.ok(html.includes("English meaning") && html.includes("alarm clock"));
    assert.match(response.headers.get("content-security-policy") ?? "", /script-src 'self'/);
  }
  console.log("PASS both synthetic approved accounts receive bilingual lessons with private caching and strict CSP");
  const firstSession = await (await request("/api/auth/session", firstCookie)).json();
  const secondSession = await (await request("/api/auth/session", secondCookie)).json();
  assert.notEqual(firstSession.accountKey, secondSession.accountKey);
  assert.match(firstSession.accountKey, /^[a-f0-9]{64}$/);
  assert.ok(!("access_token" in firstSession) && !("id_token" in firstSession));
  console.log("PASS account keys are distinct; session endpoint exposes no provider tokens");
  const csrf = await (await request("/api/auth/csrf")).json();
  assert.ok(typeof csrf.csrfToken === "string" && csrf.csrfToken.length > 10);
  const signout = await fetch(origin + "/api/auth/signout", { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "callbackUrl=/&json=true" });
  assert.ok(!(await signout.headers.getSetCookie()).some((value) => value.startsWith("__Secure-next-auth.session-token=")), "Sign-out without CSRF changed session cookie");
  console.log("PASS CSRF tokens available and unauthenticated POST cannot clear a session");
  for (const path of ["/content/generated/course.json", "/content/generated/nav.json", "/course.json"]) {
    assert.equal((await request(path)).status, 404);
  }
  console.log("PASS generated content is not publicly downloadable");
  if (process.argv.includes("--browser")) {
    const proxy = createHttpServer(async (incoming, outgoing) => {
      try {
        if (!["GET", "HEAD"].includes(incoming.method ?? "")) {
          outgoing.writeHead(405).end();
          return;
        }
        const path = incoming.url ?? "/";
        if (!path.startsWith("/") || path.startsWith("//")) {
          outgoing.writeHead(400).end();
          return;
        }
        const upstream = await fetch(origin + path, { redirect: "manual", headers: { cookie: firstCookie } });
        outgoing.statusCode = upstream.status;
        for (const [name, value] of upstream.headers) {
          if (!["content-encoding", "content-length", "transfer-encoding", "set-cookie"].includes(name)) outgoing.setHeader(name, value);
        }
        outgoing.end(Buffer.from(await upstream.arrayBuffer()));
      } catch {
        outgoing.writeHead(502).end("Synthetic browser test server unavailable");
      }
    });
    proxy.listen(0, "127.0.0.1");
    await once(proxy, "listening");
    const proxyAddress = proxy.address();
    assert.ok(proxyAddress && typeof proxyAddress !== "string");
    console.log(`Synthetic browser test only: http://127.0.0.1:${proxyAddress.port}`);
    await new Promise((accept) => { process.once("SIGINT", accept); process.once("SIGTERM", accept); });
    proxy.closeAllConnections();
    proxy.close();
  }
} finally {
  child.kill();
  if (child.exitCode === null) await once(child, "exit");
}