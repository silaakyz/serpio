import { NextRequest } from "next/server";

interface Record {
  count: number;
  resetAt: number;
}

// In-memory store — resets on server restart. Production'da Redis tabanlı kullan.
const store = new Map<string, Record>();

// Eski kayıtları temizle (bellek sızıntısını önler)
let lastCleanup = Date.now();
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, rec] of store) {
    if (now > rec.resetAt) store.delete(key);
  }
}

/**
 * Returns { success: true } when the request is within limits.
 * Returns { success: false } when the limit has been exceeded.
 *
 * @param req         Incoming request
 * @param limit       Max requests per window
 * @param windowMs    Window duration in ms (default 60 s)
 * @param keyFn       Optional custom key function (default: IP + pathname)
 */
export function rateLimit(
  req: NextRequest,
  limit = 20,
  windowMs = 60_000,
  keyFn?: (req: NextRequest) => string
): { success: boolean; remaining: number } {
  maybeCleanup();

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const key = keyFn ? keyFn(req) : `${ip}:${req.nextUrl.pathname}`;
  const now = Date.now();
  const rec = store.get(key);

  if (!rec || now > rec.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (rec.count >= limit) {
    return { success: false, remaining: 0 };
  }

  rec.count++;
  return { success: true, remaining: limit - rec.count };
}
