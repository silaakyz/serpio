"use client";

const STEPS = [
  {
    number: "01",
    icon: "🌐",
    title: "URL Gir",
    desc: "Web sitenizin adresini girin, Serpio taramaya başlasın. Dakikalar içinde sitenizin tam SEO haritası çıkar."
  },
  {
    number: "02",
    icon: "🧠",
    title: "AI Analiz",
    desc: "Eski içerikler tespit edilir, yazım stiliniz öğrenilir. Sıralama potansiyeli düşük sayfalar önceliklendirilir."
  },
  {
    number: "03",
    icon: "⚡",
    title: "Optimize Et",
    desc: "GEO/LLMO, teknik SEO ve içerik optimizasyonu tek seferde uygulanır. İç linkler, schema markup otomatik eklenir."
  },
  {
    number: "04",
    icon: "🚀",
    title: "Yayınla & İzle",
    desc: "WordPress, GitHub veya webhook ile yayınlayın. Performans izleme ve otomatik raporlama devreye girer."
  }
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24 px-6"
      style={{ backgroundColor: "#0D1526" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: "#E2E8F0", fontFamily: "var(--font-geist-mono)" }}
          >
            4 Adımda Otomatik SEO
          </h2>
          <p className="text-lg max-w-lg mx-auto" style={{ color: "#64748B" }}>
            Kurulum yok, kod yok. Sadece URL girin ve Serpio gerisini halletsin.
          </p>
        </div>

        {/* Steps — horizontal on desktop, vertical on mobile */}
        <div className="relative">
          {/* Connector line — desktop only */}
          <div
            className="hidden lg:block absolute top-10 left-0 right-0 h-px"
            style={{
              background:
                "repeating-linear-gradient(90deg, rgba(0,255,135,0.30) 0, rgba(0,255,135,0.30) 8px, transparent 8px, transparent 16px)",
              top: "2.5rem",
              left: "calc(12.5% + 2rem)",
              right: "calc(12.5% + 2rem)"
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-6">
            {STEPS.map((step, idx) => (
              <div
                key={step.number}
                className="relative flex flex-col items-start lg:items-center"
              >
                {/* Vertical connector — mobile only */}
                {idx < STEPS.length - 1 && (
                  <div
                    className="lg:hidden absolute left-5 top-16 w-px h-full"
                    style={{
                      background:
                        "repeating-linear-gradient(180deg, rgba(0,255,135,0.30) 0, rgba(0,255,135,0.30) 6px, transparent 6px, transparent 12px)"
                    }}
                  />
                )}

                {/* Icon circle with number */}
                <div
                  className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 border transition-all duration-300"
                  style={{
                    backgroundColor: "#0A0F1E",
                    borderColor: "rgba(0,255,135,0.25)"
                  }}
                >
                  {step.icon}
                </div>

                {/* Card */}
                <div
                  className="rounded-xl border p-5 w-full transition-all duration-300"
                  style={{
                    backgroundColor: "#0A0F1E",
                    borderColor: "#1E3A5F"
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = "rgba(0,255,135,0.30)";
                    el.style.backgroundColor = "#1A2744";
                    el.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.borderColor = "#1E3A5F";
                    el.style.backgroundColor = "#0A0F1E";
                    el.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    className="text-3xl font-bold mb-2 leading-none"
                    style={{
                      color: "#00FF87",
                      fontFamily: "var(--font-geist-mono)",
                      opacity: 0.7
                    }}
                  >
                    {step.number}
                  </div>
                  <h3
                    className="font-semibold text-base mb-2"
                    style={{ color: "#E2E8F0" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748B" }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
