import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { articles, projects, siteAuditIssues } from "@serpio/database";
import { eq, desc, and, isNull } from "@serpio/database";
import { ArticlesTable } from "@/components/dashboard/ArticlesTable";
import Link from "next/link";

interface SearchParams {
  status?: string;
  stale?: string;
  q?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default async function ArticlesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const project = await db.query.projects.findFirst({
    where: eq(projects.userId, session.user.id),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  const articlesList = project
    ? await db.query.articles.findMany({
        where: eq(articles.projectId, project.id),
        orderBy: [desc(articles.createdAt)],
        limit: 200,
      })
    : [];

  // Makale başına audit sorun sayıları
  const auditCounts: Record<string, { critical: number; warning: number; info: number }> = {};
  if (project) {
    const openIssues = await db.query.siteAuditIssues.findMany({
      where: and(
        eq(siteAuditIssues.projectId, project.id),
        isNull(siteAuditIssues.resolvedAt),
      ),
      columns: { articleId: true, severity: true },
    });
    for (const issue of openIssues) {
      if (!issue.articleId) continue;
      if (!auditCounts[issue.articleId]) auditCounts[issue.articleId] = { critical: 0, warning: 0, info: 0 };
      auditCounts[issue.articleId][issue.severity]++;
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-ui font-bold text-text">Makaleler</h2>
        <div className="flex items-center gap-2">
          {project && (
            <span className="text-xs text-muted font-ui">{project.name}</span>
          )}
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold hover:bg-emerald/90 transition-colors"
          >
            + Yeni Tarama
          </Link>
        </div>
      </div>

      <ArticlesTable
        articles={articlesList}
        projectId={project?.id}
        initialStatus={searchParams.status}
        initialStale={searchParams.stale}
        initialQ={searchParams.q}
        auditCounts={auditCounts}
      />
    </div>
  );
}
