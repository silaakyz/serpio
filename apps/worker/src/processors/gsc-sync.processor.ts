import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { db } from "../lib/db";
import { googleConnections } from "@serpio/database";
import { syncGSCMetrics } from "../services/gsc-sync.service";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

async function noop(_level: string, _msg: string) { /* log stub for bulk sync */ }

async function dbLog(jobId: string, level: string, message: string) {
  // Minimal log — jobId is the bullmq job ID string here, not a DB jobs row
  console.log(`[GSC ${jobId}] [${level}] ${message}`);
}

const gscSyncWorker = new Worker(
  "gsc-sync",
  async (job: Job) => {
    const { projectId } = job.data as { projectId?: string };
    const jobId = job.id ?? "unknown";
    const log = (level: string, msg: string) => dbLog(jobId, level, msg);

    if (projectId) {
      // Belirli bir proje için sync
      await syncGSCMetrics(projectId, log);
    } else {
      // Tüm Google bağlantılı projeleri sync et (günlük cron)
      const connections = await db.query.googleConnections.findMany();
      await log("info", `${connections.length} proje GSC senkronize ediliyor`);

      for (const conn of connections) {
        try {
          await syncGSCMetrics(conn.projectId, noop);
        } catch (err) {
          await log("warning", `Proje ${conn.projectId} sync hatası: ${(err as Error).message}`);
        }
      }
      await log("success", `Toplu GSC sync tamamlandı`);
    }
  },
  { connection, concurrency: 2 }
);

export default gscSyncWorker;
