// Search the internet tool
// Takes a natural language query, improves it generically,
// calls Tavily, and returns clean search hits.

import { env } from "../shared/env";
import { WebSearchResultSchema, WebSearchResultsSchema } from "./schema";

export async function webSearch(q: string) {
  const query = (q ?? "").trim();
  if (!query) return [];

  const refinedQuery = buildSearchQuery(query);

  return await searchTavilyUtil(refinedQuery);
}

function buildSearchQuery(query: string): string {
  return [query, "official authoritative source factual neutral"].join(" ");
}

async function searchTavilyUtil(query: string) {
  if (!env.TAVILY_API_KEY) {
    throw new Error(`TAVILY API KEY DOES NOT EXIST`);
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "advanced",
      max_results: 8,
      include_answer: false,
      include_images: false,
    }),
  });

  if (!response.ok) {
    const text = await safeText(response);
    throw new Error(`Tavily error, ${response.status}-${text}`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  const normalized = results.slice(0, 8).map((r: any) =>
    WebSearchResultSchema.parse({
      title: String(r?.title ?? "").trim() || "Untitled",
      url: String(r?.url ?? ""),
      snippet: String(r?.content ?? "")
        .trim()
        .slice(0, 220),
    }),
  );

  return WebSearchResultsSchema.parse(normalized);
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}
