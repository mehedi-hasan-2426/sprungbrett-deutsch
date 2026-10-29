import { test } from "node:test";
import assert from "node:assert/strict";
import { GUEST_COOKIE, GUEST_PROGRESS_KEY, guestCookie, isGuest } from "../src/lib/guest.ts";
import type { NextApiRequest, NextApiResponse } from "next";
import guest from "../pages/api/guest.ts";

function invoke(method = "POST", headers: Record<string, string> = {}) {
  let status = 200;
  const returnedHeaders = new Map<string, string>();
  const response = {
    setHeader: (name: string, value: string) => { returnedHeaders.set(name, value); },
    status: (value: number) => { status = value; return response; },
    json: () => undefined,
    end: () => undefined,
  };
  const request = { method, headers: { host: "course.example.com", origin: "https://course.example.com", "x-sprungbrett-guest": "1", ...headers } };
  guest(request as unknown as NextApiRequest, response as unknown as NextApiResponse);
  return { status, headers: returnedHeaders };
}

test("guest access requires the explicit course-only marker", () => {
  assert.equal(isGuest({}), false);
  for (const value of ["", "true", "0", "<script>"]) assert.equal(isGuest({ [GUEST_COOKIE]: value }), false);
  assert.equal(isGuest({ [GUEST_COOKIE]: "1" }), true);
  assert.equal(GUEST_PROGRESS_KEY, "sprungbrett.progress.guest");
});

test("guest cookies are HTTP-only, same-site and secure on HTTPS", () => {
  assert.match(guestCookie(true), /Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure$/);
  assert.doesNotMatch(guestCookie(false), /; Secure/);
});

test("guest entry and exit change only the course marker, not an account session", () => {
  const entered = invoke();
  assert.equal(entered.status, 204);
  assert.equal(entered.headers.get("Set-Cookie"), guestCookie(true));
  assert.match(entered.headers.get("Cache-Control") ?? "", /private.*no-store/);
  const exited = invoke("DELETE");
  assert.equal(exited.status, 204);
  assert.match(exited.headers.get("Set-Cookie") ?? "", /^sprungbrett\.guest=;.*Max-Age=0; Secure$/);
});

test("guest entry rejects unsafe methods, foreign origins and missing request headers", () => {
  for (const method of ["GET", "PUT", "OPTIONS"]) assert.equal(invoke(method).status, 405);
  const invalidHeaders: Record<string, string>[] = [
    { origin: "https://evil.example" }, { origin: "" }, { origin: "invalid" },
    { origin: "https://course.example.com/path" }, { "sec-fetch-site": "cross-site" }, { "x-sprungbrett-guest": "" },
  ];
  for (const headers of invalidHeaders) {
    const result = invoke("POST", headers);
    assert.equal(result.status, 403);
    assert.equal(result.headers.has("Set-Cookie"), false);
  }
});