import Redis from "ioredis";
import { db } from "../lib/db";
import { jobLogs } from "@serpio/database";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

export type LogLevel = "info" | "success" | "warning" | "error" | "debug";

export async function log(
  jobId: string,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
) {
  const payload = JSON.stringify({
    level,
    message,
    meta,
    timestamp: new Date().toISOString(),
  });

  // Canlı akış için Redis'e yayınla
  await redis.publish(`job:${jobId}:logs`, payload);

  // Kalıcı kayıt için DB'ye yaz (jobId jobs tablosunda yoksa sessizce geç)
  await db.insert(jobLogs).values({
    jobId,
    level,
    message,
    meta,
  }).catch(() => undefined);
}
