"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const TERMINAL_LINES = [
  { delay: 0,    text: "[10:32:14] ● Scraping başladı → https://example.com", color: "#00D4FF" },
  { delay: 800,  text: "[10:32:16] ● 47 URL keşfedildi", color: "#E2E8F0" },
  { delay: 1600, text: "[10:32:18] ✓ AI analiz tamamlandı — 12 eski makale tespit edildi", color: "#00FF87" },
  { delay: 2400, text: "[10:32:20] ✓ Stil rehberi oluşturuldu", color: "#00FF87" },
  { delay: 3200, text: "[10:32:22] ✓ 12 makale yeniden yazıldı", color: "#00FF87" },
  { delay: 4000, text: "[10:32:24] ✓ WordPress'e yayınlandı ✨", color: "#00FF87" },
  { delay: 4800, text: "▋", color: "#00FF87", cursor: true }
];

function TerminalMockup() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          TERMINAL_LINES.forEach((line, i) => {
            setTimeout(() => {
              setVisibleLines((prev) => [...prev, i]);
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }, line.delay);
          });
        }
      },
      { threshold: 0.3 }
    );
    const el = containerRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden border"
      style={{
        borderColor: "#1E3A5F",
        maxWidth: 680,
        width: "100%",
        boxShadow: "0 0 60px rgba(0,255,135,0.10), 0 25px 50px rgba(0,0,0,0.5)"
      }}
    >
      {/* Terminal Title Bar */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}
      >
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FF5F56" }} />
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FFBD2E" }} />
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#27C93F" }} />
        <span
          className="ml-4 text-xs"
          style={{ color: "#64748B", fontFamily: "var(--font-geist-mono)" }}
        >
          serpio — bash
        </span>
      </div>

      {/* Terminal Body */}
      <div
        ref={containerRef}
        className="p-5 overflow-auto"
        style={{
          backgroundColor: "#020B06",
          fontFamily: "var(--font-geist-mono)",
          fontSize: "0.8rem",
          lineHeight: "1.7",
          minHeight: 260,
          maxHeight: 320
        }}
      >
        {TERMINAL_LINES.map((line, i) =>
          visibleLines.includes(i) ? (
            <div
              key={i}
              className="whitespace-pre-wrap"
              style={{
                color: line.color,
                animation: line.cursor
                  ? "blink 1s step-end infinite"
                  : "fadeInSlideUp 0.4s ease both"
              }}
            >
              {line.text}
            </div>
          ) : null
        )}
        {visibleLines.length === 0 && (
          <span style={{ color: "#334155" }}>Sayfayı aşağı kaydırın...</span>
        )}
      </div>

      {/* animations defined in globals.css */}
    </div>
  );
}

export function Hero() {
  return (
    <section
      className="relative pt-32 pb-24 px-6 overflow-hidden"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      {/* Background glow effects */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(ellipse, #00FF87 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute top-20 left-0 w-[400px] h-[400px] rounded-full opacity-5 blur-3xl"
        style={{ background: "#0EA5E9" }}
      />

      <div className="relative max-w-7xl mx-auto">
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
            Yapay Zeka Destekli SEO Otomasyonu
          </span>
        </div>

        {/* Heading */}
        <h1
          className="text-center text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight mb-6"
          style={{ fontFamily: "var(--font-geist-mono)", color: "#E2E8F0" }}
        >
          SEO&apos;nuzu{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #00FF87, #0EA5E9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Yapay Zeka
          </span>{" "}
          ile
          <br />
          Otomatikleştirin
        </h1>

        {/* Subheading */}
        <p
          className="text-center text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "#64748B", fontFamily: "var(--font-inter)" }}
        >
          Eski içerikleri tespit edin, yazım stilinizi öğretin, tek tıkla güncelleyin.
          <br className="hidden md:block" />
          Google, ChatGPT ve Perplexity&apos;de görünür olun.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold rounded-xl transition-all duration-200 shadow-lg"
            style={{
              backgroundColor: "#00FF87",
              color: "#0A0F1E",
              fontFamily: "var(--font-inter)",
              boxShadow: "0 0 32px rgba(0,255,135,0.25)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#00E87A";
              e.currentTarget.style.boxShadow = "0 0 48px rgba(0,255,135,0.4)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#00FF87";
              e.currentTarget.style.boxShadow = "0 0 32px rgba(0,255,135,0.25)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Ücretsiz Başla
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          <button
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-xl border transition-all duration-200"
            style={{
              borderColor: "#00FF87",
              color: "#00FF87",
              backgroundColor: "transparent",
              fontFamily: "var(--font-inter)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0,255,135,0.08)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
            </svg>
            Demo İzle
          </button>
        </div>

        {/* Terminal Mockup */}
        <div className="flex justify-center">
          <TerminalMockup />
        </div>

        {/* Social proof micro-line */}
        <p
          className="text-center mt-8 text-sm"
          style={{ color: "#334155", fontFamily: "var(--font-inter)" }}
        >
          Kredi kartı gerekmez · 14 gün ücretsiz · İstediğin zaman iptal
        </p>
      </div>
    </section>
  );
}
