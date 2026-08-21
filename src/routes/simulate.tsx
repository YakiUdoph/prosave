import { useEffect, useState } from "react";
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
        content: "Validate rescue constraints, estimated execution requirements, and optional X Layer wallet verification.",
      },
      { property: "og:title", content: "Simulation Status — SAVE" },
      {
        property: "og:description",
        content: "Review simulated rescue parameters and optional X Layer wallet verification.",
      },
    ],
  }),
  component: Simulate,
});

function Simulate() {
  const {
    connected,
    walletAddress,
    scannedAddress,
    connectWallet,
    chainId,
    portfolio,
    portfolioMode,
    setPortfolioMode,
    selectedPlan,
    rescueResult,
    executionState,
    simulationResult,
    runSimulation,
    quoteTimestamp,
    executionSession,
    startExecution,
    walletVerification,
    verifyWalletOnXLayer,
    resetWalletVerification,
    walletVerificationBalanceStatus,
  } = useSave();

  const navigate = useNavigate();

  // Tick timer every second for accurate quote age rendering
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activePlan = rescueResult.plans.find((p) => p.id === selectedPlan);

  // Auto switch from WATCH_ONLY to LIVE_WALLET when the owner wallet is connected
  useEffect(() => {
    if (portfolioMode === "WATCH_ONLY" && connected && scannedAddress && walletAddress && walletAddress.toLowerCase() === scannedAddress.toLowerCase()) {
      setPortfolioMode("LIVE_WALLET");
      // Reset the execution steps to update modes
      startExecution();
    }
  }, [portfolioMode, connected, scannedAddress, walletAddress, setPortfolioMode, portfolio, startExecution]);

  // Trigger simulation auto-run on component mount if IDLE
  useEffect(() => {
    if (executionState === "IDLE") {
      runSimulation(portfolioMode === "LIVE_WALLET" ? "LIVE_SIMULATION" : "DEMO_SIMULATION");
    }
  }, [executionState, runSimulation, portfolioMode]);

  // Handle auto-start execution session when simulation succeeds
  useEffect(() => {
    if (executionState === "SIMULATION_READY" && executionSession.steps.length === 0) {
      startExecution();
    }
  }, [executionState, executionSession.steps.length, startExecution, connected, chainId, portfolio, portfolioMode]);

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
  const quoteAgeSec = Math.round((now - quoteTimestamp) / 1000);
  const isQuoteStale = quoteAgeSec >= 60;

  // Derive execution trace steps
  const traceSteps = [
    "Portfolio evaluated",
    "Simulated route parameters calculated",
    "Target asset feasibility checked",
    "Protected asset rules checked",
    "Estimated gas requirement calculated",
  ];

  // Derive execution risk label
  const riskLabel = activePlan.saveScore >= 85 ? "LOW" : activePlan.saveScore >= 70 ? "MEDIUM" : "HIGH";

  // Derive execution status text & button actions
  let statusText = "Optional X Layer wallet verification available";
  let buttonLabel = "Verify Wallet on X Layer Testnet";
  let showLoader = false;
  let errorMsg = "";

  if (walletVerification.state === "AWAITING_WALLET_SIGNATURE") {
    statusText = "Waiting for wallet authorization";
    buttonLabel = "Signing...";
    showLoader = true;
  } else if (walletVerification.state === "READY") {
    statusText = "Waiting for wallet authorization";
    buttonLabel = "Broadcasting...";
    showLoader = true;
  } else if (walletVerification.state === "PENDING_CONFIRMATION") {
    statusText = "Transaction broadcast — awaiting confirmation";
    buttonLabel = "Confirming...";
    showLoader = true;
  } else if (walletVerification.state === "USER_REJECTED") {
    statusText = "Signature request rejected by user. You can retry.";
    buttonLabel = "Retry Authorization";
    errorMsg = "Signature rejected by user.";
  } else if (walletVerification.state === "CONFIRMATION_TIMEOUT") {
    statusText = "Confirmation is taking longer than expected. Transaction hash: " + (walletVerification.activeTxHash || "");
    buttonLabel = "Check Verification Again";
    showLoader = false;
    errorMsg = "Confirmation delayed. Please check the block explorer with the transaction hash.";
  } else if (walletVerification.state === "FAILED_SAFE") {
    statusText = "Wallet verification failed closed.";
    buttonLabel = walletVerification.activeTxHash ? "Clear Failed Verification" : "Retry Wallet Verification";
    errorMsg = walletVerification.error || "Verification transaction failed.";
  }

  if (walletVerification.state === "CONFIRMED") {
    statusText = "X Layer wallet verification successful";
    buttonLabel = "Verification Confirmed";
  }

  if (!connected || !walletAddress) {
    buttonLabel = "Connect Wallet for Optional X Layer Verification";
    statusText = "The simulated rescue is complete without wallet verification.";
  } else if (chainId !== 1952) {
    buttonLabel = "Switch Wallet to X Layer Testnet";
    statusText = "Wallet verification requires X Layer Testnet. The simulated rescue remains valid.";
  } else if (walletVerificationBalanceStatus === "CHECKING" || walletVerificationBalanceStatus === "UNKNOWN") {
    buttonLabel = "Checking Test OKB Balance...";
    statusText = "Checking the connected wallet's native test OKB balance.";
  } else if (walletVerificationBalanceStatus === "INSUFFICIENT" || walletVerificationBalanceStatus === "ERROR") {
    buttonLabel = "Test OKB Required for Optional Verification";
    statusText = "Wallet verification is unavailable without sufficient test OKB. The simulated rescue remains valid.";
  } else if (walletVerification.state === "FAILED_SAFE" && walletVerification.activeTxHash) {
    buttonLabel = "Clear Failed Verification";
    statusText = "The mined verification failed. Clear it explicitly before starting a new verification.";
  }

  const verificationBalanceUnavailable =
    connected &&
    !!walletAddress &&
    chainId === 1952 &&
    (walletVerificationBalanceStatus === "CHECKING" ||
      walletVerificationBalanceStatus === "UNKNOWN" ||
      walletVerificationBalanceStatus === "INSUFFICIENT" ||
      walletVerificationBalanceStatus === "ERROR");

  const verificationButtonDisabled =
    showLoader ||
    walletVerification.state === "CONFIRMED" ||
    verificationBalanceUnavailable;

  const handleVerificationAction = async () => {
    if (!connected || !walletAddress || chainId !== 1952) {
      await connectWallet(undefined, true);
      return;
    }
    if (walletVerification.state === "FAILED_SAFE" && walletVerification.activeTxHash) {
      resetWalletVerification();
      return;
    }
    await verifyWalletOnXLayer();
  };

  let pageTitle = "Rescue plan validated";
  let statusBadgeLabel = "All safety checks passed";
  let statusBadgeTone: "safe" | "critical" | "warn" | "primary" = "safe";

  if (executionState === "SIMULATING") {
    pageTitle = "Plan validation running";
    statusBadgeLabel = "VALIDATING PLAN...";
    statusBadgeTone = "primary";
  } else if (isQuoteStale) {
    pageTitle = "Plan validation requires fresh estimates";
    statusBadgeLabel = "RE-QUOTE REQUIRED";
    statusBadgeTone = "warn";
  } else if (executionState === "SIMULATION_FAILED") {
    pageTitle = "Plan validation blocked";
    statusBadgeLabel = "SAFETY CHECKS FAILED";
    statusBadgeTone = "critical";
  } else if (executionState === "SIMULATION_READY") {
    pageTitle = "Rescue plan validated";
    statusBadgeLabel = "SAFETY CHECKS PASSED";
    statusBadgeTone = "safe";
  }

  return (
    <PageShell
      eyebrow="Step 06 · Simulation"
      title={pageTitle}
      intro="SAVE evaluated the selected strategy against portfolio constraints, estimated execution costs, quote freshness, gas requirements, and approval requirements before any wallet action."
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
          <StatusPill tone={statusBadgeTone}>
            <CircuitBoard className="size-3" /> {statusBadgeLabel}
          </StatusPill>
        </div>
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
                <p className="num mt-2 text-sm font-semibold">DEMO ROUTE ESTIMATE · OKX-compatible adapter</p>
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
                        <p className="text-sm font-semibold">{app.token} ERC-20 approval required</p>
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
          {isQuoteStale && (
            <Panel className="border-warning/30 bg-warning/10 p-6 flex gap-4 items-start rounded-lg animate-rise">
              <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-warning">Re-quote required</h4>
                <p className="mt-1 text-sm leading-relaxed text-foreground">
                  The route quote expired before authorization. Refresh the quote to continue.
                </p>
              </div>
            </Panel>
          )}

          {executionState === "SIMULATION_FAILED" && !isQuoteStale && (
            <Panel className="border-critical/30 bg-critical/10 p-6 flex gap-4 items-start rounded-lg animate-rise">
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
                <h4 className="font-semibold text-critical">Wallet Verification Error</h4>
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
                  <span className={`num font-semibold ${walletVerificationBalanceStatus === "SUFFICIENT" ? "text-safe" : "text-critical"}`}>
                    {walletVerificationBalanceStatus === "SUFFICIENT"
                      ? "Sufficient for optional verification"
                      : walletVerificationBalanceStatus === "CHECKING"
                        ? "Checking connected wallet..."
                        : "Test OKB required"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Execution mode</span>
                  <span className="label-mono px-2 py-0.5 rounded font-semibold bg-primary/10 text-primary border border-primary/20">
                    SIMULATED RESCUE
                  </span>
                </div>
              </div>
            </Panel>
          )}

          {portfolioMode === "WATCH_ONLY" ? (
            <div className="space-y-6">
              {!connected ? (
                <>
                  <Panel className="border-warning/30 bg-warning/10 p-6 flex gap-4 items-start rounded-lg animate-rise">
                    <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-warning">WALLET AUTHORIZATION REQUIRED</h4>
                      <p className="mt-1 text-sm leading-relaxed text-foreground">
                        You're analyzing this portfolio in read-only mode. Connect the wallet controlling this address to authorize on-chain actions.
                      </p>
                      <p className="mt-2 text-xxs label-mono text-muted-foreground">
                        * SAVE never requests seed phrases or private keys. Public-address scans are read-only.
                      </p>
                    </div>
                  </Panel>
                  <MagneticButton
                    onClick={connectWallet}
                    className="w-full"
                    size="lg"
                  >
                    Connect wallet to continue <ArrowRight className="size-4" />
                  </MagneticButton>
                </>
              ) : (
                <>
                  {scannedAddress && walletAddress && walletAddress.toLowerCase() !== scannedAddress.toLowerCase() && (
                    <Panel className="border-critical/30 bg-critical/10 p-6 flex gap-4 items-start rounded-lg animate-rise">
                      <AlertTriangle className="size-5 text-critical shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-critical">CONNECTED ADDRESS DOES NOT MATCH</h4>
                        <p className="mt-1 text-sm leading-relaxed text-foreground">
                          The connected wallet address (<span className="label-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>) does not match the watched address (<span className="label-mono">{scannedAddress.slice(0, 6)}...{scannedAddress.slice(-4)}</span>) currently under analysis.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground leading-normal">
                          Please switch accounts in your wallet extension to match the target address.
                        </p>
                      </div>
                    </Panel>
                  )}
                  <MagneticButton
                    className="w-full opacity-50 cursor-not-allowed"
                    size="lg"
                    disabled
                  >
                    Address Mismatch — Switch Wallet <ArrowRight className="size-4" />
                  </MagneticButton>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {connected && executionSession.mode !== "TESTNET_LIVE" && portfolioMode !== "DEMO_PORTFOLIO" && (
                <Panel className="border-warning/30 bg-warning/10 p-6 flex gap-4 items-start rounded-lg">
                  <AlertTriangle className="size-5 text-warning shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-warning">LIVE RESCUE SWAPS UNAVAILABLE ON TESTNET</h4>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      {portfolioMode === "DEMO_PORTFOLIO"
                        ? "Demo rescue planning is simulation-only."
                        : "OKX routing support for X Layer uses mainnet chain 196, while this application remains safely configured for testnet 1952."}
                    </p>
                    {portfolioMode !== "DEMO_PORTFOLIO" && (
                      <ul className="mt-2 space-y-1 text-xs list-disc list-inside text-muted-foreground">
                        {chainId !== 1952 && (
                          <li>Switch to <strong>X Layer Testnet (Chain ID 1952)</strong> to use optional wallet verification.</li>
                        )}
                        {(() => {
                          const okbAsset = portfolio.find((a) => a.symbol === "OKB");
                          const okbBalance = okbAsset ? parseFloat(okbAsset.balance) : 0;
                          if (okbBalance <= 0.001) {
                            return <li>Deposit native Testnet OKB only if you choose the optional wallet verification (balance: {okbBalance.toFixed(4)} OKB).</li>;
                          }
                          return null;
                        })()}
                      </ul>
                    )}
                  </div>
                </Panel>
              )}

              {executionState === "SIMULATION_READY" && !isQuoteStale && (
                <Panel className="border-safe/30 bg-safe/10 p-6 flex gap-4 items-start rounded-lg">
                  {showLoader ? (
                    <Loader2 className="size-5 text-primary animate-spin shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="size-5 text-safe shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-semibold text-safe">
                      RESCUE PLAN VALIDATED
                    </h4>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      Local safety and feasibility checks passed. This rescue outcome remains simulated and is not broadcast.
                    </p>
                  </div>
                </Panel>
              )}

              {isQuoteStale ? (
                <MagneticButton
                  onClick={() => runSimulation(portfolioMode === "LIVE_WALLET" ? "LIVE_SIMULATION" : "DEMO_SIMULATION")}
                  className="w-full animate-pulse"
                  size="lg"
                >
                  Refresh quote <ArrowRight className="size-4" />
                </MagneticButton>
              ) : executionState === "SIMULATION_READY" ? (
                <div className="space-y-3">
                  <MagneticButton
                    onClick={() => navigate({ to: "/protected" })}
                    className="w-full"
                    size="lg"
                  >
                    View Simulated Result <ArrowRight className="size-4" />
                  </MagneticButton>
                  <MagneticButton
                    onClick={() => void handleVerificationAction()}
                    className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    size="lg"
                    variant="ghost"
                    disabled={verificationButtonDisabled}
                  >
                    {buttonLabel} <ArrowRight className="size-4" />
                  </MagneticButton>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Optional: verify wallet authorization and X Layer Testnet settlement using your connected wallet. This does not execute the simulated rescue or imply that the connected wallet owns the Demo Portfolio.
                  </p>
                  {connected && walletAddress && (
                    <dl className="grid gap-1 rounded-lg border border-border bg-secondary/20 p-3 text-xs">
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Verification transaction</dt><dd>0.0001 OKB self-transfer</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">From</dt><dd className="font-mono">{walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">To</dt><dd className="font-mono">Same connected wallet</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Network</dt><dd>X Layer Testnet</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Purpose</dt><dd className="text-right">Wallet authorization + settlement verification only</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Rescue execution</dt><dd>None</dd></div>
                    </dl>
                  )}
                  <p className="text-xs font-mono text-muted-foreground" aria-live="polite">
                    {statusText}
                  </p>
                  {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                </div>
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
          )}
        </div>

        <div className="space-y-6">
          <Panel className="p-8">
            <Eyebrow>Rescue plan validation steps</Eyebrow>
            <div className="mt-6">
              <SimulationTimeline steps={traceSteps} autoRun={executionState === "SIMULATING" || executionState === "SIMULATION_READY"} />
            </div>
            <p className="mt-4 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground flex gap-1.5 items-start">
              <HelpCircle className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
              <span>
                These are local safety and feasibility checks, not EVM transaction simulation. Rescue parameters remain simulated.
              </span>
            </p>
          </Panel>

          <Panel className="p-6 bg-secondary/10 border-border/40">
            <Eyebrow>Infrastructure Telemetry</Eyebrow>
            <div className="mt-4 space-y-2.5 text-xs label-mono">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Portfolio / Routing Intelligence</span>
                <span className="font-semibold text-foreground text-right">OKX mainnet routing reference infrastructure</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Execution Network</span>
                <span className="font-semibold text-foreground text-right">X Layer Testnet (Chain 1952)</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <span className="text-muted-foreground">Authorization</span>
                <span className="font-semibold text-foreground text-right">Optional wallet verification only</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Execution Mode</span>
                <span className="font-semibold text-foreground text-right text-warning">SIMULATED RESCUE · OPTIONAL TESTNET VERIFICATION</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
