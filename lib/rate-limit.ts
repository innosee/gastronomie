// MVP-Rate-Limiter: in-memory Token-Bucket pro Schlüssel.
// Reicht für Phase 1 mit niedrigem Traffic auf einer Vercel-Instanz.
// Vor Stripe/Production-Skalierung auf Upstash KV oder Vercel KV migrieren —
// in-memory verliert State zwischen Serverless-Invocations und teilt nichts
// zwischen mehreren Vercel-Instanzen.

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
};

export function rateLimit(
  key: string,
  options: { capacity: number; refillPerSecond: number },
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket: Bucket = existing
    ? {
        tokens: Math.min(
          options.capacity,
          existing.tokens + ((now - existing.updatedAt) / 1000) * options.refillPerSecond,
        ),
        updatedAt: now,
      }
    : { tokens: options.capacity, updatedAt: now };

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetInSeconds: Math.ceil((options.capacity - bucket.tokens) / options.refillPerSecond),
    };
  }

  buckets.set(key, bucket);
  return {
    allowed: false,
    remaining: 0,
    resetInSeconds: Math.ceil((1 - bucket.tokens) / options.refillPerSecond),
  };
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  );
}
