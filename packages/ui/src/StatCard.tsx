import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  trend?: number; // +/- yüzde
  color?: string; // tailwind text-* sınıfı
}

export function StatCard({ title, value, description, icon, trend, color = "text-emerald" }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-muted text-xs font-ui uppercase tracking-wider">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <div className="flex items-end gap-2">
          <p className={`text-3xl font-display font-bold ${color}`}>{value}</p>
          {trend !== undefined && (
            <span
              className={`text-xs font-ui mb-1 flex items-center gap-0.5 ${
                trend >= 0 ? "text-emerald" : "text-red-400"
              }`}
            >
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-xs text-muted font-ui mt-1">{description}</p>
      </div>
    </div>
  );
}
