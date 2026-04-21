"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  userId: string;
}

export function ScrapeStarter({ userId }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleStart = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // Proje yoksa otomatik oluştur
      const projectsRes = await fetch("/api/projects");
      const projectsData = await projectsRes.json();
      let projectId: string;

      if (projectsData.projects?.length > 0) {
        projectId = projectsData.projects[0].id;
      } else {
        const createRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteUrl: url }),
        });
        if (!createRes.ok) throw new Error("Proje oluşturulamadı");
        const { project } = await createRes.json();
        projectId = project.id;
      }

      // Scrape job başlat
      const jobRes = await fetch("/api/jobs/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, url, maxDepth: 2, maxPages: 50 }),
      });

      if (!jobRes.ok) {
        const err = await jobRes.json();
        throw new Error(err.error ?? "İş başlatılamadı");
      }

      const { jobId } = await jobRes.json();
      toast.success("Tarama başlatıldı ⚡");
      router.push(`/dashboard/terminal?jobId=${jobId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu";
      setError(msg);
      toast.error(`Hata: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-dashed border-emerald/30 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🚀</span>
        <div>
          <h3 className="text-text font-ui font-semibold">Web Sitenizi Tarayın</h3>
          <p className="text-xs text-muted font-ui mt-0.5">
            URL&apos;nizi girin, Serpio içeriklerinizi analiz etsin.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          disabled={loading}
          className="flex-1 bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text
            placeholder-muted font-ui focus:outline-none focus:border-emerald/50 disabled:opacity-50"
        />
        <button
          onClick={handleStart}
          disabled={loading || !url.trim()}
          className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold
            hover:bg-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? "Başlatılıyor..." : "Taramayı Başlat →"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 font-ui">{error}</p>
      )}
    </div>
  );
}
