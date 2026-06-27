import {
  Runnable,
  RunnableBranch,
  RunnableSequence,
} from "@langchain/core/runnables";
import { directPath } from "./directPipeline";
import { webPath } from "./webPipeline";
import { routerStep } from "./routeStrategy";
import { finalValidateAndPolish } from "./finalValidate";
import { searchInput } from "../utils/schema";

const branch = RunnableBranch.from<{ q: string; mode: "web" | "direct" }, any>([
  [input => input.mode === "web", webPath],
  directPath,
]);

export const searchChain = RunnableSequence.from([
  routerStep,
  branch,
  finalValidateAndPolish,
]);

export async function runSearch(input: searchInput) {
  return await searchChain.invoke(input);
}
