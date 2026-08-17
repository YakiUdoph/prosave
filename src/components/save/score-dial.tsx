import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./primitives";

export function ScoreDial({
  score,
  size = 180,
  label = "SAVE Protection Score",
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 180);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * progress) / 100}
            style={{
              transition: "stroke-dashoffset 1800ms cubic-bezier(0.22,1,0.36,1)",
              filter: "drop-shadow(0 0 12px color-mix(in oklab, var(--primary) 55%, transparent))",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatedNumber
            value={score}
            className="text-4xl font-semibold tracking-tight text-foreground"
          />
          <span className="label-mono mt-1">/ 100</span>
        </div>
      </div>
      <p className="label-mono mt-4 text-center">{label}</p>
    </div>
  );
}
