import { test } from "node:test";
import assert from "node:assert/strict";
import { approvedEmails, canAccess, sessionIsCurrent } from "../src/lib/access.ts";

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