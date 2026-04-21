export default function ArticlesLoading() {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-lg bg-elevated animate-pulse" />
        <div className="h-8 w-28 rounded-lg bg-elevated animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        {/* Header */}
        <div className="flex gap-4 px-4 py-3 border-b" style={{ borderColor: "#1E3A5F" }}>
          {[120, 60, 80, 80, 70].map((w, i) => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ width: w, backgroundColor: "#1A2744" }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b" style={{ borderColor: "#1E3A5F" }}>
            <div className="flex-1 h-3.5 rounded animate-pulse" style={{ backgroundColor: "#1A2744", animationDelay: `${i * 60}ms` }} />
            <div className="h-3.5 w-20 rounded animate-pulse" style={{ backgroundColor: "#1A2744", animationDelay: `${i * 60 + 20}ms` }} />
            <div className="h-3.5 w-16 rounded animate-pulse" style={{ backgroundColor: "#1A2744", animationDelay: `${i * 60 + 40}ms` }} />
            <div className="h-3.5 w-20 rounded animate-pulse" style={{ backgroundColor: "#1A2744", animationDelay: `${i * 60 + 60}ms` }} />
            <div className="h-3.5 w-16 rounded animate-pulse" style={{ backgroundColor: "#1A2744", animationDelay: `${i * 60 + 80}ms` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
