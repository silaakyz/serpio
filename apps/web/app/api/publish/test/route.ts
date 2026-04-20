import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { channel, config } = body as {
    channel: string;
    config: Record<string, string>;
  };

  if (!channel || !config) {
    return NextResponse.json({ error: "channel ve config zorunlu" }, { status: 400 });
  }

  try {
    let success = false;
    let message = "";

    switch (channel) {
      case "wordpress": {
        if (!config.url || !config.username || !config.appPassword) {
          return NextResponse.json({ success: false, message: "URL, kullanıcı adı ve Application Password zorunlu" });
        }
        const auth64 = Buffer.from(`${config.username}:${config.appPassword}`).toString("base64");
        const res = await fetch(`${config.url.replace(/\/$/, "")}/wp-json/wp/v2/posts?per_page=1`, {
          headers: { Authorization: `Basic ${auth64}` },
          signal: AbortSignal.timeout(10000),
        });
        success = res.ok;
        message = success ? "WordPress bağlantısı başarılı ✓" : `WordPress yanıtı: ${res.status}`;
        break;
      }

      case "github": {
        if (!config.repo || !config.token) {
          return NextResponse.json({ success: false, message: "repo ve token zorunlu" });
        }
        const res = await fetch(`https://api.github.com/repos/${config.repo}`, {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: "application/vnd.github+json",
          },
          signal: AbortSignal.timeout(10000),
        });
        success = res.ok;
        message = success ? "GitHub bağlantısı başarılı ✓" : `GitHub yanıtı: ${res.status}`;
        break;
      }

      case "gitlab": {
        if (!config.instanceUrl || !config.token) {
          return NextResponse.json({ success: false, message: "instanceUrl ve token zorunlu" });
        }
        const res = await fetch(
          `${config.instanceUrl.replace(/\/$/, "")}/api/v4/projects/${encodeURIComponent(config.projectId ?? "")}`,
          {
            headers: { Authorization: `Bearer ${config.token}` },
            signal: AbortSignal.timeout(10000),
          }
        );
        success = res.ok;
        message = success ? "GitLab bağlantısı başarılı ✓" : `GitLab yanıtı: ${res.status}`;
        break;
      }

      case "webhook": {
        if (!config.url) {
          return NextResponse.json({ success: false, message: "Webhook URL zorunlu" });
        }
        const res = await fetch(config.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true, source: "serpio" }),
          signal: AbortSignal.timeout(10000),
        });
        success = res.ok;
        message = success ? "Webhook bağlantısı başarılı ✓" : `Webhook yanıtı: ${res.status}`;
        break;
      }

      case "ftp":
      case "sftp":
        // FTP/SFTP testi TCP bağlantısı gerektiriyor, browser-side test desteklenmiyor
        return NextResponse.json({
          success: false,
          message: "FTP/SFTP testi sunucu taraflı gerektirir. Ayarları kaydedip yayınlama ile test edin.",
        });

      default:
        return NextResponse.json({ success: false, message: `${channel} için test desteklenmiyor` }, { status: 400 });
    }

    return NextResponse.json({ success, message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Bağlantı hatası";
    return NextResponse.json({ success: false, message });
  }
}
