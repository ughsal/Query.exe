import { RunnableLambda } from "@langchain/core/runnables";
import { searchInputSchema } from "../utils/schema";

export function routeStrategy(q: string): "web" | "direct" {
  const trimmedQuery = q.toLowerCase().trim();

  const isLongQuery = trimmedQuery.length > 70;
  const recentYearRegex = /\b20(2[4-9]|3[0-9])\b/.test(trimmedQuery);

  const patterns: RegExp[] = [
    /\btop[-\s]*\d+\b/u,
    /\bbest\b/u,
    /\brank(?:ing|ings)?\b/u,
    /\bwhich\s+is\s+better\b/u,
    /\b(?:vs\.?|versus)\b/u,
    /\bcompare|comparison\b/u,

    /\bprice|prices|pricing|cost|costs|cheapest|cheaper|affordable\b/u,
    /\bunder\s*\d+(?:\s*[kK])?\b/u,
    /\p{Sc}\s*\d+/u,

    /\blatest|today|now|current\b/u,
    /\bnews|breaking|trending\b/u,
    /\b(released?|launch|launched|announce|announced|update|updated)\b/u,
    /\bchangelog|release\s*notes?\b/u,

    /\bdeprecated|eol|end\s*of\s*life|sunset\b/u,
    /\broadmap\b/u,

    /\bworks\s+with|compatible\s+with|support(?:ed)?\s+on\b/u,
    /\binstall(ation)?\b/u,

    /\bnear\s+me|nearby\b/u,
  ];

  const isQueryPresentInPatterns = patterns.some(pattern =>
    pattern.test(trimmedQuery),
  );

  if (isLongQuery || recentYearRegex || isQueryPresentInPatterns) {
    return "web";
  } else {
    return "direct";
  }
}

// LCEL
// q -> string, mode: web or direct
// {q, mode}

export const routerStep = RunnableLambda.from(async (input: { q: string }) => {
  /*
    why do we need RunnableLambda? because we want to be able to run this step in a chain and also we want to be able to run this step in a loop
    normal function vs RunnableLambda:
    - normal function: can only be run once, if you want to run it again you need to call it again, if you want to run it in a loop you need to call it in a loop
    - RunnableLambda: can be run multiple times, if you want to run it again you can just call the run method again, if you want to run it in a loop you can just call the run method in a loop
    */
  const { q } = searchInputSchema.parse(input);
  const mode = routeStrategy(q);

  return { q, mode };
});
