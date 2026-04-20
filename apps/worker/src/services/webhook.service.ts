import crypto from "crypto";
import { log } from "../utils/logger";

export interface WebhookConfig {
  url: string;
  secret: string;
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

function computeSignature(secret: string, body: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export async function publishToWebhook(
  config: WebhookConfig,
  article: {
    title: string;
    content: string;
    slug: string;
    metaDesc?: string;
    keywords?: string[];
    url: string;
    action: "create" | "update";
  },
  jobId: string
): Promise<PublishResult> {
  try {
    await log(jobId, "info", `Webhook gönderiliyor: ${config.url}`);

    const payload = {
      article: {
        title: article.title,
        content: article.content,
        slug: article.slug,
        metaDescription: article.metaDesc ?? "",
        keywords: article.keywords ?? [],
        originalUrl: article.url,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        action: article.action,
        source: "serpio",
      },
    };

    const bodyStr = JSON.stringify(payload);
    const signature = computeSignature(config.secret, bodyStr);

    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Serpio-Signature": signature,
        "User-Agent": "Serpio-Webhook/1.0",
      },
      body: bodyStr,
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Webhook yanıtı (${res.status}): ${errText.slice(0, 200)}` };
    }

    const responseText = await res.text();
    await log(jobId, "success", `Webhook başarılı (${res.status}): ${responseText.slice(0, 100)}`);
    return { success: true, publishedUrl: article.url };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function testWebhookConnection(config: WebhookConfig): Promise<boolean> {
  try {
    const pingPayload = JSON.stringify({
      test: true,
      source: "serpio",
      timestamp: new Date().toISOString(),
    });
    const signature = computeSignature(config.secret, pingPayload);
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Serpio-Signature": signature,
        "User-Agent": "Serpio-Webhook/1.0",
      },
      body: pingPayload,
    });
    return res.ok;
  } catch {
    return false;
  }
}
