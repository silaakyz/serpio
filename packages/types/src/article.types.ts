export type ArticleStatus =
  | "pending"
  | "scraping"
  | "analyzing"
  | "rewriting"
  | "review"
  | "publishing"
  | "published"
  | "failed";

export type StaleStatus =
  | "fresh"
  | "aging"
  | "stale"
  | "critical"
  | "unknown";
