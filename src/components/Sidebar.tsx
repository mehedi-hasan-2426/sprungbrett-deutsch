import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import navData from "../../content/generated/nav.json";
import type { NavWeek } from "../lib/weeks.ts";
import { sectionTitle, weekTitle } from "../lib/weeks.ts";

const NAV = navData as NavWeek[];

export function Sidebar() {
  const { query, asPath } = useRouter();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const current = Number(query.n) || 0;
  const q = term.trim().toLowerCase();
  const path = asPath.split(/[?#]/)[0];

  const weeks = NAV.map((w) => {
    const sections = w.sections.filter((s) => !q || `${w.title} ${s.title}`.toLowerCase().includes(q));
    return { ...w, sections };
  }).filter((w) => !q || w.sections.length);

  return (
    <aside className={open ? "sidebar open" : "sidebar"} aria-label="Course">
      <button type="button" className="sidebar-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Close course menu" : "Course menu"}
      </button>
      <div className="sidebar-body">
        <label className="sr-only" htmlFor="course-search">Search lessons</label>
        <input id="course-search" type="search" placeholder="Search lessons" value={term} onChange={(e) => setTerm(e.target.value)} />
        <ul className="side-top">
          <li><Link href="/einstufung" aria-current={path === "/einstufung" ? "page" : undefined}>Placement test</Link></li>
          <li><Link href="/plan" aria-current={path === "/plan" ? "page" : undefined}>Study plan</Link></li>
        </ul>
        <ol className="side-weeks">
          {weeks.map((w) => {
            const expanded = q !== "" || w.n === current;
            return (
              <li key={w.n} className={w.n === current ? "is-current" : undefined}>
                <Link href={`/woche/${w.n}`} className="side-week" aria-current={path === `/woche/${w.n}` ? "page" : undefined} onClick={() => setOpen(false)}>
                  <span className="side-num">{String(w.n).padStart(2, "0")}</span>
                  <span>{weekTitle(w.title).german}</span>
                </Link>
                {expanded ? (
                  <ul className="side-sections">
                    {w.sections.map((s) => {
                      const href = `/woche/${w.n}/${s.id}`;
                      return (
                        <li key={s.id}>
                          <Link href={href} aria-current={path === href ? "page" : undefined} onClick={() => setOpen(false)}>
                            {sectionTitle(s.title)}
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
        </ol>
        {q && !weeks.length ? <p className="muted">No lessons match “{term}”.</p> : null}
        <ul className="side-top">
          {[1, 2, 3].map((n) => (
            <li key={n}><Link href={`/checkpoint/${n}`} aria-current={path === `/checkpoint/${n}` ? "page" : undefined}>Checkpoint {n}</Link></li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
