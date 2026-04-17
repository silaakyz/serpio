"use client";

const ROWS = [
  { label: "AI İçerik Yeniden Yazım",  serpio: true,  manuel: false,     other: "Kısıtlı" },
  { label: "GEO / LLMO Optimizasyon",  serpio: true,  manuel: false,     other: false     },
  { label: "Rakip İzleme",             serpio: true,  manuel: false,     other: "Kısıtlı" },
  { label: "Predictive SEO",           serpio: true,  manuel: false,     other: false     },
  { label: "Programatik SEO",          serpio: true,  manuel: false,     other: "Kısıtlı" },
  { label: "White-Label Ajans Modu",   serpio: true,  manuel: false,     other: false     },
  { label: "Otomatik Raporlama",       serpio: true,  manuel: false,     other: "Kısıtlı" },
  { label: "WordPress / GitHub Yayın", serpio: true,  manuel: "Manuel",  other: false     },
  { label: "Schema Markup Otomasyonu", serpio: true,  manuel: false,     other: "Kısıtlı" },
  { label: "AI Marka Nabzı",           serpio: true,  manuel: false,     other: false     },
];

type CellValue = boolean | string;

function Cell({ value, highlight }: { value: CellValue; highlight?: boolean }) {
  if (value === true) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold"
        style={{ color: "#00FF87" }}
      >
        ✓
      </span>
    );
  }
  if (value === false) {
    return (
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-sm"
        style={{ color: "#334155" }}
      >
        ✗
      </span>
    );
  }
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: "rgba(245,158,11,0.10)",
        color: "#F59E0B",
        border: "1px solid rgba(245,158,11,0.20)"
      }}
    >
      {value}
    </span>
  );
}

export function Comparison() {
  return (
    <section
      className="py-24 px-6"
      style={{ backgroundColor: "#0D1526" }}
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: "#E2E8F0", fontFamily: "var(--font-geist-mono)" }}
          >
            Neden Serpio?
          </h2>
          <p className="text-lg" style={{ color: "#64748B" }}>
            Rakipler tek bir şey yapar. Serpio her şeyi yapar.
          </p>
        </div>

        {/* Table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "#1E3A5F" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-4 gap-0 border-b"
            style={{ borderColor: "#1E3A5F", backgroundColor: "#0A0F1E" }}
          >
            <div className="p-4 text-sm font-medium" style={{ color: "#64748B" }}>
              Özellik
            </div>
            <div
              className="p-4 text-sm font-bold text-center border-l"
              style={{ color: "#00FF87", borderColor: "#1E3A5F" }}
            >
              ⚡ Serpio
            </div>
            <div
              className="p-4 text-sm font-medium text-center border-l"
              style={{ color: "#64748B", borderColor: "#1E3A5F" }}
            >
              Manuel SEO
            </div>
            <div
              className="p-4 text-sm font-medium text-center border-l"
              style={{ color: "#64748B", borderColor: "#1E3A5F" }}
            >
              Diğer Araçlar
            </div>
          </div>

          {/* Rows */}
          {ROWS.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-4 gap-0 border-b transition-colors duration-150"
              style={{
                borderColor: "#1E3A5F",
                backgroundColor: i % 2 === 0 ? "#0D1526" : "#0A0F1E"
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#1A2744")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  i % 2 === 0 ? "#0D1526" : "#0A0F1E")
              }
            >
              <div
                className="p-4 text-sm"
                style={{ color: "#E2E8F0" }}
              >
                {row.label}
              </div>
              <div
                className="p-4 flex items-center justify-center border-l"
                style={{ borderColor: "#1E3A5F" }}
              >
                <Cell value={row.serpio} />
              </div>
              <div
                className="p-4 flex items-center justify-center border-l"
                style={{ borderColor: "#1E3A5F" }}
              >
                <Cell value={row.manuel} />
              </div>
              <div
                className="p-4 flex items-center justify-center border-l"
                style={{ borderColor: "#1E3A5F" }}
              >
                <Cell value={row.other} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
