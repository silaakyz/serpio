"use client";

import { useEffect, useState } from "react";

interface Stats {
  users:   { total: number; newThisWeek: number };
  jobs:    { total: number; completed: number; failed: number; active: number; successRate: number };
  credits: { consumedThisMonth: number; purchasedThisMonth: number };
  recentJobs: Array<{ id: string; type: string; status: string; createdAt: string }>;
}

const STATUS_COLOR: Record<string, string> = {
  completed: "#00FF87",
  failed:    "#FF4444",
  active:    "#38BDF8",
  pending:   "#64748B",
  retrying:  "#F59E0B",
};

export default function AdminOverviewPage() {
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <p style={{ color: "#64748B" }}>Yükleniyor...</p>
      </div>
    );
  }

  if (!stats) {
    return <p style={{ color: "#FF4444" }}>İstatistikler yüklenemedi.</p>;
  }

  const topCards = [
    {
      label: "Toplam Kullanıcı",
      value: stats.users.total.toLocaleString("tr"),
      sub:   `+${stats.users.newThisWeek} bu hafta`,
      color: "#38BDF8",
    },
    {
      label: "Bu Hafta Yeni",
      value: stats.users.newThisWeek.toLocaleString("tr"),
      sub:   "kayıt",
      color: "#00FF87",
    },
    {
      label: "Toplam Job",
      value: stats.jobs.total.toLocaleString("tr"),
      sub:   `${stats.jobs.active} aktif`,
      color: "#A78BFA",
    },
    {
      label: "Başarı Oranı",
      value: `%${stats.jobs.successRate}`,
      sub:   `${stats.jobs.failed} başarısız`,
      color: stats.jobs.successRate >= 80 ? "#00FF87" : stats.jobs.successRate >= 50 ? "#F59E0B" : "#FF4444",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
        Genel Bakış
      </h1>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {topCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-5 border"
            style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}
          >
            <p className="text-xs mb-1" style={{ color: "#64748B" }}>{card.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: card.color }}>{card.value}</p>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Credit summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
          <p className="text-xs mb-1" style={{ color: "#64748B" }}>Bu Ay Harcanan Kredi</p>
          <p className="text-2xl font-bold font-mono" style={{ color: "#F59E0B" }}>
            {stats.credits.consumedThisMonth.toLocaleString("tr")}
          </p>
        </div>
        <div className="rounded-xl p-5 border" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
          <p className="text-xs mb-1" style={{ color: "#64748B" }}>Bu Ay Satın Alınan Kredi</p>
          <p className="text-2xl font-bold font-mono" style={{ color: "#00FF87" }}>
            {stats.credits.purchasedThisMonth.toLocaleString("tr")}
          </p>
        </div>
      </div>

      {/* Recent jobs */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: "#1E3A5F" }}>
          <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>Son Joblar</p>
        </div>
        <div className="divide-y" style={{ borderColor: "#1E3A5F" }}>
          {stats.recentJobs.length === 0 ? (
            <p className="px-5 py-4 text-sm" style={{ color: "#64748B" }}>Henüz job yok.</p>
          ) : (
            stats.recentJobs.map((job) => (
              <div key={job.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[job.status] ?? "#64748B" }}
                  />
                  <span className="text-sm font-mono" style={{ color: "#CBD5E1" }}>{job.type}</span>
                  <span className="text-xs font-mono" style={{ color: "#475569" }}>{job.id.slice(-8)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      color: STATUS_COLOR[job.status] ?? "#64748B",
                      backgroundColor: `${STATUS_COLOR[job.status] ?? "#64748B"}15`,
                    }}
                  >
                    {job.status}
                  </span>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {new Date(job.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
