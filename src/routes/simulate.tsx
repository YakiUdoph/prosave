import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CircuitBoard, AlertTriangle, HelpCircle, CheckCircle, Loader2 } from "lucide-react";
import { PageShell } from "@/components/save/page-shell";
import {
  AnimatedNumber,
  Eyebrow,
  MagneticButton,
  Panel,
  StatusPill,
} from "@/components/save/primitives";
import { SimulationTimeline } from "@/components/save/simulation-timeline";
import { useSave } from "@/lib/save-context";

export const Route = createFileRoute("/simulate")({
  head: () => ({
    meta: [
      { title: "Simulation Status — SAVE" },
      {
        name: "description",
        content:
          "Expected output, gas, slippage, execution risk and route — every step simulated and safety-checked before you sign.",
      },
      { property: "og:title", content: "Simulation Status — SAVE" },
      {
        property: "og:description",
        content: "See the exact outcome before you sign anything on-chain.",
      },
    ],
  }),
  component: Simulate,
});

function Simulate() {
  const {
    selectedPlan,
    rescueResult,
    executionState,
    simulationResult,
    quoteTimestamp,
    runSimulation,
    chainId,
    executionSession,
    startExecution,
    executeNextStep,
    connected,
    portfolio,
    walletAddress,
  } = useSave();

  const navigate = useNavigate();

  const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);

  // Trigger simulation auto-run on component mount if IDLE
  useEffect(() => {
    if (executionState === "IDLE") {
      runSimulation("DEMO_SIMULATION");
    }
  }, [executionState, runSimulation]);

  // Handle auto-start execution session when simulation succeeds
  useEffect(() => {
    if (executionState === "SIMULATION_READY" && executionSession.steps.length === 0) {
      const okbAsset = portfolio.find((a) => a.symbol === "OKB");
      const okbBalance = okbAsset ? parseFloat(okbAsset.balance) : 0;
      const minGasRequirement = 0.001;

      const canActivateTestnetLive =
        connected &&
        chainId === 1952 &&
        okbBalance > minGasRequirement;

      startExecution(canActivateTestnetLive ? "TESTNET_LIVE" : "DEMO_SIMULATION");
    }
  }, [executionState, executionSession.steps.length, startExecution, connected, chainId, portfolio]);

  // Auto-navigate to protected page when execution successfully completes
  useEffect(() => {
    if (executionSession.state === "COMPLETE") {
      navigate({ to: "/protected" });
    }
  }, [executionSession.state, navigate]);

  if (!activePlan) {
    return (
      <PageShell
        eyebrow="Step 06 · Simulation"
        title="Simulation unavailable"
        intro="No active rescue plan was found to simulate."
      >
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">Please select a plan in the rescue center first.</p>
          <Link to="/plan" className="mt-6">
            <MagneticButton size="lg">Select Plan</MagneticButton>
          </Link>
        </div>
      </PageShell>
    );
  }

  // Calculate quote age
  const quoteAgeSec = Math.round((Date.now() - quoteTimestamp) / 1000);
  const isQuoteStale = quoteAgeSec >= 60;

  // Derive execution trace steps
  const traceSteps = [
    "Wallet connection verified",
    `Connected chain ID ${chainId || "1952"} validated`,
    "Rescue plan feasibility checked",
    "Protected asset constraints evaluated",
    "ERC-20 allowances determined",
    "Execution gas reserve calculated",
  ];

  // Add active execution step if running
  if (executionSession.steps.length > 0) {
    const activeStep = executionSession.steps[executionSession.currentStepIndex];
    if (activeStep) {
      traceSteps.push(
        `Execute step ${executionSession.currentStepIndex + 1}: ${activeStep.type.toUpperCase()} ${activeStep.symbol}`
      );
    }
  }

  // Derive execution risk label
  const riskLabel = activePlan.saveScore >= 85 ? "LOW" : activePlan.saveScore >= 70 ? "MEDIUM" : "HIGH";

  // Derive execution status text & button actions
  let statusText = "Ready to authorize";
  let buttonLabel = "Authorize Rescue Plan";
  let showLoader = false;
  let errorMsg = "";

  if (executionSession.state === "AWAITING_WALLET_SIGNATURE") {
    statusText = "Waiting for wallet authorization";
    buttonLabel = "Signing...";
    showLoader = true;
  } else if (executionSession.state === "BROADCASTING") {
    statusText = "Waiting for wallet authorization";
    buttonLabel = "Broadcasting...";
    showLoader = true;
  } else if (executionSession.state === "PENDING_CONFIRMATION") {
    statusText = "Transaction broadcast — awaiting confirmation";
    buttonLabel = "Confirming...";
    showLoader = true;
  } else if (executionSession.state === "USER_REJECTED") {
    statusText = "Signature request rejected by user. You can retry.";
    buttonLabel = "Retry Authorization";
    errorMsg = "Signature rejected by user.";
  } else if (executionSession.state === "CONFIRMATION_TIMEOUT") {
    statusText = "Confirmation is taking longer than expected. Transaction hash: " + (executionSession.activeTxHash || "");
    buttonLabel = "Confirmation delayed";
    showLoader = false;
    errorMsg = "Confirmation delayed. Please check the block explorer with the transaction hash.";
  } else if (executionSession.state === "FAILED_SAFE") {
    statusText = "Execution failed closed. Funds are safe.";
    buttonLabel = "Execution Failed";
    errorMsg = executionSession.error || "On-chain transaction reverted.";
  }

  return (
    <PageShell
      eyebrow="Step 06 · Simulation"
      title={executionState === "SIMULATING" ? "Running simulation..." : "Simulation complete"}
      intro="Executed against a forked state of X Layer. What you see is what settles."
      aside={
        <StatusPill tone={executionState === "SIMULATION_READY" ? "safe" : executionState === "SIMULATION_FAILED" ? "critical" : "primary"}>
          <CircuitBoard className="size-3" />{" "}
          {executionState === "SIMULATING"
            ? "Simulating X Layer..."
            : executionState === "SIMULATION_READY"
              ? "All safety checks passed"
              : "Safety checks failed"}
        </StatusPill>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-6">
              <Eyebrow>Expected output</Eyebrow>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-primary">
                <AnimatedNumber value={activePlan.securedAmount} prefix="$" decimals={2} suffix=" USDC" />
              </p>
            </Panel>
            <Panel className="p-6">
              <Eyebrow>Execution risk (SAVE Score: {activePlan.saveScore})</Eyebrow>
              <p className={`mt-3 text-3xl font-semibold tracking-tight ${riskLabel === "LOW" ? "text-safe" : riskLabel === "MEDIUM" ? "text-warning" : "text-critical"}`}>
                {riskLabel}
              </p>
            </Panel>
            <Panel className="p-6">
              <Eyebrow>Gas reserve</Eyebrow>
              <p className="num mt-3 text-2xl font-semibold tracking-tight">
                <AnimatedNumber value={activePlan.gasCostUsd} prefix="$" decimals={2} />
              </p>
            </Panel>
            <Panel className="p-6">
              <Eyebrow>Slippage</Eyebrow>
              <p className="num mt-3 text-2xl font-semibold tracking-tight">
                <AnimatedNumber value={activePlan.slippagePercent} decimals={2} suffix="%" />
              </p>
            </Panel>
          </div>

          <Panel className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Eyebrow>Route Provider</Eyebrow>
                <p className="num mt-2 text-sm font-semibold">OKX DEX Aggregator (chainIndex: 196)</p>
              </div>
              <div>
                <Eyebrow>Quote Age</Eyebrow>
                <p className={`num mt-2 text-sm font-semibold ${isQuoteStale ? "text-critical" : "text-foreground"}`}>
                  {quoteAgeSec}s ago {isQuoteStale ? "(Stale — Re-quote required)" : "(Fresh)"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="space-y-4">
              <Eyebrow>Allowance & Approval Requirements</Eyebrow>
              {simulationResult?.requiredApprovals && simulationResult.requiredApprovals.length > 0 ? (
                <ul className="divide-y divide-border">
                  {simulationResult.requiredApprovals.map((app) => (
                    <li key={app.token} className="py-2.5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold">{app.token} ERC-20 approval</p>
                        <p className="text-xs text-muted-foreground">Spender: {app.spender || "UNKNOWN_SPENDER"}</p>
                      </div>
                      <StatusPill tone={app.verificationStatus === "UNKNOWN" ? "critical" : "warning"}>
                        {app.verificationStatus === "UNKNOWN"
                          ? "REQUIRES LIVE ROUTE VERIFICATION"
                          : `Approval Required (${app.verificationStatus})`}
                      </StatusPill>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="size-4 text-safe" /> Native OKB swap requires zero approvals.
                </p>
              )}
            </div>
          </Panel>

          {/* Validation Gates & Execution Readiness Banner */}
          {executionState === "SIMULATION_FAILED" && (
            <Panel className="border-critical/30 bg-critical/10 p-6 flex gap-4 items-start rounded-lg">
              <AlertTriangle className="size-5 text-critical shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-critical">Simulation failed closed</h4>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {simulationResult?.description}
                </p>
              </div>
            </Panel>
          )}

          {errorMsg !== "" && (
            <Panel className="border-critical/30 bg-critical/10 p-6 flex gap-4 items-start rounded-lg">
              <AlertTriangle className="size-5 text-critical shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-critical">Execution Error</h4>
                <p className="mt-1 text-sm leading-relaxed text-foreground">{errorMsg}</p>
              </div>
            </Panel>
          )}

          {connected && (
            <Panel className="p-6">
              <Eyebrow>Connected Wallet Status</Eyebrow>
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between items-center text-sm border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Connected address</span>
                  <span className="num font-mono text-xs select-all bg-secondary/50 px-2 py-0.5 rounded">{walletAddress}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Detected EVM Chain ID</span>
                  <span className={`num font-semibold ${chainId === 1952 ? "text-safe" : "text-critical"}`}>
                    {chainId !== null ? `${chainId} ${chainId === 1952 ? "(X Layer Testnet)" : "(Unsupported Chain)"}` : "None"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border pb-2.5">
                  <span className="text-muted-foreground">Native OKB balance</span>
                  {(() => {
                    const okbAsset = portfolio.find((a) => a.symbol === "OKB");
                    const okbBalance = okbAsset ? parseFloat(okbAsset.balance) : 0;
                    return (
                      <span className={`num font-semibold ${okbBalance > 0.001 ? "text-safe" : "text-critical"}`}>
                        {okbBalance.toFixed(4)} OKB {okbBalance <= 0.001 && "(Requires > 0.001 OKB)"}
                      </span>
                    );
                  })()}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Execution mode</span>
                  <span className={`label-mono px-2 py-0.5 rounded font-semibold ${executionSession.mode === "TESTNET_LIVE" ? "bg-safe/10 text-safe border border-safe/20" : "bg-primary/10 text-primary border border-primary/20"}`}>
                    {executionSession.mode}
                  </span>
                </div>
              </div>
            </Panel>
          )}

          {connected && executionSession.mode !== "TESTNET_LIVE" && (
            <Panel className="border-warning/30 bg-warning/10 p-6 flex gap-4 items-start rounded-lg">
              <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-warning">TESTNET_LIVE Mode Inactive</h4>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  To execute on-chain transactions, please satisfy the following:
                </p>
                <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-muted-foreground">
                  {chainId !== 1952 && (
                    <li>Switch network in MetaMask/OKX Wallet to <strong>X Layer Testnet (Chain ID 1952)</strong>.</li>
                  )}
                  {(() => {
                    const okbAsset = portfolio.find((a) => a.symbol === "OKB");
                    const okbBalance = okbAsset ? parseFloat(okbAsset.balance) : 0;
                    if (okbBalance <= 0.001) {
                      return <li>Deposit native Testnet OKB to cover gas (balance: {okbBalance.toFixed(4)} OKB, minimum: 0.001 OKB).</li>;
                    }
                    return null;
                  })()}
                </ul>
              </div>
            </Panel>
          )}

          {executionState === "SIMULATION_READY" && (
            <Panel className="border-safe/30 bg-safe/10 p-6 flex gap-4 items-start rounded-lg">
              {showLoader ? (
                <Loader2 className="size-5 text-primary animate-spin shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="size-5 text-safe shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-semibold text-safe">{statusText}</h4>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  {executionSession.mode === "TESTNET_LIVE"
                    ? "Wallet execution mode active. Transactions will be sent to X Layer Testnet."
                    : "Demo simulation mode active. Safety checks satisfied without broadcast."}
                </p>
                <p className="mt-1.5 text-xxs label-mono text-muted-foreground/80 font-normal">
                  * Staged execution strategy — user authorization required at each stage.
                </p>
                {executionSession.steps.length > 0 && (
                  <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Step {executionSession.currentStepIndex + 1} of {executionSession.steps.length}
                    </span>
                    <span>Mode: {executionSession.mode}</span>
                  </div>
                )}
              </div>
            </Panel>
          )}

          {executionState === "SIMULATION_READY" ? (
            <MagneticButton
              onClick={executeNextStep}
              className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
              disabled={showLoader || executionSession.state === "FAILED_SAFE"}
            >
              {buttonLabel} <ArrowRight className="size-4" />
            </MagneticButton>
          ) : (
            <MagneticButton
              className="w-full opacity-50 cursor-not-allowed"
              size="lg"
              disabled
            >
              {buttonLabel} <ArrowRight className="size-4" />
            </MagneticButton>
          )}
        </div>

        <Panel className="p-8">
          <Eyebrow>Execution timeline</Eyebrow>
          <div className="mt-6">
            <SimulationTimeline steps={traceSteps} autoRun={executionState === "SIMULATING" || executionState === "SIMULATION_READY"} />
          </div>
          <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground flex gap-1.5 items-start">
            <HelpCircle className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
            <span>
              Simulation is re-run immediately before signature. If conditions drift beyond your risk
              preference, SAVE aborts instead of executing.
            </span>
          </p>
        </Panel>
      </div>
    </PageShell>
  );
}
