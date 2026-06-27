//  TWO  POSSIBLE PATHS
//  WEB PATH = BROWSE -> Summarize -> Citations
//  DIRECT PATH = Summarize -> Citations
// SHARED SHAPE = CANDIDATE

export type candidate = {
  answer: string;
  sources: string[];
  mode: "web" | "direct";
  confidence?: "high" | "medium" | "low";
  retrieval_quality?: "authoritative" | "mixed" | "weak";
};
