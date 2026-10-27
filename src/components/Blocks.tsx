import Link from "next/link";
import type { ReactNode } from "react";
import type { Block, Inline, Item } from "../lib/types.ts";

export function InlineText({ segs }: { segs: Inline[] }) {
  return (
    <>
      {segs.map((s, k) => {
        let node: ReactNode = s.t;
        if (s.i) node = <em>{node}</em>;
        if (s.b) node = <strong>{node}</strong>;
        if (s.href?.startsWith("https://")) {
          node = (
            <a href={s.href} target="_blank" rel="noopener noreferrer">
              {node}
            </a>
          );
        } else if (s.href?.startsWith("/")) {
          node = <Link href={s.href}>{node}</Link>;
        }
        return <span key={k}>{node}</span>;
      })}
    </>
  );
}

export function Blocks({ blocks, items, renderItem, idPrefix }: { blocks: Block[]; items?: Record<string, Item>; renderItem?: (item: Item) => ReactNode; idPrefix?: string }) {
  return (
    <>
      {blocks.map((b, k) => {
        switch (b.kind) {
          case "h":
            return (
              <h3 key={k} id={idPrefix ? `${idPrefix}-${k}` : undefined}>
                <InlineText segs={b.text} />
              </h3>
            );
          case "p":
            return (
              <p key={k}>
                <InlineText segs={b.text} />
              </p>
            );
          case "list":
            return (
              <ul key={k} className={b.checks ? "checks" : undefined}>
                {b.items.map((it, j) => (
                  <li key={j}>
                    <InlineText segs={it} />
                  </li>
                ))}
              </ul>
            );
          case "table":
            return (
              <div key={k} className="table-wrap">
                <table className={b.variant === "vocabulary" ? "vocab-table" : undefined}>
                  <thead>
                    <tr>
                      {b.header.map((h, j) => (
                        <th key={j} scope="col">
                          <InlineText segs={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j}>
                        {r.map((c, i) => (
                          <td key={i} data-label={b.header[i]?.map((segment) => segment.t).join("")}>
                            <InlineText segs={c} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "quote":
            return (
              <blockquote key={k}>
                {b.lines.map((l, j) => (
                  <p key={j}>
                    <InlineText segs={l} />
                  </p>
                ))}
              </blockquote>
            );
          case "code":
            return <pre key={k}>{b.text}</pre>;
          case "item": {
            const item = items?.[b.itemId];
            return item && renderItem ? <div key={k}>{renderItem(item)}</div> : null;
          }
        }
      })}
    </>
  );
}
