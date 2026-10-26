import { test } from "node:test";
import assert from "node:assert/strict";
import { blockingFindings } from "../scripts/check-codeql.mjs";

test("CodeQL gate rejects High and Critical results without blocking lower severities", () => {
  const rules = [
    { id: "high", properties: { "security-severity": "7.5" } },
    { id: "critical", properties: { "security-severity": "9.8" } },
    { id: "medium", properties: { "security-severity": "5.0" } },
  ];
  const report = { runs: [{ tool: { driver: { rules } }, results: rules.map((rule) => ({ ruleId: rule.id })) }] };
  assert.deepEqual(blockingFindings(report).map((finding) => finding.rule), ["high", "critical"]);
  report.runs[0].results = [];
  assert.deepEqual(blockingFindings(report), []);
});

test("CodeQL gate rejects absent analysis or missing rule metadata", () => {
  assert.throws(() => blockingFindings({ runs: [] }));
  assert.throws(() => blockingFindings({ runs: [{ results: [{ ruleId: "unknown" }] }] }));
});