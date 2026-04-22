"use client";

import { useState } from "react";

interface ArticlePerf {
  id: string;
  title: string;
  originalUrl: string;
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  avgCtr: number;
  totalSessions: number;
  avgBounceRate: number;
  totalConversions: number;
}

interface Props {
  articles: ArticlePerf[];
}

type SortKey = keyof ArticlePerf;

export function PerformanceTable({ articles }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "totalClicks",
    dir: "desc",
  });

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" }
    );
  }

  const sorted = [...articles].sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    const diff = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sort.dir === "desc" ? -diff : diff;
  });

  function SortIcon({ col }: { col: SortKey }) {
    if (sort.key !== col) return <span className="text-border ml-1">↕</span>;
    return <span className="text-tech-blue ml-1">{sort.dir === "desc" ? "↓" : "↑"}</span>;
  }

  if (articles.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <p className="text-2xl mb-2">📊</p>
        <p className="text-text font-ui font-semibold">Henüz veri yok</p>
        <p className="text-sm text-muted font-ui mt-1">Veri senkronizasyonu yapın.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-ui">
          <thead>
            <tr className="border-b border-border bg-elevated">
              <th className="text-left px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium">
                Makale
              </th>
              {(
                [
                  { key: "totalClicks" as SortKey, label: "Tıklama" },
                  { key: "totalImpressions" as SortKey, label: "Gösterim" },
                  { key: "avgPosition" as SortKey, label: "Ort. Konum" },
                  { key: "avgCtr" as SortKey, label: "CTR" },
                  { key: "totalSessions" as SortKey, label: "Oturum" },
                  { key: "avgBounceRate" as SortKey, label: "Çıkma Oranı" },
                  { key: "totalConversions" as SortKey, label: "Dönüşüm" },
                ] as { key: SortKey; label: string }[]
              ).map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="text-right px-4 py-3 text-xs text-muted uppercase tracking-wider font-medium cursor-pointer select-none hover:text-text transition-colors"
                >
                  {label}
                  <SortIcon col={key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((a) => (
              <tr key={a.id} className="hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-3 max-w-xs">
                  <a
                    href={a.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text hover:text-tech-blue transition-colors line-clamp-1 font-medium"
                  >
                    {a.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-right text-text font-mono text-xs">
                  {a.totalClicks.toLocaleString("tr")}
                </td>
                <td className="px-4 py-3 text-right text-muted font-mono text-xs">
                  {a.totalImpressions.toLocaleString("tr")}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono text-xs ${
                      a.avgPosition <= 3
                        ? "text-emerald"
                        : a.avgPosition <= 10
                        ? "text-yellow-400"
                        : "text-muted"
                    }`}
                  >
                    {a.avgPosition > 0 ? a.avgPosition.toFixed(1) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted font-mono text-xs">
                  {a.avgCtr > 0 ? `${(a.avgCtr * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-3 text-right text-text font-mono text-xs">
                  {a.totalSessions.toLocaleString("tr")}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-mono text-xs ${
                      a.avgBounceRate > 0.7
                        ? "text-red-400"
                        : a.avgBounceRate > 0.4
                        ? "text-yellow-400"
                        : "text-emerald"
                    }`}
                  >
                    {a.avgBounceRate > 0 ? `${(a.avgBounceRate * 100).toFixed(0)}%` : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-emerald font-mono text-xs font-medium">
                  {a.totalConversions > 0 ? a.totalConversions.toLocaleString("tr") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
