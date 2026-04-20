"use client";

import { useState, useEffect, useCallback } from "react";

type Tab = "general" | "publishing" | "external-links";

type PublishingChannel =
  | "wordpress" | "shopify" | "ghost" | "webflow"
  | "headless" | "ftp" | "sftp" | "browser" | "github" | "gitlab" | "webhook";

const CHANNELS: { id: PublishingChannel; label: string; icon: string; description: string }[] = [
  { id: "wordpress", label: "WordPress",          icon: "🔷", description: "REST API ile yayınla" },
  { id: "shopify",   label: "Shopify",             icon: "🛍️", description: "Shopify Admin API (Yakında)" },
  { id: "ghost",     label: "Ghost",               icon: "👻", description: "Ghost Content API (Yakında)" },
  { id: "webflow",   label: "Webflow",             icon: "🌊", description: "Webflow CMS API (Yakında)" },
  { id: "headless",  label: "Headless CMS",        icon: "🧩", description: "Contentful, Sanity, Strapi (Yakında)" },
  { id: "ftp",       label: "FTP",                 icon: "📁", description: "FTP ile dosya yükle" },
  { id: "sftp",      label: "SFTP",                icon: "🔒", description: "Güvenli FTP ile dosya yükle" },
  { id: "browser",   label: "Tarayıcı Otomasyonu", icon: "🤖", description: "Playwright ile otomatik yayınlama (Yakında)" },
  { id: "github",    label: "GitHub",              icon: "🐙", description: "GitHub repo'ya MDX yaz" },
  { id: "gitlab",    label: "GitLab",              icon: "🦊", description: "GitLab repo'ya MDX yaz" },
  { id: "webhook",   label: "Webhook",             icon: "🔗", description: "Özel HTTP webhook endpoint" },
];

const UNSUPPORTED: PublishingChannel[] = ["shopify", "ghost", "webflow", "headless", "browser"];

// Kanal için gerekli config alanları
type FieldDef = { key: string; label: string; type: "text" | "url" | "password" | "number"; placeholder: string; hint?: string };

