import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Radar } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, MagneticButton, Panel, ProgressBar, StatusPill } from "@/components/save/primitives";
import { PortfolioAssetCard } from "@/components/save/portfolio-asset-card";
import { SCAN_STEPS } from "@/lib/save-data";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Portfolio Scan — SAVE" },
      {
        name: "description",
        content:
          "SAVE scans every holding, evaluates liquidity, finds exit routes and calculates your SAVE Protection Score.",
      },
      { property: "og:title", content: "Portfolio Scan — SAVE" },
      {
        property: "og:description",
        content: "Portfolio analysis of assets, liquidity, and simulated exit parameters.",
      },
    ],
  }),
  component: Scan,
});

function Scan() {
  const { portfolio, rpcStatus, totalPortfolioValue, portfolioMode, setPortfolioMode, scannedAddress } = useSave();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= SCAN_STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(t);
  }, [step]);

  const complete = step >= SCAN_STEPS.length;
  const progress = Math.round((step / SCAN_STEPS.length) * 100);
  const isSparse = portfolio.length < 2 || totalPortfolioValue < 15;

  return (
    <PageShell
      eyebrow="Step 02 · Analysis"
      title={complete ? "Portfolio analyzed" : "Analyzing your portfolio…"}
      intro={
        portfolioMode === "WATCH_ONLY" && scannedAddress
          ? `Public address analysis for ${scannedAddress.slice(0, 6)}...${scannedAddress.slice(-4)} · No wallet connected · No signing permissions granted`
          : "Every position is checked for depth, slippage and viable exit paths before a single action is proposed."
      }
      aside={
        <div className="flex gap-2">
          {portfolioMode === "LIVE_WALLET" ? (
            <StatusPill tone="safe">
              LIVE WALLET DATA
            </StatusPill>
          ) : portfolioMode === "WATCH_ONLY" ? (
            <StatusPill tone="primary">
              WATCH-ONLY PORTFOLIO
            </StatusPill>
          ) : (
            <StatusPill tone="warn">
              DEMO PORTFOLIO — SAMPLE DATA
            </StatusPill>
          )}
          <StatusPill tone={rpcStatus === "offline" && portfolioMode === "LIVE_WALLET" ? "warn" : (complete ? "safe" : "primary")}>
            <Radar className="size-3" /> {rpcStatus === "offline" && portfolioMode === "LIVE_WALLET" ? "RPC Offline" : (complete ? "Scan complete" : `Scanning ${progress}%`)}
          </StatusPill>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Panel className="h-fit p-6">
          <Eyebrow>Analysis pipeline</Eyebrow>
          <ul className="mt-5 space-y-4">
            {SCAN_STEPS.map((s, i) => (
              <li key={s} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={
                      i < step ? "text-sm text-foreground" : "text-sm text-muted-foreground"
                    }
                  >
                    {s}
                  </span>
                  <span className="label-mono">{i < step ? "OK" : i === step ? "…" : ""}</span>
                </div>
                <ProgressBar value={i < step ? 100 : 0} tone={i < step ? "primary" : "primary"} />
              </li>
            ))}
          </ul>

          {step > 1 && (
            <div className="mt-6 border-t border-border pt-5 space-y-3">
              <Eyebrow>Scan Telemetry</Eyebrow>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chains discovered</span>
                  <span className="num font-semibold text-foreground">
                    {step >= 2 ? new Set(portfolio.map((a) => a.chainIndex || a.chain)).size : "Calculating..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assets found</span>
                  <span className="num font-semibold text-foreground">
                    {step >= 3 ? portfolio.length : "Scanning..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Portfolio value</span>
                  <span className="num font-semibold text-primary">
                    {step >= 4 ? `$${totalPortfolioValue.toLocaleString()}` : "Valuing..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Relevant positions</span>
                  <span className="num font-semibold text-foreground">
                    {step >= 5 ? portfolio.filter((a) => a.value >= 1.0).length : "Classifying..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dust assets hidden</span>
                  <span className="num font-semibold text-muted-foreground">
                    {step >= 5 ? portfolio.filter((a) => a.value < 1.0).length : "Evaluating..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk concentrations</span>
                  <span className="num font-semibold text-danger">
                    {step >= 5 ? portfolio.filter((a) => a.risk === "high").length : "Analyzing..."}
                  </span>
                </div>
              </div>
            </div>
          )}

          {complete && (
            <Link to="/command" className="mt-8 block">
              <MagneticButton className="w-full">
                Open command center <ArrowRight className="size-4" />
              </MagneticButton>
            </Link>
          )}
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2">
          {portfolio.map((asset, i) =>
            i < Math.max(step, 1) ? (
              <PortfolioAssetCard key={`${asset.symbol}-${asset.chain}`} asset={asset} delay={i * 60} scanning={!complete} />
            ) : (
              <div key={`${asset.symbol}-${asset.chain}`} className="glass h-[236px] animate-pulse opacity-40" />
            ),
          )}
          {complete && portfolioMode !== "DEMO_PORTFOLIO" && isSparse && (
            <Panel className="col-span-full border border-dashed border-warn/40 bg-warn/5 p-6 flex flex-col items-center text-center justify-center min-h-[236px]">
              <div className="size-12 rounded-full bg-warn/10 border border-warn/20 flex items-center justify-center mb-3">
                <Radar className="size-6 text-warn animate-pulse" />
              </div>
              <h3 className="text-base font-semibold text-foreground uppercase tracking-wider text-xs label-mono">Limited Portfolio Detected</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
                This address contains too few actionable assets to demonstrate SAVE's full rescue engine.
              </p>
              <p className="text-xxs text-muted-foreground/60 mt-1 max-w-sm">
                Demo Portfolio uses clearly labeled sample assets and never changes or mixes with your live portfolio.
              </p>
              <div className="flex flex-wrap gap-3 mt-5">
                <Link to="/command">
                  <button className="px-4 py-2 text-xs font-semibold rounded-md border border-border bg-foreground text-background hover:bg-muted transition cursor-pointer">
                    Continue with this portfolio
                  </button>
                </Link>
                <button
                  onClick={() => setPortfolioMode("DEMO_PORTFOLIO")}
                  className="px-4 py-2 text-xs font-semibold rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                >
                  Explore with Demo Portfolio
                </button>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </PageShell>
  );
}

