"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Article } from "@serpio/database";

type StatusFilter = "all" | "scraped" | "analyzing" | "ready" | "scheduled" | "published" | "failed";
type StaleFilter = "all" | "fresh" | "stale_3m" | "stale_6m" | "stale_9m_plus";

const STATUS_COLORS: Record<string, string> = {
  scraped:    "bg-subtle/30 text-muted border-subtle/50",
  analyzing:  "bg-sky-500/10 text-sky-400 border-sky-500/30",
  ready:      "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  scheduled:  "bg-orange-500/10 text-orange-400 border-orange-500/30",
  publishing: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  published:  "bg-emerald/10 text-emerald border-emerald/30",
  failed:     "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  scraped: "Tarandı", analyzing: "Analiz", ready: "Hazır",
  scheduled: "Zamanlandı", publishing: "Yayınlanıyor", published: "Yayınlandı", failed: "Başarısız",
};

const STALE_COLORS: Record<string, string> = {
  fresh:        "text-emerald",
  stale_3m:     "text-yellow-400",
  stale_6m:     "text-orange-400",
  stale_9m_plus:"text-red-400",
};

const STALE_LABELS: Record<string, string> = {
  fresh: "Güncel", stale_3m: "3–6 ay", stale_6m: "6–9 ay", stale_9m_plus: "9+ ay",
};

function geoColor(score: number | null): string {
  if (score === null) return "text-muted";
  if (score >= 70) return "text-emerald";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function shortUrl(url: string, max = 40): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.length > max ? path.slice(0, max) + "…" : path;
  } catch {
    return url.slice(0, max);
  }
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  articles: Article[];
  projectId?: string;
  initialStatus?: string;
  initialStale?: string;
  initialQ?: string;
  auditCounts?: Record<string, { critical: number; warning: number; info: number }>;
}

const PER_PAGE_OPTIONS = [10, 25, 50];

