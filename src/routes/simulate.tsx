import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CircuitBoard } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import {
  AnimatedNumber,
  Eyebrow,
  MagneticButton,
  Panel,
  StatusPill,
} from "@/components/save/primitives";
import { SimulationTimeline } from "@/components/save/simulation-timeline";
import { SIMULATION, TIMELINE } from "@/lib/save-data";

export const Route = createFileRoute("/simulate")({
  head: () => ({
    meta: [
      { title: "Simulation Complete — SAVE" },
      {
        name: "description",
        content:
          "Expected output, gas, slippage, execution risk and route — every step simulated and safety-checked before you sign.",
      },
      { property: "og:title", content: "Simulation Complete — SAVE" },
      {
        property: "og:description",
        content: "See the exact outcome before you sign anything on-chain.",
      },
    ],
  }),
  component: Simulate,
});

function Simulate() {
  return (
    <PageShell
      eyebrow="Step 06 · Simulation"
      title="Simulation complete"
      intro="Executed against a forked state of X Layer. What you see is what settles."
      aside={
        <StatusPill tone="safe">
          <CircuitBoard className="size-3" /> All safety checks passed
        </StatusPill>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-6">
              <Eyebrow>Expected output</Eyebrow>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-primary">
                <AnimatedNumber value={SIMULATION.output} prefix="$" decimals={2} suffix=" USDC" />
              </p>
            </Panel>
            <Panel className="p-6">
              <Eyebrow>Execution risk</Eyebrow>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-safe">
                {SIMULATION.risk}
              </p>
            </Panel>
            <Panel className="p-6">
              <Eyebrow>Gas</Eyebrow>
              <p className="num mt-3 text-2xl font-semibold tracking-tight">
                <AnimatedNumber value={SIMULATION.gas} prefix="$" decimals={2} />
              </p>
            </Panel>
            <Panel className="p-6">
              <Eyebrow>Slippage</Eyebrow>
              <p className="num mt-3 text-2xl font-semibold tracking-tight">
                <AnimatedNumber value={SIMULATION.slippage} decimals={2} suffix="%" />
              </p>
            </Panel>
          </div>

          <Panel className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Eyebrow>Route</Eyebrow>
                <p className="num mt-2 text-sm font-semibold">{SIMULATION.route}</p>
              </div>
              <div className="num flex items-center gap-2 text-xs text-muted-foreground">
                <span>OKB</span>
                <ArrowRight className="size-3 text-primary" />
                <span>TKX</span>
                <ArrowRight className="size-3 text-primary" />
                <span className="text-primary">USDC</span>
              </div>
            </div>
          </Panel>

          <Link to="/protected" className="block">
            <MagneticButton className="w-full" size="lg">
              Protect My Portfolio <ArrowRight className="size-4" />
            </MagneticButton>
          </Link>
        </div>

        <Panel className="p-8">
          <Eyebrow>Execution timeline</Eyebrow>
          <div className="mt-6">
            <SimulationTimeline steps={TIMELINE} />
          </div>
          <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            Simulation is re-run immediately before signature. If conditions drift beyond your risk
            preference, SAVE aborts instead of executing.
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
