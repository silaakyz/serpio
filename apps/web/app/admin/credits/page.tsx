"use client";

import { useEffect, useState } from "react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string | null;
  createdAt: string;
  userId: string;
  userEmail?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const TX_COLOR: Record<string, string> = {
  purchase:    "#00FF87",
  bonus:       "#38BDF8",
  refund:      "#A78BFA",
  consumption: "#FF4444",
};

// Reuse the credits API (platform-wide) — extend with a /api/admin/credits endpoint
export default function AdminCreditsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPag]   = useState<Pagination | null>(null);
  const [page, setPage]        = useState(1);
  const [type, setType]        = useState("");
  const [loading, setLoading]  = useState(true);

  // Quick credit add form
  const [email, setEmail]      = useState("");
  const [amount, setAmount]    = useState("");
  const [desc, setDesc]        = useState("");
  const [formMsg, setFormMsg]  = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), limit: "30" });
    if (type) p.set("type", type);
    fetch(`/api/admin/credits?${p}`)
      .then((r) => r.json())
      .then((d) => { setTransactions(d.transactions ?? []); setPag(d.pagination ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, type]);

  async function handleQuickCredit(e: React.FormEvent) {
    e.preventDefault();
    setFormMsg("");
    const amt = Number(amount);
    if (!email || !amt) { setFormMsg("E-posta ve miktar zorunlu."); return; }
    setFormLoading(true);

    // Find user by email first
    const searchRes = await fetch(`/api/admin/users?search=${encodeURIComponent(email)}&limit=1`);
    const searchData = await searchRes.json();
    const user = searchData.users?.[0];
    if (!user) { setFormMsg("Kullanıcı bulunamadı."); setFormLoading(false); return; }

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, amount: amt, description: desc || undefined }),
    });
    const data = await res.json();
    setFormLoading(false);
    if (res.ok) {
      setFormMsg(`✓ Başarılı! ${user.email} yeni bakiye: ${data.newBalance}`);
      setEmail(""); setAmount(""); setDesc("");
    } else {
      setFormMsg(data.error ?? "Hata.");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
        Kredi Yönetimi
      </h1>

      {/* Quick credit form */}
      <div className="rounded-xl border p-5 space-y-4" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <p className="text-sm font-medium" style={{ color: "#94A3B8" }}>Manuel Kredi Ekle / Çıkar</p>
        <form onSubmit={handleQuickCredit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Kullanıcı e-postası"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: "#1A2744", borderColor: "#1E3A5F", color: "#F1F5F9" }}
          />
          <input
            type="number"
            placeholder="Miktar (+/-)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-32 px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: "#1A2744", borderColor: "#1E3A5F", color: "#F1F5F9" }}
          />
          <input
            type="text"
            placeholder="Açıklama"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ backgroundColor: "#1A2744", borderColor: "#1E3A5F", color: "#F1F5F9" }}
          />
          <button
            type="submit"
            disabled={formLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#00FF87", color: "#0A0F1E" }}
          >
            {formLoading ? "..." : "Uygula"}
          </button>
        </form>
        {formMsg && (
          <p className="text-xs" style={{ color: formMsg.startsWith("✓") ? "#00FF87" : "#FF4444" }}>
            {formMsg}
          </p>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <p className="text-sm" style={{ color: "#64748B" }}>Filtre:</p>
        {["", "purchase", "consumption", "bonus", "refund"].map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setPage(1); }}
            className="px-3 py-1 rounded text-xs transition-colors"
            style={{
              backgroundColor: type === t ? "#1E3A5F" : "transparent",
              color: type === t ? "#F1F5F9" : "#64748B",
              border: "1px solid #1E3A5F",
            }}
          >
            {t || "Tümü"}
          </button>
        ))}
        {pagination && (
          <span className="ml-auto text-xs" style={{ color: "#64748B" }}>
            {pagination.total} işlem
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "#1E3A5F" }}>
              {["Kullanıcı", "Tür", "Miktar", "Bakiye", "Açıklama", "Tarih"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium text-xs" style={{ color: "#64748B" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: "#1E3A5F" }}>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: "#64748B" }}>Yükleniyor...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: "#64748B" }}>İşlem bulunamadı.</td></tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-xs font-mono" style={{ color: "#64748B" }}>
                    {tx.userId.slice(-8)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono"
                      style={{
                        color: TX_COLOR[tx.type] ?? "#64748B",
                        backgroundColor: `${TX_COLOR[tx.type] ?? "#64748B"}15`,
                      }}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: tx.amount > 0 ? "#00FF87" : "#FF4444" }}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs" style={{ color: "#94A3B8" }}>
                    {tx.balance}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#475569" }}>
                    {tx.description ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: "#475569" }}>
                    {new Date(tx.createdAt).toLocaleString("tr-TR")}
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
