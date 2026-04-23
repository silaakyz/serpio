import "dotenv/config";
import http from "http";
import scrapeWorker from "./processors/scrape.processor";
import aiWorker from "./processors/ai.processor";
import publishWorker from "./processors/publish.processor";
import geoWorker from "./processors/geo.processor";
import gscSyncWorker from "./processors/gsc-sync.processor";
import competitorWorker from "./processors/competitor.processor";
import { gscSyncQueue } from "./queues/gsc-sync.queue";
import { competitorQueue } from "./queues/competitor.queue";
import { AI_PROVIDER, AI_MODEL } from "./lib/ai-client";

console.log("⚡ Serpio Worker başlatılıyor...");
console.log("📡 Scrape worker aktif — kuyruk dinleniyor...");
console.log("🤖 AI worker aktif — kuyruk dinleniyor...");
console.log("🚀 Publish worker aktif — kuyruk dinleniyor...");
console.log("🌐 GEO worker aktif — kuyruk dinleniyor...");
console.log("📊 GSC Sync worker aktif — kuyruk dinleniyor...");
console.log("🎯 Competitor worker aktif — kuyruk dinleniyor...");
console.log(`   Redis:    ${process.env.REDIS_URL ?? "redis://127.0.0.1:6380"}`);
console.log(`   DB:       ${(process.env.DATABASE_URL ?? "not set").replace(/:[^:@]*@/, ":***@")}`);
console.log(`   AI:       ${AI_PROVIDER} / ${AI_MODEL}`);

// ─── Günlük GSC cron job ─────────────────────────────────────────────────────
async function scheduleCronJobs() {
  try {
    // Eski repeatable job'ları temizle
    const repeatableJobs = await gscSyncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await gscSyncQueue.removeRepeatableByKey(job.key);
    }

    // Her gece 03:00 UTC'de tüm projeleri sync et
    await gscSyncQueue.add(
      "daily-gsc-sync",
      {},
      {
        repeat:  { pattern: "0 3 * * *" },
        jobId:   "daily-gsc-sync",
      }
    );

    console.log("⏰ Günlük GSC sync zamanlandı (03:00 UTC)");

    // Haftalık rakip taraması — her Pazartesi 04:00 UTC
    const competitorRepeatables = await competitorQueue.getRepeatableJobs();
    for (const job of competitorRepeatables) {
      await competitorQueue.removeRepeatableByKey(job.key);
    }
    await competitorQueue.add(
      "weekly-competitor-crawl",
      { type: "crawl_all", projectId: "all", userId: "system", jobDbId: "system" },
      { repeat: { pattern: "0 4 * * 1" }, jobId: "weekly-competitor-crawl" }
    );
    console.log("⏰ Haftalık rakip taraması zamanlandı (Pazartesi 04:00 UTC)");
  } catch (err) {
    console.error("Cron job zamanlaması başarısız:", err);
  }
}

scheduleCronJobs();

// ─── Railway health check ─────────────────────────────────────────────────────
const healthServer = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

healthServer.listen(process.env.PORT || 3001, () => {
  console.log(`🏥 Health check sunucu: port ${process.env.PORT || 3001}`);
});

async function shutdown(signal: string) {
  console.log(`Worker kapatılıyor (${signal})...`);
  healthServer.close();
  await scrapeWorker.close();
  await aiWorker.close();
  await publishWorker.close();
  await geoWorker.close();
  await gscSyncWorker.close();
  await competitorWorker.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
