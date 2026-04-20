// GitLab Repository API — Content yayınlama
// Docs: https://docs.gitlab.com/ee/api/repository_files.html

export interface GitLabConfig {
  instanceUrl: string;   // "https://gitlab.com" veya self-hosted URL
  projectId: string;     // Numerik proje ID veya "namespace/project"
  branch: string;        // "main"
  path: string;          // "content/blog"
  token: string;         // Personal Access Token veya Deploy Token
}

export interface PublishResult {
  success: boolean;
  publishedUrl?: string;
  postId?: number;
  error?: string;
}

export async function publishToGitLab(
  _config: GitLabConfig,
  _article: {
    title: string;
    content: string;
    slug: string;
    metaDesc?: string;
    keywords?: string[];
    publishedAt?: Date;
  },
  _jobId: string
): Promise<PublishResult> {
  // TODO: FAZ 6b'de implementasyon
  // github.service.ts'e benzer mantık, GitLab API ile:
  // 1. GET /api/v4/projects/{id}/repository/files/{filePath}?ref={branch} → SHA kontrolü
  // 2. POST (yeni) veya PUT (güncelleme) /api/v4/projects/{id}/repository/files/{filePath}
  // 3. Authorization: Bearer {token} veya PRIVATE-TOKEN: {token}
  // 4. Content: Base64 encode
  throw new Error("Not implemented yet — coming in FAZ 6b");
}

export async function testGitLabConnection(_config: GitLabConfig): Promise<boolean> {
  // TODO: FAZ 6b'de implementasyon
  // GET /api/v4/projects/{id} ile test et
  throw new Error("Not implemented yet — coming in FAZ 6b");
}
