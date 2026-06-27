import { Router } from "express";
import { searchInputSchema } from "../utils/schema";
import { runSearch } from "../search_tool/serverChain";
import { searchRateLimiter } from "../middleware/rateLimit";
import { dailyIpCap } from "../middleware/dailyCap";

export const searchRouter = Router();

searchRouter.post("/", searchRateLimiter, dailyIpCap, async (req, res) => {
  try {
    const input = searchInputSchema.parse(req.body);

    if (input.q.length > 300) {
      return res.status(400).json({
        error: "Query too long. Please keep it under 300 characters.",
      });
    }

    const result = await runSearch(input);
    res.status(200).json(result);
  } catch (e) {
    console.error("SEARCH ROUTE ERROR:", e);
    const errorMessage = (e as Error)?.message ?? "unknown error occurred";
    res.status(400).json({ error: errorMessage });
  }
});
