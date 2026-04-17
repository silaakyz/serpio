import { NextRequest } from "next/server";
import Redis from "ioredis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params;

  const sub = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  await sub.subscribe(`job:${jobId}:logs`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
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
