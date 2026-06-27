// A Legal contract between your backend -> ai models -> frontnend
import { z } from "zod";

export const WebSearchResultSchema = z.object({
  title: z.string().min(1),
  url: z.url(),
  snippet: z.string().optional().default(""),
});

export const WebSearchResultsSchema = z.array(WebSearchResultSchema).max(10);

export type WebSearchResult = z.infer<typeof WebSearchResultSchema>;

export const openUrlInputSchema = z.object({
  url: z.url(),
});

export const openUrlOutputSchema = z.object({
  url: z.url(),
  content: z.string().min(1),
});

export const summarizeContentInputSchema = z.object({
  text: z.string().min(50, "Need more text to summarize"),
});

export const summarizeContentOutputSchema = z.object({
  summary: z.string().min(1),
});

export const searchInputSchema = z.object({
  q: z.string().min(5, "Please ask a specific question."),
});

export type searchInput = z.infer<typeof searchInputSchema>;
export type SourceQuality = z.infer<typeof SourceQualitySchema>;
export const RetrievalConfidenceSchema = z.enum(["high", "medium", "low"]);
export type RetrievalConfidence = z.infer<typeof RetrievalConfidenceSchema>;

// export const searchAnswerSchema = z.object({
//   answer: z.string().min(1),
//   sources: z.array(z.url()).default([]),
//   //   mode: z.enum(["web", "direct"]).optional(),
//   confidence: z.enum(["high", "medium", "low"]).optional(),
// });

export const searchAnswerSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(z.url()).default([]),
  confidence: RetrievalConfidenceSchema.optional(),
  retrieval_quality: z.enum(["authoritative", "mixed", "weak"]).optional(),
});

export type SearchAnswer = z.infer<typeof searchAnswerSchema>;

export const SourceQualitySchema = z.enum([
  "strong",
  "medium",
  "weak",
  "reject",
]);
