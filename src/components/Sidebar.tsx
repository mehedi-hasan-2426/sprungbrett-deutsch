import Link from "next/link";
import { useRouter } from "next/router";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import type { NavWeek } from "../lib/weeks.ts";
import { sectionTitle, STAGES, weekTitle } from "../lib/weeks.ts";
import { useProgress } from "../state/ProgressContext.tsx";
import type { Progress } from "../lib/progress.ts";
import { RoleIcon } from "./RoleIcon.tsx";
import { LEVEL_KEY, parseLevel } from "../lib/levels.ts";
import type { Level } from "../lib/levels.ts";

export const CourseNavigation = createContext<NavWeek[]>([]);

const LEVEL_EVENT = "sprungbrett:level-changed";

function readLevel(): Level {
  try {
    return parseLevel(window.localStorage.getItem(LEVEL_KEY));
  } catch {
    return "A2";
  }
}

function subscribeLevel(notify: () => void) {
  window.addEventListener(LEVEL_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(LEVEL_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
}

function storeLevel(level: Level) {
  try {
    window.localStorage.setItem(LEVEL_KEY, level);
  } catch {
    return;
  } finally {
    window.dispatchEvent(new Event(LEVEL_EVENT));
  }
}

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
  const level = useSyncExternalStore(subscribeLevel, readLevel, () => "A2" as Level);
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
        <div className="level-picker" role="radiogroup" aria-label="Level">
          {(["A1", "A2"] as const).map((l) => (
            <button key={l} type="button" role="radio" aria-checked={level === l} className={level === l ? "level-option is-active" : "level-option"} onClick={() => storeLevel(l)}>
              {l}
            </button>
          ))}
        </div>
        {level === "A1" ? (
          <div className="level-soon">
            <p><strong>A1 is coming soon.</strong></p>
            <p className="muted">The beginner course is being prepared. Until then, practise with A2.</p>
            <button type="button" className="secondary" onClick={() => storeLevel("A2")}>Show A2</button>
          </div>
        ) : (
          <>
        <ul className="side-top">
          {top("/einstufung", "Placement test", "placement")}
          {top("/plan", "Learning path", "path")}
        </ul>
        <div className="side-weeks">
          {STAGES.map((stage) => {
            const stageWeeks = weeks.filter((w) => (stage.topics as readonly number[]).includes(w.n));
            if (q && !stageWeeks.length) return null;
            return (
              <section key={stage.n} aria-labelledby={`side-stage-${stage.n}`}>
                <p className="side-stage" id={`side-stage-${stage.n}`}>{stage.title} · Topics {stage.topics[0]}–{stage.topics[stage.topics.length - 1]}</p>
                <ul>
          {stageWeeks.map((w) => {
            const expanded = q !== "" || (toggled[w.n] ?? w.n === current);
            const percent = topicPercent(progress, w);
            const listId = `side-topic-${w.n}`;
            return (
              <li key={w.n} className={w.n === current ? "side-topic is-current" : "side-topic"}>
                <div className="side-topic-row">
                  <Link href={`/woche/${w.n}`} className="side-topic-link" aria-current={path === `/woche/${w.n}` ? "page" : undefined} onClick={() => setOpen(false)}>
                    <span className="side-topic-title">{weekTitle(w.title).german}</span>
                    <span key={percent} className={percent ? "side-percent started" : "side-percent"}>{percent}%</span>
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
                  {q ? null : top(`/checkpoint/${stage.checkpoint}`, `Checkpoint ${stage.checkpoint}`, "other")}
                </ul>
              </section>
            );
          })}
        </div>
        {q && !weeks.length ? <p className="muted">No lessons match “{term}”.</p> : null}
          </>
        )}
      </div>
    </aside>
  );
}
