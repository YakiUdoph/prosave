import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, TrendingDown } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import {
  AnimatedNumber,
  Eyebrow,
  MagneticButton,
  Panel,
  ProgressBar,
  StatusPill,
} from "@/components/save/primitives";
import { PortfolioAssetCard } from "@/components/save/portfolio-asset-card";
import { RiskMeter } from "@/components/save/risk-meter";
import { ScoreDial } from "@/components/save/score-dial";
import { PROTECTION_METRICS } from "@/lib/save-data";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/command")({
  head: () => ({
    meta: [
      { title: "Portfolio Risk Command Center — SAVE" },
      {
        name: "description",
        content:
          "Live portfolio value, risk level, potential exposure and SAVE Protection Score metrics, with Panic Mode for volatile markets.",
      },
      { property: "og:title", content: "Portfolio Risk Command Center — SAVE" },
      {
        property: "og:description",
        content: "Risk level, exposure and protection metrics in one calm institutional view.",
      },
    ],
  }),
  component: CommandCenter,
});

import { useState } from "react";

function CommandCenter() {
  const { panic, portfolio, totalPortfolioValue, rpcStatus, rescueResult } = useSave();
  const [showDust, setShowDust] = useState(false);

  const highRiskValue = portfolio.filter((a) => a.risk === "high").reduce((sum, a) => sum + a.value, 0);
  const mediumRiskValue = portfolio.filter((a) => a.risk === "medium").reduce((sum, a) => sum + a.value, 0);
  const exposureValue = highRiskValue + Math.round(mediumRiskValue * 0.133);
  const flaggedCount = portfolio.filter((a) => a.risk === "high" || a.risk === "medium").length;

  const dustAssets = portfolio.filter((a) => a.value < 1.00);
  const nonDustAssets = portfolio.filter((a) => a.value >= 1.00);
  const dustTotalValue = dustAssets.reduce((sum, a) => sum + a.value, 0);
  
  const visibleAssets = showDust ? portfolio : nonDustAssets;

  // Prioritize sorting: high risk first, then by value descending
  const sortedAssets = [...visibleAssets].sort((a, b) => {
    const riskWeight = { high: 3, medium: 2, protected: 1 };
    if (riskWeight[a.risk] !== riskWeight[b.risk]) {
      return riskWeight[b.risk] - riskWeight[a.risk];
    }
    return b.value - a.value;
  });

  const recommendedPlan = rescueResult.plans.find((p) => p.id === "B");
  const activeScore = recommendedPlan?.score || 82;

  const stablecoinValue = portfolio
    .filter((a) => a.symbol === "USDC" || a.symbol === "USDT")
    .reduce((sum, a) => sum + a.value, 0);
  const stablecoinPercent = Math.round((stablecoinValue / (totalPortfolioValue || 1)) * 100);
  const highRiskPercent = Math.round((highRiskValue / (totalPortfolioValue || 1)) * 100);

  return (
    <PageShell
      eyebrow="Step 03 · Command center"
      title="Portfolio risk command center"
      intro={
        panic
          ? "Market volatility detected. SAVE recommendation ready."
          : "A single, calm view of exposure, protection quality and what needs attention right now."
      }
      aside={
        <div className="flex gap-2">
          {rpcStatus === "offline" && (
            <StatusPill tone="warn">Demo Mode (RPC Offline)</StatusPill>
          )}
          <StatusPill tone={panic ? "danger" : "primary"}>
            {panic ? "Panic mode active" : "Calm monitoring"}
          </StatusPill>
        </div>
      }
    >
      {panic && (
        <div className="animate-rise mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-danger/35 bg-danger/10 px-6 py-4 animate-risk-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-4 text-danger" />
            <p className="text-sm font-medium">
              Market volatility detected. SAVE recommendation ready.
            </p>
          </div>
          <Link to="/intent">
            <MagneticButton variant="danger">
              Review recommendation <ArrowRight className="size-4" />
            </MagneticButton>
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel className="p-5">
              <Eyebrow>Portfolio value</Eyebrow>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                <AnimatedNumber value={totalPortfolioValue} prefix="$" />
              </p>
            </Panel>
            <Panel className="p-5" alert={panic}>
              <Eyebrow>Potential exposure</Eyebrow>
              <p className="mt-3 flex items-center gap-2 text-3xl font-semibold tracking-tight text-danger">
                <TrendingDown className="size-5" />
                <AnimatedNumber value={exposureValue} prefix="-$" />
              </p>
            </Panel>
            <Panel className="p-5">
              <Eyebrow>Protection status</Eyebrow>
              <p className="mt-3 text-lg font-semibold tracking-tight text-warn">
                {flaggedCount > 0 ? "Needs Attention" : "Optimal Protection"}
              </p>
              <StatusPill tone={flaggedCount > 0 ? "warn" : "safe"} className="mt-3">
                {flaggedCount > 0 ? `${flaggedCount} position${flaggedCount > 1 ? "s" : ""} flagged` : "All risks mitigated"}
              </StatusPill>
            </Panel>
          </div>

          <Panel className="p-6">
            <RiskMeter level={panic ? 84 : 74} />
          </Panel>

          <Panel className="p-6">
            <Eyebrow>Institutional Telemetry Report</Eyebrow>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4 text-left">
              <div>
                <span className="text-xxs label-mono text-muted-foreground block">Chains Detected</span>
                <span className="num mt-1 block text-lg font-semibold">
                  {new Set(portfolio.map((a) => a.chainIndex || a.chain)).size}
                </span>
              </div>
              <div>
                <span className="text-xxs label-mono text-muted-foreground block">Assets Scanned</span>
                <span className="num mt-1 block text-lg font-semibold">{portfolio.length}</span>
              </div>
              <div>
                <span className="text-xxs label-mono text-muted-foreground block">Stablecoin Coverage</span>
                <span className="num mt-1 block text-lg font-semibold text-safe">
                  {stablecoinPercent}%
                </span>
              </div>
              <div>
                <span className="text-xxs label-mono text-muted-foreground block">High-Risk Exposure</span>
                <span className="num mt-1 block text-lg font-semibold text-danger">
                  {highRiskPercent}%
                </span>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            {sortedAssets.map((asset, i) => (
              <PortfolioAssetCard key={`${asset.chain}-${asset.symbol}`} asset={asset} delay={i * 70} />
            ))}
          </div>

          {dustAssets.length > 0 && (
            <button
              onClick={() => setShowDust(!showDust)}
              className="flex w-full items-center justify-between border border-border bg-secondary/15 hover:bg-secondary/35 transition-colors p-4 rounded-xl text-left"
            >
              <span className="text-xs text-muted-foreground">
                {showDust
                  ? `Showing all holdings (including ${dustAssets.length} dust assets)`
                  : `${dustAssets.length} dust assets hidden — $${dustTotalValue.toFixed(2)} total`}
              </span>
              <span className="label-mono text-xs text-primary">
                {showDust ? "[ Hide Dust ]" : "[ Show Dust ]"}
              </span>
            </button>
          )}
        </div>

        <div className="space-y-6">
          <Panel className="p-8">
            <ScoreDial score={activeScore} />
          </Panel>

          <Panel className="p-6">
            <Eyebrow>Protection metrics</Eyebrow>
            <ul className="mt-5 space-y-4">
              {PROTECTION_METRICS.map((m) => (
                <li key={m.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{m.label}</span>
                    <span className="num text-sm font-semibold">{m.value}</span>
                  </div>
                  <ProgressBar value={m.value} />
                </li>
              ))}
            </ul>
          </Panel>

          <Link to="/intent" className="block">
            <MagneticButton className="w-full" size="lg">
              Tell SAVE what you need <ArrowRight className="size-4" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

