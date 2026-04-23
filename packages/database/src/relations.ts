import { relations } from "drizzle-orm";
import {
  users,
  accounts,
  sessions,
  projects,
  articles,
  externalLinkSources,
  jobs,
  jobLogs,
  creditTransactions,
  subscriptions,
  googleConnections,
  gscMetrics,
  gaMetrics,
  siteAuditIssues,
  siteAuditSnapshots,
  competitors,
  competitorPages,
  competitorChanges,
  contentGaps,
} from "./schema";

export const usersRelations = relations(users, ({ many, one }) => ({
  accounts:           many(accounts),
  sessions:           many(sessions),
  projects:           many(projects),
  creditTransactions: many(creditTransactions),
  googleConnections:  many(googleConnections),
  subscription: one(subscriptions, {
    fields:     [users.id],
    references: [subscriptions.userId],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user:                one(users, { fields: [projects.userId], references: [users.id] }),
  articles:            many(articles),
  externalLinkSources: many(externalLinkSources),
  jobs:                many(jobs),
  googleConnection:    one(googleConnections, { fields: [projects.id], references: [googleConnections.projectId] }),
  gscMetrics:          many(gscMetrics),
  gaMetrics:           many(gaMetrics),
  siteAuditIssues:     many(siteAuditIssues),
  siteAuditSnapshots:  many(siteAuditSnapshots),
  competitors:         many(competitors),
  contentGaps:         many(contentGaps),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  project:         one(projects, { fields: [articles.projectId], references: [projects.id] }),
  jobs:            many(jobs),
  gscMetrics:      many(gscMetrics),
  gaMetrics:       many(gaMetrics),
  siteAuditIssues: many(siteAuditIssues),
}));

export const externalLinkSourcesRelations = relations(externalLinkSources, ({ one }) => ({
  project: one(projects, {
    fields:     [externalLinkSources.projectId],
    references: [projects.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  project: one(projects, { fields: [jobs.projectId], references: [projects.id] }),
  article: one(articles, { fields: [jobs.articleId], references: [articles.id] }),
  logs:    many(jobLogs),
}));

export const jobLogsRelations = relations(jobLogs, ({ one }) => ({
  job: one(jobs, { fields: [jobLogs.jobId], references: [jobs.id] }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields:     [creditTransactions.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

export const googleConnectionsRelations = relations(googleConnections, ({ one }) => ({
  project: one(projects, { fields: [googleConnections.projectId], references: [projects.id] }),
  user:    one(users,    { fields: [googleConnections.userId],    references: [users.id]    }),
}));

export const gscMetricsRelations = relations(gscMetrics, ({ one }) => ({
  article: one(articles, { fields: [gscMetrics.articleId], references: [articles.id] }),
  project: one(projects, { fields: [gscMetrics.projectId], references: [projects.id] }),
}));

export const gaMetricsRelations = relations(gaMetrics, ({ one }) => ({
  article: one(articles, { fields: [gaMetrics.articleId], references: [articles.id] }),
  project: one(projects, { fields: [gaMetrics.projectId], references: [projects.id] }),
}));

export const siteAuditIssuesRelations = relations(siteAuditIssues, ({ one }) => ({
  project: one(projects, { fields: [siteAuditIssues.projectId], references: [projects.id] }),
  article: one(articles, { fields: [siteAuditIssues.articleId], references: [articles.id] }),
}));

export const siteAuditSnapshotsRelations = relations(siteAuditSnapshots, ({ one }) => ({
  project: one(projects, { fields: [siteAuditSnapshots.projectId], references: [projects.id] }),
}));

export const competitorsRelations = relations(competitors, ({ one, many }) => ({
  project: one(projects, { fields: [competitors.projectId], references: [projects.id] }),
  pages:   many(competitorPages),
  changes: many(competitorChanges),
}));

export const competitorPagesRelations = relations(competitorPages, ({ one, many }) => ({
  competitor: one(competitors, { fields: [competitorPages.competitorId], references: [competitors.id] }),
  changes:    many(competitorChanges),
}));

export const competitorChangesRelations = relations(competitorChanges, ({ one }) => ({
  competitor: one(competitors,    { fields: [competitorChanges.competitorId],     references: [competitors.id] }),
  page:       one(competitorPages, { fields: [competitorChanges.competitorPageId], references: [competitorPages.id] }),
}));

export const contentGapsRelations = relations(contentGaps, ({ one }) => ({
  project: one(projects, { fields: [contentGaps.projectId], references: [projects.id] }),
}));
