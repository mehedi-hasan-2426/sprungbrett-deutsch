import { useState } from "react";
import type { FormEvent } from "react";
import { protect } from "../src/server/protect.ts";
import { Layout } from "../src/components/Layout.tsx";
import { loadCourse } from "../src/server/load.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";
import { compareOne } from "../src/lib/grade.ts";
import type { Category } from "../src/lib/types.ts";

interface Noun {
  id: string;
  week: number;
  article: "der" | "die" | "das";
  noun: string;
  plural: string | null;
}

interface Props {
  nouns: Noun[];
}

const ROUND = 10;
type Phase = "article" | "plural" | "feedback";

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [out[k], out[j]] = [out[j] as T, out[k] as T];
  }
  return out;
}

export default function ArticleDrill({ nouns }: Props) {
  const { update } = useProgress();
  const [maxWeek, setMaxWeek] = useState(12);
  const [round, setRound] = useState<Noun[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("article");
  const [plural, setPlural] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [score, setScore] = useState(0);
  const current = round?.[index];

  const mistake = (tag: Category) => update((p) => ({ ...p, mistakes: [...p.mistakes, { tag, at: Date.now() }].slice(-500) }));

  const start = () => {
    setRound(shuffle(nouns.filter((n) => n.week <= maxWeek)).slice(0, ROUND));
    setIndex(0);
    setScore(0);
    setPhase("article");
    setMessage(null);
  };

  const pick = (article: Noun["article"]) => {
    if (!current) return;
    const ok = article === current.article;
    if (!ok) mistake("GE");
    setMessage({ ok, text: ok ? `Correct: ${current.article} ${current.noun}` : `Not quite. It's: ${current.article} ${current.noun}` });
    if (ok && current.plural) setPhase("plural");
    else {
      if (ok) setScore((s) => s + 1);
      setPhase("feedback");
    }
  };

  const checkPlural = (e: FormEvent) => {
    e.preventDefault();
    if (!current?.plural) return;
    const verdict = compareOne(plural.replace(/^die\s+/i, ""), current.plural, false);
    if (!verdict.ok) mistake("PL");
    else setScore((s) => s + 1);
    setMessage({ ok: verdict.ok, text: verdict.ok ? `Correct: die ${current.plural}` : `The plural is: die ${current.plural}` });
    setPhase("feedback");
  };

  const next = () => {
    setIndex((k) => k + 1);
    setPhase("article");
    setPlural("");
    setMessage(null);
  };

  return (
    <Layout title="der, die, das">
      <h1>der, die, das – and the plural</h1>
      <p className="muted">10 nouns from your weeks. First choose the article, then type the plural. Mistakes count on the Progress page as gender (GE) or plural (PL).</p>
      {!round ? (
        <section className="card">
          <label>
            Words up to week{" "}
            <select value={maxWeek} onChange={(e) => setMaxWeek(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, k) => (
                <option key={k} value={k + 1}>
                  {k + 1}
                </option>
              ))}
            </select>
          </label>{" "}
          <button type="button" onClick={start}>
            Start
          </button>
        </section>
      ) : current ? (
        <section className="card flashcard" aria-live="polite">
          <p className="muted">
            {index + 1} / {round.length}
          </p>
          <p className="big" lang="de">___ {current.noun}</p>
          {phase === "article" ? (
            <div className="options">
              {(["der", "die", "das"] as const).map((a) => (
                <button key={a} type="button" className="option" onClick={() => pick(a)}>
                  {a}
                </button>
              ))}
            </div>
          ) : null}
          {message ? <p className={`feedback ${message.ok ? "ok" : "bad"}`}>{message.text}</p> : null}
          {phase === "plural" ? (
            <form onSubmit={checkPlural} className="row">
              <label>
                Plural: die <input value={plural} onChange={(e) => setPlural(e.target.value)} autoComplete="off" spellCheck={false} />
              </label>
              <button type="submit">Check</button>
            </form>
          ) : null}
          {phase === "feedback" ? (
            <button type="button" onClick={next}>
              Next
            </button>
          ) : null}
        </section>
      ) : (
        <section className="card">
          <h2>
            Score: {score} / {round.length}
          </h2>
          <button type="button" onClick={() => setRound(null)}>
            New round
          </button>
        </section>
      )}
    </Layout>
  );
}

export const getServerSideProps = protect<Props>(() => ({
  props: {
    nouns: loadCourse()
      .vocab.filter((v) => v.article && v.noun)
      .map((v) => ({ id: v.id, week: v.week, article: v.article as Noun["article"], noun: v.noun ?? "", plural: v.plural ?? null })),
  },
}));
