"use client";

import { useState } from "react";

interface Props {
  projectId: string;
  gscSiteUrl?: string | null;
  ga4PropertyId?: string | null;
  gscSites?: { siteUrl?: string | null; permissionLevel?: string | null }[];
  ga4Properties?: { propertyId?: string; displayName?: string | null }[];
}

export function PerformanceConnectCard({
  projectId,
  gscSiteUrl,
  ga4PropertyId,
  gscSites = [],
  ga4Properties = [],
}: Props) {
  const [saving, setSaving] = useState(false);
  const [selectedSite, setSelectedSite] = useState(gscSiteUrl ?? "");
  const [selectedProp, setSelectedProp] = useState(ga4PropertyId ?? "");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ gsc: number; ga: number } | null>(null);

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch(`/api/google/status?projectId=${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gscSiteUrl: selectedSite || null, ga4PropertyId: selectedProp || null }),
      });
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function syncData() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (data.synced) setSyncResult(data.synced);
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!confirm("Google bağlantısını kesmek istediğinize emin misiniz?")) return;
    await fetch(`/api/google/disconnect?projectId=${projectId}`, { method: "DELETE" });
    window.location.reload();
  }

  const bothConfigured = selectedSite && selectedProp;

  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-elevated flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" fill="#4285F4"/>
              <path d="M12 2v10l8.66 5A10 10 0 0012 2z" fill="#34A853"/>
              <path d="M3.34 17A10 10 0 0012 22v-10L3.34 17z" fill="#FBBC05"/>
              <path d="M3.34 7A10 10 0 0012 2v10L3.34 7z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-ui font-semibold text-text">Google Bağlantısı</p>
            <p className="text-xs text-muted font-ui">Search Console & Analytics 4</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-ui font-medium bg-emerald/10 text-emerald border border-emerald/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald"></span>
          Bağlı
        </span>
      </div>

      {/* Site & Property selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted font-ui uppercase tracking-wider mb-1.5">
            Search Console Sitesi
          </label>
          {gscSites.length > 0 ? (
            <select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text font-ui focus:outline-none focus:border-tech-blue"
            >
              <option value="">Seç...</option>
              {gscSites.map((s) => (
                <option key={s.siteUrl ?? ""} value={s.siteUrl ?? ""}>
                  {s.siteUrl}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-muted font-ui">
              {gscSiteUrl ?? "Site bulunamadı"}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs text-muted font-ui uppercase tracking-wider mb-1.5">
            GA4 Property
          </label>
          {ga4Properties.length > 0 ? (
            <select
              value={selectedProp}
              onChange={(e) => setSelectedProp(e.target.value)}
              className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text font-ui focus:outline-none focus:border-tech-blue"
            >
              <option value="">Seç...</option>
              {ga4Properties.map((p) => (
                <option key={p.propertyId ?? ""} value={p.propertyId ?? ""}>
                  {p.displayName ?? p.propertyId}
                </option>
              ))}
            </select>
          ) : (
            <div className="bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-muted font-ui">
              {ga4PropertyId ?? "Property bulunamadı"}
            </div>
          )}
        </div>
      </div>

      {(gscSites.length > 0 || ga4Properties.length > 0) && (
        <button
          onClick={saveSettings}
          disabled={saving}
          className="text-sm font-ui font-medium text-tech-blue hover:underline disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </button>
      )}

      {/* Sync controls */}
      <div className="border-t border-border pt-4 flex items-center justify-between">
        <div>
          {syncResult && (
            <p className="text-xs text-muted font-ui">
              Son senkronizasyon: {syncResult.gsc} GSC + {syncResult.ga} GA4 satır
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={disconnect}
            className="text-xs text-muted font-ui hover:text-red-400 transition-colors"
          >
            Bağlantıyı Kes
          </button>
          <button
            onClick={syncData}
            disabled={syncing || !bothConfigured}
            className="inline-flex items-center gap-2 px-4 py-2 bg-tech-blue text-white rounded-lg text-sm font-ui font-medium hover:bg-tech-blue/90 disabled:opacity-50 transition-colors"
          >
            {syncing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Senkronize ediliyor...
              </>
            ) : (
              "Veriyi Senkronize Et"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
