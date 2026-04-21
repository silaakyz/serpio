import Redis from "ioredis";

// Singleton — Next.js hot reload'da yeniden oluşturma
const globalForRedis = globalThis as unknown as { _redis: Redis | undefined };

function createRedis(): Redis {
  const client = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null; // bağlantıyı kes
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
    keepAlive: 10_000,
    enableReadyCheck: false,
  });

  client.on("error", (err) => {
    // Bağlantı hatalarını sessizce logla — uygulamayı çökertme
    if (process.env.NODE_ENV !== "test") {
      console.error("[Redis] Bağlantı hatası:", err.message);
    }
  });

  return client;
}

export const redis: Redis =
  globalForRedis._redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis._redis = redis;
}

/** Lazy connect wrapper — bağlantı yoksa kurar, varsa geçer */
export async function getRedis(): Promise<Redis> {
  if (redis.status === "wait" || redis.status === "close") {
    await redis.connect().catch(() => undefined);
  }
  return redis;
}
