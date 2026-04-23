"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ContentGap {
  id: string;
  keyword: string;
  competitorUrls: string[];
  priorityScore: number | null;
  status: string;
  suggestedTitle: string | null;
  createdAt: string;
}

type StatusFilter = "all" | "open" | "dismissed" | "assigned";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:      { label: "Açık",     color: "text-emerald" },
  assigned:  { label: "Atandı",   color: "text-tech-blue" },
  published: { label: "Yayında",  color: "text-emerald" },
  dismissed: { label: "Yoksayıldı", color: "text-muted" },
};

function priorityColor(score: number | null): string {
  if (score === null) return "bg-muted/30";
  if (score >= 80) return "bg-red-400";
  if (score >= 50) return "bg-yellow-400";
  return "bg-tech-blue";
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const [gaps, setGaps] = useState<ContentGap[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [analyzing, setAnalyzing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadData = useCallback(async (pid?: string) => {
    const id = pid ?? projectId;
    if (!id) return;
    try {
      const res = await fetch(`/api/content-gaps?projectId=${id}&status=${filter !== "all" ? filter : ""}`);
      if (res.ok) {
        const d = await res.json() as { gaps: ContentGap[] };
        setGaps(d.gaps ?? []);
      }
    } catch {}
  }, [projectId, filter]);

  useEffect(() => {
    (async () => {
      try {
        const projRes = await fetch("/api/projects");
        if (!projRes.ok) return;
        const projData = await projRes.json() as { projects?: { id: string }[] };
        const pid = projData.projects?.[0]?.id;
        if (!pid) { setLoading(false); return; }
        setProjectId(pid);
        await loadData(pid);
      } catch {} finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (projectId) loadData();
  }, [filter, projectId, loadData]);

  const handleAnalyze = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    const tid = toast.loading("İçerik boşluğu analizi başlatılıyor...");
    try {
      const res = await fetch("/api/jobs/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "content_gap", projectId }),
      });
      const data = await res.json() as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analiz başlatılamadı");
      toast.success("Analiz kuyruğa eklendi ✓", { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata", { id: tid });
    } finally {
      setAnalyzing(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/content-gaps", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      setGaps((prev) => prev.map((g) => g.id === id ? { ...g, status } : g));
      if (filter !== "all") setGaps((prev) => prev.filter((g) => g.id !== id || g.status === filter));
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setUpdatingId(null);
    }
  };

  const openGaps      = gaps.filter((g) => g.status === "open").length;
  const dismissedGaps = gaps.filter((g) => g.status === "dismissed").length;

  const selectClass = "bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-ui focus:outline-none focus:border-emerald/50 cursor-pointer";

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 bg-elevated rounded animate-pulse" />
        <div className="h-64 bg-surface border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-ui font-bold text-text">İçerik Fırsatları</h2>
          <p className="text-sm text-muted font-ui mt-1">Rakiplerin hedeflediği ama sizin yazmadığınız konular</p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-4 py-2 rounded-lg bg-tech-blue text-white text-sm font-ui font-semibold hover:bg-tech-blue/90 transition-colors disabled:opacity-50"
        >
          {analyzing ? "Başlatılıyor..." : "Boşluk Analizi Yap (5 kredi)"}
        </button>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Toplam Fırsat</p>
          <p className="text-3xl font-display font-bold text-text mt-2">{gaps.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Açık</p>
          <p className="text-3xl font-display font-bold text-emerald mt-2">{openGaps}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-xs text-muted font-ui uppercase tracking-wider">Yoksayıldı</p>
          <p className="text-3xl font-display font-bold text-muted mt-2">{dismissedGaps}</p>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as StatusFilter)}
          className={selectClass}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="open">Açık</option>
          <option value="assigned">Atandı</option>
          <option value="dismissed">Yoksayıldı</option>
        </select>
      </div>

      {/* Boş durum */}
      {gaps.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">💡</p>
          <h3 className="text-text font-ui font-semibold text-lg">
            {filter === "open" ? "Açık fırsat yok" : "Fırsat bulunamadı"}
          </h3>
          <p className="text-sm text-muted font-ui mt-2 max-w-sm mx-auto">
            {filter === "open"
              ? "Harika! Tüm fırsatlar işlendi veya henüz analiz yapılmadı."
              : "Seçili filtreye uyan içerik fırsatı bulunamadı."}
          </p>
          {filter === "open" && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-tech-blue text-white rounded-xl text-sm font-ui font-medium hover:bg-tech-blue/90 transition-colors disabled:opacity-50"
            >
              Analiz Yap →
            </button>
          )}
        </div>
      )}

      {/* Fırsat Tablosu */}
      {gaps.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-ui">
              <thead>
                <tr className="border-b border-border bg-elevated/50">
                  {["Anahtar Kelime", "Rakip Sayısı", "Öncelik", "Önerilen Başlık", "Durum", "Aksiyon"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gaps.map((gap) => (
                  <tr key={gap.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-text font-medium">{gap.keyword}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-muted text-xs">{gap.competitorUrls.length}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-elevated overflow-hidden">
                          <div
                            className={`h-full rounded-full ${priorityColor(gap.priorityScore)}`}
                            style={{ width: `${gap.priorityScore ?? 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-muted">{gap.priorityScore ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <span className="text-xs text-muted truncate block" title={gap.suggestedTitle ?? ""}>
                        {gap.suggestedTitle || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-ui ${STATUS_LABELS[gap.status]?.color ?? "text-muted"}`}>
                        {STATUS_LABELS[gap.status]?.label ?? gap.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {gap.status === "open" && (
                          <>
                            <button
                              onClick={() => updateStatus(gap.id, "assigned")}
                              disabled={updatingId === gap.id}
                              className="px-2 py-1 rounded text-xs font-ui border border-tech-blue/30 text-tech-blue hover:bg-tech-blue/10 transition-colors disabled:opacity-40"
                            >
                              Ata
                            </button>
                            <button
                              onClick={() => updateStatus(gap.id, "dismissed")}
                              disabled={updatingId === gap.id}
                              className="px-2 py-1 rounded text-xs font-ui border border-border text-muted hover:text-text transition-colors disabled:opacity-40"
                            >
                              Yoksay
                            </button>
                          </>
                        )}
                        {gap.status === "dismissed" && (
                          <button
                            onClick={() => updateStatus(gap.id, "open")}
                            disabled={updatingId === gap.id}
                            className="px-2 py-1 rounded text-xs font-ui border border-border text-muted hover:text-text transition-colors disabled:opacity-40"
                          >
                            Geri Al
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
