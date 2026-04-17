"use client";

const categories = [
  {
    title: "İçerik Otomasyonu",
    icon: "✍️",
    features: [
      {
        icon: "🤖",
        title: "AI Yeniden Yazım",
        desc: "Yazım stilinizi öğrenir, GPT-4 ile içeriklerinizi günceller"
      },
      {
        icon: "📄",
        title: "Programatik SEO",
        desc: "1 şablon + veri = yüzlerce benzersiz sayfa"
      },
      {
        icon: "🌍",
        title: "Çok Dilli İçerik",
        desc: "AI çeviri + otomatik hreflang yönetimi"
      },
      {
        icon: "🔗",
        title: "Akıllı Linkleme",
        desc: "İç ve dış link önerilerini otomatik oluşturur"
      }
    ]
  },
  {
    title: "SEO İstihbarat",
    icon: "📊",
    features: [
      {
        icon: "📈",
        title: "GSC / GA Entegrasyonu",
        desc: "Gerçek sıralama ve trafik verileriyle karar alın"
      },
      {
        icon: "🔍",
        title: "Site Audit",
        desc: "Teknik SEO sorunlarını otomatik tespit edin"
      },
      {
        icon: "👁",
        title: "Rakip İzleme",
        desc: "Rakiplerinizin içerik değişikliklerini anlık takip edin"
      },
      {
        icon: "🔗",
        title: "Backlink Takibi",
        desc: "Link profilinizi izleyin, fırsatları yakalayın"
      }
    ]
  },
  {
    title: "AI Arama Optimizasyonu (GEO / LLMO)",
    icon: "🧠",
    features: [
      {
        icon: "💬",
        title: "GEO Optimizasyon",
        desc: "ChatGPT, Perplexity, Gemini'de görünür olun"
      },
      {
        icon: "🏷️",
        title: "Schema Markup",
        desc: "JSON-LD yapılandırılmış veri otomasyonu"
      },
      {
        icon: "📡",
        title: "AI Marka Nabzı",
        desc: "LLM'lerde markanızın referans alınıp alınmadığını izleyin"
      },
      {
        icon: "🔮",
        title: "Predictive SEO",
        desc: "Sıralama düşüşünü önceden tahmin edin"
      }
    ]
  },
  {
    title: "Ajans Araçları",
    icon: "🏢",
    features: [
      {
        icon: "🎨",
        title: "White-Label",
        desc: "Kendi markanızla müşterilerinize sunun"
      },
      {
        icon: "📋",
        title: "Otomatik Raporlama",
        desc: "Aylık PDF raporlar, tek tıkla"
      },
      {
        icon: "👥",
        title: "Müşteri Portalı",
        desc: "Müşterilerinize özel salt-okunur dashboard"
      },
      {
        icon: "⚡",
        title: "Public API",
        desc: "Zapier, Make ve özel entegrasyonlar"
      }
    ]
  }
];

function FeatureCard({
  icon,
  title,
  desc
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="group rounded-xl border p-5 transition-all duration-300 cursor-default"
      style={{
        backgroundColor: "#0D1526",
        borderColor: "#1E3A5F"
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = "#1A2744";
        el.style.borderColor = "rgba(0,255,135,0.30)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = "#0D1526";
        el.style.borderColor = "#1E3A5F";
        el.style.transform = "translateY(0)";
      }}
    >
      <div className="text-2xl mb-3">{icon}</div>
      <h4
        className="text-sm font-semibold mb-1"
        style={{ color: "#E2E8F0" }}
      >
        {title}
      </h4>
      <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>
        {desc}
      </p>
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="py-24 px-6"
      style={{ backgroundColor: "#0A0F1E" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: "#E2E8F0", fontFamily: "var(--font-geist-mono)" }}
          >
            Tek Platformda Tüm SEO İhtiyaçlarınız
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "#64748B" }}>
            İçerik üretiminden teknik SEO'ya, AI aramasından ajans araçlarına kadar her şey burada.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-16">
          {categories.map((cat) => (
            <div key={cat.title}>
              {/* Category label */}
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl">{cat.icon}</span>
                <h3
                  className="text-lg font-semibold"
                  style={{ color: "#E2E8F0" }}
                >
                  {cat.title}
                </h3>
                <div
                  className="flex-1 h-px"
                  style={{ backgroundColor: "#1E3A5F" }}
                />
              </div>

              {/* Feature cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cat.features.map((feat) => (
                  <FeatureCard key={feat.title} {...feat} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
