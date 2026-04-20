import { log } from "../utils/logger";

export interface GitHubConfig {
  repo: string;    // "owner/repo"
  branch: string;  // "main"
  path: string;    // "content/blog"
  token: string;
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function toMdx(article: {
  title: string;
  content: string;
  slug: string;
  metaDesc?: string;
  keywords?: string[];
  publishedAt?: Date;
}): string {
  const date = (article.publishedAt ?? new Date()).toISOString().split("T")[0];
  const tags = article.keywords ?? [];
  const frontmatter = [
    "---",
    `title: "${article.title.replace(/"/g, '\\"')}"`,
    `description: "${(article.metaDesc ?? "").replace(/"/g, '\\"')}"`,
    `date: "${date}"`,
    `tags: [${tags.map((t) => `"${t}"`).join(", ")}]`,
    "---",
    "",
  ].join("\n");
  return frontmatter + article.content;
}

async function getFileSha(config: GitHubConfig, filePath: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${config.repo}/contents/${filePath}?ref=${config.branch}`;
  const res = await fetch(url, { headers: ghHeaders(config.token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET hatası (${res.status})`);
  const data = await res.json() as { sha: string };
  return data.sha;
}

export async function publishToGitHub(
  config: GitHubConfig,
  article: {
    title: string;
    content: string;
    slug: string;
    metaDesc?: string;
    keywords?: string[];
    publishedAt?: Date;
  },
  jobId: string
): Promise<PublishResult> {
  try {
    const cleanPath = config.path.replace(/\/$/, "");
    const fileName = `${article.slug}.mdx`;
    const filePath = `${cleanPath}/${fileName}`;

    await log(jobId, "info", `GitHub reposuna yazılıyor: ${config.repo}/${filePath}`);

    const mdxContent = toMdx(article);
    const contentBase64 = Buffer.from(mdxContent, "utf-8").toString("base64");
    const sha = await getFileSha(config, filePath);

    const body: Record<string, unknown> = {
      message: sha
        ? `chore: update ${article.slug} via Serpio`
        : `feat: publish ${article.slug} via Serpio`,
      content: contentBase64,
      branch: config.branch,
    };
    if (sha) body.sha = sha;

    const url = `https://api.github.com/repos/${config.repo}/contents/${filePath}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: ghHeaders(config.token),
      body: JSON.stringify(body),
    });

    if (res.status === 401)
      return { success: false, error: "GitHub token geçersiz veya yetkisiz." };
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `GitHub hatası (${res.status}): ${errText.slice(0, 200)}` };
    }

    const data = await res.json() as { content: { html_url: string } };
    const publishedUrl =
      data.content?.html_url ??
      `https://github.com/${config.repo}/blob/${config.branch}/${filePath}`;

    await log(jobId, "success", `GitHub'a yayınlandı: ${publishedUrl}`);
    return { success: true, publishedUrl };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function testGitHubConnection(config: GitHubConfig): Promise<boolean> {
  try {
    const res = await fetch(`https://api.github.com/repos/${config.repo}`, {
      headers: ghHeaders(config.token),
    });
    return res.ok;
  } catch {
    return false;
  }
}
