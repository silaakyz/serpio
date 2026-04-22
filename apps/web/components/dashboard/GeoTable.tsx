"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Article } from "@serpio/database";

type GeoFilter = "all" | "optimized" | "not_optimized" | "low_score";

function geoColor(score: number | null): string {
  if (score === null) return "bg-subtle/30";
  if (score >= 70) return "bg-emerald";
  if (score >= 40) return "bg-yellow-400";
  return "bg-red-400";
}

function geoTextColor(score: number | null): string {
  if (score === null) return "text-muted";
  if (score >= 70) return "text-emerald";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  articles: Article[];
  projectId: string;
}

export function GeoTable({ articles, projectId }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<GeoFilter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (filter === "optimized") return a.geoOptimizedAt !== null;
      if (filter === "not_optimized") return a.geoOptimizedAt === null;
      if (filter === "low_score") return (a.geoScore ?? 0) < 50;
      return true;
    });
  }, [articles, filter]);

  const triggerGeoJob = async (articleId: string, type: "geo_analyze" | "geo_optimize") => {
    setLoadingId(articleId + type);
    const label = type === "geo_analyze" ? "GEO Analiz" : "GEO Optimize";
    const tid = toast.loading(`${label} başlatılıyor...`);
    try {
      const res = await fetch("/api/jobs/geo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, articleId, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Job başlatılamadı");
      toast.success(`${label} kuyruğa eklendi ✓`, { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(`Hata: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`, { id: tid });
    } finally {
      setLoadingId(null);
    }
  };

  const suggestions = (selectedArticle?.geoSuggestions as string[] | null) ?? [];
  const faqs = (selectedArticle?.faqContent as { q: string; a: string }[] | null) ?? [];

  const selectClass =
    "bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-ui focus:outline-none focus:border-emerald/50 cursor-pointer";

  return (
    <div className="space-y-4">
      {/* Filtre */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as GeoFilter)}
          className={selectClass}
        >
          <option value="all">Tümü ({articles.length})</option>
          <option value="optimized">Optimize Edilmiş</option>
          <option value="not_optimized">Optimize Edilmemiş</option>
          <option value="low_score">Düşük Skor (&lt;50)</option>
        </select>
        <span className="text-xs text-muted font-ui">{filtered.length} makale gösteriliyor</span>
      </div>

      {/* Tablo */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-ui">
            <thead>
              <tr className="border-b border-border bg-elevated/50">
                {["Makale", "GEO Skoru", "Durum", "FAQ", "Schema", "Son Optimize", "Aksiyonlar"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted text-sm">
                    Bu filtreye uyan makale bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const faqList = (a.faqContent as { q: string; a: string }[] | null) ?? [];
                  const hasSchema = a.schemaMarkup !== null;
                  const isAnalyzing = loadingId === a.id + "geo_analyze";
                  const isOptimizing = loadingId === a.id + "geo_optimize";

                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-border/50 hover:bg-elevated/40 transition-colors cursor-pointer ${selectedArticle?.id === a.id ? "bg-elevated/30" : ""}`}
                      onClick={() => setSelectedArticle(selectedArticle?.id === a.id ? null : a)}
                    >
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="text-text truncate text-xs" title={a.title}>
                          {a.title || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 rounded-full bg-elevated overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${geoColor(a.geoScore)}`}
                              style={{ width: `${a.geoScore ?? 0}%` }}
                            />
                          </div>
                          <span className={`text-xs font-display font-bold ${geoTextColor(a.geoScore)} min-w-[28px] text-right`}>
                            {a.geoScore !== null ? a.geoScore : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {a.geoOptimizedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald">
                            <span>●</span> Optimize
                          </span>
                        ) : a.geoScore !== null ? (
                          <span className="inline-flex items-center gap-1 text-xs text-yellow-400">
                            <span>●</span> Analiz Edildi
                          </span>
                        ) : (
                          <span className="text-xs text-muted">Analiz yok</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {faqList.length > 0 ? (
                          <span className="text-emerald">{faqList.length} FAQ</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">
                        {hasSchema ? (
                          <span className="text-tech-blue">✓</span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                        {fmtDate(a.geoOptimizedAt)}
                      </td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <button
                            onClick={() => triggerGeoJob(a.id, "geo_analyze")}
                            disabled={isAnalyzing || isOptimizing}
                            className="px-2 py-1 rounded text-xs font-ui border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 transition-colors disabled:opacity-40"
                          >
                            {isAnalyzing ? "..." : "GEO Analiz"}
                          </button>
                          <button
                            onClick={() => triggerGeoJob(a.id, "geo_optimize")}
                            disabled={isAnalyzing || isOptimizing || !a.aiContent}
                            title={!a.aiContent ? "Önce AI içerik oluşturun" : "GEO Optimize Et (5 kredi)"}
                            className="px-2 py-1 rounded text-xs font-ui border border-emerald/30 text-emerald hover:bg-emerald/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isOptimizing ? "..." : "GEO Optimize"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GEO Öneri Paneli — seçili makale */}
      {selectedArticle && (suggestions.length > 0 || faqs.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Öneriler */}
          {suggestions.length > 0 && (
            <div className="bg-surface border border-yellow-400/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-ui font-semibold text-text">
                  GEO Önerileri
                  <span className="ml-2 text-xs text-muted font-normal">
                    {selectedArticle.title.slice(0, 30)}...
                  </span>
                </h3>
                <span className={`text-sm font-display font-bold ${geoTextColor(selectedArticle.geoScore)}`}>
                  {selectedArticle.geoScore ?? "—"}/100
                </span>
              </div>
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-ui">
                    <span className="text-yellow-400 mt-0.5 flex-shrink-0">⚠</span>
                    <span className="text-text/80">{s}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => triggerGeoJob(selectedArticle.id, "geo_optimize")}
                disabled={!selectedArticle.aiContent || loadingId !== null}
                className="w-full py-2 rounded-lg bg-emerald/10 border border-emerald/30 text-emerald text-xs font-ui font-semibold hover:bg-emerald/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Tümünü Otomatik Düzelt (GEO Optimize)
              </button>
            </div>
          )}

          {/* FAQ listesi */}
          {faqs.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-ui font-semibold text-text">
                FAQ İçeriği
                <span className="ml-2 text-xs text-muted font-normal">{faqs.length} soru</span>
              </h3>
              <ul className="space-y-3">
                {faqs.map((faq, i) => (
                  <li key={i} className="space-y-1">
                    <p className="text-xs font-ui font-semibold text-text">{faq.q}</p>
                    <p className="text-xs font-ui text-muted leading-relaxed">{faq.a}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Satır seçildi ama öneri yok */}
      {selectedArticle && suggestions.length === 0 && faqs.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-4 text-center text-muted text-sm font-ui">
          {selectedArticle.geoScore !== null
            ? "Bu makale için öneri bulunmuyor — GEO skoru iyi durumda."
            : "GEO analizi henüz yapılmamış. Yukarıdan 'GEO Analiz' butonuna tıklayın."}
        </div>
      )}
    </div>
  );
}
