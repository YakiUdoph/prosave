import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Target, AlertTriangle } from "lucide-react";
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

import { useState } from "react";

function RescuePlan() {
  const { selectedPlan, setSelectedPlan, rescueResult, portfolio, parsedIntent, portfolioMode, setPortfolioMode } = useSave();
  const [showComparison, setShowComparison] = useState(false);

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
        title="Rescue plan not feasible"
        intro="The target amount could not be satisfied under your connected wallet assets."
        aside={
          <div className="flex gap-2">
            {portfolioMode === "LIVE_WALLET" ? (
              <StatusPill tone="safe">
                LIVE WALLET DATA
              </StatusPill>
            ) : (
              <StatusPill tone="warn">
                DEMO PORTFOLIO — SAMPLE DATA
              </StatusPill>
            )}
            <StatusPill tone="danger">
              Not Feasible
            </StatusPill>
          </div>
        }
      >
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border/80 bg-muted/10 rounded-xl max-w-2xl mx-auto my-8 animate-rise">
          <div className="size-14 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mb-4">
            <AlertTriangle className="size-7 text-danger animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Target Not Currently Feasible</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
            Your connected wallet balance is insufficient to cover the target rescue amount of ${parsedIntent.targetAmount || 700} under the current liquidity conditions.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <Link to="/intent">
              <button className="px-4 py-2 text-sm font-semibold rounded-md border border-border bg-background hover:bg-muted text-foreground transition">
                Modify Intent Settings
              </button>
            </Link>
            {portfolioMode === "LIVE_WALLET" && (
              <button
                onClick={() => setPortfolioMode("DEMO_PORTFOLIO")}
                className="px-4 py-2 text-sm font-semibold rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition animate-pulse"
              >
                Run this intent on Demo Portfolio
              </button>
            )}
          </div>
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
        <div className="flex gap-2">
          {portfolioMode === "LIVE_WALLET" ? (
            <StatusPill tone="safe">
              LIVE WALLET DATA
            </StatusPill>
          ) : (
            <StatusPill tone="warn">
              DEMO PORTFOLIO — SAMPLE DATA
            </StatusPill>
          )}
          <StatusPill tone="primary">
            <Target className="size-3" /> Objective matched
          </StatusPill>
        </div>
      }
    >
      {rescueResult.explanation && (
        <div className="animate-rise mb-6 rounded-xl border border-primary/25 bg-primary/5 px-6 py-4">
          <p className="text-xs text-muted-foreground leading-relaxed label-mono">
            {rescueResult.explanation}
          </p>
        </div>
      )}

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
            <div className="mb-4 flex items-center justify-between border-b border-border/40 pb-3">
              <Eyebrow>Plan Provenance</Eyebrow>
              <span className="text-xxs label-mono text-muted-foreground">
                {portfolioMode === "LIVE_WALLET" 
                  ? "Plan generated from live connected wallet" 
                  : "Plan generated from SAVE demo portfolio"}
              </span>
            </div>
            <ScoreDial score={active.score} label={`SAVE score · Plan ${active.id}`} />
            <div className="mt-6 rounded-lg border border-primary/25 bg-primary/8 p-5">
              <Eyebrow>Why this plan</Eyebrow>
              <p className="mt-3 text-sm leading-relaxed">
                {activeRaw?.whyRecommended || active.summary}
              </p>
            </div>
          </Panel>

          <Panel className="p-6">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className="flex w-full items-center justify-between font-semibold text-sm label-mono"
            >
              <span>[ {showComparison ? "Hide Strategy Comparison" : "Compare Rescue Strategies"} ]</span>
              <span className="text-primary">{showComparison ? "↑" : "↓"}</span>
            </button>

            {showComparison && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xxs label-mono">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="pb-2 text-muted-foreground font-normal">Metric</th>
                      {rescueResult.plans.map((p) => (
                        <th key={p.id} className={`pb-2 font-semibold ${p.id === selectedPlan ? "text-primary" : "text-foreground"}`}>
                          Plan {p.id} {p.id === rescueResult.recommendedPlanId && "(Rec)"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Time Horizon</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className="py-2 text-foreground font-semibold">
                          {p.timeHorizon} ({p.eta})
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Execution Cost</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className="py-2 text-foreground font-semibold">
                          ${p.gasCostUsd.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Slippage</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className="py-2 text-foreground font-semibold">
                          {p.slippagePercent.toFixed(2)}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Core Preservation</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className={`py-2 font-semibold ${p.protectedPreservedPercent === 100 ? "text-safe" : "text-danger"}`}>
                          {p.protectedPreservedPercent}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Stablecoin post</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className="py-2 text-foreground font-semibold">
                          {p.postRescueStablecoinPercent}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Meme/High-Risk post</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className="py-2 text-foreground font-semibold">
                          {p.postRescueHighRiskPercent}%
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Swaps / Tx Count</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className="py-2 text-foreground font-semibold">
                          {p.actions.length} swap{p.actions.length !== 1 && "s"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Readiness</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className={`py-2 font-semibold ${p.executionReadiness === "READY_TO_SIGN" ? "text-safe" : "text-warn"}`}>
                          {p.executionReadiness === "READY_TO_SIGN" ? "Ready" : "Bridge required"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 text-muted-foreground font-normal">Trade-off</td>
                      {rescueResult.plans.map((p) => (
                        <td key={p.id} className="py-2 text-xxs text-muted-foreground leading-normal" style={{ minWidth: "120px" }}>
                          {p.tradeOff}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 p-3 rounded bg-secondary/30 text-xxs label-mono text-muted-foreground border border-border/40">
              * Staged execution strategy — user authorization required at each stage. No autonomous background execution will occur.
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

