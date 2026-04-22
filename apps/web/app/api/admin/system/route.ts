import { NextResponse } from "next/server";
import { adminResponse } from "@/lib/admin-guard";
import { db } from "@serpio/database";
import { sql } from "@serpio/database";

export const dynamic = "force-dynamic";

async function checkPostgres(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const Redis = (await import("ioredis")).default;
    const client = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await client.connect();
    await client.ping();
    await client.quit();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - start, error: String(e) };
  }
}

async function checkWorker(): Promise<{ ok: boolean; queues: Record<string, number>; error?: string }> {
  try {
    const { Queue } = await import("bullmq");
    const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6380";
    const url = new URL(redisUrl);
    const connection = { host: url.hostname, port: Number(url.port || 6379) };

    const queueNames = ["scrape", "ai", "publish", "geo"];
    const counts: Record<string, number> = {};

    await Promise.all(
      queueNames.map(async (name) => {
        const q = new Queue(name, { connection });
        const waiting = await q.getWaitingCount();
        counts[name] = waiting;
        await q.close();
      })
    );

    return { ok: true, queues: counts };
  } catch (e) {
    return { ok: false, queues: {}, error: String(e) };
  }
}

export async function GET() {
  const guard = await adminResponse(); if (guard) return guard;
  

  const [postgres, redis, worker] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkWorker(),
  ]);

  return NextResponse.json({
    postgres,
    redis,
    worker,
    uptime: process.uptime(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
