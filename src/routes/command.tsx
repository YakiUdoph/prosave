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
import { PORTFOLIO, PORTFOLIO_VALUE, POTENTIAL_EXPOSURE, PROTECTION_METRICS } from "@/lib/save-data";
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

function CommandCenter() {
  const { panic } = useSave();

  return (
    <PageShell
      eyebrow="Step 03 · Command center"
      title="Portfolio risk command center"
      intro={
        panic
          ? "Market volatility detected. SAVE recommendation ready."
          : "A single, calm view of exposure, protection quality and what needs attention right now."
      }
      aside={<StatusPill tone={panic ? "danger" : "primary"}>{panic ? "Panic mode active" : "Calm monitoring"}</StatusPill>}
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
                <AnimatedNumber value={PORTFOLIO_VALUE} prefix="$" />
              </p>
            </Panel>
            <Panel className="p-5" alert={panic}>
              <Eyebrow>Potential exposure</Eyebrow>
              <p className="mt-3 flex items-center gap-2 text-3xl font-semibold tracking-tight text-danger">
                <TrendingDown className="size-5" />
                <AnimatedNumber value={Math.abs(POTENTIAL_EXPOSURE)} prefix="-$" />
              </p>
            </Panel>
            <Panel className="p-5">
              <Eyebrow>Protection status</Eyebrow>
              <p className="mt-3 text-lg font-semibold tracking-tight text-warn">Needs Attention</p>
              <StatusPill tone="warn" className="mt-3">
                2 positions flagged
              </StatusPill>
            </Panel>
          </div>

          <Panel className="p-6">
            <RiskMeter level={panic ? 84 : 74} />
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            {PORTFOLIO.map((asset, i) => (
              <PortfolioAssetCard key={asset.symbol} asset={asset} delay={i * 70} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Panel className="p-8">
            <ScoreDial score={82} />
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
