import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Target } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, MagneticButton, Panel, StatusPill } from "@/components/save/primitives";
import { RescuePlanCard } from "@/components/save/rescue-plan-card";
import { ScoreDial } from "@/components/save/score-dial";
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
  const { selectedPlan, setSelectedPlan, rescueResult, portfolio, parsedIntent } = useSave();

  // Map rescueResult CandidatePlans to the Plan interface expected by RescuePlanCard
  const mappedPlans = useMemo(() => {
    return rescueResult.plans.map((p) => {
      const actions: { verb: "SELL" | "KEEP"; amount: string; asset: string }[] = [];
      const targetSymbol = parsedIntent.targetAsset || "USDC";

      // Exclude USDC from actions breakdown to match baseline list compositing
      const candidatesList = portfolio.filter((a) => a.symbol !== targetSymbol);

      for (const asset of candidatesList) {
        const act = p.actions.find((a) => a.symbol === asset.symbol);
        if (act && act.sellAmount > 0) {
          const balance = parseFloat(asset.balance);
          const fraction = balance > 0 ? act.sellAmount / balance : 0;
          const percentage = Math.round(fraction * 100);
          actions.push({
            verb: "SELL",
            amount: `${percentage}%`,
            asset: asset.symbol === "TKX" ? "risky token exposure" : asset.symbol,
          });
        } else {
          actions.push({
            verb: "KEEP",
            amount: "100%",
            asset: asset.symbol === "TKX" ? "risky token exposure" : asset.symbol,
          });
        }
      }

      const damage = p.id === "A" ? "High" : p.id === "B" ? "Minimal" : "Very low";

      return {
        id: p.id,
        name: p.name,
        summary: p.description,
        score: p.saveScore,
        output: p.securedAmount,
        damage,
        recommended: p.id === rescueResult.recommendedPlanId,
        actions,
      };
    });
  }, [rescueResult, portfolio, parsedIntent]);

  const active = mappedPlans.find((p) => p.id === selectedPlan) ?? mappedPlans[0];
  const activeRaw = rescueResult.plans.find((p) => p.id === active?.id);

  if (!active) {
    return (
      <PageShell
        eyebrow="Step 05 · Rescue plan"
        title="No feasible rescue plans found"
        intro="The target amount could not be satisfied under your strict protection settings."
      >
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">Modify your target or ease your protection policy in the intent console.</p>
          <Link to="/intent" className="mt-6">
            <MagneticButton size="lg">Modify Intent</MagneticButton>
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Step 05 · Rescue plan"
      title="Your optimized rescue plan"
      intro={`SAVE evaluated liquidity routes against your constraints. Plan ${rescueResult.recommendedPlanId || "B"} delivers the goal with the least portfolio damage.`}
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
                <p className="num mt-2 text-xl font-semibold">
                  ${parsedIntent.targetAmount ? parsedIntent.targetAmount.toLocaleString("en-US") : "700"}{" "}
                  {parsedIntent.targetAsset || "USDC"}
                </p>
              </div>
              <div className="glass-2 p-4">
                <Eyebrow>Protect</Eyebrow>
                <p className="num mt-2 flex items-center gap-2 text-xl font-semibold text-safe">
                  <Lock className="size-4" />{" "}
                  {parsedIntent.protectedAssets.length > 0 ? parsedIntent.protectedAssets.join(", ") : "None"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="p-8">
            <ScoreDial score={active.score} label={`SAVE score · Plan ${active.id}`} />
            <div className="mt-6 rounded-lg border border-primary/25 bg-primary/8 p-5">
              <Eyebrow>Why this plan</Eyebrow>
              <p className="mt-3 text-sm leading-relaxed">
                {activeRaw?.whyRecommended || active.summary}
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
          {mappedPlans.map((plan, i) => (
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

