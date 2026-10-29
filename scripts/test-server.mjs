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
    DATABASE_URL: "",
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
  assert.ok(signInHtml.includes("Continue with Google") && signInHtml.includes("Continue as guest"));
  assert.ok(signInHtml.includes("signin-screen") && !signInHtml.includes("A1 → A2"));
  const { buildId } = JSON.parse(bootstrap);
  assert.match(buildId, /^[A-Za-z0-9_-]{1,128}$/);
  const reading = { id: "5-lesen" };
  const vocab = { id: "1-wortschatz" };
  const routes = ["/", "/karten", "/fortschritt", "/info", "/plan", "/einstufung", "/artikel", "/kurz", "/checkpoint/1", "/material/wortschatz", "/material/grammatik", "/grammatik/cases/dative", "/woche/1", `/woche/1/${reading.id}`, `/_next/data/${buildId}/woche/1.json`, `/_next/data/${buildId}/woche/1/${reading.id}.json`, `/_next/data/${buildId}/grammatik/cases/dative.json`];
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
  assert.equal((await request("/api/guest")).status, 405);
  const foreignGuest = await fetch(origin + "/api/guest", { method: "POST", headers: { origin: "https://evil.example", "x-sprungbrett-guest": "1" } });
  assert.equal(foreignGuest.status, 403);
  assert.equal(foreignGuest.headers.getSetCookie().length, 0);
  const enteredGuest = await fetch(origin + "/api/guest", { method: "POST", headers: { origin, "x-sprungbrett-guest": "1" } });
  assert.equal(enteredGuest.status, 204);
  const guestSetCookie = enteredGuest.headers.getSetCookie();
  assert.equal(guestSetCookie.length, 1);
  assert.match(guestSetCookie[0], /^sprungbrett\.guest=1;.*HttpOnly; SameSite=Lax/);
  const guestCookie = guestSetCookie[0].split(";")[0];
  for (const route of routes) {
    const response = await request(route, guestCookie);
    assert.equal(response.status, 200, `Guest course route failed: ${route}`);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    const body = await response.text();
    assert.ok(body.includes('"guest":true'), `Missing guest state: ${route}`);
    assert.ok(!body.includes("Saved to cloud"), `False cloud-save claim: ${route}`);
  }
  assert.equal((await request("/api/progress", guestCookie)).status, 401);
  assert.equal((await fetch(origin + "/api/progress", { method: "PUT", headers: { cookie: guestCookie, origin: `https://localhost:${port}`, "x-sprungbrett-sync": "1", "content-type": "application/json" }, body: "{}" })).status, 401);
  const guestSession = await (await request("/api/auth/session", guestCookie)).json();
  assert.ok(!guestSession.accountKey && !guestSession.user);
  const guestProgressHtml = await (await request("/fortschritt", guestCookie)).text();
  assert.ok(guestProgressHtml.includes("Browser-only save") && !guestProgressHtml.includes("Sync Now"));
  const leftGuest = await fetch(origin + "/api/guest", { method: "DELETE", headers: { origin, cookie: guestCookie, "x-sprungbrett-guest": "1" } });
  assert.equal(leftGuest.status, 204);
  assert.match(leftGuest.headers.getSetCookie()[0], /Max-Age=0/);
  await denied("/woche/1", "sprungbrett.guest=0");
  console.log(`PASS centered sign-in offers guest entry; guests read ${routes.length} course/data routes but cannot read or write account progress`);
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
  const accountWithGuest = await (await request(`/woche/1/${vocab.id}`, firstCookie + "; " + guestCookie)).text();
  assert.ok(accountWithGuest.includes('"guest":false') && !accountWithGuest.includes("Guest: this browser only"));
  console.log("PASS both synthetic approved accounts receive bilingual lessons with private caching and strict CSP");
  const grammar = await request("/grammatik/cases/dative", firstCookie);
  assert.equal(grammar.status, 200);
  const grammarHtml = await grammar.text();
  assert.ok(grammarHtml.includes("Dative case") && grammarHtml.includes("Grammar in context"));
  assert.ok(!grammarHtml.includes("Week 1") && !grammarHtml.includes("of 12"));
  const planHtml = await (await request("/plan", firstCookie)).text();
  assert.ok(planHtml.includes("Your learning path") && !/12.week|Week 1/.test(planHtml));
  console.log("PASS authenticated grammar and self-paced learning path render without a fixed-week schedule");
  for (const active of [firstCookie, secondCookie]) {
    const signIn = await request("/signin", active);
    assert.equal(signIn.status, 307);
    assert.equal(signIn.headers.get("location"), "/");
    assert.match(signIn.headers.get("cache-control") ?? "", /private.*no-store/);
    const home = await request("/", active);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /<h1>Today<\/h1>/);
  }
  for (const inactive of [undefined, await cookie({ email: "other@example.com" }), await cookie({ signedInAt: Date.now() - 8 * 60 * 60 * 1000 })]) {
    const signIn = await request("/signin", inactive);
    assert.equal(signIn.status, 200);
    assert.ok((await signIn.text()).includes("Continue with Google"));
  }
  console.log("PASS approved sessions leave sign-in for home; anonymous, disallowed and expired sessions keep the sign-in form");
  for (const [target, expected] of [["/", "/"], ["/signin", "/signin"], ["https://evil.example/", "/signin"], ["//evil.example/", "/signin"]]) {
    const response = await request("/api/auth/csrf?callbackUrl=" + encodeURIComponent(target));
    assert.equal(response.status, 200);
    const callback = response.headers.getSetCookie().find((value) => value.split("=")[0].endsWith("callback-url"));
    assert.ok(callback, "NextAuth did not store the return destination");
    const encoded = callback.split(";")[0].slice(callback.indexOf("=") + 1);
    const destination = new URL(decodeURIComponent(encoded));
    assert.equal(destination.origin, `https://localhost:${port}`);
    assert.equal(destination.pathname, expected);
  }
  console.log("PASS NextAuth stores the relative home callback correctly and rejects external destinations");
  const firstSession = await (await request("/api/auth/session", firstCookie)).json();
  const secondSession = await (await request("/api/auth/session", secondCookie)).json();
  assert.notEqual(firstSession.accountKey, secondSession.accountKey);
  assert.match(firstSession.accountKey, /^[a-f0-9]{64}$/);
  assert.ok(!("access_token" in firstSession) && !("id_token" in firstSession));
  console.log("PASS account keys are distinct; session endpoint exposes no provider tokens");
  assert.equal((await request("/api/progress")).status, 401);
  assert.equal((await request("/api/progress", await cookie({ email: "other@example.com" }))).status, 401);
  const unavailable = await request("/api/progress", firstCookie);
  assert.equal(unavailable.status, 503);
  assert.match(unavailable.headers.get("cache-control") ?? "", /private.*no-store/);
  const foreignSave = await fetch(origin + "/api/progress", {
    method: "PUT", headers: { cookie: firstCookie, origin: "https://evil.example", "content-type": "application/json", "x-sprungbrett-sync": "1" }, body: "{}",
  });
  assert.equal(foreignSave.status, 403);
  console.log("PASS progress API denies anonymous, disallowed and cross-site requests; absent database fails closed");
  const csrf = await (await request("/api/auth/csrf")).json();
  assert.ok(typeof csrf.csrfToken === "string" && csrf.csrfToken.length > 10);
  const signout = await fetch(origin + "/api/auth/signout", { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "callbackUrl=/&json=true" });
  assert.ok(!(await signout.headers.getSetCookie()).some((value) => value.startsWith("__Secure-next-auth.session-token=")), "Sign-out without CSRF changed session cookie");
  console.log("PASS CSRF tokens available and unauthenticated POST cannot clear a session");
  for (const path of ["/content/generated/course.json", "/content/generated/nav.json", "/course.json"]) {
    assert.equal((await request(path)).status, 404);
  }
  console.log("PASS generated content is not publicly downloadable");
  if (process.argv.includes("--guest-browser")) {
    console.log(`Guest browser preview: ${origin}/signin`);
    await new Promise((accept) => { process.once("SIGINT", accept); process.once("SIGTERM", accept); });
  } else if (process.argv.includes("--browser")) {
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