"use client";

import { useState } from "react";

type Tab = "general" | "publishing" | "external-links";

type PublishingChannel =
  | "wordpress" | "shopify" | "ghost" | "webflow"
  | "headless" | "ftp" | "browser" | "github" | "gitlab" | "webhook";

const CHANNELS: { id: PublishingChannel; label: string; icon: string; description: string }[] = [
  { id: "wordpress",  label: "WordPress",            icon: "🔷", description: "REST API veya XML-RPC ile yayınla" },
  { id: "shopify",    label: "Shopify",               icon: "🛍️", description: "Shopify Admin API ile blog yazıları" },
  { id: "ghost",      label: "Ghost",                 icon: "👻", description: "Ghost Content API ile yayınla" },
  { id: "webflow",    label: "Webflow",               icon: "🌊", description: "Webflow CMS API entegrasyonu" },
  { id: "headless",   label: "Headless CMS",          icon: "🧩", description: "Contentful, Sanity, Strapi vb." },
  { id: "ftp",        label: "FTP / SFTP",            icon: "📁", description: "Dosyaları doğrudan sunucuya yükle" },
  { id: "browser",    label: "Tarayıcı Otomasyonu",   icon: "🤖", description: "Playwright ile otomatik yayınlama" },
  { id: "github",     label: "GitHub",                icon: "🐙", description: "GitHub Actions / Pages entegrasyonu" },
  { id: "gitlab",     label: "GitLab",                icon: "🦊", description: "GitLab CI/CD entegrasyonu" },
  { id: "webhook",    label: "Webhook",               icon: "🔗", description: "Özel HTTP webhook endpoint" },
];

