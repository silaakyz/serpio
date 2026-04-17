"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Article } from "@serpio/database";

type StatusFilter = "all" | "scraped" | "analyzing" | "ready" | "scheduled" | "published" | "failed";
type StaleFilter = "all" | "fresh" | "stale_3m" | "stale_6m" | "stale_9m_plus";

const STATUS_COLORS: Record<string, string> = {
  scraped:   "bg-subtle/30 text-muted border-subtle/50",
  analyzing: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  ready:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  scheduled: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  publishing:"bg-blue-500/10 text-blue-400 border-blue-500/30",
  published: "bg-emerald/10 text-emerald border-emerald/30",
  failed:    "bg-red-500/10 text-red-400 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  scraped: "Tarandı", analyzing: "Analiz", ready: "Hazır",
  scheduled: "Zamanlandı", publishing: "Yayınlanıyor", published: "Yayınlandı", failed: "Başarısız",
};

const STALE_COLORS: Record<string, string> = {
  fresh:       "text-emerald",
  stale_3m:    "text-yellow-400",
  stale_6m:    "text-orange-400",
  stale_9m_plus: "text-red-400",
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

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface Props {
  articles: Article[];
  initialStatus?: string;
  initialStale?: string;
  initialQ?: string;
}

const PER_PAGE_OPTIONS = [10, 25, 50];

export function ArticlesTable({ articles, initialStatus, initialStale, initialQ }: Props) {
  const [status, setStatus] = useState<StatusFilter>((initialStatus as StatusFilter) ?? "all");
  const [stale, setStale] = useState<StaleFilter>((initialStale as StaleFilter) ?? "all");
  const [q, setQ] = useState(initialQ ?? "");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

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

  const selectClass = "bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-ui focus:outline-none focus:border-emerald/50 cursor-pointer";

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <select value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(1); }} className={selectClass}>
          <option value="all">Tüm Durumlar</option>
          <option value="scraped">Tarandı</option>
          <option value="analyzing">Analiz Ediliyor</option>
          <option value="ready">Hazır</option>
          <option value="scheduled">Zamanlandı</option>
          <option value="published">Yayınlandı</option>
          <option value="failed">Başarısız</option>
        </select>

        <select value={stale} onChange={(e) => { setStale(e.target.value as StaleFilter); setPage(1); }} className={selectClass}>
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
                {["Başlık", "URL", "Durum", "Eskime", "GEO Skoru", "Son Güncelleme", "Aksiyonlar"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <p className="text-muted text-sm">
                      {articles.length === 0
                        ? "Henüz makale yok. İlk taramanızı başlatın!"
                        : "Filtre kriterlerine uyan makale bulunamadı."}
                    </p>
                    {articles.length === 0 && (
                      <Link href="/dashboard" className="mt-3 inline-flex items-center text-emerald text-xs hover:underline">
                        → Tarama başlat
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-elevated/40 transition-colors">
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-text truncate" title={a.title}>{a.title || "—"}</p>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[a.status] ?? "text-muted"}`}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${STALE_COLORS[a.staleStatus] ?? "text-muted"}`}>
                        {STALE_LABELS[a.staleStatus] ?? a.staleStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-display font-bold ${geoColor(a.geoScore)}`}>
                        {a.geoScore !== null ? a.geoScore : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {fmtDate(a.lastModifiedAt ?? a.originalPublishedAt ?? a.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button disabled className="text-xs text-muted opacity-40 cursor-not-allowed">···</button>
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
              {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
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
            <span className="px-3 py-1.5 text-xs text-muted font-ui">{page} / {totalPages}</span>
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
