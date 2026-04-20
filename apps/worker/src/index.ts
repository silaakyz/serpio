import "dotenv/config";
import scrapeWorker from "./processors/scrape.processor";
import aiWorker from "./processors/ai.processor";

console.log("⚡ Serpio Worker başlatılıyor...");
console.log("📡 Scrape worker aktif — kuyruk dinleniyor...");
console.log("🤖 AI worker aktif — kuyruk dinleniyor...");
console.log(`   Redis: ${process.env.REDIS_URL ?? "redis://127.0.0.1:6380"}`);
console.log(`   DB:    ${(process.env.DATABASE_URL ?? "not set").replace(/:[^:@]*@/, ":***@")}`);

process.on("SIGTERM", async () => {
  console.log("Worker kapatılıyor (SIGTERM)...");
  await scrapeWorker.close();
  await aiWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Worker kapatılıyor (SIGINT)...");
  await scrapeWorker.close();
  await aiWorker.close();
  process.exit(0);
});
