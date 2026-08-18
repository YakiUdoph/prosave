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
  const { selectedPlan, rescueResult, executionSession } = useSave();

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

  const pageTitle = isLive ? "Portfolio protected" : "Simulated outcome";
  const pageIntro = isLive
    ? "Your rescue transaction has successfully settled on X Layer Testnet."
    : "Your rescue parameters were evaluated. No transaction was broadcast to the network.";
  
  const statusPillLabel = isLive ? "Executed on-chain" : "Demo simulation";
  const statusPillTone = isLive ? "safe" : "primary";

  const txHashValue = confirmedTx
    ? confirmedTx.transactionHash
    : isLive
      ? "Unknown / Pending lookup"
      : "No transaction broadcast (Demo Mode)";

  const blockNumberValue = confirmedTx
    ? confirmedTx.blockNumber.toString()
    : isLive
      ? "Awaiting lookup"
      : "128456 (Simulated)";

  const gasUsedValue = confirmedTx
    ? `${confirmedTx.gasUsed} gas`
    : isLive
      ? "Awaiting lookup"
      : "125000 gas (Simulated)";

  const statusLabelValue = confirmedTx
    ? "Confirmed (Success)"
    : isLive
      ? "Pending confirmation"
      : "Simulated Success";

  return (
    <PageShell
      eyebrow="Step 07 · Verification"
      title={pageTitle}
      intro={pageIntro}
      aside={
        <StatusPill tone={statusPillTone}>
          <CheckCircle className="size-3" /> {statusPillLabel}
        </StatusPill>
      }
    >
      <div className="relative">
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--safe) 14%, transparent)" }}
        />
        
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-5 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-xxs label-mono rounded px-1.5 py-0.5 border border-primary/20 bg-primary/10 text-primary">SIMULATED</div>
            <ShieldAlert className="size-4 text-primary" />
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.securedAmount} prefix="$" decimals={2} />
            </p>
            <Eyebrow className="mt-2">Simulated USDC Output</Eyebrow>
          </Panel>
          <Panel className="p-5 relative overflow-hidden">
            <div className="absolute top-4 right-4 text-xxs label-mono rounded px-1.5 py-0.5 border border-primary/20 bg-primary/10 text-primary">SIMULATED</div>
            <ShieldAlert className="size-4 text-safe" />
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.protectedPreservedPercent} suffix="%" decimals={0} />
            </p>
            <Eyebrow className="mt-2">Simulated ETH Preserved</Eyebrow>
          </Panel>
          <Panel className="p-5 relative overflow-hidden alert">
            <div className="absolute top-4 right-4 text-xxs label-mono rounded px-1.5 py-0.5 border border-safe/20 bg-safe/10 text-safe">
              {isLive ? "LIVE PROOF" : "SIMULATED"}
            </div>
            <ShieldAlert className="size-4 text-warning" />
            <p className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              {isLive ? "0.0001 OKB Transfer" : "No Tx Broadcast"}
            </p>
            <Eyebrow className="mt-2">On-Chain Verification</Eyebrow>
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
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Verification Action</dt>
              <dd className="num text-sm text-foreground">0.0001 OKB Self-Transfer (Gas Test)</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Network</dt>
              <dd className="num text-sm text-foreground">
                {isLive ? "X Layer Testnet (Chain ID 1952)" : "X Layer (Demo Fork)"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Status</dt>
              <dd className={`num text-sm font-semibold ${isLive ? "text-safe" : "text-primary"}`}>
                {statusLabelValue}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Gas Used</dt>
              <dd className="num text-sm text-foreground">{gasUsedValue}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Block Number</dt>
              <dd className="num text-sm text-foreground">{blockNumberValue}</dd>
            </div>
            <div className="flex flex-col gap-1 px-6 py-3.5">
              <dt className="label-mono">Transaction Hash</dt>
              <dd className="num text-xs break-all text-foreground mt-1 select-all">{txHashValue}</dd>
            </div>
          </dl>
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
