import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/**
 * Acquire a distributed lock for a product+warehouse combination.
 * Returns true if lock was acquired, false if already locked.
 */
export async function acquireLock(
  key: string,
  ttlMs: number = 5000
): Promise<boolean> {
  const result = await redis.set(
    `lock:${key}`,
    "1",
    "PX",
    ttlMs,
    "NX"
  );
  return result === "OK";
}

/**
 * Release a distributed lock.
 */
export async function releaseLock(key: string): Promise<void> {
  await redis.del(`lock:${key}`);
}

/**
 * Store idempotency key with response data.
 */
export async function setIdempotencyResponse(
  key: string,
  data: unknown,
  ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
  await redis.setex(`idempotency:${key}`, ttlSeconds, JSON.stringify(data));
}

/**
 * Get stored idempotency response if exists.
 */
export async function getIdempotencyResponse(
  key: string
): Promise<unknown | null> {
  const raw = await redis.get(`idempotency:${key}`);
  if (!raw) return null;
  return JSON.parse(raw);
}
