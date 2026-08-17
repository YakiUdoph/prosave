import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SimulationTimeline({
  steps,
  interval = 700,
  className,
  autoRun = true,
}: {
  steps: string[];
  interval?: number;
  className?: string;
  autoRun?: boolean;
}) {
  const [done, setDone] = useState(autoRun ? 0 : steps.length);

  useEffect(() => {
    if (!autoRun) return;
    if (done >= steps.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), interval);
    return () => clearTimeout(t);
  }, [done, autoRun, interval, steps.length]);

  return (
    <ol className={cn("relative space-y-0", className)}>
      {steps.map((step, i) => {
        const complete = i < done;
        const active = i === done;
        return (
          <li key={step} className="relative flex items-start gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-6 left-[0.6875rem] h-full w-px transition-colors duration-700",
                  complete ? "bg-primary/50" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-500",
                complete
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : active
                    ? "border-primary/40 text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {complete ? (
                <Check className="size-3.5" />
              ) : active ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <span className="size-1.5 rounded-full bg-muted-foreground/60" />
              )}
            </span>
            <div className="pt-0.5">
              <p
                className={cn(
                  "text-sm transition-colors duration-500",
                  complete ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step}
              </p>
              <p className="label-mono mt-1">
                {complete ? "Passed" : active ? "Running" : "Queued"}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
