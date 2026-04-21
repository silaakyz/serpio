"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// ─── Kredi fiyat tablosu ──────────────────────────────────────────────────────
const CREDIT_COSTS_UI: Record<string, Array<{ label: string; cost: number }>> = {
  "İçerik İşlemleri": [
    { label: "Scraping (100 URL)",               cost: 10 },
    { label: "AI Analiz",                        cost:  5 },
    { label: "AI Yeniden Yazım",                 cost: 15 },
    { label: "Stil Rehberi Oluşturma",           cost: 20 },
  ],
  "GEO / LLMO": [
    { label: "GEO Analiz",                       cost:  2 },
    { label: "GEO Optimizasyon",                 cost:  5 },
    { label: "LLM Görünürlük Raporu",            cost: 10 },
  ],
  "Yayınlama": [
    { label: "API Yayınlama (WP/Shopify/Ghost)", cost:  2 },
    { label: "FTP/SFTP Yayınlama",              cost:  2 },
    { label: "Git (GitHub/GitLab)",              cost:  1 },
    { label: "Webhook",                          cost:  1 },
    { label: "Tarayıcı Otomasyonu",              cost:  5 },
  ],
  "Analiz & Rekabet": [
    { label: "Rakip Tarama",                     cost:  3 },
    { label: "İçerik Boşluğu Analizi",          cost:  5 },
    { label: "Anahtar Kelime Kümeleme",          cost:  2 },
    { label: "Kanibalizasyon Analizi",           cost:  3 },
    { label: "Konu Kümeleme",                    cost:  5 },
    { label: "Backlink Anlık Görüntü",           cost:  5 },
    { label: "Rakip Backlink",                   cost:  3 },
  ],
  "Dönüşüm & Çeviri": [
    { label: "CRO Önerileri",                    cost:  2 },
    { label: "Makale Çevirisi",                  cost:  4 },
    { label: "Programatik Sayfa",                cost:  3 },
  ],
  "Raporlama": [
    { label: "Marka Nabız Raporu",               cost: 10 },
    { label: "Otomatik Rapor",                   cost:  5 },
  ],
};

// ─── Plan & paket tanımları (lib/stripe.ts ile senkron) ───────────────────────
const PLANS = [
  {
    id:      "starter",
    name:    "Starter",
    credits: 500,
    monthly: 4999,
    yearly:  47988,
    features: ["500 kredi/ay","1 proje","AI yeniden yazım + yayınlama","Site audit + GEO optimizasyon","E-posta destek"],
  },
  {
    id:      "pro",
    name:    "Pro",
    credits: 2000,
    monthly: 14999,
    yearly:  143988,
    popular: true,
    features: ["2.000 kredi/ay","5 proje","Starter +","GSC/GA4 entegrasyonu","Rakip izleme + backlink","Programatik SEO + çeviri","Predictive SEO + CRO","API erişimi"],
  },
  {
    id:      "agency",
    name:    "Agency",
    credits: 10000,
    monthly: 39999,
    yearly:  383988,
    features: ["10.000 kredi/ay","Sınırsız proje","Pro +","White-label ajans modu","Müşteri portalı","AI Marka Nabzı","Öncelikli destek"],
  },
] as const;

const CREDIT_PACKS = [
  { credits: 500,   price: 4999,  label: "Başlangıç"    },
  { credits: 2000,  price: 14999, label: "Profesyonel"  },
  { credits: 10000, price: 39999, label: "Ajans"        },
] as const;

// ─── Tipler ───────────────────────────────────────────────────────────────────
type TxType    = "consumption" | "purchase" | "refund" | "bonus";
type FilterType = "all" | TxType;

interface Transaction {
  id: string; type: TxType; amount: number; balance: number;
  description: string | null; createdAt: string;
}
interface Stats {
  monthlySpent: number; monthlyPurchased: number;
  estimatedDays: number | null; dailyAvg: number;
}
interface Pagination { page: number; limit: number; total: number; totalPages: number; }
interface Subscription {
  status: string; currentPeriodEnd: string;
  stripeSubscriptionId: string; stripeCustomerId: string;
}

const PLAN_MAX  = 500;
const TYPE_LABELS: Record<TxType, string> = {
  consumption: "Tüketim", purchase: "Satın Alım", refund: "İade", bonus: "Bonus",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function fmtPrice(kurus: number) {
  return (kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 });
}

