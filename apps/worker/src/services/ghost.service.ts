// Ghost Admin API — Ghost Content Management
// Docs: https://ghost.org/docs/admin-api/

export interface GhostConfig {
  url: string;         // "https://siteniz.ghost.io"
  adminApiKey: string; // "id:secret" formatında Admin API key
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

export async function publishToGhost(
  _config: GhostConfig,
  _article: {
    title: string;
    content: string;
    slug: string;
    excerpt?: string;
    tags?: string[];
    status?: "published" | "draft";
  },
  _jobId: string
): Promise<PublishResult> {
  // TODO: FAZ 6b'de implementasyon
  // 1. JWT ile kimlik doğrulama (Admin API key'den oluştur)
  // 2. POST /ghost/api/admin/posts/?source=html → makale oluştur
  // 3. Content format: HTML (mobiledoc değil, html source parametresiyle)
  throw new Error("Not implemented yet — coming in FAZ 6b");
}

export async function testGhostConnection(_config: GhostConfig): Promise<boolean> {
  // TODO: FAZ 6b'de implementasyon
  // GET /ghost/api/admin/site/ ile test et
  throw new Error("Not implemented yet — coming in FAZ 6b");
}
