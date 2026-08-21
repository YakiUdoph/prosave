import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldAlert, Key, CheckCircle } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import { Eyebrow, MagneticButton, Panel, StatusPill, AnimatedNumber } from "@/components/save/primitives";
import { SimulationTimeline } from "@/components/save/simulation-timeline";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/protected")({
  head: () => ({
    meta: [
      { title: "SAVE — Rescue Result" },
      {
        name: "description",
        content: "Review the simulated rescue outcome and any optional X Layer wallet verification receipt.",
      },
      { property: "og:title", content: "SAVE — Rescue Result" },
      {
        property: "og:description",
        content: "Review a simulated rescue outcome separately from optional X Layer wallet verification.",
      },
    ],
  }),
  component: Success,
});

function Success() {
  const { selectedPlan, rescueResult, portfolioMode, walletAddress, simulationResult, walletVerification } = useSave();

  const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);

  const confirmedTx = walletVerification.transaction;
  const hasWalletVerificationReceipt = !!(
    walletVerification.state === "CONFIRMED" &&
    confirmedTx &&
    confirmedTx.transactionHash &&
    /^0x[a-fA-F0-9]{64}$/.test(confirmedTx.transactionHash) &&
    confirmedTx.status === "success" &&
    typeof confirmedTx.blockNumber === "number" &&
    confirmedTx.blockNumber > 0 &&
    confirmedTx.gasUsed &&
    confirmedTx.gasUsed !== "" &&
    confirmedTx.gasUsed !== "0"
  );
  const hasPendingVerification = walletVerification.state === "PENDING_CONFIRMATION" && !!walletVerification.activeTxHash;
  const hasDelayedVerification = walletVerification.state === "CONFIRMATION_TIMEOUT" && !!walletVerification.activeTxHash;
  const walletVerificationLabel = hasWalletVerificationReceipt
    ? "CONFIRMED"
    : hasPendingVerification
      ? "PENDING"
      : hasDelayedVerification
        ? "CONFIRMATION DELAYED"
        : "NOT PERFORMED";

  const demoSimulationCompleted = simulationResult?.success === true;

  const hasAnyResult = demoSimulationCompleted;

  if (!activePlan || !hasAnyResult) {
    return (
      <PageShell
        eyebrow="Step 07 · Verification"
        title="NO RESULT AVAILABLE"
        intro="Run a rescue simulation first to generate a result."
      >
        <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
          <ShieldAlert className="size-12 text-muted-foreground/45 mb-4" />
          <p className="text-muted-foreground max-w-sm leading-relaxed mb-8">
            No rescue simulation has been successfully completed for this session yet. Run a simulation to view its expected outcome.
          </p>
          <Link to="/simulate">
            <MagneticButton size="lg">Return to Simulation</MagneticButton>
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

  // Execution/Simulation timeline steps
  const traceSteps = ["Portfolio analyzed", "Simulated route parameters calculated", "Rescue plan validated"];

  const pageTitle = "SIMULATED RESCUE OUTCOME";
  const pageIntro = "Your rescue parameters were evaluated. The rescue strategy was not broadcast to any network.";
  
  const statusPillLabel = "SIMULATED RESCUE OUTCOME";
  const statusPillTone = "primary";

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
            <div className={`absolute top-4 right-4 text-[10px] label-mono rounded px-1.5 py-0.5 border ${hasWalletVerificationReceipt ? "border-safe/20 bg-safe/10 text-safe" : "border-muted/20 bg-muted/10 text-muted-foreground"}`}>
              {walletVerificationLabel}
            </div>
            <CheckCircle className={`size-4 ${hasWalletVerificationReceipt ? "text-safe" : "text-muted-foreground"}`} />
            <p className={`mt-4 text-xl font-semibold tracking-tight ${hasWalletVerificationReceipt ? "text-safe" : "text-muted-foreground"}`}>
              {walletVerificationLabel}
            </p>
            <Eyebrow className="mt-2">X LAYER WALLET VERIFICATION</Eyebrow>
          </Panel>
 
          <Panel className="p-5 relative overflow-hidden">
            <ShieldAlert className="size-4 text-primary" />
            <p className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.securedAmount} prefix="$" decimals={2} />
            </p>
            <Eyebrow className="mt-2">SIMULATED TARGET OUTPUT</Eyebrow>
          </Panel>
 
          <Panel className="p-5 relative overflow-hidden">
            <ShieldAlert className="size-4 text-safe" />
            <p className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              <AnimatedNumber value={activePlan.protectedPreservedPercent} suffix="%" decimals={0} />
            </p>
            <Eyebrow className="mt-2">SIMULATED ETH PRESERVED</Eyebrow>
          </Panel>
        </div>
      </div>
 
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Panel 1: Live On-Chain Verification Receipt */}
        <Panel className="p-0">
          {hasWalletVerificationReceipt ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-6 py-4 bg-safe/5">
                <Key className="size-3.5 text-safe" />
                <Eyebrow>X Layer Wallet Verification Receipt</Eyebrow>
              </div>
              <dl className="divide-y divide-border">
                <div className="flex items-center justify-between gap-6 px-6 py-3.5">
                  <dt className="label-mono">Verification Action</dt>
                  <dd className="num text-sm text-foreground">0.0001 OKB self-transfer</dd>
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
              <p className="border-t border-border px-6 py-4 text-xs leading-relaxed text-muted-foreground">
                This transaction verifies wallet authorization and X Layer Testnet settlement. It does not represent execution of the simulated rescue strategy.
              </p>
            </>
          ) : hasPendingVerification || hasDelayedVerification ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-6 py-4 bg-primary/5">
                <Key className="size-3.5 text-primary" />
                <Eyebrow>X Layer Wallet Verification {hasDelayedVerification ? "Confirmation Delayed" : "Pending"}</Eyebrow>
              </div>
              <div className="space-y-4 p-6 min-h-[300px]">
                <p className="text-sm text-muted-foreground">
                  The simulated rescue outcome remains complete. Wallet verification is awaiting an X Layer Testnet receipt.
                </p>
                <div>
                  <p className="label-mono">Transaction Hash</p>
                  <p className="mt-2 break-all font-mono text-xs select-all">{walletVerification.activeTxHash}</p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This transaction verifies wallet authorization and X Layer Testnet settlement. It does not execute the simulated rescue strategy.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border px-6 py-4 bg-secondary/5">
                <ShieldAlert className="size-3.5 text-muted-foreground" />
                <Eyebrow>X Layer Wallet Verification Not Performed</Eyebrow>
              </div>
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                <ShieldAlert className="size-8 text-muted-foreground/45 mb-3" />
                <p className="text-sm font-medium text-muted-foreground max-w-xs leading-relaxed">
                  This session contains a simulated rescue outcome only. Optional wallet verification was not performed.
                </p>
              </div>
            </>
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
              <dt className="label-mono">Route Parameters</dt>
              <dd className="num text-sm text-foreground">DEMO ROUTE ESTIMATE · OKX mainnet adapter reference</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <Eyebrow>Rescue plan validation steps</Eyebrow>
          <div className="mt-6">
            <SimulationTimeline steps={traceSteps} autoRun={false} />
          </div>
        </Panel>

        <Panel className="p-6">
          <Eyebrow>Protection history</Eyebrow>
          <ul className="mt-5 divide-y divide-border">
            {hasWalletVerificationReceipt && confirmedTx && (
              <li className="flex items-center justify-between gap-4 py-3.5">
                <div>
                  <p className="text-sm">X Layer wallet verification · confirmed</p>
                  <p className="label-mono mt-1">Today</p>
                </div>
                <span className="num text-sm font-semibold text-safe">1952</span>
              </li>
            )}
            <li className="flex items-center justify-between gap-4 py-3.5">
              <div>
                <p className="text-sm">Rescue simulated · {activePlan.securedAmount.toFixed(0)} USDC simulation</p>
                <p className="label-mono mt-1">Current session</p>
              </div>
              <span className="num text-sm font-semibold text-primary">{activePlan.saveScore}</span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel className="mt-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
              Your simulated rescue outcome is ready.
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
