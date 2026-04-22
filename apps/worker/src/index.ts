import "dotenv/config";
import http from "http";
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
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
