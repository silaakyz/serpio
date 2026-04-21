"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ backgroundColor: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)" }}
        >
          <span className="text-2xl">⚠</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
            Beklenmeyen Bir Hata Oluştu
          </h1>
          <p className="text-sm" style={{ color: "#64748B" }}>
            Bir şeyler ters gitti. Sayfayı yenilemeyi deneyin.
          </p>
          {error.digest && (
            <p className="text-xs font-mono" style={{ color: "#334155" }}>
              Hata kodu: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#00FF87", color: "#0A0F1E" }}
          >
            Tekrar Dene
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-lg text-sm border transition-colors hover:opacity-80"
            style={{ borderColor: "#1E3A5F", color: "#94A3B8" }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
