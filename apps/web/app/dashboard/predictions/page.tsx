"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface PriorityItem {
  articleId: string;
  title: string;
  url: string;
  priorityScore: number;
  reasons: string[];
  suggestedAction: string;
}

interface DecayArticle {
  id: string;
  title: string;
  aiTitle: string | null;
  originalUrl: string;
  decayRiskScore: number | null;
  decayRiskLevel: string | null;
  predictedDecayDate: string | null;
  staleStatus: string;
  monthlyClicks: number | null;
}

interface CannibalizationIssue {
  id: string;
  similarityScore: number;
  overlappingKeywords: string[];
  recommendation: string | null;
  status: string;
  articleA: { id: string; title: string; aiTitle: string | null; originalUrl: string } | null;
  articleB: { id: string; title: string; aiTitle: string | null; originalUrl: string } | null;
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  critical: { label: "Kritik",  color: "text-red-400",    bg: "bg-red-400/10",    icon: "🔴" },
  high:     { label: "Yüksek", color: "text-orange-400",  bg: "bg-orange-400/10", icon: "🟠" },
  medium:   { label: "Orta",   color: "text-yellow-400",  bg: "bg-yellow-400/10", icon: "🟡" },
  low:      { label: "Düşük",  color: "text-emerald",     bg: "bg-emerald/10",    icon: "🟢" },
};

function priorityBarColor(score: number): string {
  if (score >= 75) return "bg-red-400";
  if (score >= 50) return "bg-orange-400";
  if (score >= 30) return "bg-yellow-400";
  return "bg-tech-blue";
}

