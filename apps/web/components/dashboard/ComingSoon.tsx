"use client";

interface ComingSoonProps {
  icon: string;
  title: string;
  progress: number;
}

export function ComingSoon({ icon, title, progress }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-surface border border-border rounded-2xl p-10 max-w-md w-full text-center space-y-6">
        <div className="text-5xl">{icon}</div>

        <div className="space-y-2">
          <h2 className="text-xl font-ui font-bold text-text">{title}</h2>
          <p className="text-sm text-muted font-ui leading-relaxed">
            Bu özellik yakında aktif olacak. Geliştirme devam ediyor.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-ui">
            <span className="text-muted">Geliştirme İlerlemesi</span>
            <span className="text-text font-medium">%{progress}</span>
          </div>
          <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button
          disabled
          className="w-full py-2.5 px-4 rounded-xl border border-emerald/30 text-emerald text-sm font-ui
            hover:bg-emerald/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔔 Bildirim Al
        </button>
      </div>
    </div>
  );
}
