"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface JobRow {
  id: string;
  type: string;
  status: string;
  creditCost: number;
  progress: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  projectId: string;
  projectName: string | null;
  userEmail: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const STATUS_COLOR: Record<string, string> = {
  completed: "#00FF87",
  failed:    "#FF4444",
  active:    "#38BDF8",
  pending:   "#64748B",
  retrying:  "#F59E0B",
};

export default function AdminJobsPage() {
  const [jobs, setJobs]         = useState<JobRow[]>([]);
  const [pagination, setPag]    = useState<Pagination | null>(null);
  const [statusFilter, setStatus] = useState("");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);

  const fetchJobs = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "30" });
    if (statusFilter) p.set("status", statusFilter);
    fetch(`/api/admin/jobs?${p}`)
      .then((r) => r.json())
      .then((d) => { setJobs(d.jobs ?? []); setPag(d.pagination ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
          Job Yönetimi
        </h1>
        <button
          onClick={fetchJobs}
          className="text-xs px-3 py-1.5 rounded border transition-colors hover:opacity-80"
          style={{ borderColor: "#1E3A5F", color: "#64748B" }}
        >
          Yenile
        </button>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {["", "active", "pending", "completed", "failed", "retrying"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className="px-3 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: statusFilter === s ? "#1E3A5F" : "transparent",
              color: statusFilter === s ? "#F1F5F9" : "#64748B",
              border: "1px solid #1E3A5F",
            }}
          >
            {s || "Tümü"}
          </button>
        ))}
        {pagination && (
          <span className="ml-auto text-xs" style={{ color: "#64748B" }}>{pagination.total} job</span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "#1E3A5F" }}>
              {["ID", "Tür", "Durum", "Proje", "Kullanıcı", "Kredi", "Tarih", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-xs whitespace-nowrap" style={{ color: "#64748B" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#1E3A5F" }}>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: "#64748B" }}>Yükleniyor...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: "#64748B" }}>Job bulunamadı.</td></tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#475569" }}>
                    {job.id.slice(-10)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#CBD5E1" }}>
                    {job.type}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLOR[job.status] ?? "#64748B" }}
                      />
                      <span
                        className="text-xs font-mono"
                        style={{ color: STATUS_COLOR[job.status] ?? "#64748B" }}
                      >
                        {job.status}
                      </span>
                    </div>
                    {job.status === "active" && job.progress > 0 && (
                      <div className="mt-1 w-16 h-0.5 rounded-full" style={{ backgroundColor: "#1E3A5F" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${job.progress}%`, backgroundColor: "#38BDF8" }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#94A3B8" }}>
                    {job.projectName ?? job.projectId.slice(-8)}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "#64748B" }}>
                    {job.userEmail ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#F59E0B" }}>
                    {job.creditCost}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#475569" }}>
                    {new Date(job.createdAt).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
                      style={{ borderColor: "#1E3A5F", color: "#94A3B8" }}
                    >
                      Detay
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
