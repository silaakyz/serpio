"use client";

import { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    monthlyPrice: 499,
    yearlyPrice: 399,
    desc: "Bireysel site sahipleri ve blog yazarları için",
    popular: false,
    cta: "Ücretsiz Başla",
    ctaHref: "/register",
    ctaStyle: "outline" as const,
    features: [
      "500 kredi/ay",
      "1 proje",
      "AI yeniden yazım + yayınlama",
      "Site audit",
      "GEO optimizasyon",
      "E-posta destek"
    ]
  },
  {
    name: "Pro",
    monthlyPrice: 1499,
    yearlyPrice: 1199,
    desc: "Büyüyen işletmeler ve içerik ekipleri için",
    popular: true,
    cta: "Pro'ya Geç",
    ctaHref: "/register?plan=pro",
    ctaStyle: "primary" as const,
    features: [
      "2.000 kredi/ay",
      "5 proje",
      "Starter'daki her şey +",
      "GSC / GA4 entegrasyonu",
      "Rakip izleme + backlink takibi",
      "Programatik SEO + çeviri",
      "Predictive SEO + CRO",
      "Otomatik raporlama + API"
    ]
  },
  {
    name: "Agency",
    monthlyPrice: 3999,
    yearlyPrice: 3199,
    desc: "Dijital ajanslar ve çok müşterili yapılar için",
    popular: false,
    cta: "İletişime Geç",
    ctaHref: "/contact",
    ctaStyle: "outline" as const,
    features: [
      "10.000 kredi/ay",
      "Sınırsız proje",
      "Pro'daki her şey +",
      "White-label ajans modu",
      "Müşteri portalı",
      "AI Marka Nabzı (LLM izleme)",
      "Öncelikli destek",
      "Özel onboarding"
    ]
  }
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section
      id="pricing"
      className="py-24 px-6"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: "#E2E8F0", fontFamily: "var(--font-geist-mono)" }}
          >
            Büyümenize Uygun Plan Seçin
          </h2>
          <p className="text-lg mb-8" style={{ color: "#64748B" }}>
            14 gün ücretsiz deneyin. Kredi kartı gerekmez.
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="inline-flex items-center gap-4 p-1 rounded-xl border" style={{ borderColor: "#1E3A5F", backgroundColor: "#0D1526" }}>
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200"
              style={{
                backgroundColor: !yearly ? "#1A2744" : "transparent",
                color: !yearly ? "#E2E8F0" : "#64748B"
              }}
              onClick={() => setYearly(false)}
            >
              Aylık
            </button>
            <button
              className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2"
              style={{
                backgroundColor: yearly ? "#1A2744" : "transparent",
                color: yearly ? "#E2E8F0" : "#64748B"
              }}
              onClick={() => setYearly(true)}
            >
              Yıllık
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "rgba(0,255,135,0.12)", color: "#00FF87" }}
              >
                %20 indirim
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-2xl border p-8 transition-all duration-300 flex flex-col"
              style={{
                backgroundColor: "#0D1526",
                borderColor: plan.popular ? "#00FF87" : "#1E3A5F",
                transform: plan.popular ? "scale(1.05)" : "scale(1)",
                boxShadow: plan.popular ? "0 0 40px rgba(0,255,135,0.12)" : "none",
                zIndex: plan.popular ? 1 : 0
              }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span
                    className="px-4 py-1.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: "#00FF87", color: "#0A0F1E" }}
                  >
                    En Popüler
                  </span>
                </div>
              )}

              {/* Plan name + desc */}
              <div className="mb-6">
                <h3
                  className="text-xl font-bold mb-1"
                  style={{ color: "#E2E8F0", fontFamily: "var(--font-geist-mono)" }}
                >
                  {plan.name}
                </h3>
                <p className="text-sm" style={{ color: "#64748B" }}>
                  {plan.desc}
                </p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-end gap-1">
                  <span
                    className="text-4xl font-bold"
                    style={{ color: "#E2E8F0", fontFamily: "var(--font-geist-mono)" }}
                  >
                    ₺{(yearly ? plan.yearlyPrice : plan.monthlyPrice).toLocaleString("tr-TR")}
                  </span>
                  <span className="text-sm mb-1" style={{ color: "#64748B" }}>
                    /ay
                  </span>
                </div>
                {yearly && (
                  <p className="text-xs mt-1" style={{ color: "#00FF87" }}>
                    Yıllık ödemede ₺{((plan.monthlyPrice - plan.yearlyPrice) * 12).toLocaleString("tr-TR")} tasarruf
                  </p>
                )}
              </div>

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                className="block text-center py-3 px-6 rounded-xl font-semibold text-sm mb-8 transition-all duration-200"
                style={
                  plan.ctaStyle === "primary"
                    ? { backgroundColor: "#00FF87", color: "#0A0F1E" }
                    : { border: "1px solid #1E3A5F", color: "#E2E8F0", backgroundColor: "transparent" }
                }
                onMouseEnter={(e) => {
                  if (plan.ctaStyle === "primary") {
                    e.currentTarget.style.backgroundColor = "#00E87A";
                  } else {
                    e.currentTarget.style.borderColor = "#00FF87";
                    e.currentTarget.style.color = "#00FF87";
                  }
                }}
                onMouseLeave={(e) => {
                  if (plan.ctaStyle === "primary") {
                    e.currentTarget.style.backgroundColor = "#00FF87";
                  } else {
                    e.currentTarget.style.borderColor = "#1E3A5F";
                    e.currentTarget.style.color = "#E2E8F0";
                  }
                }}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 text-sm">
                    <span
                      className="mt-0.5 flex-shrink-0 font-bold"
                      style={{ color: feat.endsWith("+") ? "#64748B" : "#00FF87" }}
                    >
                      {feat.endsWith("+") ? "—" : "✓"}
                    </span>
                    <span style={{ color: feat.endsWith("+") ? "#64748B" : "#E2E8F0" }}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
