import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <p
          className="text-7xl font-bold font-mono"
          style={{ color: "#1E3A5F" }}
        >
          404
        </p>

        <div className="space-y-2">
          <h1 className="text-xl font-bold" style={{ color: "#F1F5F9", fontFamily: "var(--font-geist-mono)" }}>
            Sayfa Bulunamadı
          </h1>
          <p className="text-sm" style={{ color: "#64748B" }}>
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-5 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#00FF87", color: "#0A0F1E" }}
          >
            Dashboard'a Dön
          </Link>
          <Link
            href="/"
            className="px-5 py-2 rounded-lg text-sm border transition-colors hover:opacity-80"
            style={{ borderColor: "#1E3A5F", color: "#94A3B8" }}
          >
            Ana Sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
