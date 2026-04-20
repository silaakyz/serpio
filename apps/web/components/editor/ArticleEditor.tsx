"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { diffWords } from "diff";
import type { Article } from "@serpio/database";

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-ui transition-colors ${
        active
          ? "bg-emerald text-void"
          : "text-muted hover:text-text hover:bg-elevated"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Diff View ────────────────────────────────────────────────────────────────

function DiffView({ original, updated }: { original: string; updated: string }) {
  const strippedOriginal = original.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const strippedUpdated = updated.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  const parts = diffWords(strippedOriginal, strippedUpdated);

  return (
    <div className="p-4 text-sm font-ui leading-relaxed text-text whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <span key={i} className="bg-emerald/20 text-emerald">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={i} className="bg-red-500/20 text-red-400 line-through">
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

interface Props {
  article: Article;
}

type ViewMode = "split" | "diff";
type ActiveTab = "original" | "ai";

export function ArticleEditor({ article }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [activeTab, setActiveTab] = useState<ActiveTab>("ai");
  const [saving, setSaving] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: "AI içeriği henüz oluşturulmadı..." }),
    ],
    content: article.aiContent ?? article.originalContent,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[400px] p-4 focus:outline-none font-ui text-text",
      },
    },
  });

  const handleApprove = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiContent: editor?.getHTML(),
          status: "ready",
        }),
      });
      if (!res.ok) throw new Error("Kaydetme hatası");
      setSaveMsg("Kaydedildi ve hazır işaretlendi ✓");
      setTimeout(() => setSaveMsg(null), 3000);
      router.refresh();
    } catch {
      setSaveMsg("Hata oluştu!");
    } finally {
      setSaving(false);
    }
  }, [article.id, editor, router]);

  const handleRewrite = useCallback(async () => {
    setRewriting(true);
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: article.projectId,
          articleId: article.id,
          type: "rewrite",
        }),
      });
      if (!res.ok) throw new Error("Job tetikleme hatası");
      const data = await res.json();
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch {
      setSaveMsg("Job tetiklenemedi!");
    } finally {
      setRewriting(false);
    }
  }, [article.id, article.projectId, router]);

  const internalLinks = (article.internalLinks as { text: string; url: string; keyword: string }[]) ?? [];
  const externalLinks = (article.externalLinks as { text: string; url: string; keyword: string }[]) ?? [];
  const aiKeywords = (article.aiKeywords as string[]) ?? [];
  const hasAiContent = !!article.aiContent;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-ui font-bold text-text truncate max-w-xl">
            {article.aiTitle ?? article.title}
          </h2>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-tech-blue hover:underline"
          >
            {article.originalUrl}
          </a>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex items-center bg-elevated border border-border rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode("split")}
              className={`px-3 py-1 rounded text-xs font-ui transition-colors ${
                viewMode === "split" ? "bg-emerald text-void" : "text-muted hover:text-text"
              }`}
            >
              Yan Yana
            </button>
            <button
              onClick={() => setViewMode("diff")}
              className={`px-3 py-1 rounded text-xs font-ui transition-colors ${
                viewMode === "diff" ? "bg-emerald text-void" : "text-muted hover:text-text"
              }`}
            >
              Diff
            </button>
          </div>

          {saveMsg && (
            <span className="text-xs font-ui text-emerald bg-emerald/10 px-3 py-1.5 rounded-lg border border-emerald/30">
              {saveMsg}
            </span>
          )}

          <button
            onClick={handleRewrite}
            disabled={rewriting}
            className="px-4 py-2 rounded-lg border border-tech-blue/40 text-tech-blue text-sm font-ui hover:bg-tech-blue/10 transition-colors disabled:opacity-50"
          >
            {rewriting ? "Yönlendiriliyor..." : "AI ile Tekrar Yaz"}
          </button>

          <button
            onClick={handleApprove}
            disabled={saving || !hasAiContent}
            className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold hover:bg-emerald/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Onayla & Hazır İşaretle"}
          </button>

          <button
            disabled
            className="px-4 py-2 rounded-lg bg-gold/20 text-gold text-sm font-ui font-semibold opacity-50 cursor-not-allowed"
            title="FAZ 6'da aktif olacak"
          >
            Yayınla
          </button>
        </div>
      </div>

      {/* Diff Mode */}
      {viewMode === "diff" && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-elevated/50">
            <span className="text-sm font-ui text-text font-semibold">Değişiklikler</span>
            <span className="ml-3 text-xs text-muted font-ui">
              <span className="text-emerald">Yeşil</span> = eklenen ·{" "}
              <span className="text-red-400 line-through">Kırmızı</span> = silinen
            </span>
          </div>
          {hasAiContent ? (
            <DiffView original={article.originalContent} updated={article.aiContent!} />
          ) : (
            <div className="py-16 text-center text-muted text-sm font-ui">
              AI içeriği henüz oluşturulmadı. "AI ile Tekrar Yaz" butonunu kullanın.
            </div>
          )}
        </div>
      )}

      {/* Split Mode */}
      {viewMode === "split" && (
        <>
          {/* Mobile: tabs */}
          <div className="flex md:hidden border-b border-border">
            <button
              onClick={() => setActiveTab("original")}
              className={`flex-1 py-2 text-sm font-ui transition-colors ${
                activeTab === "original"
                  ? "text-text border-b-2 border-emerald"
                  : "text-muted"
              }`}
            >
              Orijinal
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-2 text-sm font-ui transition-colors ${
                activeTab === "ai"
                  ? "text-text border-b-2 border-emerald"
                  : "text-muted"
              }`}
            >
              AI Güncellenmiş
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Orijinal Panel */}
            <div
              className={`${activeTab !== "original" ? "hidden md:block" : ""} bg-surface border border-border rounded-xl overflow-hidden`}
            >
              <div className="px-4 py-3 border-b border-border bg-elevated/50 flex items-center justify-between">
                <span className="text-sm font-ui font-semibold text-text">Orijinal</span>
                <span className="text-xs text-muted font-ui">Salt okunur</span>
              </div>
              <div
                className="prose prose-invert prose-sm max-w-none p-4 font-ui text-text min-h-[400px] overflow-y-auto max-h-[600px] text-opacity-70"
                dangerouslySetInnerHTML={{ __html: article.originalContent }}
              />
            </div>

            {/* AI Panel */}
            <div
              className={`${activeTab !== "ai" ? "hidden md:block" : ""} bg-surface border border-border rounded-xl overflow-hidden`}
            >
              <div className="px-4 py-3 border-b border-border bg-elevated/50 flex items-center gap-2">
                <span className="text-sm font-ui font-semibold text-text">AI Güncellenmiş</span>
                <span className="text-xs bg-emerald/10 text-emerald border border-emerald/30 px-2 py-0.5 rounded-full font-ui">
                  Düzenlenebilir
                </span>
              </div>

              {/* Tiptap Toolbar */}
              {editor && (
                <div className="px-3 py-2 border-b border-border bg-elevated/30 flex flex-wrap gap-1">
                  <ToolbarButton
                    title="Kalın"
                    active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                  >
                    <strong>B</strong>
                  </ToolbarButton>
                  <ToolbarButton
                    title="İtalik"
                    active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                  >
                    <em>I</em>
                  </ToolbarButton>
                  <div className="w-px bg-border mx-1" />
                  <ToolbarButton
                    title="H2 Başlık"
                    active={editor.isActive("heading", { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  >
                    H2
                  </ToolbarButton>
                  <ToolbarButton
                    title="H3 Başlık"
                    active={editor.isActive("heading", { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  >
                    H3
                  </ToolbarButton>
                  <div className="w-px bg-border mx-1" />
                  <ToolbarButton
                    title="Madde Listesi"
                    active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                  >
                    • Liste
                  </ToolbarButton>
                  <ToolbarButton
                    title="Numaralı Liste"
                    active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  >
                    1. Liste
                  </ToolbarButton>
                  <div className="w-px bg-border mx-1" />
                  <ToolbarButton
                    title="Geri Al"
                    onClick={() => editor.chain().focus().undo().run()}
                  >
                    ↩
                  </ToolbarButton>
                  <ToolbarButton
                    title="Yinele"
                    onClick={() => editor.chain().focus().redo().run()}
                  >
                    ↪
                  </ToolbarButton>
                </div>
              )}

              {hasAiContent ? (
                <div className="overflow-y-auto max-h-[600px]">
                  <EditorContent editor={editor} />
                </div>
              ) : (
                <div className="py-16 text-center text-muted text-sm font-ui">
                  AI içeriği henüz oluşturulmadı.
                  <br />
                  <button
                    onClick={handleRewrite}
                    className="mt-3 text-emerald hover:underline text-sm"
                  >
                    → AI ile Yaz
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Meta & Keywords & Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Başlık karşılaştırma + Meta */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-ui font-semibold text-text">Başlık & Meta</h3>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-muted font-ui uppercase tracking-wider mb-1">Orijinal Başlık</p>
              <p className="text-sm text-text/70 font-ui">{article.title}</p>
            </div>
            {article.aiTitle && (
              <div>
                <p className="text-xs text-muted font-ui uppercase tracking-wider mb-1">AI Başlık</p>
                <p className="text-sm text-emerald font-ui">{article.aiTitle}</p>
              </div>
            )}
            {article.aiMetaDesc && (
              <div>
                <p className="text-xs text-muted font-ui uppercase tracking-wider mb-1">
                  Meta Açıklama ({article.aiMetaDesc.length}/155)
                </p>
                <p className="text-xs text-text/70 font-ui leading-relaxed">{article.aiMetaDesc}</p>
              </div>
            )}
          </div>
        </div>

        {/* Keywords */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-ui font-semibold text-text">Anahtar Kelimeler</h3>
          {aiKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {aiKeywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs bg-tech-blue/10 text-tech-blue border border-tech-blue/30 px-2 py-1 rounded-full font-ui"
                >
                  {kw}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted font-ui">Henüz anahtar kelime yok.</p>
          )}
        </div>
      </div>

      {/* Link Suggestions */}
      {(internalLinks.length > 0 || externalLinks.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {internalLinks.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-ui font-semibold text-text">
                İç Link Önerileri
                <span className="ml-2 text-xs text-muted font-normal">({internalLinks.length})</span>
              </h3>
              <ul className="space-y-2">
                {internalLinks.map((link, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-ui">
                    <span className="text-emerald mt-0.5">→</span>
                    <div>
                      <span className="text-text">{link.text}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-tech-blue hover:underline truncate max-w-xs"
                      >
                        {link.url}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {externalLinks.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-ui font-semibold text-text">
                Dış Link Önerileri
                <span className="ml-2 text-xs text-muted font-normal">({externalLinks.length})</span>
              </h3>
              <ul className="space-y-2">
                {externalLinks.map((link, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-ui">
                    <span className="text-gold mt-0.5">↗</span>
                    <div>
                      <span className="text-text">{link.text}</span>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-tech-blue hover:underline truncate max-w-xs"
                      >
                        {link.url}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
