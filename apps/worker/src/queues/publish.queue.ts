import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
  maxRetriesPerRequest: null,
});

export const publishQueue = new Queue("publish", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});
