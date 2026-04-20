import * as ftp from "basic-ftp";
import SftpClient from "ssh2-sftp-client";
import { Readable } from "stream";
import { log } from "../utils/logger";

export interface FTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
  protocol: "ftp" | "sftp";
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

function buildHtmlPage(title: string, content: string): Buffer {
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
</head>
<body>
  <article>
    <h1>${title.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</h1>
    ${content}
  </article>
</body>
</html>`;
  return Buffer.from(html, "utf-8");
}

async function uploadFtp(
  config: FTPConfig,
  remotePath: string,
  content: Buffer
): Promise<void> {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: false,
    });
    const readable = Readable.from(content);
    await client.uploadFrom(readable, remotePath);
  } finally {
    client.close();
  }
}

async function uploadSftp(
  config: FTPConfig,
  remotePath: string,
  content: Buffer
): Promise<void> {
  const client = new SftpClient();
  try {
    await client.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
    });
    await client.put(content, remotePath);
  } finally {
    await client.end();
  }
}

export async function publishToFTP(
  config: FTPConfig,
  article: {
    title: string;
    content: string;
    slug: string;
  },
  jobId: string
): Promise<PublishResult> {
  try {
    const remotePath = config.remotePath.replace(/\/$/, "") + `/${article.slug}.html`;
    await log(jobId, "info", `${config.protocol.toUpperCase()} ile yükleniyor: ${config.host}${remotePath}`);

    const htmlBuffer = buildHtmlPage(article.title, article.content);

    if (config.protocol === "sftp") {
      await uploadSftp(config, remotePath, htmlBuffer);
    } else {
      await uploadFtp(config, remotePath, htmlBuffer);
    }

    await log(jobId, "success", `${config.protocol.toUpperCase()} yükleme başarılı: ${remotePath}`);
    return { success: true, publishedUrl: remotePath };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function testFTPConnection(config: FTPConfig): Promise<boolean> {
  if (config.protocol === "sftp") {
    const client = new SftpClient();
    try {
      await client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
      });
      await client.list(config.remotePath);
      return true;
    } catch {
      return false;
    } finally {
      await client.end().catch(() => undefined);
    }
  } else {
    const client = new ftp.Client();
    try {
      await client.access({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        secure: false,
      });
      await client.list(config.remotePath);
      return true;
    } catch {
      return false;
    } finally {
      client.close();
    }
  }
}
