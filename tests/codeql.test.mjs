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

test("CodeQL gate resolves extension rules and explicit tool-component references", () => {
  const high = { id: "js/extension-high", properties: { "security-severity": "8.1" } };
  const medium = { id: "js/file-access-to-http", properties: { "security-severity": "5.0" } };
  const report = { runs: [{ tool: { driver: { rules: [] }, extensions: [{ name: "security-extended", rules: [medium, high] }] }, results: [{ ruleId: medium.id }, { rule: { index: 1, toolComponent: { index: 0 } } }] }] };
  assert.deepEqual(blockingFindings(report), [{ rule: high.id, severity: 8.1 }]);
});

test("CodeQL gate fails closed for ambiguous metadata and invalid severity", () => {
  const rule = { id: "duplicate", properties: { "security-severity": "8" } };
  assert.throws(() => blockingFindings({ runs: [{ tool: { driver: { rules: [rule] }, extensions: [{ rules: [rule] }] }, results: [{ ruleId: rule.id }] }] }));
  assert.throws(() => blockingFindings({ runs: [{ tool: { driver: { rules: [{ id: "bad", properties: { "security-severity": "invalid" } }] } }, results: [{ ruleId: "bad" }] }] }));
  assert.throws(() => blockingFindings({ runs: [{ tool: { driver: { rules: [rule] } }, results: [{ ruleId: "missing", ruleIndex: 0 }] }] }));
});