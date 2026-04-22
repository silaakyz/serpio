"use client";

import { useState, useTransition } from "react";

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

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-400/10 text-red-400 border-red-400/20",
  warning:  "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  info:     "bg-tech-blue/10 text-tech-blue border-tech-blue/20",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Kritik",
  warning:  "Uyarı",
  info:     "Bilgi",
};

type FilterSeverity = "all" | Severity;

export function AuditTable({ issues, issueLabels }: Props) {
  const [filter, setFilter] = useState<FilterSeverity>("all");
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = issues.filter((i) => {
    if (resolvedIds.has(i.id)) return false;
    if (filter === "all") return true;
    return i.severity === filter;
  });

  async function resolve(id: string) {
    startTransition(async () => {
      try {
        await fetch(`/api/audit/${id}/resolve`, { method: "POST" });
        setResolvedIds((prev) => new Set([...prev, id]));
      } catch { /* ignore */ }
    });
  }

  const counts = {
    all:      issues.filter((i) => !resolvedIds.has(i.id)).length,
    critical: issues.filter((i) => !resolvedIds.has(i.id) && i.severity === "critical").length,
    warning:  issues.filter((i) => !resolvedIds.has(i.id) && i.severity === "warning").length,
    info:     issues.filter((i) => !resolvedIds.has(i.id) && i.severity === "info").length,
  };

  function shortUrl(url: string) {
    try { return new URL(url).pathname || "/"; } catch { return url; }
  }

  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  }

  return (
    <div className="space-y-4">
      {/* Filtre bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "critical", "warning", "info"] as (FilterSeverity)[]).map((f) => {
          const label = f === "all" ? "Tümü" : SEVERITY_LABELS[f];
          const count = counts[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-ui font-medium border transition-colors ${
                filter === f
                  ? "bg-tech-blue text-white border-tech-blue"
                  : "bg-surface text-muted border-border hover:text-text hover:border-border/80"
              }`}
            >
              {label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Tablo */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-ui">
            <thead>
              <tr className="border-b border-border bg-elevated/50">
                {["Sorun", "Önem", "Sayfa", "Makale", "Tespit", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted text-sm">
                    Bu filtrede sorun bulunamadı.
                  </td>
                </tr>
              ) : (
                visible.map((issue) => (
                  <>
                    <tr
                      key={issue.id}
                      className="border-b border-border/50 hover:bg-elevated/40 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                    >
                      <td className="px-4 py-3 max-w-[200px]">
                        <span className="text-text font-medium truncate block">
                          {issueLabels[issue.issueType] ?? issue.issueType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${SEVERITY_STYLES[issue.severity]}`}>
                          {SEVERITY_LABELS[issue.severity]}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-muted text-xs truncate block" title={issue.pageUrl}>
                          {shortUrl(issue.pageUrl)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {issue.article ? (
                          <a
                            href={`/dashboard/articles/${issue.article.id}/editor`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-tech-blue hover:underline text-xs truncate block"
                            title={issue.article.title}
                          >
                            {issue.article.title}
                          </a>
                        ) : (
                          <span className="text-border text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                        {fmtDate(issue.detectedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); resolve(issue.id); }}
                          disabled={isPending}
                          className="px-2.5 py-1 rounded text-xs font-ui border border-emerald/30 text-emerald hover:bg-emerald/10 transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          Çözüldü
                        </button>
                      </td>
                    </tr>
                    {expandedId === issue.id && (
                      <tr key={`${issue.id}-detail`} className="bg-elevated/30">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="text-xs text-muted font-mono space-y-1">
                            <p className="text-text font-ui font-medium mb-2">Detaylar</p>
                            {issue.details && Object.entries(issue.details).map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <span className="text-border min-w-[120px]">{k}:</span>
                                <span className="text-text break-all">
                                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                </span>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-1">
                              <span className="text-border min-w-[120px]">URL:</span>
                              <a
                                href={issue.pageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-tech-blue hover:underline break-all"
                              >
                                {issue.pageUrl}
                              </a>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
