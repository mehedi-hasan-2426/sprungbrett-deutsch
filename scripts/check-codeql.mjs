import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function blockingFindings(report) {
  if (!Array.isArray(report.runs) || report.runs.length === 0) throw new Error("Missing CodeQL analysis runs");
  const findings = [];
  for (const run of report.runs) {
    const rules = run.tool?.driver?.rules ?? [];
    for (const result of run.results ?? []) {
      const rule = rules.find((entry) => entry.id === result.ruleId) ?? rules[result.ruleIndex];
      if (!rule) throw new Error("CodeQL result has no rule metadata");
      const severity = Number(rule.properties?.["security-severity"] ?? 0);
      if (severity >= 7) findings.push({ rule: rule.id, severity });
    }
  }
  return findings;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(process.argv[2] ?? "codeql-results");
  const files = readdirSync(directory).filter((file) => file.endsWith(".sarif"));
  if (files.length === 0) throw new Error("Missing CodeQL SARIF output");
  const findings = files.flatMap((file) => blockingFindings(JSON.parse(readFileSync(join(directory, file), "utf8"))));
  for (const finding of findings) console.error(`Blocked: ${finding.rule} (security severity ${finding.severity})`);
  console.log(`CodeQL gate: ${findings.length} High/Critical findings`);
  if (findings.length) process.exitCode = 1;
}