import { NextRequest } from "next/server";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function makeEvent(level: string, message: string): string {
  const payload = JSON.stringify({ level, message, timestamp: new Date().toISOString() });
  return `data: ${payload}\n\n`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;
  const encoder = new TextEncoder();

  // Redis bağlantısını hızlı başarısız yap: 3 saniye timeout, 2 deneme
  const sub = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6380", {
    maxRetriesPerRequest: 2,
    connectTimeout: 3000,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  // Bağlantıyı önceden kur — başarısız olursa hata eventi gönder
  try {
    await sub.connect();
    await sub.subscribe(`job:${jobId}:logs`);
  } catch (err) {
    await sub.quit().catch(() => undefined);
    const errMsg = err instanceof Error ? err.message : String(err);
    const body = encoder.encode(
      makeEvent("error", `Redis bağlantısı kurulamadı: ${errMsg}`) +
      makeEvent("error", "REDIS_URL değerini ve Redis servisinin çalıştığını kontrol edin.")
    );
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Bağlantı başarılı — istemciye haber ver
      controller.enqueue(encoder.encode(makeEvent("system", `Bağlandı — iş izleniyor: ${jobId}`)));

      // Keep-alive ping her 20 saniyede bir
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch { /* stream kapandı */ }
      }, 20000);

      sub.on("message", (_channel: string, message: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch { /* stream kapandı */ }
      });

      sub.on("error", (redisErr) => {
        try {
          controller.enqueue(encoder.encode(makeEvent("warning", `Redis bağlantısı kesildi: ${redisErr.message}`)));
        } catch { /* ok */ }
      });

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        sub.unsubscribe().catch(() => undefined);
        sub.quit().catch(() => undefined);
        try { controller.close(); } catch { /* ok */ }
      });
    },
    cancel() {
      sub.unsubscribe().catch(() => undefined);
      sub.quit().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
