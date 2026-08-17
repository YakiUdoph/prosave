import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Target } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, MagneticButton, Panel, StatusPill } from "@/components/save/primitives";
import { RescuePlanCard } from "@/components/save/rescue-plan-card";
import { ScoreDial } from "@/components/save/score-dial";
import { PLANS } from "@/lib/save-data";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/plan")({
  head: () => ({
    meta: [
      { title: "Your Optimized Rescue Plan — SAVE" },
      {
        name: "description",
        content:
          "Three candidate rescue plans scored on output, portfolio damage and execution safety, with the recommended plan highlighted.",
      },
      { property: "og:title", content: "Your Optimized Rescue Plan — SAVE" },
      {
        property: "og:description",
        content: "Reach your goal while preserving the assets you told SAVE to protect.",
      },
    ],
  }),
  component: RescuePlan,
});

function RescuePlan() {
  const { selectedPlan, setSelectedPlan } = useSave();
  const active = PLANS.find((p) => p.id === selectedPlan) ?? PLANS[1];

  return (
    <PageShell
      eyebrow="Step 05 · Rescue plan"
      title="Your optimized rescue plan"
      intro="SAVE evaluated 1,284 liquidity routes against your constraints. Plan B delivers the goal with the least portfolio damage."
      aside={
        <StatusPill tone="primary">
          <Target className="size-3" /> Objective matched
        </StatusPill>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-6">
          <Panel className="p-6">
            <Eyebrow>Objective</Eyebrow>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="glass-2 p-4">
                <Eyebrow>Receive</Eyebrow>
                <p className="num mt-2 text-xl font-semibold">$700 USDC</p>
              </div>
              <div className="glass-2 p-4">
                <Eyebrow>Protect</Eyebrow>
                <p className="num mt-2 flex items-center gap-2 text-xl font-semibold text-safe">
                  <Lock className="size-4" /> ETH
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="p-8">
            <ScoreDial score={active.score} label={`SAVE score · Plan ${active.id}`} />
            <div className="mt-6 rounded-lg border border-primary/25 bg-primary/8 p-5">
              <Eyebrow>Why this plan</Eyebrow>
              <p className="mt-3 text-sm leading-relaxed">
                Your ETH exposure is preserved while minimizing portfolio damage. High-slippage
                Token X exposure is cleared first, and OKB covers the remaining shortfall through the
                deepest available route.
              </p>
            </div>
          </Panel>

          <Link to="/simulate" className="block">
            <MagneticButton className="w-full" size="lg">
              Simulate plan {active.id} <ArrowRight className="size-4" />
            </MagneticButton>
          </Link>
        </div>

        <div className="space-y-4">
          <Eyebrow>Candidate plans</Eyebrow>
          {PLANS.map((plan, i) => (
            <RescuePlanCard
              key={plan.id}
              plan={plan}
              delay={i * 90}
              selected={plan.id === selectedPlan}
              onSelect={() => setSelectedPlan(plan.id)}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
