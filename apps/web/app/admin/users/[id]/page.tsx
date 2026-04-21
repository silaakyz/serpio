"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  role: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string | null;
  createdAt: string;
}

interface JobRow {
  id: string;
  type: string;
  status: string;
  creditCost: number;
  createdAt: string;
  completedAt: string | null;
}

const TX_COLOR: Record<string, string> = {
  purchase:    "#00FF87",
  bonus:       "#38BDF8",
  refund:      "#A78BFA",
  consumption: "#FF4444",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "#00FF87",
  failed:    "#FF4444",
  active:    "#38BDF8",
  pending:   "#64748B",
  retrying:  "#F59E0B",
};

export default function AdminUserDetailPage() {
  const { id } = useParams() as { id: string };
  const [data, setData]     = useState<{ user: UserDetail; recentJobs: JobRow[]; recentTransactions: Transaction[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ color: "#64748B" }}>Yükleniyor...</p>;
  if (!data) return <p style={{ color: "#FF4444" }}>Kullanıcı bulunamadı.</p>;

  const { user, recentJobs, recentTransactions } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm" style={{ color: "#64748B" }}>
          ← Kullanıcılar
        </Link>
        <span style={{ color: "#1E3A5F" }}>/</span>
        <p className="text-sm font-mono" style={{ color: "#94A3B8" }}>{user.email}</p>
      </div>

      {/* User card */}
      <div className="rounded-xl border p-6 space-y-4" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold" style={{ color: "#F1F5F9" }}>{user.name ?? "İsimsiz"}</p>
            <p className="text-sm font-mono mt-0.5" style={{ color: "#64748B" }}>{user.email}</p>
          </div>
          <span
            className="px-3 py-1 rounded text-xs font-mono"
            style={{
              color: user.role === "admin" ? "#FF4444" : "#64748B",
              backgroundColor: user.role === "admin" ? "rgba(255,68,68,0.1)" : "rgba(100,116,139,0.1)",
            }}
          >
            {user.role}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs" style={{ color: "#64748B" }}>Kredi</p>
            <p className="text-xl font-bold font-mono" style={{ color: "#00FF87" }}>
              {user.credits.toLocaleString("tr")}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#64748B" }}>ID</p>
            <p className="text-xs font-mono mt-1" style={{ color: "#475569" }}>{user.id}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#64748B" }}>Kayıt Tarihi</p>
            <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
              {new Date(user.createdAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "#64748B" }}>Güncellendi</p>
            <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
              {new Date(user.updatedAt).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent transactions */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#1E3A5F" }}>
            <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>Son İşlemler</p>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: "#1E3A5F" }}>
            {recentTransactions.length === 0 ? (
              <p className="px-4 py-4 text-xs" style={{ color: "#64748B" }}>İşlem yok.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-mono"
                      style={{
                        color: TX_COLOR[tx.type] ?? "#64748B",
                        backgroundColor: `${TX_COLOR[tx.type] ?? "#64748B"}15`,
                      }}
                    >
                      {tx.type}
                    </span>
                    {tx.description && (
                      <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{tx.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className="text-xs font-mono"
                      style={{ color: tx.amount > 0 ? "#00FF87" : "#FF4444" }}
                    >
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </p>
                    <p className="text-xs" style={{ color: "#475569" }}>
                      {new Date(tx.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent jobs */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#1E3A5F" }}>
            <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>Son Joblar</p>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: "#1E3A5F" }}>
            {recentJobs.length === 0 ? (
              <p className="px-4 py-4 text-xs" style={{ color: "#64748B" }}>Job yok.</p>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: STATUS_COLOR[job.status] ?? "#64748B" }}
                    />
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="text-xs font-mono hover:underline"
                      style={{ color: "#CBD5E1" }}
                    >
                      {job.type}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono" style={{ color: "#F59E0B" }}>{job.creditCost}kr</span>
                    <span className="text-xs" style={{ color: "#475569" }}>
                      {new Date(job.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
