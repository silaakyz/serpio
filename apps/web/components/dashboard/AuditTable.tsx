"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

type Severity = "critical" | "warning" | "info";

interface AuditIssueRow {
  id: string;
  issueType: string;
  severity: Severity;
  pageUrl: string;
  details: Record<string, unknown> | null;
  detectedAt: Date | string;
  article?: { id: string; title: string; originalUrl: string } | null;
}

interface Props {
  issues: AuditIssueRow[];
  issueLabels: Record<string, string>;
}

// ─── Nasıl düzeltilir rehberi ─────────────────────────────────────────────────
const HOW_TO_FIX: Record<string, string> = {
  missing_title:
    "HTML <head> bölümüne <title>Sayfa Başlığınız</title> ekleyin. Başlık 30-60 karakter arasında olmalı.",
  title_too_long:
    "Başlığı 60 karakterin altına indirin. En önemli anahtar kelimeyi başa alın.",
  title_too_short:
    "Başlığı 30-60 karakter arasına uzatın. Anahtar kelime + marka adı formatını deneyin.",
  duplicate_title:
    "Her sayfa için benzersiz bir başlık yazın. Kategori/tarih ekleyerek ayırt edin.",
  missing_meta_desc:
    '<meta name="description" content="120-160 karakterlik açıklama"> etiketini <head> içine ekleyin.',
  meta_desc_too_long:
    "Meta açıklamayı 160 karakterin altına indirin. İlk cümleye en önemli bilgiyi koyun.",
  meta_desc_too_short:
    "Meta açıklamayı en az 120 karaktere çıkarın. Kullanıcıyı tıklamaya teşvik eden bir metin yazın.",
  duplicate_meta_desc:
    "Her sayfa için özgün bir meta açıklama yazın. Sayfanın içeriğini yansıtmalı.",
  missing_canonical:
    '<link rel="canonical" href="https://siteniz.com/sayfa-url"> etiketini <head> bölümüne ekleyin.',
  missing_viewport:
    '<meta name="viewport" content="width=device-width, initial-scale=1"> etiketini ekleyin.',
  missing_h1:
    "Her sayfada tam olarak bir <h1> etiketi olmalı. Ana sayfa başlığı için kullanın.",
  multiple_h1:
    "Sayfada yalnızca bir <h1> bırakın. Diğerlerini <h2> veya <h3> olarak değiştirin.",
  broken_heading_hierarchy:
    "Başlıkları h1→h2→h3 sırasıyla kullanın. Seviye atlamayın (h1'den h3'e geçmeyin).",
  missing_alt_text:
    'Tüm <img> etiketlerine alt="açıklayıcı metin" özelliği ekleyin. Dekoratif görseller için alt="" kullanın.',
  slow_page:
    "Görsel boyutlarını küçültün (WebP formatı kullanın), JavaScript'i minify edin, tarayıcı önbelleğini aktive edin, CDN kullanın.",
  missing_https:
    "SSL sertifikası edinin ve tüm HTTP trafiğini HTTPS'e yönlendirin (301 redirect).",
  http_error:
    "Sayfanın döndürdüğü hata kodunu inceleyin. 404 için sayfayı yeniden oluşturun ya da linkleri güncelleyin.",
  broken_link_internal:
    "Bu URL'yi gösteren linkleri güncelleyin veya sayfayı yeniden oluşturun. 301 yönlendirme ekleyebilirsiniz.",
  broken_link_external:
    "Dış linkin hedef sayfasını kontrol edin. Erişilemiyorsa linki kaldırın veya güncelleyin.",
  redirect_chain:
    "Yönlendirme zincirini kısaltın. A→B→C yerine A'dan doğrudan C'ye 301 yönlendirmesi yapın.",
  robots_blocked:
    "robots.txt veya meta robots etiketini kontrol edin. İndexlenmesini istediğiniz sayfaları engellemeyin.",
  poor_lcp:
    "En büyük içerik öğesini (hero görsel/başlık) optimize edin. Lazy loading'i devre dışı bırakın.",
  poor_cls:
    "Görsellere width/height attribute ekleyin. Sayfaya yerleşen reklam/banner alanlarını reserve edin.",
};