const CHANNEL_FIELDS: Record<PublishingChannel, FieldDef[]> = {
  wordpress: [
    { key: "url",         label: "WordPress Site URL",   type: "url",      placeholder: "https://siteniz.com" },
    { key: "username",    label: "Kullanıcı Adı",        type: "text",     placeholder: "admin" },
    { key: "appPassword", label: "Application Password", type: "password", placeholder: "xxxx xxxx xxxx xxxx xxxx xxxx", hint: "Kullanıcılar → Profil → Application Passwords" },
  ],
  shopify: [
    { key: "storeUrl",    label: "Shopify Store URL",    type: "url",      placeholder: "https://magazaniz.myshopify.com" },
    { key: "accessToken", label: "Admin API Access Token", type: "password", placeholder: "shpat_xxxxxxxxxxxxxxxxxxxx" },
  ],
  ghost: [
    { key: "url",        label: "Ghost Site URL",   type: "url",      placeholder: "https://siteniz.ghost.io" },
    { key: "adminApiKey",label: "Admin API Key",    type: "password", placeholder: "id:secret" },
  ],
  webflow: [
    { key: "apiToken",      label: "API Token",       type: "password", placeholder: "Webflow API token" },
    { key: "siteId",        label: "Site ID",          type: "text",     placeholder: "Site ID" },
    { key: "collectionId",  label: "Collection ID",    type: "text",     placeholder: "Blog collection ID" },
  ],
  headless: [
    { key: "apiUrl", label: "API URL",  type: "url",      placeholder: "https://api.siteniz.com" },
    { key: "apiKey", label: "API Key",  type: "password", placeholder: "sk_xxxxxxxxxxxxxxxxxxxx" },
  ],
  ftp: [
    { key: "host",       label: "Host",          type: "text",     placeholder: "ftp.siteniz.com" },
    { key: "port",       label: "Port",          type: "number",   placeholder: "21" },
    { key: "username",   label: "Kullanıcı Adı", type: "text",     placeholder: "kullanici" },
    { key: "password",   label: "Şifre",         type: "password", placeholder: "••••••••" },
    { key: "remotePath", label: "Hedef Klasör",  type: "text",     placeholder: "/public_html/blog/" },
  ],
  sftp: [
    { key: "host",       label: "Host",          type: "text",     placeholder: "sftp.siteniz.com" },
    { key: "port",       label: "Port",          type: "number",   placeholder: "22" },
    { key: "username",   label: "Kullanıcı Adı", type: "text",     placeholder: "kullanici" },
    { key: "password",   label: "Şifre",         type: "password", placeholder: "••••••••" },
    { key: "remotePath", label: "Hedef Klasör",  type: "text",     placeholder: "/var/www/html/blog/" },
  ],
  browser: [
    { key: "loginUrl",  label: "Giriş URL",    type: "url",      placeholder: "https://siteniz.com/wp-login.php" },
    { key: "adminUrl",  label: "Admin URL",    type: "url",      placeholder: "https://siteniz.com/wp-admin/post-new.php" },
    { key: "username",  label: "Kullanıcı Adı", type: "text",   placeholder: "admin" },
    { key: "password",  label: "Şifre",         type: "password", placeholder: "••••••••" },
  ],
  github: [
    { key: "repo",   label: "Repository",       type: "text",     placeholder: "kullanici/repo-adi" },
    { key: "branch", label: "Branch",            type: "text",     placeholder: "main" },
    { key: "path",   label: "İçerik Klasörü",   type: "text",     placeholder: "content/posts" },
    { key: "token",  label: "Personal Access Token", type: "password", placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx", hint: "repo write yetkisi gerekli" },
  ],
  gitlab: [
    { key: "instanceUrl", label: "GitLab URL",         type: "url",      placeholder: "https://gitlab.com" },
    { key: "projectId",   label: "Project ID / Path",  type: "text",     placeholder: "kullanici/repo-adi" },
    { key: "branch",      label: "Branch",              type: "text",     placeholder: "main" },
    { key: "path",        label: "İçerik Klasörü",     type: "text",     placeholder: "content/posts" },
    { key: "token",       label: "Access Token",        type: "password", placeholder: "glpat-xxxxxxxxxxxxxxxxxxxx" },
  ],
  webhook: [
    { key: "url",    label: "Webhook URL", type: "url",      placeholder: "https://siteniz.com/api/publish" },
    { key: "secret", label: "Secret Key",  type: "password", placeholder: "HMAC-SHA256 imzalama için gizli anahtar" },
  ],
};

interface ProjectData {
  id: string;
  name: string;
  websiteUrl: string;
  activeChannel: string;
  publishConfig: Record<string, Record<string, string>>;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");
  const [channel, setChannel] = useState<PublishingChannel>("wordpress");
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);

  // General form
  const [projName, setProjName] = useState("");
  const [projUrl, setProjUrl] = useState("");
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalMsg, setGeneralMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Publishing form — kanal bazlı field değerleri
  const [channelConfig, setChannelConfig] = useState<Record<string, string>>({});
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pubSaving, setPubSaving] = useState(false);
  const [pubMsg, setPubMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Proje bilgilerini yükle
  useEffect(() => {
    async function load() {
      setProjectLoading(true);
      try {
        const res = await fetch("/api/projects");
        if (!res.ok) return;
        const list = await res.json() as ProjectData[];
        if (list.length > 0) {
          const p = list[0];
          setProject(p);
          setProjName(p.name);
          setProjUrl(p.websiteUrl);
          setChannel((p.activeChannel as PublishingChannel) ?? "wordpress");
          setChannelConfig((p.publishConfig?.[p.activeChannel] as Record<string, string>) ?? {});
        }
      } finally {
        setProjectLoading(false);
      }
    }
    load();
  }, []);

  // Kanal değiştiğinde mevcut config'i yükle
  useEffect(() => {
    if (project) {
      setChannelConfig((project.publishConfig?.[channel] as Record<string, string>) ?? {});
      setTestResult(null);
      setPubMsg(null);
    }
  }, [channel, project]);

  const handleGeneralSave = useCallback(async () => {
    if (!project) return;
    setGeneralSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projName, websiteUrl: projUrl }),
      });
      if (!res.ok) throw new Error("Kaydetme hatası");
      setGeneralMsg({ ok: true, text: "Kaydedildi ✓" });
    } catch (err: unknown) {
      setGeneralMsg({ ok: false, text: err instanceof Error ? err.message : "Hata" });
    } finally {
      setGeneralSaving(false);
      setTimeout(() => setGeneralMsg(null), 3000);
    }
  }, [project, projName, projUrl]);

  const handleTest = useCallback(async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/publish/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, config: channelConfig }),
      });
      const data = await res.json() as { success: boolean; message: string };
      setTestResult({ ok: data.success, text: data.message });
    } catch {
      setTestResult({ ok: false, text: "Bağlantı hatası" });
    } finally {
      setTestLoading(false);
    }
  }, [channel, channelConfig]);

  const handlePublishSave = useCallback(async () => {
    if (!project) return;
    setPubSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeChannel: channel,
          publishConfig: { [channel]: channelConfig },
        }),
      });
      if (!res.ok) throw new Error("Kaydetme hatası");
      const updated = await res.json() as ProjectData;
      setProject(updated);
      setPubMsg({ ok: true, text: "Ayarlar kaydedildi ✓" });
    } catch (err: unknown) {
      setPubMsg({ ok: false, text: err instanceof Error ? err.message : "Hata" });
    } finally {
      setPubSaving(false);
      setTimeout(() => setPubMsg(null), 3000);
    }
  }, [project, channel, channelConfig]);

  const inputClass =
    "w-full bg-elevated border border-border rounded-lg px-3 py-2 text-sm text-text " +
    "placeholder-muted font-ui focus:outline-none focus:border-emerald/50 transition-colors";
  const labelClass = "block text-xs font-ui font-medium text-muted mb-1.5";
  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-ui font-medium transition-colors border-b-2 ${
      tab === t ? "border-emerald text-emerald" : "border-transparent text-muted hover:text-text"
    }`;

  if (projectLoading) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted text-sm font-ui">Yükleniyor...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted text-sm font-ui">Proje bulunamadı. Önce bir tarama başlatın.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-ui font-bold text-text">Proje Ayarları</h2>

      {/* Tab Navigasyonu */}
      <div className="flex border-b border-border">
        <button className={tabClass("general")} onClick={() => setTab("general")}>Genel</button>
        <button className={tabClass("publishing")} onClick={() => setTab("publishing")}>Yayınlama</button>
        <button className={tabClass("external-links")} onClick={() => setTab("external-links")}>Dış Linkler</button>
      </div>

      {/* Genel Tab */}
      {tab === "general" && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-ui font-semibold text-text">Proje Bilgileri</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Proje Adı</label>
              <input
                type="text"
                value={projName}
                onChange={(e) => setProjName(e.target.value)}
                placeholder="Benim Projem"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Website URL</label>
              <input
                type="url"
                value={projUrl}
                onChange={(e) => setProjUrl(e.target.value)}
                placeholder="https://siteniz.com"
                className={inputClass}
              />
            </div>
          </div>
          <div className="pt-2 flex items-center gap-3 justify-end">
            {generalMsg && (
              <span className={`text-xs font-ui ${generalMsg.ok ? "text-emerald" : "text-red-400"}`}>
                {generalMsg.text}
              </span>
            )}
            <button
              onClick={handleGeneralSave}
              disabled={generalSaving}
              className="px-5 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold hover:bg-emerald/90 transition-colors disabled:opacity-50"
            >
              {generalSaving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      )}

      {/* Yayınlama Tab */}
      {tab === "publishing" && (
        <div className="space-y-4">
          {/* Kanal seçimi */}
          <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-ui font-semibold text-text">Yayınlama Kanalı</h3>
            <div className="space-y-2">
              {CHANNELS.map((ch) => {
                const isUnsupported = UNSUPPORTED.includes(ch.id);
                return (
                  <label
                    key={ch.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isUnsupported
                        ? "border-border opacity-50 cursor-not-allowed"
                        : channel === ch.id
                        ? "border-emerald/50 bg-elevated cursor-pointer"
                        : "border-border hover:border-border/80 hover:bg-elevated/40 cursor-pointer"
                    }`}
                  >
                    <input
                      type="radio"
                      name="channel"
                      value={ch.id}
                      checked={channel === ch.id}
                      disabled={isUnsupported}
                      onChange={() => { if (!isUnsupported) setChannel(ch.id); }}
                      className="accent-emerald"
                    />
                    <span className="text-base">{ch.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-ui font-medium text-text leading-tight">{ch.label}</p>
                      <p className="text-xs text-muted font-ui leading-tight">{ch.description}</p>
                    </div>
                    {channel === ch.id && !isUnsupported && (
                      <span className="w-2 h-2 rounded-full bg-emerald flex-shrink-0" />
                    )}
                    {project.activeChannel === ch.id && (
                      <span className="text-xs text-emerald font-ui font-medium px-2 py-0.5 bg-emerald/10 rounded-full border border-emerald/30 flex-shrink-0">
                        Aktif
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Bağlantı ayarları */}
          {!UNSUPPORTED.includes(channel) && (
            <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-ui font-semibold text-text">
                {CHANNELS.find((c) => c.id === channel)?.label} Bağlantı Ayarları
              </h3>

              <div className="space-y-4">
                {(CHANNEL_FIELDS[channel] ?? []).map((field) => (
                  <div key={field.key}>
                    <label className={labelClass}>{field.label}</label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={channelConfig[field.key] ?? ""}
                      onChange={(e) =>
                        setChannelConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className={inputClass}
                    />
                    {field.hint && (
                      <p className="text-xs text-muted font-ui mt-1">{field.hint}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3 justify-end">
                {/* Test sonucu */}
                {testResult && (
                  <span
                    className={`text-xs font-ui px-3 py-1.5 rounded-lg border ${
                      testResult.ok
                        ? "text-emerald bg-emerald/10 border-emerald/30"
                        : "text-red-400 bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    {testResult.text}
                  </span>
                )}

                {pubMsg && (
                  <span
                    className={`text-xs font-ui px-3 py-1.5 rounded-lg border ${
                      pubMsg.ok
                        ? "text-emerald bg-emerald/10 border-emerald/30"
                        : "text-red-400 bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    {pubMsg.text}
                  </span>
                )}

                <button
                  onClick={handleTest}
                  disabled={testLoading}
                  className="px-4 py-2 rounded-lg border border-border text-muted text-sm font-ui hover:text-text hover:border-border/80 transition-colors disabled:opacity-50"
                >
                  {testLoading ? "Test ediliyor..." : "Bağlantıyı Test Et"}
                </button>

                <button
                  onClick={handlePublishSave}
                  disabled={pubSaving}
                  className="px-5 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold hover:bg-emerald/90 transition-colors disabled:opacity-50"
                >
                  {pubSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          )}
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
              className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold opacity-50 cursor-not-allowed"
            >
              + Yeni Kaynak Ekle
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-ui">
                <thead>
                  <tr className="border-b border-border bg-elevated/50">
                    {["Anahtar Kelime", "URL", "Etiket", "Aktif", "Aksiyonlar"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-muted font-medium text-xs uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <p className="text-muted text-sm">Henüz dış link kaynağı eklenmedi.</p>
                      <p className="text-muted/60 text-xs mt-1">"Yeni Kaynak Ekle" butonu ile başlayın.</p>
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
