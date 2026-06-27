import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { webSearch } from "../utils/webSearch";
import { openUrl } from "../utils/openUrl";
import { summarize } from "../utils/summarize";
import { candidate } from "./types";
import { getChatModel } from "../shared/models";

const setTopResults = 5;

type SourceQuality = "strong" | "medium" | "weak" | "reject";
type RetrievalConfidence = "high" | "medium" | "low";
type RetrievalQuality = "authoritative" | "mixed" | "weak";

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getSourceQuality(url: string): SourceQuality {
  const host = getHostname(url);
  if (!host) return "reject";

  const rejectDomains = [
    "instagram.com",
    "facebook.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "pinterest.com",
    "quora.com",
    "linkedin.com",
  ];

  const weakDomains = [
    "medium.com",
    "blogspot.com",
    "wordpress.com",
    "substack.com",
  ];

  if (rejectDomains.some(d => host === d || host.endsWith("." + d))) {
    return "reject";
  }

  if (
    host.endsWith(".gov") ||
    host.endsWith(".gov.in") ||
    host.endsWith(".edu") ||
    host.endsWith(".ac.in") ||
    host.includes("nirfindia.org") ||
    host.startsWith("docs.") ||
    host.startsWith("developer.")
  ) {
    return "strong";
  }

  if (weakDomains.some(d => host === d || host.endsWith("." + d))) {
    return "weak";
  }

  return "medium";
}

function getRetrievalConfidence(
  summaries: Array<{ quality: SourceQuality }>,
): RetrievalConfidence {
  const strong = summaries.filter(s => s.quality === "strong").length;
  const medium = summaries.filter(s => s.quality === "medium").length;

  if (strong >= 2) return "high";
  if (strong >= 1 || medium >= 2) return "medium";
  return "low";
}

function getRetrievalQuality(
  confidence: RetrievalConfidence,
): RetrievalQuality {
  if (confidence === "high") return "authoritative";
  if (confidence === "medium") return "mixed";
  return "weak";
}

export const webSearchStep = RunnableLambda.from(
  async (input: { q: string; mode: "web" | "direct" }) => {
    const results = await webSearch(input.q);

    return {
      ...input,
      results,
    };
  },
);

export const openAndSummarizeStep = RunnableLambda.from(
  async (input: { q: string; mode: "web" | "direct"; results: any[] }) => {
    if (!Array.isArray(input.results) || input.results.length === 0) {
      return {
        ...input,
        pageSummaries: [],
        fallback: "no-results" as const,
      };
    }

    const extractTopResults = input.results.slice(0, setTopResults);

    const settledResults = await Promise.allSettled(
      extractTopResults.map(async (result: any) => {
        const opened = await openUrl(result.url);
        const summarizeContent = await summarize(opened.content);

        return {
          title: String(result.title ?? "Untitled"),
          url: opened.url,
          domain: getHostname(opened.url),
          quality: getSourceQuality(opened.url),
          summary: summarizeContent.summary,
        };
      }),
    );

    const settledResultPageSummaries = settledResults
      .filter(
        (
          settledResult,
        ): settledResult is PromiseFulfilledResult<{
          title: string;
          url: string;
          domain: string;
          quality: SourceQuality;
          summary: string;
        }> => settledResult.status === "fulfilled",
      )
      .map(s => s.value)
      .filter(s => s.quality !== "reject");

    if (settledResultPageSummaries.length === 0) {
      const fallbackSnippetSummaries = extractTopResults
        .map((result: any) => {
          const url = String(result.url ?? "");

          return {
            title: String(result.title ?? "Untitled"),
            url,
            domain: getHostname(url),
            quality: getSourceQuality(url),
            summary: String(result.snippet || result.title || "").trim(),
          };
        })
        .filter(x => x.summary.length > 0 && x.quality !== "reject");

      return {
        ...input,
        pageSummaries: fallbackSnippetSummaries,
        fallback: "snippets" as const,
      };
    }

    return {
      ...input,
      pageSummaries: settledResultPageSummaries,
      fallback: "none" as const,
    };
  },
);

export const ComposeStep = RunnableLambda.from(
  async (input: {
    q: string;
    pageSummaries: Array<{
      title: string;
      url: string;
      domain: string;
      quality: SourceQuality;
      summary: string;
    }>;
    mode: "web" | "direct";
    fallback: "no-results" | "snippets" | "none";
  }): Promise<candidate> => {
    const model = getChatModel({
      temperature: 0.1,
    });

    if (!input.pageSummaries || input.pageSummaries.length === 0) {
      const directResponse = await model.invoke([
        new SystemMessage(
          [
            "You answer briefly and clearly for beginners.",
            "If unsure, say so.",
          ].join("\n"),
        ),
        new HumanMessage(input.q),
      ]);

      const directAns =
        typeof directResponse.content === "string"
          ? directResponse.content.trim()
          : JSON.stringify(directResponse.content);

      return {
        answer: directAns,
        sources: [],
        mode: "direct",
        confidence: "low",
        retrieval_quality: "weak",
      };
    }

    const confidence = getRetrievalConfidence(input.pageSummaries);
    const retrieval_quality = getRetrievalQuality(confidence);

    const res = await model.invoke([
      new SystemMessage(
        [
          "You are a factual web search assistant.",
          "",
          "You answer ONLY using the supplied page summaries.",
          "",
          "Rules:",
          "- Never use your own knowledge if it is not present in the summaries.",
          "- Do not invent facts, rankings, numbers, dates, or names.",
          "- Prefer strong sources over medium sources, and medium sources over weak sources.",
          "- Treat promotional pages, SEO blogs, advertisements, and social media as weak or unusable evidence.",
          "- Ignore marketing language such as 'best', 'leading', '#1', or similar unless backed by an authoritative ranking.",
          "- If the user asks for a list, ranking, top X, comparison, steps, or options, use a clear list.",
          "- If the user asks a broad explanatory question, answer in short paragraphs.",
          "- If multiple sources disagree, explain the disagreement instead of choosing one.",
          "- If the summaries are incomplete or low quality, explicitly say that there is insufficient evidence.",
          "- Include the retrieval confidence: high, medium, or low.",
          "- Keep the answer concise, factual, and neutral.",
        ].join("\n"),
      ),

      new HumanMessage(
        [
          `Question: ${input.q}`,
          `Retrieval confidence: ${confidence}`,
          `Retrieval quality: ${retrieval_quality}`,
          `Fallback mode: ${input.fallback}`,
          "",
          "Page summaries:",
          JSON.stringify(input.pageSummaries, null, 2),
        ].join("\n"),
      ),
    ]);

    const finalAns =
      typeof res.content === "string"
        ? res.content.trim()
        : JSON.stringify(res.content);

    return {
      answer: finalAns,
      sources: input.pageSummaries.map(x => x.url),
      mode: "web",
      confidence,
      retrieval_quality,
    };
  },
);

export const webPath = RunnableSequence.from([
  webSearchStep,
  openAndSummarizeStep,
  ComposeStep,
]);
