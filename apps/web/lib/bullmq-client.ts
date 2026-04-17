import { Queue } from "bullmq";
import type {
  ScrapeJobPayload,
  AiJobPayload,
  PublishJobPayload,
  GeoJobPayload
} from "@serpio/types";

const connection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379)
};

export const scrapeQueue = new Queue<ScrapeJobPayload>("scrape", {
  connection
});

export const aiQueue = new Queue<AiJobPayload>("ai", {
  connection
});

export const publishQueue = new Queue<PublishJobPayload>("publish", {
  connection
});

export const geoQueue = new Queue<GeoJobPayload>("geo", {
  connection
});
