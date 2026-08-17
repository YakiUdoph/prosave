import { ShieldCheck } from "lucide-react";
import { AnimatedNumber, Eyebrow, Panel } from "./primitives";

export function SuccessSummary() {
  const items = [
    { label: "USDC secured", value: 704, prefix: "$", decimals: 0 },
    { label: "ETH preserved", value: 0.842, prefix: "", decimals: 3 },
    { label: "Loss avoided", value: 84, prefix: "$", decimals: 0 },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item, i) => (
        <div key={item.label} className="animate-rise" style={{ animationDelay: `${i * 120}ms` }}>
          <Panel className="p-5">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 left-1/2 h-32 w-40 -translate-x-1/2 rounded-full opacity-60 blur-2xl"
              style={{ background: "color-mix(in oklab, var(--safe) 22%, transparent)" }}
            />
            <ShieldCheck className="size-4 text-safe" />
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber
                value={item.value}
                prefix={item.prefix}
                decimals={item.decimals}
                duration={1600}
              />
            </p>
            <Eyebrow className="mt-2">{item.label}</Eyebrow>
          </Panel>
        </div>
      ))}
    </div>
  );
}
