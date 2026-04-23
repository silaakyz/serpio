"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Competitor {
  id: string;
  name: string;
  websiteUrl: string;
  isActive: boolean;
  lastCrawledAt: string | null;
  totalPages: number | null;
  createdAt: string;
}

interface CompetitorChange {
  id: string;
  competitorId: string;
  changeType: string;
  summary: string | null;
  detectedAt: string;
  competitorName?: string;
}

const CHANGE_TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  new_page:        { icon: "✦",  color: "text-emerald",     label: "Yeni Sayfa" },
  content_updated: { icon: "↻",  color: "text-tech-blue",   label: "İçerik Güncellendi" },
  title_changed:   { icon: "✎",  color: "text-yellow-400",  label: "Başlık Değişti" },
  removed:         { icon: "✕",  color: "text-red-400",     label: "Kaldırıldı" },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
}

export default function CompetitorsPage() {
  const router = useRouter();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [changes, setChanges] = useState<CompetitorChange[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [crawlingId, setCrawlingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Projeyi çek
      const projRes = await fetch("/api/projects");
      if (!projRes.ok) return;
      const projData = await projRes.json() as { projects?: { id: string }[] };
      const pid = projData.projects?.[0]?.id;
      if (!pid) { setLoading(false); return; }
      setProjectId(pid);

      // Rakipleri çek
      const compRes = await fetch(`/api/competitors?projectId=${pid}`);
      if (compRes.ok) {
        const d = await compRes.json() as { competitors: Competitor[] };
        setCompetitors(d.competitors ?? []);
      }

      // Son değişiklikleri çek
      const changesRes = await fetch(`/api/competitors/changes?projectId=${pid}&limit=20`);
      if (changesRes.ok) {
        const d = await changesRes.json() as { changes: CompetitorChange[] };
        setChanges(d.changes ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAdd = async () => {
    if (!projectId || !newName.trim() || !newUrl.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name: newName.trim(), websiteUrl: newUrl.trim() }),
      });
      const data = await res.json() as { competitor?: Competitor; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Rakip eklenemedi");
      setCompetitors((prev) => [...prev, data.competitor!]);
      setShowModal(false);
      setNewName("");
      setNewUrl("");
      toast.success("Rakip eklendi ✓");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu rakibi silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/competitors/${id}`, { method: "DELETE" });
      setCompetitors((prev) => prev.filter((c) => c.id !== id));
      toast.success("Rakip silindi");
    } catch {
      toast.error("Silme başarısız");
    }
  };

  const handleCrawl = async (competitorId: string) => {
    if (!projectId) return;
    setCrawlingId(competitorId);
    const tid = toast.loading("Tarama kuyruğa ekleniyor...");
    try {
      const res = await fetch("/api/jobs/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "crawl_competitor", projectId, competitorId }),
      });
      const data = await res.json() as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Job tetiklenemedi");
      toast.success("Tarama başlatıldı ✓", { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata", { id: tid });
    } finally {
      setCrawlingId(null);
    }
  };

  const handleCrawlAll = async () => {
    if (!projectId) return;
    const tid = toast.loading("Tüm rakipler kuyruğa ekleniyor...");
    try {
      const res = await fetch("/api/jobs/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "crawl_all", projectId }),
      });
      const data = await res.json() as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Job tetiklenemedi");
      toast.success("Tüm rakip taramaları başlatıldı ✓", { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata", { id: tid });
    }
  };

  const thisWeekChanges = changes.filter((c) => {
    const d = new Date(c.detectedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-elevated rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="h-40 bg-surface border border-border rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-ui font-bold text-text">Rakip İzleme</h2>
          <p className="text-sm text-muted font-ui mt-1">Rakip içerik değişikliklerini haftalık takip et</p>
        </div>
        <div className="flex gap-2">
          {competitors.length > 0 && (
            <button
              onClick={handleCrawlAll}
              className="px-4 py-2 rounded-lg border border-tech-blue/40 text-tech-blue text-sm font-ui hover:bg-tech-blue/10 transition-colors"
            >
              Tümünü Tara
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold hover:bg-emerald/90 transition-colors"
          >
            + Rakip Ekle
          </button>
        </div>
      </div>

      {/* Bu hafta değişiklik banner */}
      {thisWeekChanges.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-ui bg-tech-blue/8 border border-tech-blue/30 text-tech-blue">
          <span className="w-2 h-2 rounded-full bg-tech-blue animate-pulse flex-shrink-0" />
          Bu hafta rakiplerinizde <strong className="mx-1">{thisWeekChanges.length}</strong> değişiklik tespit edildi!
        </div>
      )}

      {/* Rakip yoksa */}
      {competitors.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <p className="text-4xl mb-3">🎯</p>
          <h3 className="text-text font-ui font-semibold text-lg">Henüz rakip eklenmedi</h3>
          <p className="text-sm text-muted font-ui mt-2 max-w-sm mx-auto">
            Rakip web sitelerini ekleyerek içerik değişikliklerini otomatik takip edin.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-tech-blue text-white rounded-xl text-sm font-ui font-medium hover:bg-tech-blue/90 transition-colors"
          >
            İlk Rakibi Ekle →
          </button>
        </div>
      )}

      {/* Rakip Kartları */}
      {competitors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((c) => {
            const cChanges = changes.filter((ch) => ch.competitorId === c.id);
            const weekChanges = cChanges.filter((ch) => new Date(ch.detectedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
            const newCount     = weekChanges.filter((ch) => ch.changeType === "new_page").length;
            const updatedCount = weekChanges.filter((ch) => ch.changeType === "content_updated" || ch.changeType === "title_changed").length;
            const removedCount = weekChanges.filter((ch) => ch.changeType === "removed").length;

            return (
              <div key={c.id} className="bg-surface border border-border rounded-xl p-5 space-y-4">
                {/* Başlık */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-display font-bold text-muted">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-ui font-semibold text-text truncate">{c.name}</p>
                      <p className="text-xs text-muted font-ui">{domainOf(c.websiteUrl)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleCrawl(c.id)}
                      disabled={crawlingId === c.id}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-ui text-muted hover:text-text transition-colors disabled:opacity-50"
                    >
                      {crawlingId === c.id ? "..." : "Tara"}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-400/30 text-xs font-ui text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                {/* İstatistikler */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-elevated rounded-lg p-2.5 text-center">
                    <p className="text-lg font-display font-bold text-text">{c.totalPages ?? 0}</p>
                    <p className="text-xs text-muted font-ui">Toplam Sayfa</p>
                  </div>
                  <div className="bg-elevated rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted font-ui mb-0.5">Son Tarama</p>
                    <p className="text-xs font-ui text-text">{c.lastCrawledAt ? fmtDate(c.lastCrawledAt) : "—"}</p>
                  </div>
                  <div className="bg-elevated rounded-lg p-2.5 text-center">
                    <p className="text-lg font-display font-bold text-text">{weekChanges.length}</p>
                    <p className="text-xs text-muted font-ui">Bu Hafta</p>
                  </div>
                </div>

                {/* Bu hafta özeti */}
                {weekChanges.length > 0 && (
                  <div className="flex items-center gap-3 text-xs font-ui">
                    {newCount > 0 && (
                      <span className="text-emerald">{newCount} yeni</span>
                    )}
                    {updatedCount > 0 && (
                      <span className="text-tech-blue">{updatedCount} değişti</span>
                    )}
                    {removedCount > 0 && (
                      <span className="text-red-400">{removedCount} kaldırıldı</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Değişiklik Akışı */}
      {changes.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-ui font-semibold text-text mb-4">Değişiklik Akışı</h3>
          <div className="space-y-3">
            {changes.slice(0, 15).map((change) => {
              const cfg = CHANGE_TYPE_CONFIG[change.changeType] ?? { icon: "•", color: "text-muted", label: change.changeType };
              const comp = competitors.find((c) => c.id === change.competitorId);
              return (
                <div key={change.id} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
                  <span className={`text-sm ${cfg.color} flex-shrink-0 mt-0.5`}>{cfg.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-ui text-text leading-snug">
                      <span className={`text-xs font-semibold ${cfg.color} mr-1`}>[{cfg.label}]</span>
                      {comp && <span className="text-muted mr-1">{comp.name} ·</span>}
                      {change.summary || "Değişiklik tespit edildi"}
                    </p>
                    <p className="text-xs text-muted font-ui mt-0.5">{fmtDate(change.detectedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal — Rakip Ekle */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-elevated border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-text font-ui font-semibold">Rakip Ekle</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-text text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-ui text-muted mb-1.5">Rakip Adı</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Rakip Şirket"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-ui placeholder-muted focus:outline-none focus:border-emerald/50"
                />
              </div>
              <div>
                <label className="block text-xs font-ui text-muted mb-1.5">Web Sitesi URL</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://rakip.com"
                  className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text font-ui placeholder-muted focus:outline-none focus:border-emerald/50"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-ui text-muted hover:text-text transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !newName.trim() || !newUrl.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold hover:bg-emerald/90 transition-colors disabled:opacity-50"
              >
                {adding ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
