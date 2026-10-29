import Link from "next/link";
import { useRouter } from "next/router";
import { createContext, useContext, useState } from "react";
import type { NavWeek } from "../lib/weeks.ts";
import { sectionTitle, weekTitle } from "../lib/weeks.ts";
import { useProgress } from "../state/ProgressContext.tsx";
import type { Progress } from "../lib/progress.ts";
import { RoleIcon } from "./RoleIcon.tsx";

export const CourseNavigation = createContext<NavWeek[]>([]);

function topicPercent(progress: Progress, week: NavWeek): number {
  if (!week.total) return 0;
  const prefix = `w${week.n}-`;
  let done = 0;
  for (const [id, r] of Object.entries(progress.items)) if (id.startsWith(prefix) && (r.status === "solved" || r.status === "revealed")) done++;
  return Math.min(100, Math.round((done / week.total) * 100));
}

export function Sidebar() {
  const navigation = useContext(CourseNavigation);
  const { progress } = useProgress();
  const { query, asPath } = useRouter();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [toggled, setToggled] = useState<Record<number, boolean>>({});
  const current = Number(query.n) || 0;
  const q = term.trim().toLowerCase();
  const path = asPath.split(/[?#]/)[0];

  const weeks = navigation.map((w) => {
    const sections = w.sections.filter((s) => !q || `${w.title} ${s.title}`.toLowerCase().includes(q));
    return { ...w, sections };
  }).filter((w) => !q || w.sections.length);

  const top = (href: string, label: string, icon: string) => (
    <li key={href}>
      <Link href={href} className="side-item" aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>
        <RoleIcon role={icon} />
        <span>{label}</span>
      </Link>
    </li>
  );

  return (
    <aside className={open ? "sidebar open" : "sidebar"} aria-label="Course">
      <button type="button" className="sidebar-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Close course menu" : "Course menu"}
      </button>
      <div className="sidebar-body">
        <label className="sr-only" htmlFor="course-search">Search lessons</label>
        <input id="course-search" type="search" placeholder="Search lessons" value={term} onChange={(e) => setTerm(e.target.value)} />
        <ul className="side-top">
          {top("/einstufung", "Placement test", "placement")}
          {top("/plan", "Learning path", "path")}
        </ul>
        <ul className="side-weeks">
          {weeks.map((w) => {
            const expanded = q !== "" || (toggled[w.n] ?? w.n === current);
            const percent = topicPercent(progress, w);
            const listId = `side-topic-${w.n}`;
            return (
              <li key={w.n} className={w.n === current ? "side-topic is-current" : "side-topic"}>
                <div className="side-topic-row">
                  <Link href={`/woche/${w.n}`} className="side-topic-link" aria-current={path === `/woche/${w.n}` ? "page" : undefined} onClick={() => setOpen(false)}>
                    <span className="side-topic-title">{weekTitle(w.title).german}</span>
                    <span className={percent ? "side-percent started" : "side-percent"}>{percent}%</span>
                  </Link>
                  {q ? null : (
                    <button type="button" className="side-chevron" aria-expanded={expanded} aria-controls={listId} aria-label={`${expanded ? "Hide" : "Show"} lessons in ${weekTitle(w.title).german}`} onClick={() => setToggled({ ...toggled, [w.n]: !expanded })}>
                      <RoleIcon role="chevron" />
                    </button>
                  )}
                </div>
                {expanded ? (
                  <ul className="side-sections" id={listId}>
                    {w.sections.map((s) => {
                      const href = `/woche/${w.n}/${s.id}`;
                      return (
                        <li key={s.id}>
                          <Link href={href} className="side-item" aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>
                            <RoleIcon role={s.role} />
                            <span>{sectionTitle(s.title)}</span>
                            {s.role === "listening" ? <span className="pill">soon</span> : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
        {q && !weeks.length ? <p className="muted">No lessons match “{term}”.</p> : null}
        <ul className="side-top">
          {[1, 2, 3].map((n) => top(`/checkpoint/${n}`, `Checkpoint ${n}`, "other"))}
        </ul>
      </div>
    </aside>
  );
}
