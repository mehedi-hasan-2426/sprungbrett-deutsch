import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedEmails, canAccess, safeAuthRedirect, sessionIsCurrent } from "../src/lib/access.ts";

const allowlist = "first@example.com,second@example.org";

test("access requires exactly two distinct configured email addresses", () => {
  for (const invalid of [undefined, "", "first@example.com", `${allowlist},third@example.com`, "same@example.com,SAME@example.com", "bad,second@example.org"]) {
    assert.deepEqual(approvedEmails(invalid), []);
    assert.equal(canAccess("first@example.com", true, invalid), false);
  }
});

test("only exact verified addresses pass, not aliases, domains or suffixes", () => {
  assert.equal(canAccess("FIRST@example.com", true, allowlist), true);
  assert.equal(canAccess("second@example.org", true, allowlist), true);
  for (const email of ["third@example.com", "first+other@example.com", "first@example.com.evil.test", "prefixfirst@example.com", null]) {
    assert.equal(canAccess(email, true, allowlist), false);
  }
  for (const verified of [false, undefined, "true", 1]) assert.equal(canAccess("first@example.com", verified, allowlist), false);
});

test("sessions have an absolute eight-hour maximum and reject invalid timestamps", () => {
  const now = 1_000_000_000;
  assert.equal(sessionIsCurrent(now, now), true);
  assert.equal(sessionIsCurrent(now - 8 * 60 * 60 * 1000, now), false);
  for (const time of [undefined, NaN, Infinity, "today", now + 1]) assert.equal(sessionIsCurrent(time, now), false);
});

test("relative home and sign-out callbacks stay on the configured origin", () => {
  const base = "https://course.example.com";
  assert.equal(safeAuthRedirect("/", base), base + "/");
  assert.equal(safeAuthRedirect(base, base), base + "/");
  assert.equal(safeAuthRedirect(base + "/", base), base + "/");
  assert.equal(safeAuthRedirect("/signin", base), base + "/signin");
  assert.equal(safeAuthRedirect("/woche/1?practice=easy#words", base), base + "/woche/1?practice=easy#words");
});

test("authentication return URLs reject external, malformed and ambiguous targets", () => {
  const base = "https://course.example.com";
  for (const target of [
    "https://evil.example/", "https://course.example.com.evil.example/", "//evil.example/", "//course.example.com/",
    "/\\evil.example/", "https://user:password@course.example.com/", "javascript:alert(1)", "data:text/html,test",
    "http://course.example.com/", "https://course.example.com:8443/", "not a URL", "", "/\n/evil.example/",
  ]) assert.equal(safeAuthRedirect(target, base), base + "/signin", target);
});