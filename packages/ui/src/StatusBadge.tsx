type ArticleStatus = "scraped" | "analyzing" | "ready" | "scheduled" | "published" | "failed";

const STATUS_CONFIG: Record<ArticleStatus, { label: string; classes: string }> = {
  scraped:   { label: "Tarandı",          classes: "bg-subtle/30 text-muted border-subtle/50" },
  analyzing: { label: "Analiz Ediliyor",  classes: "bg-sky-500/10 text-sky-400 border-sky-500/30" },
  ready:     { label: "Hazır",            classes: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  scheduled: { label: "Zamanlandı",       classes: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  published: { label: "Yayınlandı",       classes: "bg-emerald/10 text-emerald border-emerald/30" },
  failed:    { label: "Başarısız",        classes: "bg-red-500/10 text-red-400 border-red-500/30" },
};

interface StatusBadgeProps {
  status: ArticleStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-ui border ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

export type { ArticleStatus };
