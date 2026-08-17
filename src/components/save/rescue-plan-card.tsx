import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/save-data";
import { AnimatedNumber, Panel, ProgressBar, StatusPill } from "./primitives";

export function RescuePlanCard({
  plan,
  selected,
  onSelect,
  delay = 0,
}: {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
  delay?: number;
}) {
  return (
    <div className="animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <Panel
        className={cn(
          "cursor-pointer p-5 transition-all duration-500",
          selected ? "elevated border-primary/45" : "opacity-85 hover:opacity-100",
        )}
      >
        <div onClick={onSelect} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect()}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{plan.summary}</p>
            </div>
            {plan.recommended ? (
              <StatusPill tone="primary">Recommended</StatusPill>
            ) : (
              <StatusPill>{`Plan ${plan.id}`}</StatusPill>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-4">
            <Metric label="Output" value={`$${plan.output.toFixed(2)}`} />
            <Metric label="Damage" value={plan.damage} />
            <Metric label="SAVE score" value={`${plan.score}`} />
          </div>

          <ProgressBar
            className="mt-4"
            value={plan.score}
            tone={selected ? "primary" : plan.score < 80 ? "warn" : "safe"}
          />

          <ul className="mt-5 space-y-2">
            {plan.actions.map((a) => (
              <li key={`${a.verb}-${a.asset}`} className="flex items-center gap-3 text-xs">
                <span
                  className={cn(
                    "label-mono w-10 shrink-0",
                    a.verb === "SELL" ? "text-danger" : "text-safe",
                  )}
                >
                  {a.verb}
                </span>
                <span className="num text-foreground">{a.amount}</span>
                <span className="text-muted-foreground">{a.asset}</span>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
              <AnimatedNumber
                value={plan.score}
                className="text-2xl font-semibold tracking-tight text-primary"
              />
              <span className="label-mono">selected plan score</span>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className="num mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