// ─── İç bileşen (useSearchParams Suspense gerektirir) ─────────────────────────
function CreditsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const success      = searchParams.get("success") === "1";
  const canceled     = searchParams.get("canceled") === "1";
  const successPlan  = searchParams.get("plan");
  const successPack  = searchParams.get("pack");

  const [credits, setCredits]           = useState<number | null>(null);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination]     = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [filter, setFilter]             = useState<FilterType>("all");
  const [txPage, setTxPage]             = useState(1);
  const [loading, setLoading]           = useState(true);
  const [billing, setBilling]           = useState<"monthly" | "yearly">("monthly");
  const [buyLoading, setBuyLoading]     = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchData = useCallback(async (p = 1, f: FilterType = "all") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "20" });
      if (f !== "all") params.set("type", f);
      const [credRes, subRes, cfgRes] = await Promise.all([
        fetch(`/api/credits?${params}`),
        fetch("/api/stripe/subscription"),
        fetch("/api/stripe/config"),
      ]);
      if (credRes.ok) {
        const d = await credRes.json();
        setCredits(d.credits); setStats(d.stats);
        setTransactions(d.transactions); setPagination(d.pagination);
      }
      if (subRes.ok) {
        const d = await subRes.json();
        setSubscription(d.subscription ?? null);
      }
      if (cfgRes.ok) {
        const d = await cfgRes.json();
        setStripeConfigured(d.configured);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(1, filter); }, [fetchData, filter]);

  // Başarılı ödeme sonrası URL temizle
  useEffect(() => {
    if (success || canceled) {
      const t = setTimeout(() => router.replace("/dashboard/credits"), 6000);
      return () => clearTimeout(t);
    }
  }, [success, canceled, router]);

  async function handleBuyPlan(planId: string) {
    setBuyLoading(`plan-${planId}`);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingPeriod: billing }),
      });
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } finally { setBuyLoading(null); }
  }

  async function handleBuyPack(credits: number) {
    setBuyLoading(`pack-${credits}`);
    try {
      const res = await fetch("/api/stripe/buy-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      });
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } finally { setBuyLoading(null); }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const { url, error } = await res.json();
      if (error) { alert(error); return; }
      window.location.href = url;
    } finally { setPortalLoading(false); }
  }

  const creditPercent = credits != null ? Math.min(100, (credits / PLAN_MAX) * 100) : 0;
  const isCritical    = (credits ?? 0) <= 10;
  const isLow         = (credits ?? 0) < PLAN_MAX * 0.2;
  const barColor      = isCritical ? "#FF4444" : isLow ? "#F59E0B" : "#00FF87";

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ── Ödeme sonucu banner'ları ─────────────────────────────────────────── */}
      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-ui"
             style={{ backgroundColor: "rgba(0,255,135,0.08)", border: "1px solid rgba(0,255,135,0.3)", color: "#00FF87" }}>
          <span>✓</span>
          Ödeme başarılı! {successPlan ? `${successPlan} planı` : successPack ? `${Number(successPack).toLocaleString("tr-TR")} kredi` : "Kredileriniz"} hesabınıza eklendi.
        </div>
      )}
      {canceled && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-ui"
             style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
          <span>⚠</span>
          Ödeme iptal edildi. Herhangi bir ücret alınmadı.
        </div>
      )}
      {isCritical && credits != null && !success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-ui"
             style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#FF4444" }}>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          Krediniz kritik düzeyde düşük ({credits} kredi). Aşağıdan kredi satın alın.
        </div>
      )}

      {/* ── Bakiye + İstatistikler ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 rounded-xl border p-6 flex flex-col justify-between"
             style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
          <div>
            <p className="text-xs text-muted font-ui mb-2">Kalan Kredi</p>
            <p className="font-bold leading-none mb-4"
               style={{ fontSize: "3.5rem", color: barColor, fontFamily: "var(--font-geist-mono)" }}>
              {credits ?? "—"}
            </p>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#1A2744" }}>
              <div className="h-full rounded-full transition-all duration-700"
                   style={{ width: `${creditPercent}%`, backgroundColor: barColor }} />
            </div>
            <p className="text-xs text-muted font-ui mt-1.5">{credits} / {PLAN_MAX} gösteriliyor</p>
          </div>
          <a href="#buy"
             className="mt-5 w-full text-center py-2.5 rounded-xl text-sm font-ui font-bold transition-all duration-200 block"
             style={stripeConfigured === false
               ? { backgroundColor: "#1A2744", color: "#64748B", border: "1px solid #1E3A5F", cursor: "default" }
               : { backgroundColor: "#00FF87", color: "#0A0F1E" }
             }>
            {stripeConfigured === false ? "Stripe Yapılandır" : "Kredi Satın Al"}
          </a>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Bu Ay Harcanan",      value: stats ? `-${stats.monthlySpent}` : "—",  sub: stats ? `${stats.dailyAvg} kr/gün` : "",  color: "#FF4444" },
            { label: "Bu Ay Satın Alınan",  value: stats ? `+${stats.monthlyPurchased}` : "—", sub: "",                                     color: "#00FF87" },
            { label: "Tahmini Yetme",       value: stats?.estimatedDays != null ? `~${stats.estimatedDays} gün` : "∞",
              sub: "mevcut hızla", color: stats?.estimatedDays != null && stats.estimatedDays < 7 ? "#F59E0B" : "#E2E8F0" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border p-5" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
              <p className="text-xs text-muted font-ui mb-3">{c.label}</p>
              <p className="text-2xl font-bold font-mono" style={{ color: c.color }}>{c.value}</p>
              {c.sub && <p className="text-xs text-muted font-ui mt-1">{c.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Aktif Abonelik ───────────────────────────────────────────────────── */}
      {subscription && subscription.status === "active" && (
        <div className="rounded-xl border p-5 flex flex-wrap items-center justify-between gap-4"
             style={{ backgroundColor: "#0D1526", borderColor: "rgba(0,255,135,0.3)" }}>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-ui font-bold"
                  style={{ backgroundColor: "rgba(0,255,135,0.1)", color: "#00FF87", border: "1px solid rgba(0,255,135,0.3)" }}>
              Aktif Plan
            </span>
            <div>
              <p className="text-sm font-ui font-semibold text-text">Aylık Abonelik</p>
              <p className="text-xs text-muted font-ui">
                Sonraki yenileme: {new Date(subscription.currentPeriodEnd).toLocaleDateString("tr-TR")}
              </p>
            </div>
          </div>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="px-4 py-2 rounded-lg text-sm font-ui font-medium transition-colors disabled:opacity-60"
            style={{ backgroundColor: "#1A2744", color: "#E2E8F0", border: "1px solid #1E3A5F" }}
          >
            {portalLoading ? "Yönlendiriliyor..." : "Planı Yönet / İptal"}
          </button>
        </div>
      )}

      {/* ── Kredi Satın Al ───────────────────────────────────────────────────── */}
      <div id="buy" className="space-y-6">

        {/* Stripe yapılandırılmamış uyarısı */}
        {stripeConfigured === false && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-ui"
               style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B" }}>
            <span className="text-base flex-shrink-0">⚠</span>
            <div>
              <p className="font-semibold">Stripe yapılandırılmamış</p>
              <p className="text-xs mt-0.5 opacity-80">
                Ödeme almak için <code className="font-mono bg-black/20 px-1 py-0.5 rounded">apps/web/.env.local</code> dosyasına{" "}
                <code className="font-mono bg-black/20 px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> ekleyin.
                Manuel kredi eklemek için admin panelini kullanabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Plan Kartları */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b"
               style={{ borderColor: "#1E3A5F" }}>
            <div>
              <h2 className="text-sm font-ui font-semibold text-text">Aylık Planlar</h2>
              <p className="text-xs text-muted font-ui mt-0.5">Her ay otomatik kredi yüklenir</p>
            </div>
            {/* Billing toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "#1A2744" }}>
              {(["monthly","yearly"] as const).map((b) => (
                <button key={b} onClick={() => setBilling(b)}
                        className="px-3 py-1.5 rounded-md text-xs font-ui transition-all duration-150"
                        style={{
                          backgroundColor: billing === b ? "#0D1526" : "transparent",
                          color: billing === b ? "#00FF87" : "#64748B",
                          border: billing === b ? "1px solid rgba(0,255,135,0.3)" : "1px solid transparent",
                        }}>
                  {b === "monthly" ? "Aylık" : "Yıllık"}{b === "yearly" ? " (−20%)" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x"
               style={{ "--tw-divide-opacity": "1", borderColor: "#1E3A5F" } as React.CSSProperties}>
            {PLANS.map((plan) => {
              const price    = billing === "yearly" ? plan.yearly : plan.monthly;
              const perMonth = billing === "yearly" ? plan.yearly / 12 : plan.monthly;
              const isBuying = buyLoading === `plan-${plan.id}`;
              return (
                <div key={plan.id}
                     className="p-6 flex flex-col relative"
                     style={{ borderColor: "rgba(30,58,95,0.6)" }}>
                  {"popular" in plan && plan.popular && (
                    <span className="absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full font-ui font-bold"
                          style={{ backgroundColor: "rgba(0,255,135,0.15)", color: "#00FF87", border: "1px solid rgba(0,255,135,0.3)" }}>
                      Popüler
                    </span>
                  )}
                  <p className="text-sm font-ui font-bold text-text mb-1">{plan.name}</p>
                  <p className="text-xs text-muted font-ui mb-4">{plan.credits.toLocaleString("tr-TR")} kredi/ay</p>

                  <div className="mb-1">
                    <span className="text-3xl font-bold font-mono" style={{ color: "#E2E8F0" }}>
                      ₺{fmtPrice(perMonth)}
                    </span>
                    <span className="text-xs text-muted font-ui ml-1">/ay</span>
                  </div>
                  {billing === "yearly" && (
                    <p className="text-xs font-ui mb-4" style={{ color: "#00FF87" }}>
                      ₺{fmtPrice(price)} yıllık faturalanır
                    </p>
                  )}

                  <ul className="space-y-1.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs font-ui text-muted">
                        <span style={{ color: "#00FF87" }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => stripeConfigured && handleBuyPlan(plan.id)}
                    disabled={isBuying || !stripeConfigured}
                    title={!stripeConfigured ? "Stripe yapılandırılmamış" : undefined}
                    className="w-full py-2.5 rounded-xl text-sm font-ui font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={
                      "popular" in plan && plan.popular
                        ? { backgroundColor: "#00FF87", color: "#0A0F1E" }
                        : { backgroundColor: "#1A2744", color: "#E2E8F0", border: "1px solid #1E3A5F" }
                    }
                  >
                    {isBuying ? "Yönlendiriliyor..." : !stripeConfigured ? "Yapılandırılmamış" : "Satın Al"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tek Seferlik Paketler */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "#1E3A5F" }}>
            <h2 className="text-sm font-ui font-semibold text-text">Tek Seferlik Kredi Paketleri</h2>
            <p className="text-xs text-muted font-ui mt-0.5">Abonelik olmadan, istediğiniz zaman kredi satın alın</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x"
               style={{ borderColor: "rgba(30,58,95,0.6)" }}>
            {CREDIT_PACKS.map((pack) => {
              const isBuying = buyLoading === `pack-${pack.credits}`;
              return (
                <div key={pack.credits} className="p-6 flex flex-col items-center text-center"
                     style={{ borderColor: "rgba(30,58,95,0.6)" }}>
                  <p className="text-xs font-ui text-muted mb-2">{pack.label}</p>
                  <p className="text-4xl font-bold font-mono mb-1" style={{ color: "#00FF87" }}>
                    {pack.credits.toLocaleString("tr-TR")}
                  </p>
                  <p className="text-xs text-muted font-ui mb-4">kredi</p>
                  <p className="text-xl font-bold font-mono text-text mb-6">
                    ₺{fmtPrice(pack.price)}
                  </p>
                  <button
                    onClick={() => stripeConfigured && handleBuyPack(pack.credits)}
                    disabled={isBuying || !stripeConfigured}
                    title={!stripeConfigured ? "Stripe yapılandırılmamış" : undefined}
                    className="w-full py-2.5 rounded-xl text-sm font-ui font-bold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#1A2744", color: "#E2E8F0", border: "1px solid #1E3A5F" }}
                  >
                    {isBuying ? "Yönlendiriliyor..." : !stripeConfigured ? "Yapılandırılmamış" : "Satın Al"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── İşlem Geçmişi ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b"
             style={{ borderColor: "#1E3A5F" }}>
          <h2 className="text-sm font-ui font-semibold text-text">İşlem Geçmişi</h2>
          <div className="flex gap-1.5">
            {(["all","consumption","purchase","refund","bonus"] as FilterType[]).map((f) => (
              <button key={f} onClick={() => { setFilter(f); setTxPage(1); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-ui transition-all duration-150"
                      style={{
                        backgroundColor: filter === f ? "#1A2744" : "transparent",
                        borderWidth: 1, borderStyle: "solid",
                        borderColor: filter === f ? "rgba(0,255,135,0.4)" : "#1E3A5F",
                        color: filter === f ? "#00FF87" : "#64748B",
                      }}>
                {f === "all" ? "Tümü" : f === "consumption" ? "Tüketim" :
                 f === "purchase" ? "Satın Alım" : f === "refund" ? "İade" : "Bonus"}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-ui">
            <thead>
              <tr style={{ borderBottom: "1px solid #1E3A5F" }}>
                {["Tarih","İşlem","Miktar","Bakiye","Açıklama"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-muted font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted">Yükleniyor...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-muted">Henüz işlem yok.</td></tr>
              ) : (
                transactions.map((tx) => {
                  const pos = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-elevated/30"
                        style={{ borderBottom: "1px solid rgba(30,58,95,0.5)" }}>
                      <td className="px-5 py-3 text-muted whitespace-nowrap">{fmt(tx.createdAt)}</td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold"
                              style={{
                                backgroundColor:
                                  tx.type === "consumption" ? "rgba(239,68,68,0.1)" :
                                  tx.type === "purchase"    ? "rgba(0,255,135,0.1)" :
                                  tx.type === "refund"      ? "rgba(245,158,11,0.1)" :
                                                              "rgba(0,212,255,0.1)",
                                color:
                                  tx.type === "consumption" ? "#FF4444" :
                                  tx.type === "purchase"    ? "#00FF87" :
                                  tx.type === "refund"      ? "#F59E0B" : "#00D4FF",
                              }}>
                          {TYPE_LABELS[tx.type]}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold"
                          style={{ color: pos ? "#00FF87" : "#FF4444" }}>
                        {pos ? "+" : ""}{tx.amount}
                      </td>
                      <td className="px-5 py-3 font-mono text-text">{tx.balance}</td>
                      <td className="px-5 py-3 text-muted max-w-[260px] truncate">{tx.description ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t"
               style={{ borderColor: "#1E3A5F" }}>
            <p className="text-xs text-muted font-ui">
              {pagination.total} işlemden {(txPage - 1) * pagination.limit + 1}–
              {Math.min(txPage * pagination.limit, pagination.total)} gösteriliyor
            </p>
            <div className="flex gap-1.5">
              <button disabled={txPage <= 1}
                      onClick={() => { const p = txPage - 1; setTxPage(p); fetchData(p, filter); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-ui disabled:opacity-40"
                      style={{ backgroundColor: "#1A2744", color: "#E2E8F0" }}>
                ← Önceki
              </button>
              <span className="px-3 py-1.5 text-xs text-muted font-ui">
                {txPage} / {pagination.totalPages}
              </span>
              <button disabled={txPage >= pagination.totalPages}
                      onClick={() => { const p = txPage + 1; setTxPage(p); fetchData(p, filter); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-ui disabled:opacity-40"
                      style={{ backgroundColor: "#1A2744", color: "#E2E8F0" }}>
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Kredi Fiyat Tablosu ───────────────────────────────────────────────── */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#1E3A5F" }}>
          <h2 className="text-sm font-ui font-semibold text-text">Kredi Fiyat Tablosu</h2>
          <p className="text-xs text-muted font-ui mt-0.5">Her işlemin kaç kredi tükettiğini görün</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {Object.entries(CREDIT_COSTS_UI).map(([group, items]) => (
            <div key={group} className="p-5 border-b border-r" style={{ borderColor: "rgba(30,58,95,0.5)" }}>
              <p className="text-[10px] font-ui font-semibold text-muted uppercase tracking-widest mb-3">{group}</p>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text font-ui">{item.label}</span>
                    <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: "#00FF87" }}>
                      {item.cost} kr
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense>
      <CreditsContent />
    </Suspense>
  );
}
