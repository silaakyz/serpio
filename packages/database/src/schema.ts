import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  boolean,
  timestamp,
  json,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// ─── Enum Tanımları ───────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const publishChannelEnum = pgEnum("publish_channel", [
  "wordpress",
  "shopify",
  "ghost",
  "webflow",
  "contentful",
  "strapi",
  "sanity",
  "ftp",
  "browser_automation",
  "github",
  "gitlab",
  "webhook",
]);

export const articleStatusEnum = pgEnum("article_status", [
  "scraped",
  "analyzing",
  "ready",
  "scheduled",
  "publishing",
  "published",
  "failed",
]);

export const staleStatusEnum = pgEnum("stale_status", [
  "fresh",
  "stale_3m",
  "stale_6m",
  "stale_9m_plus",
]);

export const jobTypeEnum = pgEnum("job_type", [
  "scrape",
  "ai_analyze",
  "ai_rewrite",
  "style_guide",
  "internal_link",
  "geo_analyze",
  "geo_optimize",
  "publish",
  "gsc_sync",
  "ga_sync",
]);

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "active",
  "completed",
  "failed",
  "retrying",
]);

export const logLevelEnum = pgEnum("log_level", [
  "info",
  "success",
  "warning",
  "error",
  "debug",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "purchase",
  "consumption",
  "refund",
  "bonus",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "incomplete",
]);

// ─── Auth.js v5 (NextAuth) Tabloları ─────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id:            text("id").primaryKey().$defaultFn(() => createId()),
    name:          text("name"),
    email:         text("email").notNull(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image:         text("image"),
    password:      text("password"),
    role:          userRoleEnum("role").notNull().default("user"),
    credits:       integer("credits").notNull().default(100),
    createdAt:     timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt:     timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

export const accounts = pgTable(
  "accounts",
  {
    userId:            text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:              text("type").notNull(),
    provider:          text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token:     text("refresh_token"),
    access_token:      text("access_token"),
    expires_at:        integer("expires_at"),
    token_type:        text("token_type"),
    scope:             text("scope"),
    id_token:          text("id_token"),
    session_state:     text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token:      text("token").notNull(),
    expires:    timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

// ─── Yardımcı Tipler ──────────────────────────────────────────────────────────

export type StyleGuide = {
  tone: string;
  avgSentenceLength: number;
  headingStyle: string;
  frequentPhrases: string[];
  writingPersonality: string;
  generatedAt: string;
};

export type LinkEntry = {
  text: string;
  url: string;
  keyword: string;
};

// ─── Proje / Website ──────────────────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id:          text("id").primaryKey().$defaultFn(() => createId()),
    userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name:        text("name").notNull(),
    websiteUrl:  text("website_url").notNull(),
    description: text("description"),

    publishConfig:  json("publish_config").$type<Record<string, unknown>>().default({}),
    activeChannel:  publishChannelEnum("active_channel").notNull().default("wordpress"),

    styleGuide:            json("style_guide").$type<StyleGuide | null>().default(null),
    styleGuideGeneratedAt: timestamp("style_guide_generated_at", { mode: "date" }),

    llmVisibilityReport:  json("llm_visibility_report").$type<Record<string, unknown> | null>().default(null),
    llmReportGeneratedAt: timestamp("llm_report_generated_at", { mode: "date" }),

    onboardingStep: integer("onboarding_step").notNull().default(0),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("projects_user_id_idx").on(table.userId),
  })
);

