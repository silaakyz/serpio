// Webflow CMS API — Webflow Collections
// Docs: https://developers.webflow.com/reference/create-item

export interface WebflowConfig {
  apiToken: string;    // Webflow API token
  siteId: string;      // Site ID
  collectionId: string; // Blog collection ID
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

export async function publishToWebflow(
  _config: WebflowConfig,
  _article: {
    title: string;
    content: string;
    slug: string;
    excerpt?: string;
  },
  _jobId: string
): Promise<PublishResult> {
  // TODO: FAZ 6b'de implementasyon
  // 1. POST /collections/{collection_id}/items → draft oluştur
  // 2. POST /collections/{collection_id}/items/{item_id}/publish → yayınla
  // 3. Headers: Authorization: Bearer {apiToken}
  throw new Error("Not implemented yet — coming in FAZ 6b");
}

export async function testWebflowConnection(_config: WebflowConfig): Promise<boolean> {
  // TODO: FAZ 6b'de implementasyon
  // GET /sites/{site_id} ile test et
  throw new Error("Not implemented yet — coming in FAZ 6b");
}
