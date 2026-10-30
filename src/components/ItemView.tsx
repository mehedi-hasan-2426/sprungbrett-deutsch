import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Item } from "../lib/types.ts";
import { gradeItem, step } from "../lib/grade.ts";
import type { Note } from "../lib/grade.ts";
import { parseInline } from "../lib/inline.ts";
import { acceptOverride, itemState, recordAnswer, MAX_ANSWER_LENGTH } from "../lib/progress.ts";
import { CATEGORIES } from "../lib/tags.ts";
import { InlineText } from "./Blocks.tsx";
import { useProgress } from "../state/ProgressContext.tsx";

const NOTE_TEXT: Record<Note, string> = {
  umlaut: "Tip: in German this is written with ä, ö, ü or ß.",
  case: "Tip: German nouns and the first word of a sentence start with a capital letter.",
  punctuation: "Tip: compare the commas and punctuation with the model answer.",
};

const SPECIAL = ["ä", "ö", "ü", "ß"];

function Prompt({ text, blanks, values, setValue, disabled, label }: { text: string; blanks: number; values: string[]; setValue: (k: number, v: string) => void; disabled: boolean; label: string }) {
  const pieces = text.split(/(___|…)/);
  let blank = 0;
  return (
    <span className="prompt" lang="de">
      {pieces.map((piece, k) => {
        if ((piece === "___" || piece === "…") && blank < blanks) {
          const index = blank++;
          return (
            <input
              key={k}
              className="blank"
              aria-label={`${label}, gap ${index + 1}`}
              value={values[index] ?? ""}
              onChange={(e) => setValue(index, e.target.value)}
              disabled={disabled}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={MAX_ANSWER_LENGTH}
              size={Math.max(6, (values[index] ?? "").length + 2)}
            />
          );
        }
        return <InlineText key={k} segs={parseInline(piece)} />;
      })}
    </span>
  );
}