export default function PredictionsPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [decayArticles, setDecayArticles] = useState<DecayArticle[]>([]);
  const [cannibalIssues, setCannibalIssues] = useState<CannibalizationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [showAllPriorities, setShowAllPriorities] = useState(false);

  const loadData = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/predictions?projectId=${pid}`);
      if (!res.ok) return;
      const d = await res.json() as {
        priorities: PriorityItem[];
        decayRisk: DecayArticle[];
        cannibalization: CannibalizationIssue[];
      };
      setPriorities(d.priorities ?? []);
      setDecayArticles(d.decayRisk ?? []);
      setCannibalIssues(d.cannibalization ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) return;
        const d = await res.json() as { projects?: { id: string }[] };
        const pid = d.projects?.[0]?.id;
        if (!pid) { setLoading(false); return; }
        setProjectId(pid);
        await loadData(pid);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [loadData]);

  const handleAnalyze = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    const tid = toast.loading("Tahmin analizi başlatılıyor...");
    try {
      const res = await fetch("/api/predictions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "full_analysis" }),
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

  const dismissCannibalization = async (id: string, status: "resolved" | "dismissed") => {
    setDismissingId(id);
    try {
      await fetch("/api/predictions/cannibalization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      setCannibalIssues((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Güncelleme başarısız");
    } finally {
      setDismissingId(null);
    }
  };

  // Risk grupları
  const riskGroups = {
    critical: decayArticles.filter((a) => a.decayRiskLevel === "critical"),
    high:     decayArticles.filter((a) => a.decayRiskLevel === "high"),
    medium:   decayArticles.filter((a) => a.decayRiskLevel === "medium"),
    low:      decayArticles.filter((a) => a.decayRiskLevel === "low"),
  };

  const highRiskCount = riskGroups.critical.length + riskGroups.high.length;
  const displayedPriorities = showAllPriorities ? priorities : priorities.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-elevated rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-surface border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hasNoData = decayArticles.length === 0 && cannibalIssues.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-ui font-bold text-text">Akıllı Tahminler</h2>
          <p className="text-sm text-muted font-ui mt-1">
            Sıralama düşmeden önce proaktif uyarılar ve öncelik önerileri
          </p>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="px-4 py-2 rounded-lg bg-tech-blue text-white text-sm font-ui font-semibold hover:bg-tech-blue/90 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {analyzing ? "Başlatılıyor..." : "🔮 Decay Riski Hesapla"}
        </button>
      </div>

      {/* Proaktif uyarı banner */}
      {highRiskCount > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl text-sm font-ui bg-red-400/8 border border-red-400/30 text-red-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
            ⚠️ <strong className="mx-1">{highRiskCount}</strong> makaleniz önümüzdeki haftalarda sıralama kaybedebilir. Şimdi harekete geçin!
          </div>
          <button
            onClick={() => setExpandedRisk("critical")}
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-400/15 transition-colors"
          >
            İncele →
          </button>
        </div>
      )}

      {hasNoData && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">🔮</p>
          <h3 className="text-text font-ui font-semibold text-lg">Henüz analiz yapılmadı</h3>
          <p className="text-sm text-muted font-ui mt-2 max-w-sm mx-auto">
            Decay riski ve kanibalizasyon tespiti için analizi başlatın.
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-tech-blue text-white rounded-xl text-sm font-ui font-medium hover:bg-tech-blue/90 transition-colors disabled:opacity-50"
          >
            Analizi Başlat →
          </button>
        </div>
      )}

      {/* Öncelik Listesi */}
      {priorities.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-ui font-semibold text-text flex items-center gap-2">
              ⚡ Bugün Yapılması Gerekenler
              <span className="text-xs font-normal text-muted">({priorities.length} öneri)</span>
            </h3>
            {priorities.length > 5 && (
              <button
                onClick={() => setShowAllPriorities((v) => !v)}
                className="text-xs text-tech-blue font-ui hover:underline"
              >
                {showAllPriorities ? "Az Göster" : `Tümü (${priorities.length})`}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {displayedPriorities.map((item) => (
              <div key={item.articleId} className="flex items-start gap-4 p-3 rounded-lg bg-elevated border border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-ui font-medium text-text truncate">{item.title}</p>
                  </div>
                  {/* Öncelik bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-24 h-1.5 rounded-full bg-void overflow-hidden">
                      <div
                        className={`h-full rounded-full ${priorityBarColor(item.priorityScore)}`}
                        style={{ width: `${item.priorityScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-muted">{item.priorityScore}</span>
                  </div>
                  {/* Sebepler */}
                  <div className="flex flex-wrap gap-1.5">
                    {item.reasons.map((r, idx) => (
                      <span key={idx} className="text-xs font-ui px-1.5 py-0.5 rounded bg-elevated border border-border text-muted">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/dashboard/articles/${item.articleId}/editor`}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald text-void text-xs font-ui font-semibold hover:bg-emerald/90 transition-colors whitespace-nowrap"
                >
                  {item.suggestedAction} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decay Risk Haritası */}
      {decayArticles.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-ui font-semibold text-text mb-4">Decay Risk Haritası</h3>
          <div className="space-y-2">
            {(["critical", "high", "medium", "low"] as const).map((level) => {
              const group = riskGroups[level];
              const cfg   = RISK_CONFIG[level];
              if (group.length === 0) return null;

              return (
                <div key={level}>
                  <button
                    onClick={() => setExpandedRisk(expandedRisk === level ? null : level)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                      expandedRisk === level
                        ? `${cfg.bg} border-current ${cfg.color}`
                        : "bg-elevated border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{cfg.icon}</span>
                      <span className={`text-sm font-ui font-medium ${cfg.color}`}>{cfg.label}</span>
                      <span className={`text-xs font-ui px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {group.length} makale
                      </span>
                    </div>
                    <span className={`text-xs font-ui ${cfg.color}`}>
                      {expandedRisk === level ? "▲" : "▼"}
                    </span>
                  </button>

                  {expandedRisk === level && (
                    <div className="mt-1 ml-4 space-y-1">
                      {group.slice(0, 10).map((article) => (
                        <div key={article.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded bg-elevated/50 border border-border/30">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-ui text-text truncate">
                              {article.aiTitle || article.title}
                            </p>
                            {article.predictedDecayDate && (
                              <p className="text-xs text-muted font-ui mt-0.5">
                                Tahmini düşüş: {new Date(article.predictedDecayDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-mono font-bold ${cfg.color}`}>
                              {article.decayRiskScore ?? "—"}
                            </span>
                            <Link
                              href={`/dashboard/articles/${article.id}/editor`}
                              className="text-xs text-tech-blue hover:underline font-ui whitespace-nowrap"
                            >
                              Güncelle →
                            </Link>
                          </div>
                        </div>
                      ))}
                      {group.length > 10 && (
                        <p className="text-xs text-muted font-ui px-3 py-1">
                          +{group.length - 10} makale daha
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kanibalizasyon Uyarıları */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-sm font-ui font-semibold text-text mb-4">Kanibalizasyon Uyarıları</h3>

        {cannibalIssues.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald/8 border border-emerald/30">
            <span className="text-emerald">✓</span>
            <p className="text-sm font-ui text-emerald">Kanibalizasyon tespit edilmedi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cannibalIssues.map((issue) => (
              <div key={issue.id} className="p-4 rounded-lg bg-elevated border border-yellow-400/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-ui font-medium text-yellow-400">
                        {Math.round(issue.similarityScore * 100)}% benzerlik
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-ui text-muted mb-1 flex-wrap">
                      <span className="text-text font-medium truncate max-w-[200px]">
                        {issue.articleA?.aiTitle || issue.articleA?.title || "Makale A"}
                      </span>
                      <span>vs</span>
                      <span className="text-text font-medium truncate max-w-[200px]">
                        {issue.articleB?.aiTitle || issue.articleB?.title || "Makale B"}
                      </span>
                    </div>
                    {issue.overlappingKeywords.length > 0 && (
                      <p className="text-xs text-muted font-ui">
                        Örtüşen: {issue.overlappingKeywords.slice(0, 6).join(", ")}
                        {issue.overlappingKeywords.length > 6 && ` +${issue.overlappingKeywords.length - 6}`}
                      </p>
                    )}
                    {issue.recommendation && (
                      <p className="text-xs text-muted font-ui mt-1.5 leading-relaxed">
                        💡 {issue.recommendation}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => dismissCannibalization(issue.id, "resolved")}
                      disabled={dismissingId === issue.id}
                      className="px-3 py-1.5 rounded text-xs font-ui border border-emerald/30 text-emerald hover:bg-emerald/10 transition-colors disabled:opacity-40 whitespace-nowrap"
                    >
                      Çözüldü ✓
                    </button>
                    <button
                      onClick={() => dismissCannibalization(issue.id, "dismissed")}
                      disabled={dismissingId === issue.id}
                      className="px-3 py-1.5 rounded text-xs font-ui border border-border text-muted hover:text-text transition-colors disabled:opacity-40"
                    >
                      Yoksay
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
