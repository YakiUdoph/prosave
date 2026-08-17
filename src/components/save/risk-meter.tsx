import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Eyebrow } from "./primitives";

export function RiskMeter({
  level,
  className,
}: {
  /** 0–100, higher = riskier */
  level: number;
  className?: string;
}) {
  const [v, setV] = useState(6);
  useEffect(() => {
    const t = setTimeout(() => setV(level), 150);
    return () => clearTimeout(t);
  }, [level]);

  const label = v > 66 ? "HIGH" : v > 33 ? "ELEVATED" : "LOW";
  const tone = v > 66 ? "text-danger" : v > 33 ? "text-warn" : "text-safe";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between">
        <Eyebrow>Risk level</Eyebrow>
        <span className={cn("num text-lg font-semibold tracking-tight", tone)}>{label}</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-[1600ms] ease-out"
          style={{
            width: `${v}%`,
            background:
              "linear-gradient(90deg, var(--safe), var(--warn) 55%, var(--danger) 100%)",
          }}
        />
        <div
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[left] duration-[1600ms] ease-out"
          style={{ left: `${v}%` }}
        />
      </div>
      <div className="label-mono flex justify-between">
        <span>Protected</span>
        <span>Exposed</span>
      </div>
    </div>
  );
}