export function ItemView({ item }: { item: Item }) {
  const { progress, update } = useProgress();
  const id = useId();
  const state = itemState(progress, item.id);
  const [draft, setDraft] = useState<string[] | null>(null);
  const values = draft ?? progress.items[item.id]?.inputs ?? [];
  const [notes, setNotes] = useState<Note[]>([]);
  const [spelling, setSpelling] = useState(false);
  const [selfShown, setSelfShown] = useState(false);
  const done = state.status === "solved" || state.status === "revealed";
  const label = `Exercise ${item.group} ${item.n}`;
  const cat = CATEGORIES[item.tag];
  const difficulty = item.difficulty ? <span className="exercise-level" lang="en">{item.difficulty}</span> : null;

  const answer = (ok: boolean, submitted = values) => {
    const next = step(state, ok);
    update((p) => recordAnswer(p, item.id, state, next, item.tag, Date.now(), submitted));
  };

  const selfCheck = (ok: boolean) => {
    const next = ok ? step(state, true) : step(step(state, false), false);
    update((p) => recordAnswer(p, item.id, state, next, item.tag, Date.now(), values));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (done) return;
    const inputs = item.kind === "text" && item.blanks === 0 ? [values[0] ?? ""] : values;
    if (!inputs.some((v) => v.trim())) return;
    const verdict = gradeItem(item, inputs);
    setNotes(verdict.notes);
    setSpelling(verdict.spellingOnly);
    answer(verdict.ok);
  };

  const setValue = (k: number, v: string) => setDraft((prev) => Object.assign([...(prev ?? values)], { [k]: v }));
  const lastInput = useRef<HTMLInputElement | null>(null);
  const insertSpecial = (form: HTMLFormElement | null, char: string) => {
    const inputs = form ? [...form.querySelectorAll<HTMLInputElement>("input")] : [];
    const input = lastInput.current && inputs.includes(lastInput.current) ? lastInput.current : inputs[0];
    if (!input) return;
    const k = inputs.indexOf(input);
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const next = (input.value.slice(0, start) + char + input.value.slice(end)).slice(0, MAX_ANSWER_LENGTH);
    setValue(k, next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + 1, start + 1);
    });
  };
  const reset = () => {
    setDraft(null);
    setNotes([]);
    setSelfShown(false);
    update((p) => ({ ...p, items: Object.fromEntries(Object.entries(p.items).filter(([k]) => k !== item.id)) }));
  };

  const feedback = () => {
    if (state.status === "solved") {
      const extra = notes.map((n) => NOTE_TEXT[n]).filter(Boolean);
      return (
        <div className="feedback ok">
          <strong>Correct!</strong> {extra.join(" ")}
          {item.kind !== "choice" ? <> Model answer: <span lang="de">{item.display}</span></> : null}
        </div>
      );
    }
    if (state.status === "hint") {
      return (
        <div className="feedback hint">
          <strong>{spelling ? "Almost!" : "Not yet."}</strong> {spelling ? NOTE_TEXT.case : null} Hint: {item.hint}
          <span className="muted"> ({cat.label})</span>
        </div>
      );
    }
    if (state.status === "revealed") {
      const typed = values.some((v) => v.trim());
      return (
        <div className="feedback bad">
          <p>
            <strong>Answer:</strong> {item.kind === "choice" ? item.options?.find((o) => o.key === item.correct)?.label ?? item.correct : item.display}
          </p>
          <p>
            <strong>Rule:</strong> {item.rule}
          </p>
          <p className="muted">
            Category: {cat.label}. This counts towards your progress.
          </p>
          {item.kind === "text" && typed ? (
            <button type="button" className="link" onClick={() => update((p) => acceptOverride(p, item.id, item.tag, Date.now()))}>
              My answer was also correct
            </button>
          ) : null}
        </div>
      );
    }
    return null;
  };

  if (item.kind === "choice") {
    return (
      <fieldset className="item" aria-describedby={id}>
        <legend>
          {difficulty} <span className="num">{item.n}.</span> <InlineText segs={parseInline(item.prompt)} />
        </legend>
        <div className="options">
          {item.options?.map((o) => (
            <button key={o.key} type="button" className={values[0] === o.key ? "option selected" : "option"} aria-pressed={values[0] === o.key} disabled={done} onClick={() => answer(o.key === item.correct, [o.key])}>
              {o.label === o.key ? o.key : `${o.key}) ${o.label}`}
            </button>
          ))}
        </div>
        <div id={id} aria-live="polite">
          {feedback()}
        </div>
        {done ? <button type="button" className="link" onClick={reset}>Try again</button> : null}
      </fieldset>
    );
  }

  if (item.kind === "open") {
    return (
      <div className="item">
        <p className="prompt pre">
          {difficulty} <span className="num">{item.n}.</span> <InlineText segs={parseInline(item.prompt)} />
        </p>
        {!done ? (
          <>
            <label className="sr-only" htmlFor={id + "-t"}>Your answer</label>
            <p className="muted">Self-check: several answers may be valid. Compare your answer with the example, or ask a tutor.</p>
            <textarea id={id + "-t"} lang="de" rows={2} maxLength={MAX_ANSWER_LENGTH} placeholder="Your answer (optional, only for you)" value={values[0] ?? ""} onChange={(e) => setValue(0, e.target.value)} />
            {!selfShown ? (
              <button type="button" onClick={() => setSelfShown(true)}>Show answer</button>
            ) : (
              <div className="feedback neutral" aria-live="polite">
                <p>
                  <strong>Example answer:</strong> <span className="pre" lang="de">{item.display}</span>
                </p>
                <p>Compare it yourself. Was your answer correct?</p>
                <div className="options">
                  <button type="button" onClick={() => selfCheck(true)}>Yes, correct</button>
                  <button type="button" onClick={() => selfCheck(false)}>No, not yet</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={`feedback ${state.firstTry ? "ok" : "bad"}`}>
            {values[0] ? <p>Your answer: <span className="pre" lang="de">{values[0]}</span></p> : null}
            <strong>{state.firstTry ? "Correct (self-checked)." : "Example answer:"}</strong> <span className="pre" lang="de">{item.display}</span>
          </div>
        )}
        {done ? <button type="button" className="link" onClick={reset}>Try again</button> : null}
      </div>
    );
  }

  return (
    <form className="item" onSubmit={submit} aria-describedby={id} onFocusCapture={(e) => { if (e.target instanceof HTMLInputElement) lastInput.current = e.target; }}>
      <p>
        {difficulty} <span className="num">{item.n}.</span>{" "}
        <Prompt text={item.prompt} blanks={item.blanks} values={values} setValue={setValue} disabled={done} label={label} />
      </p>
      {item.blanks === 0 ? (
        <input className="full" lang="de" aria-label={label} value={values[0] ?? ""} onChange={(e) => setValue(0, e.target.value)} disabled={done} maxLength={MAX_ANSWER_LENGTH} autoComplete="off" autoCapitalize="off" spellCheck={false} />
      ) : null}
      <div className="row">
        {!done ? <button type="submit">Check</button> : null}
        {!done ? (
          <span className="special-keys" role="group" aria-label="German letters">
            {SPECIAL.map((c) => (
              <button key={c} type="button" className="special-key" aria-label={`Insert ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={(e) => insertSpecial(e.currentTarget.form, c)}>{c}</button>
            ))}
          </span>
        ) : null}
        {state.status === "hint" ? (
          <button type="button" className="link" onClick={() => answer(false)}>Show answer</button>
        ) : null}
        {done ? <button type="button" className="link" onClick={reset}>Try again</button> : null}
      </div>
      <div id={id} aria-live="polite">
        {feedback()}
      </div>
    </form>
  );
}
