export default function AdminUsersLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
        <div className="h-5 w-28 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
      </div>

      <div className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: "#0D1526" }} />

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}>
        <div className="flex gap-4 px-4 py-3 border-b" style={{ borderColor: "#1E3A5F" }}>
          {[160, 100, 60, 60, 70, 100].map((w, i) => (
            <div key={i} className="h-3 rounded animate-pulse" style={{ width: w, backgroundColor: "#1A2744" }} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b items-center" style={{ borderColor: "#1E3A5F", animationDelay: `${i * 50}ms` }}>
            <div className="h-3.5 w-40 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
            <div className="h-3.5 w-24 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
            <div className="h-5 w-14 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
            <div className="h-3.5 w-12 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
            <div className="h-3.5 w-16 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
            <div className="flex gap-2">
              {[0, 1, 2].map((j) => (
                <div key={j} className="h-6 w-12 rounded animate-pulse" style={{ backgroundColor: "#1A2744" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
