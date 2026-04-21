export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 border animate-pulse"
            style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F", animationDelay: `${i * 80}ms` }}
          >
            <div className="h-3 w-20 rounded mb-3" style={{ backgroundColor: "#1A2744" }} />
            <div className="h-8 w-16 rounded mb-2" style={{ backgroundColor: "#1A2744" }} />
            <div className="h-2.5 w-28 rounded" style={{ backgroundColor: "#1A2744" }} />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div
        className="rounded-xl border p-5 animate-pulse"
        style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F" }}
      >
        <div className="h-4 w-32 rounded mb-4" style={{ backgroundColor: "#1A2744" }} />
        <div className="h-48 rounded" style={{ backgroundColor: "#1A2744" }} />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border p-5 space-y-3 animate-pulse"
            style={{ backgroundColor: "#0D1526", borderColor: "#1E3A5F", animationDelay: `${i * 100}ms` }}
          >
            <div className="h-4 w-24 rounded" style={{ backgroundColor: "#1A2744" }} />
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="h-3 rounded" style={{ backgroundColor: "#1A2744", width: `${50 + j * 10}%` }} />
                <div className="h-5 w-12 rounded" style={{ backgroundColor: "#1A2744" }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
