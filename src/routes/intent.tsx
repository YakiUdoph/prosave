import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrainCircuit } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, Panel, StatusPill } from "@/components/save/primitives";
import { AIIntentBox } from "@/components/save/intent-box";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/intent")({
  head: () => ({
    meta: [
      { title: "Tell SAVE What You Need — Intent Console" },
      {
        name: "description",
        content:
          "Describe the outcome you need in plain language. SAVE extracts your goal, protected assets, risk preference and priority.",
      },
      { property: "og:title", content: "Tell SAVE What You Need — Intent Console" },
      {
        property: "og:description",
        content: "Outcome-first portfolio actions: goals in, optimized plan out.",
      },
    ],
  }),
  component: Intent,
});

function Intent() {
  const navigate = useNavigate();
  const {
    intent,
    setIntent,
    parsedIntent,
    portfolioMode,
    setPortfolioMode,
    scannedAddress,
    walletAddress,
    portfolio,
    totalPortfolioValue,
  } = useSave();
  const [parsed, setParsed] = useState(false);

  const highRiskValue = portfolio.filter((a) => a.risk === "high").reduce((sum, a) => sum + a.value, 0);
  const highRiskPercent = Math.round((highRiskValue / (totalPortfolioValue || 1)) * 100);
  const isSparse = portfolio.length < 2 || totalPortfolioValue < 15;

  const suggestions = portfolioMode === "DEMO_PORTFOLIO"
    ? [
        "Raise $1,100 USDC. Sell risky assets first, protect my ETH, and keep enough OKB for gas.",
        "Raise $1,000 in stablecoins. Sell risky assets first and preserve ETH.",
        "Reduce my high-risk exposure by 60% without touching my ETH.",
        "Build a $500 emergency USDC reserve using the least portfolio-damaging exits."
      ]
    : isSparse
      ? [
          "Keep at least 0.05 OKB reserved for gas.",
          "Show me whether this portfolio has enough liquid value to raise $20 USDC.",
          "Reduce risk while preserving enough OKB for X Layer gas."
        ]
      : [
          `Get me $${Math.round(totalPortfolioValue * 0.5)} USDC.`,
          "Reduce risk while preserving native gas.",
          "Liquidate volatile positions."
        ];

  const targetAmount = parsedIntent.targetAmount || 0;
  const isFeasible = targetAmount <= totalPortfolioValue;

  const formattedIntent = [
    {
      label: "Target",
      value: parsedIntent.targetAmount
        ? `${parsedIntent.targetAmount.toLocaleString("en-US")} ${parsedIntent.targetAsset || "USDC"}`
        : "None",
    },
    {
      label: "Protected",
      value: parsedIntent.protectedAssets.length > 0 ? parsedIntent.protectedAssets.join(", ") : "None",
    },
    {
      label: "Objective",
      value:
        parsedIntent.objective === "MINIMIZE_DAMAGE"
          ? "Minimum portfolio damage"
          : parsedIntent.objective === "REDUCE_RISK"
            ? "Reduce risk"
            : parsedIntent.objective === "EXIT_EXPOSURE"
              ? "Exit exposure"
              : "Maximize liquidity",
    },
    {
      label: "Policy",
      value:
        parsedIntent.protectedAssetPolicy === "LAST_RESORT"
          ? parsedIntent.protectedAssets.includes("ETH")
            ? "Sell ETH only as last resort"
            : "Sell protected only as last resort"
          : "Never sell protected assets",
    },
  ];

  return (
    <PageShell
      eyebrow="Step 04 · Intent"
      title="What outcome do you want from this portfolio?"
      intro="Describe the result you want. SAVE will determine which assets can be used, what should be protected, and whether the target is achievable."
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
          <StatusPill tone="primary">
            <BrainCircuit className="size-3" /> Intent parser online
          </StatusPill>
        </div>
      }
    >
      {/* Portfolio Awareness Panel */}
      <Panel className="p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xxs label-mono text-muted-foreground block uppercase">Active Analysis Source</span>
            <span className="text-sm font-semibold mt-1 block">
              {portfolioMode === "LIVE_WALLET"
                ? `CONNECTED WALLET (${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)})`
                : portfolioMode === "WATCH_ONLY"
                  ? `WATCH-ONLY ADDRESS (${scannedAddress?.slice(0, 6)}...${scannedAddress?.slice(-4)})`
                  : "DEMO PORTFOLIO — SAMPLE DATA"}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-left">
            <div>
              <span className="text-xxs label-mono text-muted-foreground block uppercase">Portfolio Value</span>
              <span className="num text-sm font-semibold mt-0.5 block">${totalPortfolioValue.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-xxs label-mono text-muted-foreground block uppercase">Actionable Assets</span>
              <span className="num text-sm font-semibold mt-0.5 block">{portfolio.length}</span>
            </div>
            <div>
              <span className="text-xxs label-mono text-muted-foreground block uppercase">Protected Assets</span>
              <span className="text-xs font-semibold mt-0.5 block max-w-[120px] truncate">
                {portfolio.filter((a) => a.risk === "protected").map(a => a.symbol).join(", ") || "None"}
              </span>
            </div>
            <div>
              <span className="text-xxs label-mono text-muted-foreground block uppercase">Risk Concentration</span>
              <span className="num text-sm font-semibold mt-0.5 block text-danger">{highRiskPercent}%</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <AIIntentBox
          value={intent}
          onChange={setIntent}
          onSubmit={() => {
            setParsed(true);
            setTimeout(() => navigate({ to: "/plan" }), 1400);
          }}
          suggestions={suggestions}
        />

        <Panel className="p-6">
          <Eyebrow>Extracted constraints</Eyebrow>
          <dl className="mt-5 divide-y divide-border">
            {formattedIntent.map((row, i) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-6 py-4 transition-opacity duration-700"
                style={{ opacity: parsed ? 1 : 0.35, transitionDelay: `${i * 180}ms` }}
              >
                <dt className="label-mono">{row.label}</dt>
                <dd className="num text-sm font-semibold text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {parsed
              ? "Constraints locked. Building candidate rescue plans from simulated route parameters…"
              : "Submit an intent to see how SAVE structures it before planning."}
          </p>

          {targetAmount > 0 && (
            <div className="mt-6 border-t border-border pt-5 space-y-3">
              <Eyebrow>Target Feasibility Check</Eyebrow>
              {isFeasible ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-emerald-500 uppercase label-mono">Target Feasible</span>
                  </div>
                  <p className="text-xxs text-muted-foreground mt-1 leading-normal">
                    This portfolio contains enough aggregate liquid value to meet your target of ${targetAmount.toLocaleString()} {parsedIntent.targetAsset || "USDC"}.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-danger/20 bg-danger/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold text-danger uppercase label-mono">Target Not Currently Feasible</span>
                  </div>
                  <p className="text-xxs text-muted-foreground leading-normal">
                    Your current wallet does not contain enough swappable value to reach this target while maintaining the required OKB gas reserve.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIntent("")}
                      className="px-2.5 py-1.5 text-[10px] font-semibold rounded bg-secondary/50 text-foreground border border-border hover:bg-secondary transition cursor-pointer"
                    >
                      Adjust target
                    </button>
                    <button
                      type="button"
                      onClick={() => setPortfolioMode("DEMO_PORTFOLIO")}
                      className="px-2.5 py-1.5 text-[10px] font-semibold rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition cursor-pointer"
                    >
                      Explore with Demo Portfolio
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </PageShell>
  );
}