function ChannelFields({ channel }: { channel: PublishingChannel }) {
  const inputClass =
    "w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text " +
    "placeholder-muted font-ui focus:outline-none focus:border-emerald/50 transition-colors";
  const labelClass = "block text-xs font-ui font-medium text-muted mb-1.5";

  switch (channel) {
    case "wordpress":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>WordPress Site URL</label>
            <input type="url" placeholder="https://siteniz.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Kullanıcı Adı</label>
            <input type="text" placeholder="admin" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Application Password</label>
            <input type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" className={inputClass} />
            <p className="text-xs text-muted font-ui mt-1">
              WordPress Kullanıcılar → Profil → Application Passwords bölümünden oluşturun.
            </p>
          </div>
        </div>
      );
    case "shopify":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Shopify Store URL</label>
            <input type="url" placeholder="https://magazaniz.myshopify.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Admin API Access Token</label>
            <input type="password" placeholder="shpat_xxxxxxxxxxxxxxxxxxxx" className={inputClass} />
          </div>
        </div>
      );
    case "ghost":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Ghost Site URL</label>
            <input type="url" placeholder="https://siteniz.ghost.io" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Admin API Key</label>
            <input type="password" placeholder="xxxx:xxxxxxxxxxxxxxxxxxxx" className={inputClass} />
          </div>
        </div>
      );
    case "ftp":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Host</label>
              <input type="text" placeholder="ftp.siteniz.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Port</label>
              <input type="number" placeholder="21" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Kullanıcı Adı</label>
              <input type="text" placeholder="kullanici" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Şifre</label>
              <input type="password" placeholder="••••••••" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Hedef Klasör</label>
            <input type="text" placeholder="/public_html/blog/" className={inputClass} />
          </div>
        </div>
      );
    case "github":
    case "gitlab":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Repository URL</label>
            <input type="url" placeholder="https://github.com/kullanici/repo" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Personal Access Token</label>
            <input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>İçerik Klasörü</label>
            <input type="text" placeholder="content/posts/" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Branch</label>
            <input type="text" placeholder="main" className={inputClass} />
          </div>
        </div>
      );
    case "webhook":
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Webhook URL</label>
            <input type="url" placeholder="https://siteniz.com/api/publish" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Authorization Header (opsiyonel)</label>
            <input type="password" placeholder="Bearer xxxxxxxxxxxx" className={inputClass} />
          </div>
        </div>
      );
    default:
      return (
        <div className="space-y-4">
          <div>
            <label className={labelClass}>API URL</label>
            <input type="url" placeholder="https://api.siteniz.com" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>API Anahtarı</label>
            <input type="password" placeholder="sk_xxxxxxxxxxxxxxxxxxxx" className={inputClass} />
          </div>
        </div>
      );
  }
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [channel, setChannel] = useState<PublishingChannel>("wordpress");

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-ui font-medium transition-colors border-b-2 ${
      tab === t
        ? "border-emerald text-emerald"
        : "border-transparent text-muted hover:text-text"
    }`;

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-ui font-bold text-text">Proje Ayarları</h2>

      {/* Tab Navigasyonu */}
      <div className="flex border-b border-border">
        <button className={tabClass("general")} onClick={() => setTab("general")}>
          Genel
        </button>
        <button className={tabClass("publishing")} onClick={() => setTab("publishing")}>
          Yayınlama
        </button>
        <button className={tabClass("external-links")} onClick={() => setTab("external-links")}>
          Dış Linkler
        </button>
      </div>

      {/* Genel Tab */}
      {tab === "general" && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-ui font-semibold text-text">Proje Bilgileri</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-ui font-medium text-muted mb-1.5">
                Proje Adı
              </label>
              <input
                type="text"
                placeholder="Benim Projem"
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text
                  placeholder-muted font-ui focus:outline-none focus:border-emerald/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-ui font-medium text-muted mb-1.5">
                Website URL
              </label>
              <input
                type="url"
                placeholder="https://siteniz.com"
                className="w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text
                  placeholder-muted font-ui focus:outline-none focus:border-emerald/50 transition-colors"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              disabled
              className="px-5 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold
                opacity-50 cursor-not-allowed"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Yayınlama Tab */}
      {tab === "publishing" && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-ui font-semibold text-text">Yayınlama Kanalı</h3>
            <div className="space-y-2">
              {CHANNELS.map((ch) => (
                <label
                  key={ch.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    channel === ch.id
                      ? "border-emerald/50 bg-elevated"
                      : "border-border hover:border-border/80 hover:bg-elevated/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="channel"
                    value={ch.id}
                    checked={channel === ch.id}
                    onChange={() => setChannel(ch.id)}
                    className="accent-emerald"
                  />
                  <span className="text-base">{ch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-ui font-medium text-text leading-tight">{ch.label}</p>
                    <p className="text-xs text-muted font-ui leading-tight">{ch.description}</p>
                  </div>
                  {channel === ch.id && (
                    <span className="w-2 h-2 rounded-full bg-emerald flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-ui font-semibold text-text">
              {CHANNELS.find((c) => c.id === channel)?.label} Bağlantı Ayarları
            </h3>
            <ChannelFields channel={channel} />
            <div className="pt-2 flex items-center gap-3 justify-end">
              <button
                disabled
                className="px-4 py-2 rounded-lg border border-border text-muted text-sm font-ui
                  opacity-50 cursor-not-allowed"
              >
                Bağlantıyı Test Et
              </button>
              <button
                disabled
                className="px-5 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold
                  opacity-50 cursor-not-allowed"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dış Linkler Tab */}
      {tab === "external-links" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted font-ui">
              Makalelerinizde otomatik eklenecek dış link kaynakları.
            </p>
            <button
              disabled
              className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold
                opacity-50 cursor-not-allowed"
            >
              + Yeni Kaynak Ekle
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-ui">
                <thead>
                  <tr className="border-b border-border bg-elevated/50">
                    <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">
                      Anahtar Kelime
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">
                      URL
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">
                      Etiket
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">
                      Aktif
                    </th>
                    <th className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">
                      Aksiyonlar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <p className="text-muted text-sm">
                        Henüz dış link kaynağı eklenmedi.
                      </p>
                      <p className="text-muted/60 text-xs mt-1">
                        "Yeni Kaynak Ekle" butonu ile başlayın.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
