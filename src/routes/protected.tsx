import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Key } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, MagneticButton, Panel, StatusPill, AnimatedNumber } from "@/components/save/primitives";
import { SimulationTimeline } from "@/components/save/simulation-timeline";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/protected")({
  head: () => ({
    meta: [
      { title: "Rescue Authorization Ready — SAVE" },
      {
        name: "description",
        content:
          "USDC secured, ETH preserved — with a full simulation transaction receipt and protection history.",
      },
      { property: "og:title", content: "Rescue Authorization Ready — SAVE" },
      {
        property: "og:description",
        content: "Mission complete: goal reached, long-term holdings untouched.",
      },
    ],
  }),
  component: Success,
});

function Success() {
  const { selectedPlan, rescueResult, portfolio, parsedIntent, simulationResult } = useSave();

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
    "Ready for wallet authorization",
  ];

  return (
    <PageShell
      eyebrow="Step 07 · Verification"
      title="Rescue plan authorized"
      intro="Your rescue parameters are compiled. Awaiting wallet signature to submit transactions."
      aside={
        <StatusPill tone="primary">
          <Key className="size-3" /> Awaiting Signature
        </StatusPill>
      }
    >
      <div className="relative">
        <div
          aria-hidden
          className="animate-drift pointer-events-none absolute -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "color-mix(in oklab, var(--safe) 14%, transparent)" }}
        />
        
        {/* Dynamic SuccessSummary inline */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel className="p-5">
            <ShieldAlert className="size-4 text-primary" />
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.securedAmount} prefix="$" decimals={2} />
            </p>
            <Eyebrow className="mt-2">USDC to be secured</Eyebrow>
          </Panel>
          <Panel className="p-5">
            <ShieldAlert className="size-4 text-safe" />
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.protectedPreservedPercent} suffix="%" decimals={0} />
            </p>
            <Eyebrow className="mt-2">ETH preserved</Eyebrow>
          </Panel>
          <Panel className="p-5">
            <ShieldAlert className="size-4 text-warning" />
            <p className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={lossAvoided} prefix="$" decimals={2} />
            </p>
            <Eyebrow className="mt-2">Loss avoided (DEMO)</Eyebrow>
          </Panel>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        
        {/* Dynamic TransactionReceipt inline */}
        <Panel className="p-0">
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <Key className="size-3.5 text-primary" />
            <Eyebrow>Simulation Receipt (Awaiting Signature)</Eyebrow>
          </div>
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Target Received</dt>
              <dd className="num text-sm text-foreground">{activePlan.securedAmount.toFixed(2)} USDC</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Swaps to Execute</dt>
              <dd className="num text-sm text-foreground">{soldAssetsList || "None (Existing USDC covers target)"}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Preservation State</dt>
              <dd className="num text-sm text-safe">{activePlan.protectedPreservedPercent}% preserved</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Connected Network</dt>
              <dd className="num text-sm text-foreground">X Layer Testnet (Chain 1952)</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">DEX Aggregator</dt>
              <dd className="num text-sm text-foreground">OKX DEX Router (mainnet 196 reference)</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Required Gas</dt>
              <dd className="num text-sm text-foreground">${activePlan.gasCostUsd.toFixed(2)}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 px-6 py-3.5">
              <dt className="label-mono">Transaction Hash</dt>
              <dd className="num text-sm text-warning font-semibold">Not Broadcast (Awaiting user signature)</dd>
            </div>
          </dl>
        </Panel>

        <div className="space-y-6">
          <Panel className="p-6">
            <Eyebrow>Execution trace</Eyebrow>
            <div className="mt-6">
              <SimulationTimeline steps={[...traceSteps, "Awaiting wallet signature"]} autoRun={true} />
            </div>
          </Panel>

          <Panel className="p-6">
            <Eyebrow>Protection history (DEMO)</Eyebrow>
            <ul className="mt-5 divide-y divide-border">
              <li className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm">Rescue compiled · {activePlan.securedAmount.toFixed(0)} USDC simulation</p>
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