// ─── Makale ───────────────────────────────────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id:        text("id").primaryKey().$defaultFn(() => createId()),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),

    title:           text("title").notNull(),
    originalContent: text("original_content").notNull(),
    originalUrl:     text("original_url").notNull(),
    slug:            text("slug"),
    excerpt:         text("excerpt"),

    originalPublishedAt: timestamp("original_published_at", { mode: "date" }),
    lastModifiedAt:      timestamp("last_modified_at", { mode: "date" }),
    scrapedAt:           timestamp("scraped_at", { mode: "date" }).notNull().defaultNow(),

    staleStatus:  staleStatusEnum("stale_status").notNull().default("fresh"),
    aiContent:    text("ai_content"),
    aiTitle:      text("ai_title"),
    aiMetaDesc:   text("ai_meta_desc"),
    aiKeywords:   json("ai_keywords").$type<string[]>().default([]),

    internalLinks: json("internal_links").$type<LinkEntry[]>().default([]),
    externalLinks: json("external_links").$type<LinkEntry[]>().default([]),

    geoScore:       integer("geo_score"),
    geoSuggestions: json("geo_suggestions").$type<string[]>().default([]),
    schemaMarkup:   json("schema_markup").$type<Record<string, unknown> | null>().default(null),
    faqContent:     json("faq_content").$type<{ q: string; a: string }[]>().default([]),
    geoOptimizedAt: timestamp("geo_optimized_at", { mode: "date" }),

    currentPosition:    real("current_position"),
    positionChange:     real("position_change"),
    monthlyClicks:      integer("monthly_clicks"),
    monthlyImpressions: integer("monthly_impressions"),

    decayRiskScore:     integer("decay_risk_score"),
    decayRiskLevel:     text("decay_risk_level"),
    conversionScore:    real("conversion_score"),
    monthlyConversions: integer("monthly_conversions"),
    croSuggestions:     json("cro_suggestions").$type<string[]>().default([]),

    status:       articleStatusEnum("status").notNull().default("scraped"),
    scheduledAt:  timestamp("scheduled_at", { mode: "date" }),
    publishedAt:  timestamp("published_at", { mode: "date" }),
    publishedUrl: text("published_url"),
    wpPostId:     integer("wp_post_id"),

    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx:       index("articles_project_id_idx").on(table.projectId),
    statusIdx:          index("articles_status_idx").on(table.status),
    staleIdx:           index("articles_stale_status_idx").on(table.staleStatus),
    scheduledIdx:       index("articles_scheduled_at_idx").on(table.scheduledAt),
    originalUrlIdx:     uniqueIndex("articles_original_url_idx").on(table.originalUrl),
    geoScoreIdx:        index("articles_geo_score_idx").on(table.geoScore),
    // Composite — en sık kullanılan sorgu: proje + durum filtresi
    projectStatusIdx:   index("articles_project_status_idx").on(table.projectId, table.status),
  })
);

// ─── Dış Link Kaynakları ──────────────────────────────────────────────────────

export const externalLinkSources = pgTable(
  "external_link_sources",
  {
    id:        text("id").primaryKey().$defaultFn(() => createId()),
    projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    keyword:   text("keyword").notNull(),
    url:       text("url").notNull(),
    label:     text("label"),
    isActive:  boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx: index("ext_links_project_id_idx").on(table.projectId),
    keywordIdx:   index("ext_links_keyword_idx").on(table.keyword),
  })
);

// ─── Job Kuyruğu ──────────────────────────────────────────────────────────────

export const jobs = pgTable(
  "jobs",
  {
    id:          text("id").primaryKey().$defaultFn(() => createId()),
    projectId:   text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    articleId:   text("article_id").references(() => articles.id),
    bullmqJobId: text("bullmq_job_id"),
    type:        jobTypeEnum("type").notNull(),
    status:      jobStatusEnum("status").notNull().default("pending"),
    payload:     json("payload").$type<Record<string, unknown>>(),
    result:      json("result").$type<Record<string, unknown>>(),
    error:       text("error"),
    creditCost:  integer("credit_cost").notNull().default(0),
    progress:    integer("progress").notNull().default(0),
    startedAt:   timestamp("started_at", { mode: "date" }),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt:   timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt:   timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx:    index("jobs_project_id_idx").on(table.projectId),
    statusIdx:       index("jobs_status_idx").on(table.status),
    typeIdx:         index("jobs_type_idx").on(table.type),
    bullmqJobIdIdx:  uniqueIndex("jobs_bullmq_job_id_idx").on(table.bullmqJobId),
    // Composite + yeni
    projectStatusIdx: index("jobs_project_status_idx").on(table.projectId, table.status),
    createdAtIdx:     index("jobs_created_at_idx").on(table.createdAt),
  })
);

// ─── Job Log ──────────────────────────────────────────────────────────────────

