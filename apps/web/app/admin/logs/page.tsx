"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface LogRow {
  id: string;
  level: string;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  jobId: string;
  jobType: string | null;
  jobStatus: string | null;
  projectName: string | null;
  userEmail: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const LEVEL_COLOR: Record<string, string> = {
  success: "#00FF87",
  info:    "#38BDF8",
  warning: "#F59E0B",
  error:   "#FF4444",
  debug:   "#64748B",
};

export default function AdminLogsPage() {
  const [logs, setLogs]         = useState<LogRow[]>([]);
  const [pagination, setPag]    = useState<Pagination | null>(null);
  const [levelFilter, setLevel] = useState("");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "50" });
    if (levelFilter) p.set("level", levelFilter);
    fetch(`/api/admin/logs?${p}`)
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs ?? []); setPag(d.pagination ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, levelFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
          Platform Logları
        </h1>
        <button
          onClick={fetchLogs}
          className="text-xs px-3 py-1.5 rounded border transition-colors hover:opacity-80"
          style={{ borderColor: "#1E3A5F", color: "#64748B" }}
        >
          Yenile
        </button>
      </div>

      {/* Level filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {["", "error", "warning", "success", "info", "debug"].map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setPage(1); }}
            className="px-3 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: levelFilter === l ? "#1E3A5F" : "transparent",
              color: levelFilter === l ? "#F1F5F9" : (LEVEL_COLOR[l] ?? "#64748B"),
              border: `1px solid ${levelFilter === l ? "#1E3A5F" : "#1E2D4A"}`,
            }}
          >
            {l || "Tümü"}
          </button>
        ))}
        {pagination && (
          <span className="ml-auto text-xs" style={{ color: "#64748B" }}>{pagination.total} log</span>
        )}
      </div>

      {/* Log list */}
      <div
        className="rounded-xl border overflow-hidden font-mono text-xs"
        style={{ backgroundColor: "#060C1A", borderColor: "#1E3A5F" }}
      >
        {loading ? (
          <p className="px-4 py-6 text-center" style={{ color: "#64748B" }}>Yükleniyor...</p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-6 text-center" style={{ color: "#64748B" }}>Log bulunamadı.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "#0D1526" }}>
            {logs.map((log) => (
              <div key={log.id}>
                <div
                  className="flex items-start gap-3 px-4 py-2 cursor-pointer hover:bg-white/[0.02]"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <span style={{ color: "#334155", flexShrink: 0 }}>
                    {new Date(log.createdAt).toLocaleTimeString("tr-TR")}
                  </span>
                  <span
                    style={{
                      color: LEVEL_COLOR[log.level] ?? "#64748B",
                      flexShrink: 0,
                      width: "4rem",
                    }}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span style={{ color: "#CBD5E1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {log.message}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {log.userEmail && (
                      <span style={{ color: "#334155" }}>{log.userEmail.split("@")[0]}</span>
                    )}
                    {log.jobId && (
                      <Link
                        href={`/admin/jobs/${log.jobId}`}
                        className="hover:underline"
                        style={{ color: "#475569" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {log.jobType ?? log.jobId.slice(-6)}
                      </Link>
                    )}
                  </div>
                </div>
                {expanded === log.id && log.meta && (
                  <div className="px-4 py-2 border-t" style={{ borderColor: "#0D1526", backgroundColor: "#0A0F1E" }}>
                    <pre className="text-xs" style={{ color: "#475569" }}>
                      {JSON.stringify(log.meta, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs px-3 py-1.5 rounded border disabled:opacity-30"
            style={{ borderColor: "#1E3A5F", color: "#94A3B8" }}
          >
            ← Önceki
          </button>
          <span className="text-xs" style={{ color: "#64748B" }}>{page} / {pagination.pages}</span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs px-3 py-1.5 rounded border disabled:opacity-30"
            style={{ borderColor: "#1E3A5F", color: "#94A3B8" }}
          >
            Sonraki →
          </button>
        </div>
      )}
    </div>
  );
}
