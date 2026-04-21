"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  credits: number;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<User[]>([]);
  const [pagination, setPag]    = useState<Pagination | null>(null);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);

  // Credit modal
  const [creditModal, setCreditModal] = useState<{ userId: string; email: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc]   = useState("");
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditMsg, setCreditMsg]     = useState("");

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => { setUsers(d.users ?? []); setPag(d.pagination ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAddCredits() {
    if (!creditModal) return;
    const amount = Number(creditAmount);
    if (!amount || isNaN(amount)) { setCreditMsg("Geçerli bir sayı girin."); return; }
    setCreditLoading(true);
    setCreditMsg("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: creditModal.userId, amount, description: creditDesc || undefined }),
    });
    const data = await res.json();
    setCreditLoading(false);
    if (res.ok) {
      setCreditMsg(`Başarılı! Yeni bakiye: ${data.newBalance}`);
      fetchUsers();
      setTimeout(() => { setCreditModal(null); setCreditAmount(""); setCreditDesc(""); setCreditMsg(""); }, 1500);
    } else {
      setCreditMsg(data.error ?? "Hata oluştu.");
    }
  }

  async function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (!confirm(`Bu kullanıcıyı ${newRole} yapmak istediğinize emin misiniz?`)) return;
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    fetchUsers();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
          Kullanıcı Yönetimi
        </h1>
        {pagination && (
          <span className="text-sm" style={{ color: "#64748B" }}>
            Toplam {pagination.total} kullanıcı
          </span>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="E-posta veya isim ara..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="w-full px-4 py-2 rounded-lg text-sm outline-none border"
        style={{
          backgroundColor: "#0D1526",
          borderColor: "#1E3A5F",
          color: "#F1F5F9",
        }}
      />

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "#1E3A5F" }}>
              {["E-posta", "İsim", "Rol", "Kredi", "Kayıt", "İşlemler"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-xs" style={{ color: "#64748B" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#1E3A5F" }}>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: "#64748B" }}>Yükleniyor...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: "#64748B" }}>Kullanıcı bulunamadı.</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#CBD5E1" }}>{u.email}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#94A3B8" }}>{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        color: u.role === "admin" ? "#FF4444" : "#64748B",
                        backgroundColor: u.role === "admin" ? "rgba(255,68,68,0.1)" : "rgba(100,116,139,0.1)",
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#00FF87" }}>
                    {u.credits.toLocaleString("tr")}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#475569" }}>
                    {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
                        style={{ borderColor: "#1E3A5F", color: "#94A3B8" }}
                      >
                        Detay
                      </Link>
                      <button
                        onClick={() => setCreditModal({ userId: u.id, email: u.email })}
                        className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
                        style={{ borderColor: "#1E3A5F", color: "#00FF87" }}
                      >
                        Kredi
                      </button>
                      <button
                        onClick={() => toggleRole(u.id, u.role)}
                        className="text-xs px-2 py-1 rounded border transition-colors hover:opacity-80"
                        style={{ borderColor: "#1E3A5F", color: "#FF4444" }}
                      >
                        Rol
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
          <span className="text-xs" style={{ color: "#64748B" }}>
            {page} / {pagination.pages}
          </span>
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

      {/* Credit modal */}
      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="w-full max-w-sm rounded-xl border p-6 space-y-4"
            style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}
          >
            <p className="font-semibold" style={{ color: "#F1F5F9" }}>Kredi Ekle / Çıkar</p>
            <p className="text-xs" style={{ color: "#64748B" }}>{creditModal.email}</p>

            <input
              type="number"
              placeholder="Miktar (+ ekle, - çıkar)"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: "#1A2744", borderColor: "#1E3A5F", color: "#F1F5F9" }}
            />
            <input
              type="text"
              placeholder="Açıklama (opsiyonel)"
              value={creditDesc}
              onChange={(e) => setCreditDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: "#1A2744", borderColor: "#1E3A5F", color: "#F1F5F9" }}
            />

            {creditMsg && (
              <p className="text-xs" style={{ color: creditMsg.startsWith("Başarılı") ? "#00FF87" : "#FF4444" }}>
                {creditMsg}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleAddCredits}
                disabled={creditLoading}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#00FF87", color: "#0A0F1E" }}
              >
                {creditLoading ? "..." : "Uygula"}
              </button>
              <button
                onClick={() => { setCreditModal(null); setCreditAmount(""); setCreditDesc(""); setCreditMsg(""); }}
                className="flex-1 py-2 rounded-lg text-sm border transition-colors hover:opacity-80"
                style={{ borderColor: "#1E3A5F", color: "#94A3B8" }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