export const jobLogs = pgTable(
  "job_logs",
  {
    id:        text("id").primaryKey().$defaultFn(() => createId()),
    jobId:     text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    level:     logLevelEnum("level").notNull().default("info"),
    message:   text("message").notNull(),
    meta:      json("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    jobIdIdx:    index("job_logs_job_id_idx").on(table.jobId),
    createdIdx:  index("job_logs_created_at_idx").on(table.createdAt),
    jobLevelIdx: index("job_logs_job_level_idx").on(table.jobId, table.level),
  })
);

// ─── Kredi İşlemleri ──────────────────────────────────────────────────────────

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id:          text("id").primaryKey().$defaultFn(() => createId()),
    userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:        transactionTypeEnum("type").notNull(),
    amount:      integer("amount").notNull(),
    balance:     integer("balance").notNull(),
    description: text("description"),
    jobId:       text("job_id").references(() => jobs.id),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt:   timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx:      index("credit_tx_user_id_idx").on(table.userId),
    createdIdx:     index("credit_tx_created_at_idx").on(table.createdAt),
    userCreatedIdx: index("credit_tx_user_created_idx").on(table.userId, table.createdAt),
  })
);

// ─── Abonelik ─────────────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id:                   text("id").primaryKey().$defaultFn(() => createId()),
    userId:               text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId:     text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripePriceId:        text("stripe_price_id").notNull(),
    status:               subscriptionStatusEnum("status").notNull(),
    currentPeriodStart:   timestamp("current_period_start", { mode: "date" }).notNull(),
    currentPeriodEnd:     timestamp("current_period_end", { mode: "date" }).notNull(),
    cancelAtPeriodEnd:    boolean("cancel_at_period_end").notNull().default(false),
    createdAt:            timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt:            timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx:   uniqueIndex("subscriptions_user_id_idx").on(table.userId),
    customerIdx: uniqueIndex("subscriptions_stripe_customer_idx").on(table.stripeCustomerId),
    subIdIdx:    uniqueIndex("subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId),
  })
);

// ─── Site Audit Enums ────────────────────────────────────────────────────────

export const auditSeverityEnum = pgEnum("audit_severity", [
  "critical",
  "warning",
  "info",
]);

export const auditIssueTypeEnum = pgEnum("audit_issue_type", [
  "broken_link_internal",
  "broken_link_external",
  "missing_title",
  "title_too_long",
  "title_too_short",
  "missing_meta_desc",
  "meta_desc_too_long",
  "meta_desc_too_short",
  "missing_canonical",
  "missing_viewport",
  "missing_alt_text",
  "slow_page",
  "poor_lcp",
  "poor_cls",
  "duplicate_title",
  "duplicate_meta_desc",
  "missing_h1",
  "multiple_h1",
  "broken_heading_hierarchy",
  "http_error",
  "redirect_chain",
  "missing_https",
  "robots_blocked",
]);

// ─── Site Audit Sorunları ─────────────────────────────────────────────────────

export const siteAuditIssues = pgTable(
  "site_audit_issues",
  {
    id:         text("id").primaryKey().$defaultFn(() => createId()),
    projectId:  text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    articleId:  text("article_id").references(() => articles.id, { onDelete: "cascade" }),
    pageUrl:    text("page_url").notNull(),
    issueType:  auditIssueTypeEnum("issue_type").notNull(),
    severity:   auditSeverityEnum("severity").notNull(),
    details:    json("details").$type<Record<string, unknown>>(),
    detectedAt: timestamp("detected_at", { mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
  },
  (table) => ({
    projectSeverityIdx: index("audit_project_severity_idx").on(table.projectId, table.severity),
    articleIdx:         index("audit_article_idx").on(table.articleId),
    resolvedIdx:        index("audit_resolved_idx").on(table.resolvedAt),
    pageUrlIdx:         index("audit_page_url_idx").on(table.pageUrl),
  })
);

// ─── Site Audit Snapshot ──────────────────────────────────────────────────────

export const siteAuditSnapshots = pgTable(
  "site_audit_snapshots",
  {
    id:            text("id").primaryKey().$defaultFn(() => createId()),
    projectId:     text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    healthScore:   integer("health_score").notNull(),
    totalIssues:   integer("total_issues").notNull(),
    criticalCount: integer("critical_count").notNull(),
    warningCount:  integer("warning_count").notNull(),
    infoCount:     integer("info_count").notNull(),
    pagesAudited:  integer("pages_audited").notNull(),
    avgLoadTime:   real("avg_load_time"),
    createdAt:     timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdx:   index("audit_snapshots_project_idx").on(table.projectId),
    createdAtIdx: index("audit_snapshots_created_at_idx").on(table.createdAt),
  })
);

// ─── Google Bağlantısı ────────────────────────────────────────────────────────

export const googleConnections = pgTable(
  "google_connections",
  {
    id:             text("id").primaryKey().$defaultFn(() => createId()),
    projectId:      text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId:         text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    accessToken:    text("access_token").notNull(),
    refreshToken:   text("refresh_token").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { mode: "date" }).notNull(),
    gscSiteUrl:     text("gsc_site_url"),
    ga4PropertyId:  text("ga4_property_id"),
    scope:          text("scope").notNull(),
    createdAt:      timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt:      timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    projectIdIdx: uniqueIndex("google_conn_project_id_idx").on(table.projectId),
    userIdIdx:    index("google_conn_user_id_idx").on(table.userId),
  })
);

