import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getChatModel } from "../shared/models";
import {
  summarizeContentInputSchema,
  summarizeContentOutputSchema,
} from "./schema";

export async function summarize(text: string) {
  const { text: raw } = summarizeContentInputSchema.parse({ text });
  const clipped = clip(raw, 6000);
  const model = getChatModel({ temperature: 0.2 });

  const res = await model.invoke([
    new SystemMessage(
      [
        "You evaluate and summarize a web page for a search agent.",
        "",
        "Return:",
        "1. Source quality: strong, medium, weak, or reject.",
        "2. Reason for the quality rating.",
        "3. Short factual summary.",
        "",
        "Rules:",
        "- Strong = official, primary, government, academic, standards, documentation, or directly authoritative.",
        "- Medium = reputable news, encyclopedia, well-known educational source.",
        "- Weak = SEO blog, promotional page, generic listicle, affiliate content, personal blog.",
        "- Reject = social media, spam, irrelevant page, or page that does not answer the query.",
        "- Do not summarize marketing language as fact.",
        "- Do not invent missing information.",
        "- If the page does not directly answer the user's question, mark it weak or reject.",
      ].join("\n"),
    ),
    new HumanMessage(
      [
        "Summarize the following content:\n\n",
        "Focus on key facts and remove extraneous details and fluff",
        "TEXT:",
        clipped,
      ].join("\n"),
    ),
  ]);
  const rawModelOutput =
    typeof res.content === "string" ? res.content : String(res.content);
  const summary = normalizeSummary(rawModelOutput);
  return summarizeContentOutputSchema.parse({ summary });
}

function clip(s: string, max: number) {
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeSummary(s: string) {
  // Remove leading/trailing whitespace and newlines
  const t = s
    .replace(/^\s+|\s+$/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return t.slice(0, 2500);
}
