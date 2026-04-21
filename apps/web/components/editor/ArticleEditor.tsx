"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { diffWords } from "diff";
import { toast } from "sonner";
import type { Article } from "@serpio/database";

const DRAFT_KEY = (id: string) => `serpio_draft_${id}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wordCount(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
}

function readingTime(words: number) {
  const mins = Math.round(words / 200);
  return mins < 1 ? "<1 dk" : `${mins} dk`;
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

function ToolbarButton({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button" title={title} onClick={onClick}
      className={`px-2 py-1 rounded text-xs font-ui transition-colors ${
        active ? "bg-emerald text-void" : "text-muted hover:text-text hover:bg-elevated"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Diff View ────────────────────────────────────────────────────────────────

function DiffView({ original, updated }: { original: string; updated: string }) {
  const parts = diffWords(
    original.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    updated.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  );
  return (
    <div className="p-4 text-sm font-ui leading-relaxed text-text whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.added)   return <span key={i} className="bg-emerald/20 text-emerald">{part.value}</span>;
        if (part.removed) return <span key={i} className="bg-red-500/20 text-red-400 line-through">{part.value}</span>;
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

interface Props { article: Article }
type ViewMode = "split" | "diff";
type ActiveTab = "original" | "ai";
type SaveStatus = "idle" | "saving" | "saved" | "autosaved";

export function ArticleEditor({ article }: Props) {
  const router = useRouter();
  const [viewMode, setViewMode]   = useState<ViewMode>("split");
  const [activeTab, setActiveTab] = useState<ActiveTab>("ai");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [rewriting, setRewriting]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Restore draft from localStorage ────────────────────────────────────────
  const initialContent = (() => {
    if (typeof window === "undefined") return article.aiContent ?? article.originalContent;
    const draft = localStorage.getItem(DRAFT_KEY(article.id));
    return draft ?? (article.aiContent ?? article.originalContent);
  })();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: "AI içeriği henüz oluşturulmadı..." }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "prose prose-invert prose-sm max-w-none min-h-[400px] p-4 focus:outline-none font-ui text-text",
      },
    },
  });

  // ── Auto-save to localStorage every 30s ────────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    autoSaveTimerRef.current = setInterval(() => {
      const html = editor.getHTML();
      localStorage.setItem(DRAFT_KEY(article.id), html);
      setSaveStatus("autosaved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 30_000);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [editor, article.id]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleApprove();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setViewMode((m) => m === "diff" ? "split" : "diff");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleApprove = useCallback(async () => {
    if (!editor) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiContent: editor.getHTML(), status: "ready" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Kaydetme hatası");
      localStorage.removeItem(DRAFT_KEY(article.id));
      setSaveStatus("saved");
      toast.success("Kaydedildi ve hazır işaretlendi ✓");
      setTimeout(() => setSaveStatus("idle"), 3000);
      router.refresh();
    } catch (err) {
      setSaveStatus("idle");
      toast.error(`Hata: ${err instanceof Error ? err.message : "Kaydetme başarısız"}`);
    }
  }, [article.id, editor, router]);

  // ── Rewrite ─────────────────────────────────────────────────────────────────
  const handleRewrite = useCallback(async () => {
    setRewriting(true);
    const tid = toast.loading("AI güncelleme kuyruğa ekleniyor 🤖");
    try {
      const res = await fetch("/api/jobs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: article.projectId, articleId: article.id, type: "rewrite" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Job tetikleme hatası");
      const data = await res.json();
      toast.success("AI güncelleme kuyruğa eklendi 🤖", { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(`Hata: ${err instanceof Error ? err.message : "Job tetiklenemedi"}`, { id: tid });
    } finally {
      setRewriting(false);
    }
  }, [article.id, article.projectId, router]);

  // ── Publish ─────────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    setPublishing(true);
    const tid = toast.loading("Yayınlanıyor...");
    try {
      const res = await fetch("/api/jobs/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: article.projectId, articleId: article.id }),
      });
      const data = await res.json() as { jobId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Yayınlama başlatılamadı");
      toast.success("Yayınlama başlatıldı ✓", { id: tid });
      router.push(`/dashboard/terminal?jobId=${data.jobId}`);
    } catch (err) {
      toast.error(`Hata: ${err instanceof Error ? err.message : "Yayınlama başarısız"}`, { id: tid });
    } finally {
      setPublishing(false);
    }
  }, [article.id, article.projectId, router]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const origWords = wordCount(article.originalContent);
  const aiWords   = editor ? wordCount(editor.getHTML()) : wordCount(article.aiContent ?? "");
  const hasAiContent = !!article.aiContent;

  const internalLinks = (article.internalLinks as { text: string; url: string; keyword: string }[]) ?? [];
  const externalLinks = (article.externalLinks as { text: string; url: string; keyword: string }[]) ?? [];
  const aiKeywords    = (article.aiKeywords as string[]) ?? [];

  // ── Save status label ────────────────────────────────────────────────────────
  const saveLabel = {
    idle:      "Ctrl+S ile kaydet",
    saving:    "Kaydediliyor...",
    saved:     "Kaydedildi ✓",
    autosaved: "Taslak kaydedildi",
  }[saveStatus];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-ui font-bold text-text truncate max-w-xl">
            {article.aiTitle ?? article.title}
          </h2>
          <a href={article.originalUrl} target="_blank" rel="noopener noreferrer"
             className="text-xs text-tech-blue hover:underline">
            {article.originalUrl}
          </a>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode */}
          <div className="flex items-center bg-elevated border border-border rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode("split")}
              className={`px-3 py-1 rounded text-xs font-ui transition-colors ${viewMode === "split" ? "bg-emerald text-void" : "text-muted hover:text-text"}`}>
              Yan Yana
            </button>
            <button onClick={() => setViewMode("diff")}
              className={`px-3 py-1 rounded text-xs font-ui transition-colors ${viewMode === "diff" ? "bg-emerald text-void" : "text-muted hover:text-text"}`}
              title="Ctrl+Shift+D">
              Diff
            </button>
          </div>

          {/* Save status */}
          <span className={`text-xs font-ui px-2 py-1 rounded ${
            saveStatus === "saved" ? "text-emerald bg-emerald/10" :
            saveStatus === "saving" ? "text-yellow-400 bg-yellow-400/10" :
            saveStatus === "autosaved" ? "text-tech-blue bg-tech-blue/10" :
            "text-muted"
          }`}>
            {saveLabel}
          </span>

          <button onClick={handleRewrite} disabled={rewriting}
            className="px-4 py-2 rounded-lg border border-tech-blue/40 text-tech-blue text-sm font-ui hover:bg-tech-blue/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {rewriting ? "Yönlendiriliyor..." : "AI ile Tekrar Yaz"}
          </button>

          <button onClick={handleApprove} disabled={saveStatus === "saving" || !hasAiContent}
            className="px-4 py-2 rounded-lg bg-emerald text-void text-sm font-ui font-semibold hover:bg-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ctrl+S">
            {saveStatus === "saving" ? "Kaydediliyor..." : "Onayla & Hazır İşaretle"}
          </button>

          <button onClick={handlePublish} disabled={publishing || article.status !== "ready"}
            className="px-4 py-2 rounded-lg bg-gold/20 text-gold text-sm font-ui font-semibold hover:bg-gold/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={article.status !== "ready" ? "Önce 'Onayla & Hazır İşaretle' butonuna basın" : "Yayınla"}>
            {publishing ? "Başlatılıyor..." : "Yayınla"}
          </button>
        </div>
      </div>

      {/* Word count bar */}
      <div className="flex items-center gap-4 text-xs font-ui text-muted">
        <span>Orijinal: <strong className="text-text">{origWords} kelime</strong> · {readingTime(origWords)}</span>
        {hasAiContent && (
          <span>
            AI: <strong className={aiWords > origWords ? "text-emerald" : "text-text"}>{aiWords} kelime</strong> · {readingTime(aiWords)}
            <span className={`ml-1.5 ${aiWords > origWords ? "text-emerald" : aiWords < origWords ? "text-yellow-400" : "text-muted"}`}>
              ({aiWords > origWords ? "+" : ""}{aiWords - origWords})
            </span>
          </span>
        )}
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
          <div className="flex md:hidden border-b border-border">
            {(["original", "ai"] as ActiveTab[]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-sm font-ui transition-colors ${activeTab === tab ? "text-text border-b-2 border-emerald" : "text-muted"}`}>
                {tab === "original" ? "Orijinal" : "AI Güncellenmiş"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Orijinal */}
            <div className={`${activeTab !== "original" ? "hidden md:block" : ""} bg-surface border border-border rounded-xl overflow-hidden`}>
              <div className="px-4 py-3 border-b border-border bg-elevated/50 flex items-center justify-between">
                <span className="text-sm font-ui font-semibold text-text">Orijinal</span>
                <span className="text-xs text-muted font-ui">Salt okunur</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none p-4 font-ui text-text min-h-[400px] overflow-y-auto max-h-[600px] text-opacity-70"
                   dangerouslySetInnerHTML={{ __html: article.originalContent }} />
            </div>

            {/* AI */}
            <div className={`${activeTab !== "ai" ? "hidden md:block" : ""} bg-surface border border-border rounded-xl overflow-hidden`}>
              <div className="px-4 py-3 border-b border-border bg-elevated/50 flex items-center gap-2">
                <span className="text-sm font-ui font-semibold text-text">AI Güncellenmiş</span>
                <span className="text-xs bg-emerald/10 text-emerald border border-emerald/30 px-2 py-0.5 rounded-full font-ui">
                  Düzenlenebilir
                </span>
              </div>

              {editor && (
                <div className="px-3 py-2 border-b border-border bg-elevated/30 flex flex-wrap gap-1">
                  <ToolbarButton title="Kalın (Ctrl+B)" active={editor.isActive("bold")}
                    onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
                  <ToolbarButton title="İtalik (Ctrl+I)" active={editor.isActive("italic")}
                    onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
                  <div className="w-px bg-border mx-1" />
                  <ToolbarButton title="H2 Başlık" active={editor.isActive("heading", { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
                  <ToolbarButton title="H3 Başlık" active={editor.isActive("heading", { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
                  <div className="w-px bg-border mx-1" />
                  <ToolbarButton title="Madde Listesi" active={editor.isActive("bulletList")}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}>• Liste</ToolbarButton>
                  <ToolbarButton title="Numaralı Liste" active={editor.isActive("orderedList")}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Liste</ToolbarButton>
                  <div className="w-px bg-border mx-1" />
                  <ToolbarButton title="Geri Al (Ctrl+Z)"
                    onClick={() => editor.chain().focus().undo().run()}>↩</ToolbarButton>
                  <ToolbarButton title="Yinele (Ctrl+Y)"
                    onClick={() => editor.chain().focus().redo().run()}>↪</ToolbarButton>
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
                  <button onClick={handleRewrite} className="mt-3 text-emerald hover:underline text-sm">
                    → AI ile Yaz
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Meta & Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-ui font-semibold text-text">Anahtar Kelimeler</h3>
          {aiKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {aiKeywords.map((kw) => (
                <span key={kw} className="text-xs bg-tech-blue/10 text-tech-blue border border-tech-blue/30 px-2 py-1 rounded-full font-ui">
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
                İç Link Önerileri <span className="text-xs text-muted font-normal">({internalLinks.length})</span>
              </h3>
              <ul className="space-y-2">
                {internalLinks.map((link, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-ui">
                    <span className="text-emerald mt-0.5">→</span>
                    <div>
                      <span className="text-text">{link.text}</span>
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                         className="block text-tech-blue hover:underline truncate max-w-xs">{link.url}</a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {externalLinks.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-ui font-semibold text-text">
                Dış Link Önerileri <span className="text-xs text-muted font-normal">({externalLinks.length})</span>
              </h3>
              <ul className="space-y-2">
                {externalLinks.map((link, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-ui">
                    <span className="text-gold mt-0.5">↗</span>
                    <div>
                      <span className="text-text">{link.text}</span>
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                         className="block text-tech-blue hover:underline truncate max-w-xs">{link.url}</a>
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
