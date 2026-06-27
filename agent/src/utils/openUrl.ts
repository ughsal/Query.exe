// fetches URLs and every page
// LLM itself cannot directly browse the web
// this code will act as a browser tool.
// and decide what content is "safe" and what we want the model to show
// we will strip the junk information
import { convert } from "html-to-text";
import { openUrlOutputSchema } from "./schema";
export async function openUrl(url: string) {
  const normalized = validateUrl(url);

  const res = await fetch(normalized, {
    headers: { "User-Agent": "agent-core/1.0 (+course-demo)" }, //avoid instant 403 on strict websites
  });

  if (!res.ok) {
    const body = await safeText(res);
    throw new Error(`OPEN URL FAILED ${res.status} - ${body.slice(0, 200)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  // HTML TO TEXT
  const text = contentType.includes("text/html")
    ? convert(raw, {
        wordwrap: false,
        selectors: [
          {
            selector: "nav",
            format: "skip",
          },
          {
            selector: "header",
            format: "skip",
          },
          {
            selector: "footer",
            format: "skip",
          },
          {
            selector: "script",
            format: "skip",
          },
          {
            selector: "style",
            format: "skip",
          },
        ],
      })
    : raw;

  const cleaned = collapseWhitespace(text);
  const capped = cleaned.slice(0, 8000);

  return openUrlOutputSchema.parse({
    url: normalized,
    content: capped,
  });
}

function validateUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error(`only http/https are supported`);
    }
    return parsed.toString();
  } catch {
    throw new Error(`Invalid URL`);
  }
}

async function safeText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "<no body>";
  }
}

function collapseWhitespace(s: string) {
  return s.replace(/\s+/g, " ").trim();
}
