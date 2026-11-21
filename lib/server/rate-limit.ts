type TokenBucket = {
  tokens: number;
  updatedAt: number;
};

const MAX_BUCKETS = 10_000;
const DEFAULT_CAPACITY = 60;
const DEFAULT_REFILL_PER_SECOND = 1;
const buckets = new Map<string, TokenBucket>();

export function consumeRateLimit(
  request: Request,
  scope: string,
  capacity = DEFAULT_CAPACITY,
  refillPerSecond = DEFAULT_REFILL_PER_SECOND,
) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  const ip = request.headers.get("x-real-ip")?.trim() || forwardedFor || "unknown";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const previous = buckets.get(key);
  const elapsedSeconds = previous ? Math.max(0, now - previous.updatedAt) / 1000 : 0;
  const tokens = Math.min(capacity, (previous?.tokens ?? capacity) + elapsedSeconds * refillPerSecond);
  const allowed = tokens >= 1;
  const remaining = allowed ? tokens - 1 : tokens;

  buckets.delete(key);
  buckets.set(key, { tokens: remaining, updatedAt: now });
  if (buckets.size > MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }

  return {
    allowed,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((1 - tokens) / refillPerSecond)),
  };
}
