import rateLimit from "express-rate-limit";

export const searchRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 10, // 10 searches per IP per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many searches. Please wait 10 minutes before trying again.",
  },
});
