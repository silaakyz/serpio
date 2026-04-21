"use client";

import { useEffect, useState } from "react";

interface ServiceStatus {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

interface WorkerStatus {
  ok: boolean;
  queues: Record<string, number>;
  error?: string;
}

interface SystemData {
  postgres: ServiceStatus;
  redis: ServiceStatus;
  worker: WorkerStatus;
  uptime: number;
  nodeVersion: string;
  env: string;
  timestamp: string;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
      style={{
        color:           ok ? "#00FF87" : "#FF4444",
        backgroundColor: ok ? "rgba(0,255,135,0.1)" : "rgba(255,68,68,0.1)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: ok ? "#00FF87" : "#FF4444" }}
      />
      {ok ? "Çevrimiçi" : "Hata"}
    </span>
  );
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}s ${m}d ${s}sn`;
}

export default function AdminSystemPage() {
  const [data, setData]       = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  function fetchData() {
    setLoading(true);
    fetch("/api/admin/system")
      .then((r) => r.json())
      .then((d) => { setData(d); setLastRefresh(new Date()); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
          Sistem Durumu
        </h1>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs" style={{ color: "#475569" }}>
              Son: {lastRefresh.toLocaleTimeString("tr-TR")}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded border transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ borderColor: "#1E3A5F", color: "#64748B" }}
          >
            {loading ? "Kontrol ediliyor..." : "Yenile"}
          </button>
        </div>
      </div>

      {loading && !data && (
        <p style={{ color: "#64748B" }}>Sistem kontrol ediliyor...</p>
      )}

      {data && (
        <>
          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PostgreSQL */}
            <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>PostgreSQL</p>
                <StatusBadge ok={data.postgres.ok} />
              </div>
              {data.postgres.latencyMs !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#64748B" }}>Gecikme:</span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: data.postgres.latencyMs < 50 ? "#00FF87" : data.postgres.latencyMs < 200 ? "#F59E0B" : "#FF4444" }}
                  >
                    {data.postgres.latencyMs}ms
                  </span>
                </div>
              )}
              {data.postgres.error && (
                <p className="text-xs font-mono" style={{ color: "#FF4444" }}>
                  {data.postgres.error.slice(0, 100)}
                </p>
              )}
            </div>

            {/* Redis */}
            <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Redis</p>
                <StatusBadge ok={data.redis.ok} />
              </div>
              {data.redis.latencyMs !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "#64748B" }}>Gecikme:</span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: data.redis.latencyMs < 5 ? "#00FF87" : data.redis.latencyMs < 50 ? "#F59E0B" : "#FF4444" }}
                  >
                    {data.redis.latencyMs}ms
                  </span>
                </div>
              )}
              {data.redis.error && (
                <p className="text-xs font-mono" style={{ color: "#FF4444" }}>
                  {data.redis.error.slice(0, 100)}
                </p>
              )}
              {!data.redis.error && (
                <p className="text-xs" style={{ color: "#475569" }}>
                  {process.env.NEXT_PUBLIC_REDIS_URL ?? "redis://127.0.0.1:6380"}
                </p>
              )}
            </div>

            {/* Worker / BullMQ */}
            <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "#F1F5F9" }}>Worker Kuyrukları</p>
                <StatusBadge ok={data.worker.ok} />
              </div>
              {data.worker.ok && Object.entries(data.worker.queues).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: "#64748B" }}>{name}</span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: count > 0 ? "#F59E0B" : "#475569" }}
                  >
                    {count} bekliyor
                  </span>
                </div>
              ))}
              {data.worker.error && (
                <p className="text-xs font-mono" style={{ color: "#FF4444" }}>
                  {data.worker.error.slice(0, 100)}
                </p>
              )}
            </div>
          </div>

          {/* Runtime info */}
          <div className="rounded-xl border p-5 space-y-3" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
            <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>Runtime Bilgileri</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p style={{ color: "#64748B" }}>Node.js</p>
                <p className="mt-0.5 font-mono" style={{ color: "#94A3B8" }}>{data.nodeVersion}</p>
              </div>
              <div>
                <p style={{ color: "#64748B" }}>Ortam</p>
                <p className="mt-0.5 font-mono" style={{ color: data.env === "production" ? "#00FF87" : "#F59E0B" }}>
                  {data.env}
                </p>
              </div>
              <div>
                <p style={{ color: "#64748B" }}>Uptime</p>
                <p className="mt-0.5 font-mono" style={{ color: "#94A3B8" }}>{formatUptime(data.uptime)}</p>
              </div>
              <div>
                <p style={{ color: "#64748B" }}>Son Kontrol</p>
                <p className="mt-0.5 font-mono" style={{ color: "#94A3B8" }}>
                  {new Date(data.timestamp).toLocaleTimeString("tr-TR")}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
