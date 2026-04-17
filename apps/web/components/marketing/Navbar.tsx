"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { href: "#features", label: "Özellikler" },
  { href: "#how-it-works", label: "Nasıl Çalışır" },
  { href: "#pricing", label: "Fiyatlandırma" }
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAnchorClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? "rgba(13, 21, 38, 0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #1E3A5F" : "1px solid transparent"
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold select-none"
          style={{ fontFamily: "var(--font-geist-mono)", color: "#00FF87" }}
        >
          <span>⚡</span>
          <span>Serpio</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="text-sm transition-colors duration-200 cursor-pointer"
              style={{ color: "#64748B" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#E2E8F0")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "#64748B")
              }
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm rounded-lg transition-colors duration-200"
            style={{ color: "#64748B" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#E2E8F0";
              e.currentTarget.style.backgroundColor = "#1A2744";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#64748B";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Giriş Yap
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
            style={{
              backgroundColor: "#00FF87",
              color: "#0A0F1E"
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#00E87A")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#00FF87")
            }
          >
            Ücretsiz Başla
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg"
          style={{ color: "#E2E8F0" }}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menü"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-6 py-4 flex flex-col gap-4"
          style={{
            backgroundColor: "#0D1526",
            borderColor: "#1E3A5F"
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="text-sm py-2"
              style={{ color: "#64748B" }}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "#1E3A5F" }}>
            <Link
              href="/login"
              className="px-4 py-2 text-sm rounded-lg text-center"
              style={{ color: "#E2E8F0", border: "1px solid #1E3A5F" }}
              onClick={() => setMenuOpen(false)}
            >
              Giriş Yap
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-semibold rounded-lg text-center"
              style={{ backgroundColor: "#00FF87", color: "#0A0F1E" }}
              onClick={() => setMenuOpen(false)}
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
