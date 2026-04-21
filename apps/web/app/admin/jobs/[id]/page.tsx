"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface JobDetail {
  id: string;
  type: string;
  status: string;
  creditCost: number;
  progress: number;
  error: string | null;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  bullmqJobId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  projectId: string;
  projectName: string | null;
  userEmail: string | null;
}

interface LogEntry {
  id: string;
  level: string;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

const LEVEL_COLOR: Record<string, string> = {
  success: "#00FF87",
  info:    "#38BDF8",
  warning: "#F59E0B",
  error:   "#FF4444",
  debug:   "#64748B",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "#00FF87",
  failed:    "#FF4444",
  active:    "#38BDF8",
  pending:   "#64748B",
  retrying:  "#F59E0B",
};

export default function AdminJobDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData]     = useState<{ job: JobDetail; logs: LogEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: "#64748B" }}>Yükleniyor...</p>;
  if (!data) return <p style={{ color: "#FF4444" }}>Job bulunamadı.</p>;

  const { job, logs } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/jobs" className="text-sm" style={{ color: "#64748B" }}>← Joblar</Link>
        <span style={{ color: "#1E3A5F" }}>/</span>
        <p className="text-sm font-mono" style={{ color: "#94A3B8" }}>{job.id.slice(-12)}</p>
      </div>

      {/* Job meta */}
      <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <div className="flex items-center justify-between">
          <p className="font-mono text-lg font-semibold" style={{ color: "#F1F5F9" }}>{job.type}</p>
          <span
            className="px-3 py-1 rounded text-xs font-mono"
            style={{
              color: STATUS_COLOR[job.status] ?? "#64748B",
              backgroundColor: `${STATUS_COLOR[job.status] ?? "#64748B"}15`,
            }}
          >
            {job.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <p style={{ color: "#64748B" }}>Proje</p>
            <p className="mt-0.5" style={{ color: "#94A3B8" }}>{job.projectName ?? job.projectId.slice(-8)}</p>
          </div>
          <div>
            <p style={{ color: "#64748B" }}>Kullanıcı</p>
            <p className="mt-0.5 font-mono" style={{ color: "#94A3B8" }}>{job.userEmail ?? "—"}</p>
          </div>
          <div>
            <p style={{ color: "#64748B" }}>Kredi Maliyeti</p>
            <p className="mt-0.5 font-mono" style={{ color: "#F59E0B" }}>{job.creditCost}</p>
          </div>
          <div>
            <p style={{ color: "#64748B" }}>BullMQ ID</p>
            <p className="mt-0.5 font-mono" style={{ color: "#475569" }}>{job.bullmqJobId ?? "—"}</p>
          </div>
          <div>
            <p style={{ color: "#64748B" }}>Oluşturuldu</p>
            <p className="mt-0.5" style={{ color: "#94A3B8" }}>{new Date(job.createdAt).toLocaleString("tr-TR")}</p>
          </div>
          <div>
            <p style={{ color: "#64748B" }}>Başladı</p>
            <p className="mt-0.5" style={{ color: "#94A3B8" }}>
              {job.startedAt ? new Date(job.startedAt).toLocaleString("tr-TR") : "—"}
            </p>
          </div>
          <div>
            <p style={{ color: "#64748B" }}>Tamamlandı</p>
            <p className="mt-0.5" style={{ color: "#94A3B8" }}>
              {job.completedAt ? new Date(job.completedAt).toLocaleString("tr-TR") : "—"}
            </p>
          </div>
          {job.progress > 0 && (
            <div>
              <p style={{ color: "#64748B" }}>İlerleme</p>
              <p className="mt-0.5 font-mono" style={{ color: "#38BDF8" }}>%{job.progress}</p>
            </div>
          )}
        </div>

        {job.error && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.2)" }}>
            <p className="text-xs font-mono" style={{ color: "#FF4444" }}>{job.error}</p>
          </div>
        )}
      </div>

      {/* Logs terminal */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1E3A5F" }}>
          <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>Loglar</p>
          <span className="text-xs" style={{ color: "#64748B" }}>{logs.length} kayıt</span>
        </div>
        <div
          className="p-4 font-mono text-xs space-y-1 max-h-96 overflow-y-auto"
          style={{ backgroundColor: "#060C1A" }}
        >
          {logs.length === 0 ? (
            <p style={{ color: "#334155" }}>Log yok.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <span style={{ color: "#334155", flexShrink: 0 }}>
                  {new Date(log.createdAt).toLocaleTimeString("tr-TR")}
                </span>
                <span
                  style={{ color: LEVEL_COLOR[log.level] ?? "#64748B", flexShrink: 0, width: "3rem" }}
                >
                  [{log.level.toUpperCase().slice(0, 4)}]
                </span>
                <span style={{ color: "#CBD5E1" }}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Payload / Result JSON */}
      {(job.payload || job.result) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {job.payload && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#1E3A5F" }}>
                <p className="text-xs font-medium" style={{ color: "#64748B" }}>Payload</p>
              </div>
              <pre
                className="p-4 text-xs overflow-auto max-h-48"
                style={{ color: "#94A3B8", fontFamily: "var(--font-geist-mono)" }}
              >
                {JSON.stringify(job.payload, null, 2)}
              </pre>
            </div>
          )}
          {job.result && (
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#1E3A5F" }}>
                <p className="text-xs font-medium" style={{ color: "#64748B" }}>Sonuç</p>
              </div>
              <pre
                className="p-4 text-xs overflow-auto max-h-48"
                style={{ color: "#94A3B8", fontFamily: "var(--font-geist-mono)" }}
              >
                {JSON.stringify(job.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
