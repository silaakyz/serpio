import Stripe from "stripe";

// ─── Lazy Stripe Client ───────────────────────────────────────────────────────
// Build sırasında boş key ile çağrılmaz — sadece runtime API route'larında kullanılır.

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY tanımlı değil");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return _stripe;
}

// Eski kodla uyumluluk için named export (route'larda kullanılıyor)
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ─── Fiyatlandırma Planları ───────────────────────────────────────────────────

export const PLANS = {
  starter: {
    name:         "Starter",
    credits:      500,
    priceMonthly: 4999,    // ₺49.99
    priceYearly:  47988,   // ₺479.88 (₺39.99/ay × 12)
    features: [
      "500 kredi/ay",
      "1 proje",
      "AI yeniden yazım + yayınlama",
      "Site audit + GEO optimizasyon",
      "E-posta destek",
    ],
  },
  pro: {
    name:         "Pro",
    credits:      2000,
    priceMonthly: 14999,   // ₺149.99
    priceYearly:  143988,  // ₺1.439.88 (₺119.99/ay × 12)
    popular:      true,
    features: [
      "2.000 kredi/ay",
      "5 proje",
      "Starter'daki her şey +",
      "GSC/GA4 entegrasyonu",
      "Rakip izleme + backlink",
      "Programatik SEO + çeviri",
      "Predictive SEO + CRO",
      "Otomatik raporlama + API",
    ],
  },
  agency: {
    name:         "Agency",
    credits:      10000,
    priceMonthly: 39999,   // ₺399.99
    priceYearly:  383988,  // ₺3.839.88 (₺319.99/ay × 12)
    features: [
      "10.000 kredi/ay",
      "Sınırsız proje",
      "Pro'daki her şey +",
      "White-label ajans modu",
      "Müşteri portalı",
      "AI Marka Nabzı",
      "Öncelikli destek",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;

// ─── Tek Seferlik Kredi Paketleri ─────────────────────────────────────────────

export const CREDIT_PACKS = [
  { credits: 500,   price: 4999,  label: "Başlangıç Paketi"  },
  { credits: 2000,  price: 14999, label: "Profesyonel Paket" },
  { credits: 10000, price: 39999, label: "Ajans Paketi"      },
] as const;

export type CreditPackCredits = (typeof CREDIT_PACKS)[number]["credits"];
