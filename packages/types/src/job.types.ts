export interface ScrapeJobPayload {
  projectId: string;
  articleId?: string;
  options?: {
    depth?: number;
    maxPages?: number;
    respectRobots?: boolean;
  };
}

export interface AiJobPayload {
  projectId: string;
  articleId?: string;
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    styleGuideId?: string;
  };
}

export interface PublishJobPayload {
  projectId: string;
  articleId?: string;
  options?: {
    publishAt?: string;
    destination?: "wordpress" | "github" | "webhook";
    dryRun?: boolean;
  };
}

export interface GeoJobPayload {
  projectId: string;
  articleId?: string;
  options?: {
    targetLocale?: string;
    targetCountry?: string;
    detectAutomatic?: boolean;
  };
}