// JSON detaylarından okunabilir metin üret
function formatDetails(issueType: string, details: Record<string, unknown> | null): string {
  if (!details) return "";
  const d = details;
  switch (issueType) {
    case "title_too_long":
    case "title_too_short":
      return `Mevcut uzunluk: ${d.length} karakter · Önerilen: ${d.recommended}`;
    case "meta_desc_too_long":
    case "meta_desc_too_short":
      return `Mevcut uzunluk: ${d.length} karakter · Önerilen: ${d.recommended}`;
    case "missing_alt_text":
      return `${d.count} görselde alt text eksik`;
    case "multiple_h1":
      return `${d.count} adet H1 bulundu`;
    case "slow_page":
      return `Yükleme süresi: ${d.loadTimeMs}ms (eşik: ${d.threshold}ms)`;
    case "http_error":
      return `HTTP ${d.statusCode} hatası`;
    case "duplicate_title":
      return `"${String(d.title ?? "").slice(0, 50)}" başka sayfada da var`;
    case "duplicate_meta_desc":
      return `"${String(d.preview ?? "").slice(0, 50)}" başka sayfada da var`;
    case "broken_heading_hierarchy":
      return `Sıra: ${(d.headings as number[] | undefined)?.join("→") ?? ""}`;
    default:
      return Object.entries(d)
        .filter(([k]) => k !== "url")
        .map(([k, v]) => `${k}: ${v}`)
        .join(" · ")
        .slice(0, 100);
  }
}

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: "bg-red-400/10 text-red-400 border-red-400/20",
  warning:  "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  info:     "bg-tech-blue/10 text-tech-blue border-tech-blue/20",
};
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Kritik", warning: "Uyarı", info: "Bilgi",
};

const PAGE_SIZE = 20;
type FilterSev = "all" | Severity;

