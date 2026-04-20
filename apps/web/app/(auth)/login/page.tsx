"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    if (result?.error) {
      setError("Geçersiz e-posta veya şifre.");
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  };

  const handleGoogle = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8"
        style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold"
            style={{ fontFamily: "var(--font-geist-mono)", color: "#00FF87" }}
          >
            <span>⚡</span>
            <span>Serpio</span>
          </Link>
          <h1
            className="mt-4 text-xl font-semibold"
            style={{ color: "#E2E8F0" }}
          >
            Hesabınıza Giriş Yapın
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
            Hoş geldiniz! Devam etmek için giriş yapın.
          </p>
        </div>

        {/* Google Button */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 mb-6"
          style={{ borderColor: "#1E3A5F", color: "#E2E8F0", backgroundColor: "transparent" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#1A2744";
            e.currentTarget.style.borderColor = "rgba(0,255,135,0.30)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.borderColor = "#1E3A5F";
          }}
        >
          <GoogleIcon />
          Google ile Giriş Yap
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px" style={{ backgroundColor: "#1E3A5F" }} />
          <span className="text-xs" style={{ color: "#334155" }}>veya</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#1E3A5F" }} />
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#E2E8F0" }}
            >
              E-posta
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="siz@example.com"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200"
              style={{
                backgroundColor: "#0A0F1E",
                borderColor: "#1E3A5F",
                color: "#E2E8F0"
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,135,0.50)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1E3A5F")}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#E2E8F0" }}
            >
              Şifre
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200"
              style={{
                backgroundColor: "#0A0F1E",
                borderColor: "#1E3A5F",
                color: "#E2E8F0"
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(0,255,135,0.50)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1E3A5F")}
            />
          </div>

          {justRegistered && !error && (
            <p className="text-sm text-center rounded-lg py-2 px-3"
               style={{ color: "#00FF87", backgroundColor: "rgba(0,255,135,0.1)", border: "1px solid rgba(0,255,135,0.3)" }}>
              Kayıt başarılı! Şimdi giriş yapabilirsiniz.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-400 text-center rounded-lg py-2 px-3"
               style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#00FF87", color: "#0A0F1E" }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = "#00E87A";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#00FF87";
            }}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {/* Register Link */}
        <p className="mt-6 text-center text-sm" style={{ color: "#64748B" }}>
          Hesabınız yok mu?{" "}
          <Link
            href="/register"
            className="font-medium transition-colors duration-200"
            style={{ color: "#00FF87" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#00E87A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#00FF87")}
          >
            Ücretsiz Başlayın
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
