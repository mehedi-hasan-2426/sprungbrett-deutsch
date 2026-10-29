import type { Block, Course, Inline } from "../lib/types.ts";

export function topicText(text: string): string {
  return text.replace(/\bweekly\b/gi, "topic-based").replace(/\bweeks\b/gi, (word) => word === "Weeks" ? "Topics" : "topics").replace(/\bweek\b/gi, (word) => word === "Week" ? "Topic" : "topic");
}

const segments = (text: Inline[]) => text.map((segment) => ({ ...segment, t: topicText(segment.t) }));

function planningBlock(block: Block): Block {
  if (block.kind === "p" || block.kind === "h") return { ...block, text: segments(block.text) };
  if (block.kind === "list") return { ...block, items: block.items.map(segments) };
  return block;
}

export function makeSelfPaced(course: Course): void {
  for (const unit of course.weeks) {
    unit.title = topicText(unit.title).replace(/\s*·\s*Checkpoint \d+\s*$/, "");
    unit.intro = unit.intro.filter((block) => {
      if (block.kind === "p") return !/^Time:/i.test(block.text.map((segment) => segment.t).join("").trim());
      if (block.kind === "table") return !/^(?:Day|Week)$/i.test(block.header[0]?.map((segment) => segment.t).join("").trim() ?? "");
      return true;
    }).map(planningBlock);
    unit.shortDay = segments(unit.shortDay);
    for (const item of Object.values(unit.items)) item.hint = topicText(item.hint).replace("this topic's topic", "this topic");
  }
  for (const checkpoint of course.checkpoints) checkpoint.canDo = checkpoint.canDo.map(topicText);
  for (const doc of course.docs) doc.blocks = doc.blocks.map(planningBlock);
  const plan = course.docs.find((doc) => doc.slug === "plan");
  if (plan) {
    plan.title = "Your learning path";
    plan.blocks = [
      { kind: "p", text: [{ t: "Work at your own pace. Choose a topic, read its explanations, practise, and return whenever you need a review. There is no fixed completion schedule." }] },
      { kind: "h", text: [{ t: "Choose your next step" }] },
      { kind: "list", items: [
        [{ t: "Start with the placement test", href: "/einstufung" }],
        [{ t: "Practise grammar by subject", href: "/material/grammatik" }],
        [{ t: "Review vocabulary with flashcards", href: "/karten" }],
        [{ t: "Check your saved progress", href: "/fortschritt" }],
      ] },
      { kind: "h", text: [{ t: "Everyday topics" }] },
      { kind: "list", items: course.weeks.map((unit, index) => [{ t: unit.title, href: `/woche/${index + 1}` }]) },
      { kind: "h", text: [{ t: "Review when you are ready" }] },
      { kind: "p", text: [{ t: "Use checkpoints to decide what needs more practice. Repeat difficult activities without rushing. These are learning checks, not official certificates." }] },
    ];
  }
}