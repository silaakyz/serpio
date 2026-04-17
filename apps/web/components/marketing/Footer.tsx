"use client";

const COLUMNS = [
  {
    title: "Ürün",
    links: [
      { label: "Özellikler", href: "#features" },
      { label: "Fiyatlandırma", href: "#pricing" },
      { label: "API Docs", href: "/docs/api" },
      { label: "Changelog", href: "/changelog" }
    ]
  },
  {
    title: "Şirket",
    links: [
      { label: "Hakkımızda", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "İletişim", href: "/contact" }
    ]
  },
  {
    title: "Yasal",
    links: [
      { label: "Gizlilik Politikası", href: "/privacy" },
      { label: "Kullanım Şartları", href: "/terms" }
    ]
  }
];

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer
      className="border-t"
      style={{ borderColor: "#1E3A5F", backgroundColor: "#0D1526" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Top: logo + columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div
              className="text-xl font-bold mb-3"
              style={{ fontFamily: "var(--font-geist-mono)", color: "#00FF87" }}
            >
              ⚡ Serpio
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: "#64748B" }}>
              SEO otomasyonunun geleceği. Yapay zeka ile içeriklerinizi sürekli taze ve sıralamada tutun.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              {[
                { icon: <XIcon />, href: "https://x.com/serpio_io", label: "X" },
                { icon: <LinkedInIcon />, href: "https://linkedin.com/company/serpio", label: "LinkedIn" },
                { icon: <GitHubIcon />, href: "https://github.com/serpio", label: "GitHub" }
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="p-2 rounded-lg border transition-all duration-200"
                  style={{ borderColor: "#1E3A5F", color: "#64748B" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(0,255,135,0.30)";
                    e.currentTarget.style.color = "#E2E8F0";
                    e.currentTarget.style.backgroundColor = "#1A2744";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#1E3A5F";
                    e.currentTarget.style.color = "#64748B";
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4
                className="text-xs font-semibold uppercase tracking-wider mb-4"
                style={{ color: "#E2E8F0" }}
              >
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm transition-colors duration-200"
                      style={{ color: "#64748B" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#E2E8F0")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t text-sm"
          style={{ borderColor: "#1E3A5F" }}
        >
          <p style={{ color: "#334155" }}>
            © {new Date().getFullYear()} Serpio. Tüm hakları saklıdır.
          </p>
          <p
            style={{ color: "#334155", fontFamily: "var(--font-geist-mono)" }}
          >
            Sıralamayı otomatikleştir. ⚡
          </p>
        </div>
      </div>
    </footer>
  );
}
