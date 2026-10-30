import { useState } from "react";
import { protect } from "../src/server/protect.ts";
import { Layout } from "../src/components/Layout.tsx";
import { loadCourse } from "../src/server/load.ts";
import { KNOWLEDGE_DECKS } from "../src/content/knowledge.ts";
import { fromKnowledge, fromVocab, newCardOrder, TOPIC_DECK } from "../src/lib/flashcards.ts";
import type { DeckOption, Flashcard } from "../src/lib/flashcards.ts";
import { useProgress } from "../src/state/ProgressContext.tsx";
import { dayKey, dueCards, newCardAllowance, newPerDay, NEW_PER_DAY_OPTIONS, review } from "../src/lib/leitner.ts";

interface Props {
  cards: Flashcard[];
  decks: DeckOption[];
}

export default function Cards({ cards, decks }: Props) {
  const { progress, update } = useProgress();
  const [deck, setDeck] = useState("all");
  const [queue, setQueue] = useState<string[] | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ ok: 0, bad: 0 });
  const [requeued, setRequeued] = useState<Set<string>>(new Set());
  const byId = new Map(cards.map((c) => [c.id, c]));
  const inDeck = (id: string) => deck === "all" || byId.get(id)?.deck === deck;
  const today = dayKey(new Date());
  const allDue = dueCards(progress.cards, today).filter((id) => byId.has(id));
  const due = allDue.filter(inDeck);
  const limit = newPerDay(progress.settings);
  const introduced = progress.newCards.day === today ? progress.newCards.count : 0;
  const allowance = newCardAllowance(allDue.length, introduced, limit);
  const unseen = newCardOrder(cards, deck).filter((c) => !progress.cards[c.id]);
  const fresh = unseen.slice(0, allowance);
  const started = (id: string) => cards.filter((c) => c.deck === id && progress.cards[c.id]).length;

  const start = () => {
    setQueue([...due, ...fresh.map((c) => c.id)]);
    setStats({ ok: 0, bad: 0 });
    setRequeued(new Set());
    setFlipped(false);
  };

  const setLimit = (value: number) => update((p) => ({ ...p, settings: { ...p.settings, newPerDay: value } }));

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
        <>
          <section className="card">
            <div className="deck-controls">
              <label>
                <span>Deck</span>
                <select value={deck} onChange={(e) => setDeck(e.target.value)}>
                  <option value="all">All decks mixed ({cards.length} cards)</option>
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>{d.title} ({started(d.id)}/{d.total})</option>
                  ))}
                </select>
              </label>
              <label>
                <span>New cards per day</span>
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                  {NEW_PER_DAY_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
            <p>
              Today: <strong>{due.length}</strong> due cards, <strong>{fresh.length}</strong> new {deck === "all" ? "from all decks" : "from this deck"}.
              {" "}<span className="muted">{unseen.length} not started yet.</span>
            </p>
            {allowance === 0 && allDue.length * 20 > 15 * 60 ? <p className="feedback hint">Lots of due cards: no new words today. Old ones first.</p> : null}
            <button type="button" onClick={start} disabled={due.length + fresh.length === 0}>
              Start
            </button>
            {due.length + fresh.length === 0 ? <p className="muted">{unseen.length === 0 ? "You have started every card in this deck." : "All done for today. Well done!"}</p> : null}
          </section>
          <section className="card">
            <h2>Decks</h2>
            <ul className="deck-list">
              {decks.map((d) => (
                <li key={d.id}>
                  <span>{d.title}</span>
                  <meter min={0} max={d.total} value={started(d.id)} aria-label={`${d.title} started`} />
                  <span className="muted">{started(d.id)}/{d.total}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : current ? (
        <section key={current.id} className="card flashcard" aria-live="polite">
          <p className="muted">
            {current.label} · {queue.length} cards left
          </p>
          <p className="big" lang={current.frontLang}>{current.front}</p>
          <p>{current.ask}</p>
          {!flipped ? (
            <button type="button" onClick={() => setFlipped(true)}>
              Turn over
            </button>
          ) : (
            <>
              <div className="back" lang="de">
                <p className="big">{current.back}</p>
                {current.meaning ? <p lang="en"><strong>{current.meaning}</strong></p> : null}
                {current.forms ? <p>{current.forms}</p> : null}
                {current.example ? <p className="muted">{current.example}</p> : null}
                {current.exampleEn ? <p className="muted" lang="en">{current.exampleEn}</p> : null}
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

export const getServerSideProps = protect<Props>(() => {
  const topic = loadCourse().vocab.map(fromVocab);
  const knowledge = fromKnowledge(KNOWLEDGE_DECKS);
  const decks: DeckOption[] = [
    { id: TOPIC_DECK, title: "Topic vocabulary", total: topic.length },
    ...KNOWLEDGE_DECKS.map((d) => ({ id: d.id, title: d.title, total: d.cards.length })),
  ];
  return { props: { cards: [...topic, ...knowledge], decks } };
});
