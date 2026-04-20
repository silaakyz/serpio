import { log } from "../utils/logger";

export interface WPConfig {
  url: string;
  username: string;
  appPassword: string;
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

function wpAuth(config: WPConfig): string {
  return "Basic " + Buffer.from(`${config.username}:${config.appPassword}`).toString("base64");
}

async function findOrCreateTerm(
  config: WPConfig,
  taxonomy: "categories" | "tags",
  name: string
): Promise<number> {
  const endpoint = taxonomy === "categories" ? "categories" : "tags";
  const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const searchRes = await fetch(
    `${config.url}/wp-json/wp/v2/${endpoint}?slug=${encodeURIComponent(slug)}`,
    { headers: { Authorization: wpAuth(config) } }
  );
  if (searchRes.ok) {
    const existing = await searchRes.json() as { id: number }[];
    if (existing.length > 0) return existing[0].id;
  }

  const createRes = await fetch(`${config.url}/wp-json/wp/v2/${endpoint}`, {
    method: "POST",
    headers: { Authorization: wpAuth(config), "Content-Type": "application/json" },
    body: JSON.stringify({ name, slug }),
  });
  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Terim oluşturulamadı (${name}): ${err}`);
  }
  const created = await createRes.json() as { id: number };
  return created.id;
}

async function findPostBySlug(
  config: WPConfig,
  slug: string
): Promise<{ id: number; link: string } | null> {
  const res = await fetch(
    `${config.url}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&status=any`,
    { headers: { Authorization: wpAuth(config) } }
  );
  if (!res.ok) return null;
  const posts = await res.json() as { id: number; link: string }[];
  return posts.length > 0 ? posts[0] : null;
}

export async function publishToWordPress(
  config: WPConfig,
  article: {
    title: string;
    content: string;
    slug?: string;
    excerpt?: string;
    status?: "publish" | "draft";
    categories?: string[];
    tags?: string[];
  },
  jobId: string
): Promise<PublishResult> {
  try {
    await log(jobId, "info", `WordPress bağlantısı kontrol ediliyor: ${config.url}`);

    const categoryIds: number[] = [];
    for (const cat of article.categories ?? []) {
      try {
        categoryIds.push(await findOrCreateTerm(config, "categories", cat));
      } catch { /* devam et */ }
    }

    const tagIds: number[] = [];
    for (const tag of article.tags ?? []) {
      try {
        tagIds.push(await findOrCreateTerm(config, "tags", tag));
      } catch { /* devam et */ }
    }

    const payload: Record<string, unknown> = {
      title: article.title,
      content: article.content,
      status: article.status ?? "publish",
      ...(article.excerpt && { excerpt: article.excerpt }),
      ...(article.slug && { slug: article.slug }),
      ...(categoryIds.length > 0 && { categories: categoryIds }),
      ...(tagIds.length > 0 && { tags: tagIds }),
    };

    const existingPost = article.slug ? await findPostBySlug(config, article.slug) : null;

    let res: Response;
    if (existingPost) {
      await log(jobId, "info", `Mevcut post güncelleniyor (ID: ${existingPost.id})`);
      res = await fetch(`${config.url}/wp-json/wp/v2/posts/${existingPost.id}`, {
        method: "PUT",
        headers: { Authorization: wpAuth(config), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await log(jobId, "info", "Yeni post oluşturuluyor...");
      res = await fetch(`${config.url}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: { Authorization: wpAuth(config), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (res.status === 401)
      return { success: false, error: "Kimlik doğrulama hatası. Kullanıcı adı / Application Password kontrol edin." };
    if (res.status === 404)
      return { success: false, error: "WordPress REST API bulunamadı. URL ve permalink ayarlarını kontrol edin." };
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `WordPress hatası (${res.status}): ${errText.slice(0, 200)}` };
    }

    const data = await res.json() as { id: number; link: string };
    await log(jobId, "success", `WordPress'e yayınlandı: ${data.link}`);
    return { success: true, publishedUrl: data.link, postId: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function testWordPressConnection(config: WPConfig): Promise<boolean> {
  try {
    const res = await fetch(`${config.url}/wp-json/wp/v2/posts?per_page=1`, {
      headers: { Authorization: wpAuth(config) },
    });
    return res.ok;
  } catch {
    return false;
  }
}
