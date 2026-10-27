import { useState } from "react";
import type { GrammarTopic } from "../lib/types.ts";
import { ItemView } from "./ItemView.tsx";

export function GrammarPractice({ topic }: { topic: GrammarTopic }) {
  const [level, setLevel] = useState("all");
  return (
    <>
      <fieldset className="difficulty">
        <legend>Practice level</legend>
        {["all", "easy", "medium", "hard"].map((value) => <label key={value}>
          <input type="radio" name="grammar-level" value={value} checked={value === level} onChange={() => setLevel(value)} />
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </label>)}
      </fieldset>
      <div lang="de">
        {topic.items.filter((item) => level === "all" || item.difficulty === level).map((item) => <ItemView key={item.id} item={item} />)}
      </div>
    </>
  );
}