export function ArticlesTable({ articles, projectId, initialStatus, initialStale, initialQ, auditCounts }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusFilter>((initialStatus as StatusFilter) ?? "all");
  const [stale, setStale] = useState<StaleFilter>((initialStale as StaleFilter) ?? "all");
  const [q, setQ] = useState(initialQ ?? "");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [geoLoadingId, setGeoLoadingId] = useState<string | null>(null);
  const [confirmRewriteAll, setConfirmRewriteAll] = useState(false);
  const [styleGuideLoading, setStyleGuideLoading] = useState(false);
  const [rewriteAllLoading, setRewriteAllLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(999);

  useEffect(() => {
    fetch("/api/credits/balance")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.credits != null) setUserCredits(d.credits); })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (stale !== "all" && a.staleStatus !== stale) return false;
      if (q && !a.title.toLowerCase().includes(q.toLowerCase()) && !a.originalUrl.includes(q)) return false;
      return true;
    });
  }, [articles, status, stale, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const triggerAiJob = useCallback(
    async (articleId: string, type: "rewrite" | "analyze") => {
      if (!projectId) return;
      setLoadingId(articleId);
      const tid = toast.loading(type === "rewrite" ? "AI güncelleme kuyruğa ekleniyor 🤖" : "Analiz başlatılıyor...");
      try {
        const res = await fetch("/api/jobs/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, articleId, type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Job tetiklenemedi");
        toast.success("AI güncelleme kuyruğa eklendi 🤖", { id: tid });
        router.push(`/dashboard/terminal?jobId=${data.jobId}`);
      } catch (err) {
        toast.error(`Hata: ${err instanceof Error ? err.message : "Job tetiklenemedi"}`, { id: tid });
      } finally {
        setLoadingId(null);
      }
    },
    [projectId, router]
  );

  const handleStyleGuide = useCallback(async () => {
    if (!projectId) return;
    setStyleGuideLoading(true);
    const tid = toast.loading("Stil rehberi oluşturuluyor...");
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "style_guide" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Stil rehberi başlatılamadı");
      toast.success("Stil rehberi kuyruğa eklendi ✓", { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(`Hata: ${err instanceof Error ? err.message : "Stil rehberi oluşturulamadı"}`, { id: tid });
    } finally {
      setStyleGuideLoading(false);
    }
  }, [projectId, router]);

  const handlePublish = useCallback(
    async (articleId: string) => {
      if (!projectId) return;
      setPublishingId(articleId);
      const tid = toast.loading("Yayınlama kuyruğa ekleniyor...");
      try {
        const res = await fetch("/api/jobs/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, articleId }),
        });
        const data = await res.json() as { jobId?: string; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Yayınlama başlatılamadı");
        toast.success("Yayınlama başlatıldı ✓", { id: tid });
        router.push(`/dashboard/terminal?jobId=${data.jobId}`);
      } catch (err) {
        toast.error(`Hata: ${err instanceof Error ? err.message : "Yayınlama başlatılamadı"}`, { id: tid });
      } finally {
        setPublishingId(null);
      }
    },
    [projectId, router]
  );

  const triggerGeoJob = useCallback(
    async (articleId: string, type: "geo_analyze" | "geo_optimize") => {
      if (!projectId) return;
      setGeoLoadingId(articleId + type);
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
        setGeoLoadingId(null);
      }
    },
    [projectId, router]
  );

  const handleRewriteAll = useCallback(async () => {
    if (!projectId) return;
    setConfirmRewriteAll(false);
    setRewriteAllLoading(true);
    const tid = toast.loading("Toplu yeniden yazım başlatılıyor...");
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, type: "rewrite_all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Toplu yazım başlatılamadı");
      toast.success("Toplu yeniden yazım kuyruğa eklendi 🤖", { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(`Hata: ${err instanceof Error ? err.message : "Toplu yazım başlatılamadı"}`, { id: tid });
    } finally {
      setRewriteAllLoading(false);
    }
  }, [projectId, router]);

  const selectClass =
    "bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-ui focus:outline-none focus:border-emerald/50 cursor-pointer";

  return (
    <div className="space-y-4">
      {/* Üst aksiyon butonları */}
      {projectId && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleStyleGuide}
            disabled={styleGuideLoading}
            className="px-4 py-2 rounded-lg border border-tech-blue/40 text-tech-blue text-sm font-ui hover:bg-tech-blue/10 transition-colors disabled:opacity-50"
          >
            {styleGuideLoading ? "Başlatılıyor..." : "Stil Rehberi Oluştur"}
          </button>

          <button
            onClick={() => setConfirmRewriteAll(true)}
            disabled={rewriteAllLoading}
            className="px-4 py-2 rounded-lg border border-gold/40 text-gold text-sm font-ui hover:bg-gold/10 transition-colors disabled:opacity-50"
          >
            {rewriteAllLoading ? "Başlatılıyor..." : "Tümünü Güncelle"}
          </button>
        </div>
      )}

      {/* Onay dialogu */}
      {confirmRewriteAll && (
        <div className="bg-surface border border-gold/40 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-ui text-text font-semibold">Tüm eski makaleleri yeniden yaz?</p>
            <p className="text-xs text-muted font-ui mt-0.5">
              Her makale 15 kredi tüketir. Bu işlem geri alınamaz.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmRewriteAll(false)}
              className="px-3 py-1.5 rounded-lg border border-border text-muted text-xs font-ui hover:text-text transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleRewriteAll}
              className="px-3 py-1.5 rounded-lg bg-gold text-void text-xs font-ui font-semibold hover:bg-gold/90 transition-colors"
            >
              Evet, Tümünü Güncelle
            </button>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }}
          className={selectClass}
        >
          <option value="all">Tüm Durumlar</option>
          <option value="scraped">Tarandı</option>
          <option value="analyzing">Analiz Ediliyor</option>
          <option value="ready">Hazır</option>
          <option value="scheduled">Zamanlandı</option>
          <option value="published">Yayınlandı</option>
          <option value="failed">Başarısız</option>
        </select>

        <select
          value={stale}
          onChange={(e) => { setStale(e.target.value as StaleFilter); setPage(1); }}
          className={selectClass}
        >
          <option value="all">Tüm Eskimeler</option>
          <option value="fresh">Güncel</option>
          <option value="stale_3m">3–6 ay</option>
          <option value="stale_6m">6–9 ay</option>
          <option value="stale_9m_plus">9+ ay</option>
        </select>

        <input
          type="text"
          placeholder="Makale ara..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className="flex-1 min-w-[200px] bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-muted font-ui focus:outline-none focus:border-emerald/50"
        />
      </div>

      {/* Tablo */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-ui">
            <thead>
              <tr className="border-b border-border bg-elevated/50">
                {[
                  { label: "Başlık" },
                  { label: "URL" },
                  { label: "Durum" },
                  { label: "Eskime" },
                  { label: "GEO Skoru" },
                  { label: "Pozisyon", title: "Google'daki ortalama sıralama (GSC verisi)" },
                  { label: "Tıklama/ay", title: "Son 90 gün toplam tıklama (GSC verisi)" },
                  { label: "SEO", title: "Açık teknik SEO sorunları" },
                  { label: "Son Güncelleme" },
                  { label: "Aksiyonlar" },
                ].map(({ label, title }) => (
                  <th
                    key={label}
                    title={title}
                    className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <p className="text-muted text-sm">
                      {articles.length === 0
                        ? "Henüz makale yok. İlk taramanızı başlatın!"
                        : "Filtre kriterlerine uyan makale bulunamadı."}
                    </p>
                    {articles.length === 0 && (
                      <Link
                        href="/dashboard"
                        className="mt-3 inline-flex items-center text-emerald text-xs hover:underline"
                      >
                        → Tarama başlat
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-border/50 hover:bg-elevated/40 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-text truncate" title={a.title}>
                        {a.title || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <a
                        href={a.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-tech-blue hover:underline text-xs truncate block"
                        title={a.originalUrl}
                      >
                        {shortUrl(a.originalUrl)}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[a.status] ?? "text-muted"}`}
                      >
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${STALE_COLORS[a.staleStatus] ?? "text-muted"}`}>
                        {STALE_LABELS[a.staleStatus] ?? a.staleStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {a.geoScore !== null ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 rounded-full bg-elevated overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                a.geoScore >= 70 ? "bg-emerald" :
                                a.geoScore >= 40 ? "bg-yellow-400" : "bg-red-400"
                              }`}
                              style={{ width: `${a.geoScore}%` }}
                            />
                          </div>
                          <span className={`text-xs font-display font-bold ${geoColor(a.geoScore)}`}>
                            {a.geoScore}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); triggerGeoJob(a.id, "geo_analyze"); }}
                          disabled={geoLoadingId !== null}
                          title="GEO Analizi başlat (2 kredi)"
                          className="text-xs text-muted hover:text-yellow-400 transition-colors disabled:opacity-40"
                        >
                          Analiz et →
                        </button>
                      )}
                    </td>
                    {/* Pozisyon (GSC) */}
                    <td className="px-4 py-3 text-right">
                      {a.currentPosition != null ? (
                        <span
                          className={`text-xs font-mono font-semibold ${
                            a.currentPosition <= 3  ? "text-emerald" :
                            a.currentPosition <= 10 ? "text-yellow-400" : "text-muted"
                          }`}
                        >
                          #{a.currentPosition.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-border">—</span>
                      )}
                    </td>

                    {/* Tıklama/ay (GSC) */}
                    <td className="px-4 py-3 text-right">
                      {a.monthlyClicks != null && a.monthlyClicks > 0 ? (
                        <span className="text-xs font-mono text-text">
                          {a.monthlyClicks.toLocaleString("tr")}
                        </span>
                      ) : (
                        <span className="text-xs text-border">—</span>
                      )}
                    </td>

                    {/* SEO audit badge */}
                    <td className="px-4 py-3">
                      {(() => {
                        const counts = auditCounts?.[a.id];
                        const total = counts ? counts.critical + counts.warning + counts.info : 0;
                        if (!counts || total === 0) return <span className="text-xs text-border">—</span>;
                        const parts: string[] = [];
                        if (counts.critical > 0) parts.push(`${counts.critical} kritik`);
                        if (counts.warning > 0)  parts.push(`${counts.warning} uyarı`);
                        if (counts.info > 0)     parts.push(`${counts.info} bilgi`);
                        return (
                          <span
                            title={parts.join(", ")}
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-ui font-semibold border ${
                              counts.critical > 0
                                ? "bg-red-400/10 text-red-400 border-red-400/30"
                                : counts.warning > 0
                                ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                                : "bg-tech-blue/10 text-tech-blue border-tech-blue/30"
                            }`}
                          >
                            {total} sorun
                          </span>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {fmtDate(a.lastModifiedAt ?? a.originalPublishedAt ?? a.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        {/* AI Güncelle */}
                        <button
                          onClick={() => userCredits >= 15 && triggerAiJob(a.id, "rewrite")}
                          disabled={loadingId === a.id || a.status === "analyzing" || userCredits < 15}
                          title={userCredits < 15 ? `Yetersiz kredi (gerekli: 15, mevcut: ${userCredits})` : ""}
                          className="px-2 py-1 rounded text-xs font-ui border border-tech-blue/30 text-tech-blue hover:bg-tech-blue/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {loadingId === a.id ? "..." : "AI Güncelle"}
                        </button>

                        {/* Düzenle */}
                        <Link
                          href={`/dashboard/articles/${a.id}/editor`}
                          className="px-2 py-1 rounded text-xs font-ui border border-border text-muted hover:text-text hover:border-border/80 transition-colors"
                        >
                          Düzenle
                        </Link>

                        {/* Yayınla */}
                        <button
                          onClick={() => a.status === "ready" && userCredits >= 2 && handlePublish(a.id)}
                          disabled={a.status !== "ready" || publishingId === a.id || userCredits < 2}
                          className="px-2 py-1 rounded text-xs font-ui border border-emerald/30 text-emerald hover:bg-emerald/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            userCredits < 2    ? `Yetersiz kredi (gerekli: 2, mevcut: ${userCredits})` :
                            a.status !== "ready" ? "Önce AI ile güncellenmeli" : "Yayınla"
                          }
                        >
                          {publishingId === a.id ? "..." : "Yayınla"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted font-ui">
            <span>Gösterilen:</span>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="bg-elevated border border-border rounded px-2 py-1 text-text focus:outline-none"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>/ {filtered.length} makale</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border bg-elevated disabled:opacity-40 font-ui hover:text-text transition-colors"
            >
              ← Önceki
            </button>
            <span className="px-3 py-1.5 text-xs text-muted font-ui">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs text-muted border border-border bg-elevated disabled:opacity-40 font-ui hover:text-text transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
