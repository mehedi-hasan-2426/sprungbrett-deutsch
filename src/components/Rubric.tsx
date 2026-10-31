import { useId, type KeyboardEvent } from "react";

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export function Rubric({ criteria, max, value, onChange, title }: { criteria: string[]; max: number; value: number[]; onChange: (v: number[]) => void; title: string }) {
  const id = useId();
  const total = value.reduce((a, b) => a + b, 0);
  const full = criteria.length * max;
  const pick = (k: number, n: number) => onChange(criteria.map((_, j) => (j === k ? n : value[j] ?? 0)));
  const onKey = (k: number, e: KeyboardEvent<HTMLDivElement>) => {
    const step = STEP[e.key];
    let n: number;
    if (step) n = ((value[k] ?? 0) + step + max + 1) % (max + 1);
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = max;
    else return;
    e.preventDefault();
    pick(k, n);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[n]?.focus();
  };
  return (
    <fieldset className="rubric">
      <legend>{title}</legend>
      {criteria.map((c, k) => (
        <div key={c} className="rubric-row">
          <span id={`${id}-${k}`}>{c}</span>
          <div role="radiogroup" aria-labelledby={`${id}-${k}`} className="options" onKeyDown={(e) => onKey(k, e)}>
            {Array.from({ length: max + 1 }, (_, n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value[k] === n}
                tabIndex={(value[k] ?? 0) === n ? 0 : -1}
                className={value[k] === n ? "option selected" : "option"}
                onClick={() => pick(k, n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p>
        <strong>
          Total: {total} / {full}
        </strong>
      </p>
    </fieldset>
  );
}

export const SPEAKING_CRITERIA = ["Task", "Clarity / pronunciation", "Grammar / vocabulary"];
