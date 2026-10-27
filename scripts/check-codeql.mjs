import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function blockingFindings(report) {
  if (!Array.isArray(report.runs) || report.runs.length === 0) throw new Error("Missing CodeQL analysis runs");
  const findings = [];
  for (const run of report.runs) {
    const driver = run.tool?.driver;
    const extensions = run.tool?.extensions ?? [];
    for (const result of run.results ?? []) {
      const reference = result.rule;
      const component = reference?.toolComponent;
      const components = component
        ? extensions.filter((entry, index) => component.index !== undefined ? index === component.index : component.guid ? entry.guid === component.guid : entry.name === component.name)
        : [driver, ...extensions].filter(Boolean);
      const id = reference?.id ?? result.ruleId;
      const index = reference?.index ?? result.ruleIndex;
      const matches = id
        ? components.flatMap((entry) => (entry.rules ?? []).filter((rule) => rule.id === id))
        : components.flatMap((entry) => entry.rules?.[index] ? [entry.rules[index]] : []);
      if (matches.length !== 1) throw new Error("CodeQL result has no unique rule metadata");
      const rule = matches[0];
      if (!rule) throw new Error("CodeQL result has no rule metadata");
      const severity = Number(rule.properties?.["security-severity"] ?? 0);
      if (!Number.isFinite(severity) || severity < 0 || severity > 10) throw new Error("Invalid CodeQL security severity");
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