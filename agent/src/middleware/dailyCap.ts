import type { NextFunction, Request, Response } from "express";

type UsageRecord = {
  count: number;
  resetAt: number;
};

const dailyUsage = new Map<string, UsageRecord>();

const DAILY_LIMIT = Number(process.env.DAILY_IP_LIMIT ?? 50);
const DAY_MS = 24 * 60 * 60 * 1000;

function getClientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function dailyIpCap(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const now = Date.now();

  const existing = dailyUsage.get(ip);

  if (!existing || existing.resetAt <= now) {
    dailyUsage.set(ip, {
      count: 1,
      resetAt: now + DAY_MS,
    });

    return next();
  }

  if (existing.count >= DAILY_LIMIT) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);

    res.setHeader("Retry-After", retryAfterSeconds);

    return res.status(429).json({
      error: "Daily search limit exceeded. Please try again tomorrow.",
      limit: DAILY_LIMIT,
      retry_after_seconds: retryAfterSeconds,
    });
  }

  existing.count += 1;
  dailyUsage.set(ip, existing);

  return next();
}
