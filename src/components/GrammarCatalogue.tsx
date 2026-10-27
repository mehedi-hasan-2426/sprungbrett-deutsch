import Link from "next/link";
import { useState } from "react";
import type { GrammarTopic } from "../lib/types.ts";
import { groupScore } from "../lib/progress.ts";
import { useProgress } from "../state/ProgressContext.tsx";

export type GrammarSummary = Pick<GrammarTopic, "slug" | "title" | "group" | "level" | "summary"> & { ids: string[] };

export function GrammarCatalogue({ topics }: { topics: GrammarSummary[] }) {
  const { progress, ready } = useProgress();
  const [search, setSearch] = useState("");
  const groups = [...new Set(topics.map((topic) => topic.group))];
  const term = search.trim().toLowerCase();
  const filtered = topics.filter((topic) => `${topic.title} ${topic.group} ${topic.summary}`.toLowerCase().includes(term));
  return (
    <div className="grammar-catalogue">
      <label htmlFor="grammar-search">Find a grammar topic</label>
      <input id="grammar-search" className="full" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      {filtered.length === 0 ? <p role="status">No grammar topics match.</p> : null}
      {groups.map((group) => {
        const entries = filtered.filter((topic) => topic.group === group);
        if (!entries.length) return null;
        return <section key={group}>
          <h2 className="grammar-group">{group}</h2>
          <ul className="lessons">
            {entries.map((topic) => {
              const score = groupScore(progress, topic.ids);
              return <li key={topic.slug}>
                <Link className="lesson" href={`/grammatik/${topic.slug}`}>
                  <span className="lesson-body">
                    <span className="lesson-role">{topic.level}</span>
                    <span className="lesson-title">{topic.title}</span>
                    <span className="lesson-meta">{topic.summary}</span>
                    <span className="lesson-meta">{ready ? `${score.done} / ${score.total} done` : `${score.total} exercises`}</span>
                  </span>
                </Link>
              </li>;
            })}
          </ul>
        </section>;
      })}
    </div>
  );
}