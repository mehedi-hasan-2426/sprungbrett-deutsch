import { useId } from "react";

export function Rubric({ criteria, max, value, onChange, title }: { criteria: string[]; max: number; value: number[]; onChange: (v: number[]) => void; title: string }) {
  const id = useId();
  const total = value.reduce((a, b) => a + b, 0);
  const full = criteria.length * max;
  return (
    <fieldset className="rubric">
      <legend>{title}</legend>
      {criteria.map((c, k) => (
        <div key={c} className="rubric-row">
          <span id={`${id}-${k}`}>{c}</span>
          <div role="radiogroup" aria-labelledby={`${id}-${k}`} className="options">
            {Array.from({ length: max + 1 }, (_, n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value[k] === n}
                className={value[k] === n ? "option selected" : "option"}
                onClick={() => onChange(criteria.map((_, j) => (j === k ? n : value[j] ?? 0)))}
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
