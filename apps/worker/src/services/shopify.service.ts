// Shopify Admin API — Shopify Blog Posts API (Admin REST API)
// Docs: https://shopify.dev/docs/api/admin-rest/latest/resources/blog

export interface ShopifyConfig {
  storeUrl: string;      // "https://magazaniz.myshopify.com"
  accessToken: string;   // Admin API access token (shpat_...)
  blogId?: string;       // Hedef blog ID (opsiyonel, varsayılan ilk blog)
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

export async function publishToShopify(
  _config: ShopifyConfig,
  _article: {
    title: string;
    content: string;
    slug: string;
    excerpt?: string;
    tags?: string[];
  },
  _jobId: string
): Promise<PublishResult> {
  // TODO: FAZ 6b'de implementasyon
  // 1. GET /admin/api/2024-01/blogs.json → ilk blog ID'yi al
  // 2. POST /admin/api/2024-01/blogs/{blog_id}/articles.json → makale oluştur
  // 3. Headers: X-Shopify-Access-Token: {accessToken}
  throw new Error("Not implemented yet — coming in FAZ 6b");
}

export async function testShopifyConnection(_config: ShopifyConfig): Promise<boolean> {
  // TODO: FAZ 6b'de implementasyon
  // GET /admin/api/2024-01/blogs.json ile test et
  throw new Error("Not implemented yet — coming in FAZ 6b");
}
