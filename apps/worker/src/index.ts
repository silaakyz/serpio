import "dotenv/config";
import scrapeWorker from "./processors/scrape.processor";

console.log("⚡ Serpio Worker başlatılıyor...");
console.log("📡 Scrape worker aktif — kuyruk dinleniyor...");
console.log(`   Redis: ${process.env.REDIS_URL ?? "redis://localhost:6379"}`);
console.log(`   DB:    ${(process.env.DATABASE_URL ?? "not set").replace(/:[^:@]*@/, ":***@")}`);

process.on("SIGTERM", async () => {
  console.log("Worker kapatılıyor (SIGTERM)...");
  await scrapeWorker.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Worker kapatılıyor (SIGINT)...");
  await scrapeWorker.close();
  process.exit(0);
});
