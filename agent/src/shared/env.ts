import { z } from "zod";
const EnvSchema = z.object({
  PORT: z.string().default("5000"),
  ALLOWED_ORIGIN: z.url().default("http://localhost:5000"),
  MODEL_PROVIDER: z.enum(["gemini", "ollama", "groq"]).default("ollama"),
  GOOGLE_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().default("http://0.0.0.0:11434"),
  OLLAMA_MODEL: z.string().default("qwen3.5:0.8b"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash-lite"),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),

  SEARCH_PROVIDER: z.enum(["tavily"]).default("tavily"),
  TAVILY_API_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
