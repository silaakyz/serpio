import "dotenv/config";
import scrapeWorker from "./processors/scrape.processor";
import aiWorker from "./processors/ai.processor";
import publishWorker from "./processors/publish.processor";
import { AI_PROVIDER, AI_MODEL } from "./lib/ai-client";

console.log("⚡ Serpio Worker başlatılıyor...");
console.log("📡 Scrape worker aktif — kuyruk dinleniyor...");
console.log("🤖 AI worker aktif — kuyruk dinleniyor...");
console.log("🚀 Publish worker aktif — kuyruk dinleniyor...");
console.log(`   Redis:    ${process.env.REDIS_URL ?? "redis://127.0.0.1:6380"}`);
console.log(`   DB:       ${(process.env.DATABASE_URL ?? "not set").replace(/:[^:@]*@/, ":***@")}`);
console.log(`   AI:       ${AI_PROVIDER} / ${AI_MODEL}`);

process.on("SIGTERM", async () => {
  console.log("Worker kapatılıyor (SIGTERM)...");
  await scrapeWorker.close();
  await aiWorker.close();
  await publishWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Worker kapatılıyor (SIGINT)...");
  await scrapeWorker.close();
  await aiWorker.close();
  await publishWorker.close();
  process.exit(0);
});
