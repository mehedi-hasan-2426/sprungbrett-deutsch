import type { Block, Inline } from "./types.ts";
import { parseInline } from "./inline.ts";

export interface RawSection {
  title: string;
  lines: string[];
}

export interface RawDoc {
  title: string;
  intro: string[];
  sections: RawSection[];
}

export function stripFrontmatter(md: string): string {
  const text = md.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---\n", 4);
  return end === -1 ? text : text.slice(end + 5);
}

export function splitDoc(md: string, level = 2): RawDoc {
  const marker = "#".repeat(level) + " ";
  const lines = stripFrontmatter(md).split("\n");
  const doc: RawDoc = { title: "", intro: [], sections: [] };
  let current: RawSection | null = null;
  for (const line of lines) {
    if (!doc.title && line.startsWith("# ")) {
      doc.title = line.slice(2).trim();
    } else if (line.startsWith(marker)) {
      current = { title: line.slice(marker.length).trim(), lines: [] };
      doc.sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      doc.intro.push(line);
    }
  }
  return doc;
}

export function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isSeparator(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

export function parseTable(lines: string[]): { header: string[]; rows: string[][] } {
  const all = lines.map(splitCells);
  const header = all[0] ?? [];
  const rows = all.slice(1).filter((r) => !isSeparator(r));
  return { header, rows };
}

const special = (line: string) =>
  line.startsWith("|") || line.startsWith(">") || line.startsWith("- ") || line.startsWith("```") || line.startsWith("### ") || line.trim() === "---";

export function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let k = 0;
  while (k < lines.length) {
    const line = lines[k] ?? "";
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") {
      k++;
    } else if (trimmed.startsWith("```")) {
      const body: string[] = [];
      k++;
      while (k < lines.length && !(lines[k] ?? "").trim().startsWith("```")) body.push(lines[k++] ?? "");
      k++;
      blocks.push({ kind: "code", text: body.join("\n") });
    } else if (trimmed.startsWith("|")) {
      const rowsRaw: string[] = [];
      while (k < lines.length && (lines[k] ?? "").trim().startsWith("|")) rowsRaw.push(lines[k++] ?? "");
      const { header, rows } = parseTable(rowsRaw);
      blocks.push({
        kind: "table",
        header: header.map(parseInline),
        rows: rows.map((r) => r.map(parseInline)),
      });
    } else if (trimmed.startsWith(">")) {
      const quote: Inline[][] = [];
      while (k < lines.length && (lines[k] ?? "").trim().startsWith(">")) {
        quote.push(parseInline((lines[k++] ?? "").trim().replace(/^>\s?/, "")));
      }
      blocks.push({ kind: "quote", lines: quote });
    } else if (trimmed.startsWith("- ")) {
      const items: Inline[][] = [];
      let checks = false;
      while (k < lines.length && (lines[k] ?? "").trim().startsWith("- ")) {
        let text = (lines[k++] ?? "").trim().slice(2);
        if (text.startsWith("[ ] ")) {
          checks = true;
          text = text.slice(4);
        }
        items.push(parseInline(text));
      }
      blocks.push(checks ? { kind: "list", items, checks } : { kind: "list", items });
    } else if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "h", text: parseInline(trimmed.slice(4)) });
      k++;
    } else {
      const para: string[] = [];
      while (k < lines.length && (lines[k] ?? "").trim() && !special((lines[k] ?? "").trim())) {
        para.push((lines[k++] ?? "").trim());
      }
      blocks.push({ kind: "p", text: parseInline(para.join(" ")) });
    }
  }
  return blocks;
}
