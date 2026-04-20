import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@serpio/database";
import { articles, projects } from "@serpio/database";
import { eq } from "drizzle-orm";
import { ArticleEditor } from "@/components/editor/ArticleEditor";
import Link from "next/link";

interface Props {
  params: { id: string };
}

export default async function ArticleEditorPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const article = await db.query.articles.findFirst({
    where: eq(articles.id, params.id),
  });

  if (!article) return notFound();

  // Kullanıcının bu makaleye erişimi var mı?
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, article.projectId),
  });

  if (!project || project.userId !== session.user.id) return notFound();

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-ui text-muted">
        <Link href="/dashboard/articles" className="hover:text-text transition-colors">
          Makaleler
        </Link>
        <span>/</span>
        <span className="text-text truncate max-w-xs">{article.title}</span>
        <span>/</span>
        <span className="text-emerald">Editör</span>
      </div>

      <ArticleEditor article={article} />
    </div>
  );
}
