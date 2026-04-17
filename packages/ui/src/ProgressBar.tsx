interface ProgressBarProps {
  value: number; // 0-100
  color?: string; // hex veya tailwind bg-* sınıfı
  size?: "sm" | "default" | "lg";
}

const SIZE_MAP = {
  sm:      "h-1",
  default: "h-1.5",
  lg:      "h-2.5",
};

export function ProgressBar({ value, color, size = "default" }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const heightClass = SIZE_MAP[size];

  return (
    <div className={`w-full ${heightClass} bg-elevated rounded-full overflow-hidden`}>
      <div
        className={`h-full rounded-full transition-all duration-500 ${color ?? "bg-emerald"}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