export function AuditTable({ issues, issueLabels }: Props) {
  const [filterSev,  setFilterSev]  = useState<FilterSev>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRes,  setFilterRes]  = useState<"open" | "resolved" | "all">("open");
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [expandedId,  setExpandedId]  = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Unique issue types for type filter
  const issueTypes = Array.from(new Set(issues.map((i) => i.issueType))).sort();

  const filtered = issues.filter((i) => {
    const isResolved = resolvedIds.has(i.id);
    if (filterRes === "open"     && isResolved)  return false;
    if (filterRes === "resolved" && !isResolved) return false;
    if (filterSev !== "all" && i.severity !== filterSev) return false;
    if (filterType !== "all" && i.issueType !== filterType) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const counts = {
    all:      issues.length,
    critical: issues.filter((i) => i.severity === "critical").length,
    warning:  issues.filter((i) => i.severity === "warning").length,
    info:     issues.filter((i) => i.severity === "info").length,
  };

  async function resolve(id: string) {
    startTransition(async () => {
      try {
        await fetch(`/api/audit/${id}/resolve`, { method: "POST" });
        setResolvedIds((p) => new Set([...p, id]));
      } catch { /* ignore */ }
    });
  }

  function shortUrl(url: string) {
    try { const u = new URL(url); return u.pathname + (u.search ? "?…" : ""); } catch { return url; }
  }
  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "2-digit" });
  }

  return (
    <div className="space-y-4">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Severity */}
        <div className="flex gap-1">
          {(["all", "critical", "warning", "info"] as FilterSev[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilterSev(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-ui font-medium border transition-colors ${
                filterSev === f
                  ? "bg-tech-blue text-white border-tech-blue"
                  : "bg-surface text-muted border-border hover:text-text"
              }`}
            >
              {f === "all" ? `Tümü (${counts.all})` : `${SEVERITY_LABEL[f]} (${counts[f]})`}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs text-text font-ui focus:outline-none focus:border-tech-blue"
        >
          <option value="all">Tüm Sorun Tipleri</option>
          {issueTypes.map((t) => (
            <option key={t} value={t}>{issueLabels[t] ?? t}</option>
          ))}
        </select>

        {/* Resolved filter */}
        <select
          value={filterRes}
          onChange={(e) => { setFilterRes(e.target.value as "open" | "resolved" | "all"); setPage(1); }}
          className="bg-elevated border border-border rounded-lg px-2 py-1.5 text-xs text-text font-ui focus:outline-none focus:border-tech-blue"
        >
          <option value="open">Açık Sorunlar</option>
          <option value="resolved">Çözülmüş</option>
          <option value="all">Tümü</option>
        </select>

        <span className="text-xs text-muted font-ui ml-auto">{filtered.length} sorun</span>
      </div>

      {/* Tablo */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-ui">
            <thead>
              <tr className="border-b border-border bg-elevated/50">
                {["Sayfa", "Sorun Tipi", "Önem", "Detay", "Tarih", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted text-sm font-ui">
                    Bu filtrede sorun bulunamadı.
                  </td>
                </tr>
              ) : (
                paginated.flatMap((issue) => {
                  const isExpanded = expandedId === issue.id;
                  const isResolved = resolvedIds.has(issue.id);
                  const detailText = formatDetails(issue.issueType, issue.details);
                  const fixGuide   = HOW_TO_FIX[issue.issueType];

                  return [
                    <tr
                      key={issue.id}
                      onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                      className={`border-b border-border/50 hover:bg-elevated/40 transition-colors cursor-pointer ${isResolved ? "opacity-50" : ""}`}
                    >
                      {/* Sayfa */}
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-muted text-xs truncate block" title={issue.pageUrl}>
                          {shortUrl(issue.pageUrl)}
                        </span>
                        {issue.article && (
                          <Link
                            href={`/dashboard/articles/${issue.article.id}/editor`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-tech-blue hover:underline text-xs truncate block mt-0.5"
                            title={issue.article.title}
                          >
                            {issue.article.title.slice(0, 40)}{issue.article.title.length > 40 ? "…" : ""}
                          </Link>
                        )}
                      </td>

                      {/* Sorun tipi */}
                      <td className="px-4 py-3">
                        <span className="text-text text-xs font-medium">
                          {issueLabels[issue.issueType] ?? issue.issueType}
                        </span>
                      </td>

                      {/* Severity badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${SEVERITY_BADGE[issue.severity]}`}>
                          {SEVERITY_LABEL[issue.severity]}
                        </span>
                      </td>

                      {/* Detay */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-muted text-xs truncate block">{detailText || "—"}</span>
                      </td>

                      {/* Tarih */}
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                        {fmtDate(issue.detectedAt)}
                      </td>

                      {/* Aksiyon */}
                      <td className="px-4 py-3">
                        {!isResolved ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); resolve(issue.id); }}
                            disabled={isPending}
                            className="px-2.5 py-1 rounded text-xs font-ui border border-emerald/30 text-emerald hover:bg-emerald/10 disabled:opacity-40 whitespace-nowrap transition-colors"
                          >
                            ✓ Çözüldü
                          </button>
                        ) : (
                          <span className="text-xs text-muted font-ui">Çözüldü</span>
                        )}
                      </td>
                    </tr>,

                    // Expand panel: detay + nasıl düzeltilir
                    isExpanded && (
                      <tr key={`${issue.id}-exp`} className="bg-elevated/20 border-b border-border/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Teknik detay */}
                            <div>
                              <p className="text-xs font-ui font-semibold text-text mb-2">Teknik Detay</p>
                              <div className="space-y-1">
                                {issue.details && Object.entries(issue.details)
                                  .filter(([k]) => k !== "url")
                                  .map(([k, v]) => (
                                    <div key={k} className="flex gap-2 text-xs font-mono">
                                      <span className="text-border min-w-[100px] flex-shrink-0">{k}:</span>
                                      <span className="text-muted break-all">
                                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                      </span>
                                    </div>
                                  ))}
                                <div className="flex gap-2 text-xs font-mono mt-1">
                                  <span className="text-border min-w-[100px] flex-shrink-0">url:</span>
                                  <a href={issue.pageUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-tech-blue hover:underline break-all">
                                    {issue.pageUrl}
                                  </a>
                                </div>
                              </div>
                            </div>

                            {/* Nasıl düzeltilir */}
                            {fixGuide && (
                              <div className="bg-surface border border-border rounded-lg p-3">
                                <p className="text-xs font-ui font-semibold text-emerald mb-1.5">
                                  💡 Nasıl Düzeltilir?
                                </p>
                                <p className="text-xs text-muted font-ui leading-relaxed">{fixGuide}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  ].filter(Boolean);
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted font-ui">
              {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1 rounded text-xs font-ui border border-border text-muted hover:text-text disabled:opacity-30 transition-colors"
              >
                ←
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = safePage <= 3 ? i + 1 : safePage - 2 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded text-xs font-ui border transition-colors ${
                      pg === safePage
                        ? "bg-tech-blue text-white border-tech-blue"
                        : "border-border text-muted hover:text-text"
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-2.5 py-1 rounded text-xs font-ui border border-border text-muted hover:text-text disabled:opacity-30 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
