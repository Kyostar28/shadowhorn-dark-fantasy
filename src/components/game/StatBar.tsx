import { cn } from "@/lib/utils";

export function StatBar({
  value,
  max,
  color = "linear-gradient(90deg,#7f1d1d,#dc2626,#f87171)",
  className,
  label,
  showText = true,
}: {
  value: number;
  max: number;
  color?: string;
  className?: string;
  label?: string;
  showText?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn("relative h-4 bar-track", className)}>
      <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      {showText && (
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tracking-wide text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
          {label ? `${label} ` : ""}
          {Math.round(value)} / {Math.round(max)}
        </span>
      )}
    </div>
  );
}