// ─── GSC Metrikleri ───────────────────────────────────────────────────────────

export const gscMetrics = pgTable(
  "gsc_metrics",
  {
    id:          text("id").primaryKey().$defaultFn(() => createId()),
    articleId:   text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    projectId:   text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    pageUrl:     text("page_url").notNull(),
    date:        text("date").notNull(), // YYYY-MM-DD
    clicks:      integer("clicks").notNull().default(0),
    impressions: integer("impressions").notNull().default(0),
    position:    real("position").notNull().default(0),
    ctr:         real("ctr").notNull().default(0),
    createdAt:   timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    articleIdIdx:   index("gsc_metrics_article_id_idx").on(table.articleId),
    projectIdIdx:   index("gsc_metrics_project_id_idx").on(table.projectId),
    dateIdx:        index("gsc_metrics_date_idx").on(table.date),
    uniquePageDate: uniqueIndex("gsc_metrics_page_date_idx").on(table.pageUrl, table.date),
  })
);

// ─── GA4 Metrikleri ───────────────────────────────────────────────────────────

export const gaMetrics = pgTable(
  "ga_metrics",
  {
    id:                  text("id").primaryKey().$defaultFn(() => createId()),
    articleId:           text("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    projectId:           text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    pageUrl:             text("page_url").notNull(),
    date:                text("date").notNull(), // YYYY-MM-DD
    sessions:            integer("sessions").notNull().default(0),
    bounceRate:          real("bounce_rate").notNull().default(0),
    avgSessionDuration:  real("avg_session_duration").notNull().default(0),
    conversions:         integer("conversions").notNull().default(0),
    createdAt:           timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    articleIdIdx:   index("ga_metrics_article_id_idx").on(table.articleId),
    projectIdIdx:   index("ga_metrics_project_id_idx").on(table.projectId),
    dateIdx:        index("ga_metrics_date_idx").on(table.date),
    uniquePageDate: uniqueIndex("ga_metrics_page_date_idx").on(table.pageUrl, table.date),
  })
);

// ─── $inferSelect Tip Export'ları ─────────────────────────────────────────────

export type User               = typeof users.$inferSelect;
export type NewUser            = typeof users.$inferInsert;
export type Project            = typeof projects.$inferSelect;
export type NewProject         = typeof projects.$inferInsert;
export type Article            = typeof articles.$inferSelect;
export type NewArticle         = typeof articles.$inferInsert;
export type Job                = typeof jobs.$inferSelect;
export type NewJob             = typeof jobs.$inferInsert;
export type JobLog             = typeof jobLogs.$inferSelect;
export type ExternalLinkSource = typeof externalLinkSources.$inferSelect;
export type CreditTransaction  = typeof creditTransactions.$inferSelect;
export type Subscription       = typeof subscriptions.$inferSelect;
export type GoogleConnection   = typeof googleConnections.$inferSelect;
export type SiteAuditIssue     = typeof siteAuditIssues.$inferSelect;
export type SiteAuditSnapshot  = typeof siteAuditSnapshots.$inferSelect;
export type GscMetric          = typeof gscMetrics.$inferSelect;
export type GaMetric           = typeof gaMetrics.$inferSelect;
