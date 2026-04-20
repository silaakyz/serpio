// Headless CMS Service — Contentful / Sanity / Strapi destekli
// Docs:
//   Contentful: https://www.contentful.com/developers/docs/references/content-management-api/
//   Sanity: https://www.sanity.io/docs/http-mutations
//   Strapi: https://docs.strapi.io/dev-docs/api/rest

export type HeadlessCMSProvider = "contentful" | "sanity" | "strapi";

export interface HeadlessCMSConfig {
  provider: HeadlessCMSProvider;
  apiUrl: string;          // Strapi için base URL; Contentful için space ID; Sanity için project ID
  apiKey: string;          // Content Management API token
  contentTypeId?: string;  // Contentful: content type ID; Strapi: collection slug
  datasetName?: string;    // Sanity: dataset adı (genellikle "production")
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

export async function publishToHeadlessCMS(
  _config: HeadlessCMSConfig,
  _article: {
    title: string;
    content: string;
    slug: string;
    excerpt?: string;
    keywords?: string[];
  },
  _jobId: string
): Promise<PublishResult> {
  // TODO: FAZ 6b'de implementasyon
  // Provider'a göre farklı API çağrıları:
  //   - Contentful: CMA ile entry oluştur → publish
  //   - Sanity: Mutations API ile patch/create
  //   - Strapi: REST API ile POST /api/{contentTypeId}
  throw new Error("Not implemented yet — coming in FAZ 6b");
}

export async function testHeadlessCMSConnection(_config: HeadlessCMSConfig): Promise<boolean> {
  // TODO: FAZ 6b'de implementasyon
  throw new Error("Not implemented yet — coming in FAZ 6b");
}
