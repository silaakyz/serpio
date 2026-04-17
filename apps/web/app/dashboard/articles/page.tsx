import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { articles, projects } from "@serpio/database";
import { eq, desc, and } from "drizzle-orm";
import { ArticlesTable } from "@/components/dashboard/ArticlesTable";

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

  // Kullanıcının ilk projesini al
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-ui font-bold text-text">Makaleler</h2>
        <div className="flex items-center gap-2">
          {project && (
            <span className="text-xs text-muted font-ui">
              {project.name}
            </span>
          )}
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold opacity-50 cursor-not-allowed"
          >
            + Yeni Tarama
          </button>
        </div>
      </div>

      <ArticlesTable
        articles={articlesList}
        initialStatus={searchParams.status}
        initialStale={searchParams.stale}
        initialQ={searchParams.q}
      />
    </div>
  );
}
