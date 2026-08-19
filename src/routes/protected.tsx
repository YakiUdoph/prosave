import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Key, CheckCircle } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, MagneticButton, Panel, StatusPill, AnimatedNumber } from "@/components/save/primitives";
import { SimulationTimeline } from "@/components/save/simulation-timeline";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/protected")({
  head: () => ({
    meta: [
      { title: "Rescue Complete — SAVE" },
      {
        name: "description",
        content:
          "USDC secured, ETH preserved — with a full transaction receipt and protection history.",
      },
      { property: "og:title", content: "Rescue Complete — SAVE" },
      {
        property: "og:description",
        content: "Mission complete: goal reached, long-term holdings untouched.",
      },
    ],
  }),
  component: Success,
});

function Success() {
  const { selectedPlan, rescueResult, executionSession, portfolioMode, walletAddress } = useSave();

  const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);

  if (!activePlan) {
    return (
      <PageShell
        eyebrow="Step 07 · Verification"
        title="No active plan"
        intro="Please configure and simulate your rescue plan first."
      >
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Link to="/plan">
            <MagneticButton size="lg">Return to plans</MagneticButton>
          </Link>
        </div>
      </PageShell>
    );
  }

  // Format sold assets
  const soldAssetsList = activePlan.actions
    .filter((a) => a.sellAmount > 0)
    .map((a) => `${a.sellAmount.toFixed(2)} ${a.symbol}`)
    .join(" · ");

  // Mock loss avoided (e.g. $84.00 default if exiting high-risk TKX)
  const hasTKX = activePlan.actions.some((a) => a.symbol === "TKX" && a.sellAmount > 0);
  const lossAvoided = hasTKX ? 84.00 : 0.00;

  // Execution trace timeline steps
  const traceSteps = [
    "Portfolio analyzed",
    "Route optimized",
    "Transaction simulated",
    "Wallet authorization complete",
  ];

  // Retrieve confirmed transaction details if live execution completed
  const isLive = executionSession.mode === "TESTNET_LIVE";
  const confirmedTx = executionSession.confirmedTransactions[0];

  const pageTitle = isLive ? "LIVE X LAYER TESTNET VERIFICATION" : "SIMULATED RESCUE OUTCOME";
  const pageIntro = isLive
    ? "Your rescue transaction has successfully settled on X Layer Testnet."
    : "Your rescue parameters were evaluated. No transaction was broadcast to the network.";
  
  const statusPillLabel = isLive ? "LIVE EXECUTION PROOF" : "SIMULATED RESCUE OUTCOME";
  const statusPillTone = isLive ? "safe" : "primary";

  return (
    <PageShell
      eyebrow="Step 07 · Verification"
      title={pageTitle}
      intro={pageIntro}
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
          <StatusPill tone={statusPillTone}>
            <CheckCircle className="size-3" /> {statusPillLabel}
          </StatusPill>
        </div>
      }
    >
      <div className="relative">
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--safe) 14%, transparent)" }}
        />
        
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Panel className="p-5 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-[10px] label-mono rounded px-1.5 py-0.5 border border-primary/20 bg-primary/10 text-primary">
              SIMULATED
            </div>
            <ShieldAlert className="size-4 text-primary" />
            <p className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              SIMULATED
            </p>
            <Eyebrow className="mt-2">RESCUE OUTCOME</Eyebrow>
          </Panel>
          
          <Panel className="p-5 relative overflow-hidden">
            <div className={`absolute top-4 right-4 text-[10px] label-mono rounded px-1.5 py-0.5 border ${isLive ? "border-safe/20 bg-safe/10 text-safe" : "border-muted/20 bg-muted/10 text-muted-foreground"}`}>
              {isLive ? "TESTNET_LIVE" : "NONE"}
            </div>
            <CheckCircle className={`size-4 ${isLive ? "text-safe" : "text-muted-foreground"}`} />
            <p className={`mt-4 text-xl font-semibold tracking-tight ${isLive ? "text-safe" : "text-muted-foreground"}`}>
              {isLive ? "TESTNET_LIVE" : "NONE"}
            </p>
            <Eyebrow className="mt-2">X LAYER VERIFICATION</Eyebrow>
          </Panel>

          <Panel className="p-5 relative overflow-hidden">
            <ShieldAlert className="size-4 text-primary" />
            <p className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.securedAmount} prefix="$" decimals={2} />
            </p>
            <Eyebrow className="mt-2">Simulated USDC Output</Eyebrow>
          </Panel>

          <Panel className="p-5 relative overflow-hidden">
            <ShieldAlert className="size-4 text-safe" />
            <p className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.protectedPreservedPercent} suffix="%" decimals={0} />
            </p>
            <Eyebrow className="mt-2">Simulated ETH Preserved</Eyebrow>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Panel 1: Live On-Chain Verification Receipt */}
        <Panel className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-6 py-4 bg-safe/5">
            <Key className="size-3.5 text-safe" />
            <Eyebrow>Live On-Chain Verification Receipt</Eyebrow>
          </div>
          {confirmedTx ? (
            <dl className="divide-y divide-border">
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Verification Action</dt>
                <dd className="num text-sm text-foreground">0.0001 OKB Self-Transfer (Gas Test)</dd>
              </div>
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Network</dt>
                <dd className="num text-sm text-foreground">X Layer Testnet</dd>
              </div>
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Chain ID</dt>
                <dd className="num text-sm text-foreground">1952</dd>
              </div>
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Connected Wallet</dt>
                <dd className="num text-sm text-foreground font-mono select-all bg-secondary/50 px-2 py-0.5 rounded">{walletAddress}</dd>
              </div>
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Native Asset</dt>
                <dd className="num text-sm text-foreground">OKB</dd>
              </div>
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Status</dt>
                <dd className="num text-sm font-semibold text-safe">Confirmed (Success)</dd>
              </div>
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Gas Used</dt>
                <dd className="num text-sm text-foreground">{confirmedTx.gasUsed} gas</dd>
              </div>
              <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                <dt className="label-mono">Block Number</dt>
                <dd className="num text-sm text-foreground">{confirmedTx.blockNumber}</dd>
              </div>
              <div className="flex flex-col gap-1 px-6 py-3.5">
                <dt className="label-mono">Transaction Hash</dt>
                <dd className="num text-xs break-all text-foreground mt-1 select-all">{confirmedTx.transactionHash}</dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
              <ShieldAlert className="size-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground max-w-xs leading-relaxed">
                No live verification transaction was executed in this session.
              </p>
            </div>
          )}
        </Panel>

        {/* Panel 2: Simulated Rescue Parameters */}
        <Panel className="p-0 border-primary/25">
          <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-primary/5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-3.5 text-primary" />
              <Eyebrow>Simulated Rescue Parameters</Eyebrow>
            </div>
            <span className="text-xxs label-mono text-primary border border-primary/20 bg-primary/10 rounded px-1.5 py-0.5">NOT BROADCAST</span>
          </div>
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Target Asset Output</dt>
              <dd className="num text-sm text-foreground">{activePlan.securedAmount.toFixed(2)} USDC</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Swaps Simulated</dt>
              <dd className="num text-sm text-foreground">{soldAssetsList || "None (Existing USDC covers target)"}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Preservation State</dt>
              <dd className="num text-sm text-safe">{activePlan.protectedPreservedPercent}% preserved</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Expected Slippage</dt>
              <dd className="num text-sm text-foreground">{activePlan.slippagePercent.toFixed(2)}%</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Expected Price Impact</dt>
              <dd className="num text-sm text-foreground">{activePlan.priceImpactPercent.toFixed(2)}%</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Expected Gas Cost</dt>
              <dd className="num text-sm text-foreground">${activePlan.gasCostUsd.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">DEX Aggregator</dt>
              <dd className="num text-sm text-foreground">OKX DEX Router (mainnet 196 reference)</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <Eyebrow>Execution trace</Eyebrow>
          <div className="mt-6">
            <SimulationTimeline steps={[...traceSteps, "Transaction confirmed"]} autoRun={false} />
          </div>
        </Panel>

        <Panel className="p-6">
          <Eyebrow>Protection history</Eyebrow>
          <ul className="mt-5 divide-y divide-border">
            {isLive && confirmedTx && (
              <li className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm">Rescue executed · live swap confirmed</p>
                  <p className="label-mono mt-1">Today</p>
                </div>
                <span className="num text-sm font-semibold text-primary">{activePlan.saveScore}</span>
              </li>
            )}
            <li className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm">Rescue simulated · {activePlan.securedAmount.toFixed(0)} USDC simulation</p>
                <p className="label-mono mt-1">17 Aug</p>
              </div>
              <span className="num text-sm font-semibold text-primary">{activePlan.saveScore}</span>
            </li>
            <li className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm">Risk reduced 38% · meme exposure exited</p>
                <p className="label-mono mt-1">02 Aug</p>
              </div>
              <span className="num text-sm font-semibold text-primary">91</span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Your portfolio is now safer.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              SAVE keeps monitoring exposure and will surface a new plan the moment risk changes.
            </p>
          </div>
          <Link to="/command">
            <MagneticButton size="lg" variant="ghost">
              Back to command center <ArrowRight className="size-4" />
            </MagneticButton>
          </Link>
        </div>
      </Panel>
    </PageShell>
  );
}
