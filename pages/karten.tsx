import { useState } from "react";
import type { GetStaticProps } from "next";
import { Layout } from "../src/components/Layout.tsx";
import { loadCourse } from "../src/server/load.ts";
import type { VocabEntry } from "../src/lib/types.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";
import { dayKey, dueCards, newCardAllowance, review } from "../src/lib/leitner.ts";

interface Props {
  vocab: VocabEntry[];
}

function front(v: VocabEntry): { main: string; ask: string } {
  if (v.article && v.noun) return { main: `___ ${v.noun}`, ask: v.plural ? "Article and plural?" : "Article?" };
  if (/·/.test(v.forms) || /hat |ist /.test(v.forms)) return { main: v.term, ask: "Which forms? (er/sie, perfect tense)" };
  return { main: v.term, ask: "Meaning, or an example sentence?" };
}

export default function Cards({ vocab }: Props) {
  const { progress, update } = useProgress();
  const [queue, setQueue] = useState<string[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ ok: 0, bad: 0 });
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const byId = new Map(vocab.map((v) => [v.id, v]));
  const today = dayKey(new Date());
  const due = dueCards(progress.cards, today).filter((id) => byId.has(id));
  const introduced = progress.newCards.day === today ? progress.newCards.count : 0;
  const allowance = newCardAllowance(due.length, introduced);

  const start = () => {
    const fresh = vocab.filter((v) => !progress.cards[v.id]).slice(0, allowance).map((v) => v.id);
    setQueue([...due, ...fresh]);
    setStats({ ok: 0, bad: 0 });
    setRequeued(new Set());
    setFlipped(false);
  };

  const current = queue?.[0] ? byId.get(queue[0]) : undefined;

  const grade = (ok: boolean) => {
    if (!current || !queue) return;
    const isNew = !progress.cards[current.id];
    update((p) => ({
      ...p,
      cards: { ...p.cards, [current.id]: review(p.cards[current.id], ok, today) },
      newCards: isNew ? { day: today, count: (p.newCards.day === today ? p.newCards.count : 0) + 1 } : p.newCards,
    }));
    const rest = queue.slice(1);
    if (!ok && !requeued.has(current.id)) {
      rest.push(current.id);
      setRequeued(new Set(requeued).add(current.id));
    }
    setQueue(rest);
    setStats((s) => (ok ? { ...s, ok: s.ok + 1 } : { ...s, bad: s.bad + 1 }));
    setFlipped(false);
  };

  return (
    <Layout title="Flashcards">
      <h1>Flashcards</h1>
      <p className="muted">
        Say it aloud first, then turn the card over. Be honest: this only helps you. Correct → next box (1, 3, 7, 14, 30 days). Wrong → back to box 1.
      </p>
      {!queue ? (
        <section className="card">
          <p>
            Today: <strong>{due.length}</strong> due cards, <strong>{allowance}</strong> new allowed.
          </p>
          {allowance === 0 && due.length * 20 > 15 * 60 ? <p className="feedback hint">Lots of due cards: no new words today. Old ones first.</p> : null}
          <button type="button" onClick={start} disabled={due.length + allowance === 0}>
            Start
          </button>
          {due.length + allowance === 0 ? <p className="muted">All done for today. Well done!</p> : null}
        </section>
      ) : current ? (
        <section className="card flashcard" aria-live="polite">
          <p className="muted">
            Week {current.week} · {queue.length} cards left
          </p>
          <p className="big" lang="de">{front(current).main}</p>
          <p>{front(current).ask}</p>
          {!flipped ? (
            <button type="button" onClick={() => setFlipped(true)}>
              Turn over
            </button>
          ) : (
            <>
              <div className="back" lang="de">
                <p className="big">{current.term}</p>
                {current.forms ? <p>{current.forms}</p> : null}
                {current.example ? <p className="muted">{current.example}</p> : null}
              </div>
              <div className="row">
                <button type="button" onClick={() => grade(true)}>
                  I knew it
                </button>
                <button type="button" className="secondary" onClick={() => grade(false)}>
                  I didn't know it
                </button>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="card">
          <h2>Done for today</h2>
          <p>
            Knew it: {stats.ok} · Still practising: {stats.bad}
          </p>
          <button type="button" onClick={() => setQueue(null)}>
            Back
          </button>
        </section>
      )}
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<Props> = () => ({ props: { vocab: loadCourse().vocab } });
