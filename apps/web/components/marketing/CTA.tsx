"use client";

import Link from "next/link";

export function CTA() {
  return (
    <section
      className="relative py-28 px-6 overflow-hidden"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      {/* Background radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,255,135,0.07) 0%, transparent 70%)"
        }}
      />

      {/* Top border accent */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(0,255,135,0.5), transparent)"
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border"
            style={{
              backgroundColor: "rgba(0,255,135,0.08)",
              borderColor: "rgba(0,255,135,0.25)",
              color: "#00FF87",
              fontFamily: "var(--font-geist-mono)"
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Ücretsiz deneyin — kredi kartı gerekmez
          </span>
        </div>

        {/* Heading */}
        <h2
          className="text-4xl md:text-5xl font-bold mb-5 leading-tight"
          style={{ color: "#E2E8F0", fontFamily: "var(--font-geist-mono)" }}
        >
          SEO&apos;nuzu Bugün
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #00FF87, #0EA5E9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Otomatikleştirin
          </span>
        </h2>

        <p
          className="text-lg mb-10 leading-relaxed"
          style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}
        >
          14 gün ücretsiz deneyin. İstediğiniz zaman iptal edin.
          <br className="hidden sm:block" />
          Kurulum yok, teknik bilgi gerekmez.
        </p>

        {/* CTA Button */}
        <Link
          href="/register"
          className="inline-flex items-center gap-3 px-10 py-5 text-lg font-bold rounded-2xl transition-all duration-300"
          style={{
            backgroundColor: "#00FF87",
            color: "#0A0F1E",
            fontFamily: "var(--font-inter)",
            boxShadow: "0 0 40px rgba(0,255,135,0.30)",
            animation: "ctaPulse 3s ease-in-out infinite"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#00E87A";
            e.currentTarget.style.boxShadow = "0 0 60px rgba(0,255,135,0.50)";
            e.currentTarget.style.transform = "translateY(-2px) scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#00FF87";
            e.currentTarget.style.boxShadow = "0 0 40px rgba(0,255,135,0.30)";
            e.currentTarget.style.transform = "translateY(0) scale(1)";
          }}
        >
          Ücretsiz Başla
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        {/* Trust signals */}
        <div
          className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm"
          style={{ color: "#334155" }}
        >
          <span className="flex items-center gap-1.5">
            <span style={{ color: "#00FF87" }}>✓</span> 14 gün ücretsiz
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: "#00FF87" }}>✓</span> Kredi kartı gerekmez
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: "#00FF87" }}>✓</span> İstediğin zaman iptal
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ color: "#00FF87" }}>✓</span> 5 dakikada kurulum
          </span>
        </div>
      </div>

      {/* animations defined in globals.css */}
    </section>
  );
}
