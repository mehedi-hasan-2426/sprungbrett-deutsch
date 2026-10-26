import type { Inline } from "./types.ts";

const ROUTES: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/Woche_(\d{2})\.md$/, (m) => "/woche/" + Number(m[1])],
  [/Grammatik\.md$/, () => "/material/grammatik"],
  [/Wortschatz\.md$/, () => "/material/wortschatz"],
  [/Hoeren_Lesen\.md$/, () => "/material/hoeren-lesen"],
  [/Sprechen_Aussprache\.md$/, () => "/material/sprechen"],
  [/Schreibportfolio\.md$/, () => "/material/schreiben"],
  [/Fortschritt\.md$/, () => "/fortschritt"],
  [/02_Einstufungstest\.md$/, () => "/einstufung"],
  [/03_Lernplan\.md$/, () => "/plan"],
];

export function safeHref(raw: string): string | undefined {
  const target = raw.trim();
  if (/^https:\/\//i.test(target)) {
    try {
      const url = new URL(target);
      if (url.protocol !== "https:" || url.username || url.password) return undefined;
      return url.toString();
    } catch {
      return undefined;
    }
  }
  const path = target.split("#")[0] ?? "";
  for (const [pattern, toRoute] of ROUTES) {
    const m = path.match(pattern);
    if (m) return toRoute(m);
  }
  return undefined;
}

function emphasis(text: string, out: Inline[], href?: string): void {
  let b = false;
  let i = false;
  let buf = "";
  const flush = () => {
    if (!buf) return;
    const seg: Inline = { t: buf };
    if (b) seg.b = true;
    if (i) seg.i = true;
    if (href) seg.href = href;
    out.push(seg);
    buf = "";
  };
  for (let k = 0; k < text.length; k++) {
    if (text.startsWith("**", k)) {
      flush();
      b = !b;
      k++;
    } else if (text[k] === "*") {
      flush();
      i = !i;
    } else {
      buf += text[k];
    }
  }
  flush();
}

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)|(https:\/\/[^\s|)]+)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const index = m.index ?? 0;
    emphasis(text.slice(last, index), out);
    if (m[3]) {
      const href = safeHref(m[3]);
      out.push(href ? { t: m[3], href } : { t: m[3] });
    } else {
      emphasis(m[1] ?? "", out, safeHref(m[2] ?? ""));
    }
    last = index + m[0].length;
  }
  emphasis(text.slice(last), out);
  return out;
}

export function plain(text: string): string {
  return parseInline(text)
    .map((s) => s.t)
    .join("");
}
