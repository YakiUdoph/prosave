import { type ScannedAsset } from "./xlayer";
import { type SaveIntent } from "./intent-parser";
import { type CandidatePlan } from "./rescue-solver";

export type ExecutionState =
  | "IDLE"
  | "ANALYZING"
  | "QUOTING"
  | "QUOTE_READY"
  | "QUOTE_STALE"
  | "SIMULATING"
  | "SIMULATION_FAILED"
  | "SIMULATION_READY"
  | "APPROVAL_REQUIRED"
  | "APPROVING"
  | "READY_TO_SIGN"
  | "AWAITING_WALLET_SIGNATURE"
  | "SIGNED"
  | "BROADCASTING"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "REPLANNING"
  | "COMPLETE"
  | "FAILED_SAFE";

export type SimulationFailureReason =
  | "WALLET_DISCONNECTED"
  | "WRONG_NETWORK"
  | "PLAN_INFEASIBLE"
  | "TARGET_NOT_MET"
  | "QUOTE_STALE"
  | "INSUFFICIENT_GAS_RESERVE"
  | "UNVERIFIED_ASSET"
  | "UNSUPPORTED_ROUTE"
  | "OKX_TIMEOUT"
  | "APPROVAL_REQUIRED"
  | "SIMULATION_DATA_MALFORMED"
  | "PROTECTED_ASSET_VIOLATION"
  | "UNKNOWN_SPENDER";

export type ApprovalRequirement = {
  token: string;
  owner: string;
  spender: string;
  requiredAmount: number;
  currentAllowance: number;
  approvalNeeded: boolean;
  chainIndex: number;
  environment: "testnet" | "mainnet";
  source: "demo" | "live";
  verificationStatus: "VERIFIED_OKX" | "LIVE_CHAIN" | "DEMO" | "UNKNOWN";
};

export type PreparedTransaction = {
  chainId: number;
  chainIndex?: number;
  environment: "testnet" | "mainnet";
  to: string;
  from: string;
  value: string;
  data: string;
  source: "demo" | "live";
  quoteTimestamp: number;
  verificationStatus: "VERIFIED_OKX" | "LIVE_CHAIN" | "DEMO" | "UNKNOWN";
};

export type SimulationResult = {
  success: boolean;
  reason?: SimulationFailureReason;
  description?: string;
  requiredApprovals: ApprovalRequirement[];
  preparedTransactions: PreparedTransaction[];
  gasReserveNative: number;
  remainingNativeOKB: number;
  provenance: "DEMO" | "LIVE";
};

const STALE_QUOTE_WINDOW_MS = 60 * 1000; // 1 minute stale quote threshold

/**
 * Validate and simulate a plan before authorization.
 */
export function simulatePlan(
  intent: SaveIntent,
  plan: CandidatePlan,
  portfolio: ScannedAsset[],
  connectedAddress: string | null,
  connectedChainId: number | null,
  quoteTimestamp: number,
  simulationMode: "DEMO_SIMULATION" | "LIVE_SIMULATION"
): SimulationResult {
  // 1. Wallet Connection Gate
  if (!connectedAddress) {
    return {
      success: false,
      reason: "WALLET_DISCONNECTED",
      description: "Wallet is disconnected. Connect wallet to proceed.",
      requiredApprovals: [],
      preparedTransactions: [],
      gasReserveNative: 0,
      remainingNativeOKB: 0,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // 2. Correct Network Gate (X Layer Testnet is 1952)
  const expectedChainId = 1952;
  if (connectedChainId !== expectedChainId) {
    return {
      success: false,
      reason: "WRONG_NETWORK",
      description: `Connected to chain ${connectedChainId}. Expected X Layer Testnet (${expectedChainId}).`,
      requiredApprovals: [],
      preparedTransactions: [],
      gasReserveNative: 0,
      remainingNativeOKB: 0,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // 3. Plan Feasibility and Target Check
  if (!plan.targetMet) {
    return {
      success: false,
      reason: "TARGET_NOT_MET",
      description: "Selected plan does not meet target stable amount requirement.",
      requiredApprovals: [],
      preparedTransactions: [],
      gasReserveNative: 0,
      remainingNativeOKB: 0,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // 4. Quote Staleness Check
  const now = Date.now();
  if (now - quoteTimestamp >= STALE_QUOTE_WINDOW_MS) {
    return {
      success: false,
      reason: "QUOTE_STALE",
      description: `Quotes are stale. Quote age: ${Math.round((now - quoteTimestamp) / 1000)}s. Re-quoting required.`,
      requiredApprovals: [],
      preparedTransactions: [],
      gasReserveNative: 0,
      remainingNativeOKB: 0,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // 5. Protected Assets Policy Validation
  const hasProtectedSale = plan.actions.some((act) => intent.protectedAssets.includes(act.symbol));
  if (intent.protectedAssetPolicy === "STRICT" && hasProtectedSale) {
    return {
      success: false,
      reason: "PROTECTED_ASSET_VIOLATION",
      description: "Plan violates STRICT protected assets constraint.",
      requiredApprovals: [],
      preparedTransactions: [],
      gasReserveNative: 0,
      remainingNativeOKB: 0,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // 6. ERC-20 Allowance Spender Validation
  const nativeGasSymbol = "OKB";
  const requiredApprovals: ApprovalRequirement[] = [];

  for (const act of plan.actions) {
    if (act.symbol !== nativeGasSymbol) {
      // Find spender address from the quote itself
      const quoteSpender = act.quote?.spenderAddress;
      
      // Verification status mapping rules
      let verificationStatus: "VERIFIED_OKX" | "LIVE_CHAIN" | "DEMO" | "UNKNOWN" = "UNKNOWN";
      
      if (!quoteSpender || quoteSpender === "") {
        verificationStatus = "UNKNOWN";
      } else if (simulationMode === "DEMO_SIMULATION") {
        verificationStatus = "DEMO";
      } else if (act.quote?.dataSource === "live") {
        verificationStatus = "VERIFIED_OKX";
      }

      requiredApprovals.push({
        token: act.symbol,
        owner: connectedAddress,
        spender: quoteSpender || "",
        requiredAmount: act.sellAmount,
        currentAllowance: 0,
        approvalNeeded: true,
        chainIndex: act.quote?.chainIndex || 196,
        environment: act.quote?.chainIndex === 1952 ? "testnet" : "mainnet",
        source: simulationMode === "LIVE_SIMULATION" ? "live" : "demo",
        verificationStatus,
      });
    }
  }

  // Spender Verification Check
  const hasUnknownSpender = requiredApprovals.some((app) => app.verificationStatus === "UNKNOWN");
  if (hasUnknownSpender) {
    return {
      success: false,
      reason: "UNKNOWN_SPENDER",
      description: "DEX router spender address cannot be verified. Unable to prepare ERC-20 approvals.",
      requiredApprovals,
      preparedTransactions: [],
      gasReserveNative: 0,
      remainingNativeOKB: 0,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // Chain Matching Validation
  // quote chain, approval chain, and swap transaction chain index must matchconnectedChainId (1952)
  for (const app of requiredApprovals) {
    if (app.chainIndex !== 1952) {
      return {
        success: false,
        reason: "WRONG_NETWORK",
        description: `DEX quote chain index ${app.chainIndex} does not matchconnected wallet chain ID ${connectedChainId}.`,
        requiredApprovals,
        preparedTransactions: [],
        gasReserveNative: 0,
        remainingNativeOKB: 0,
        provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
      };
    }
  }

  // 7. Native Gas Budget Calculation
  const nativeGasPrice = 47.17;
  const okbAsset = portfolio.find((a) => a.symbol === nativeGasSymbol);
  const startingOKB = okbAsset ? parseFloat(okbAsset.balance) : 0;

  // Swapped OKB amount
  const okbSwapAction = plan.actions.find((a) => a.symbol === nativeGasSymbol);
  const soldOKB = okbSwapAction ? okbSwapAction.sellAmount : 0;

  // Estimate transaction fee gas (plan.gasCostUsd already includes swaps + approvals)
  const safetyMultiplier = 1.2;
  const totalGasUsd = plan.gasCostUsd;

  // Convert gas cost to OKB reserve requirement
  const gasReserveNative = (totalGasUsd / nativeGasPrice) * safetyMultiplier;
  const remainingNativeOKB = startingOKB - soldOKB - gasReserveNative;

  if (remainingNativeOKB < -0.00001) {
    return {
      success: false,
      reason: "INSUFFICIENT_GAS_RESERVE",
      description: `Insufficient OKB gas reserve. Retained OKB: ${(startingOKB - soldOKB).toFixed(4)}, Required Reserve: ${gasReserveNative.toFixed(4)}.`,
      requiredApprovals,
      preparedTransactions: [],
      gasReserveNative,
      remainingNativeOKB,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // 8. Transaction Construction payloads
  const preparedTransactions: PreparedTransaction[] = [];
  
  // We construct approval transactions first
  for (const app of requiredApprovals) {
    preparedTransactions.push({
      chainId: expectedChainId,
      chainIndex: app.chainIndex,
      environment: "testnet",
      to: "0xMockTokenAddressFor" + app.token,
      from: connectedAddress,
      value: "0",
      data: "0x095d1a22" + app.spender.slice(2).padStart(64, "0") + "ffffff", // Mock approve calldata
      source: simulationMode === "LIVE_SIMULATION" ? "live" : "demo",
      quoteTimestamp,
      verificationStatus: app.verificationStatus,
    });
  }

  // Swap transactions second
  for (const act of plan.actions) {
    preparedTransactions.push({
      chainId: expectedChainId,
      chainIndex: act.quote?.chainIndex || 1952,
      environment: "testnet",
      to: act.quote?.spenderAddress || "0x1111111254fb6c44bac0bed2854e76f90643097d", // Spender address
      from: connectedAddress,
      value: act.symbol === nativeGasSymbol ? Math.round(act.sellAmount * 1e18).toString() : "0",
      data: "0xMockSwapCalldataFor" + act.symbol,
      source: simulationMode === "LIVE_SIMULATION" ? "live" : "demo",
      quoteTimestamp,
      verificationStatus: simulationMode === "DEMO_SIMULATION" ? "DEMO" : "VERIFIED_OKX",
    });
  }

  return {
    success: true,
    requiredApprovals,
    preparedTransactions,
    gasReserveNative,
    remainingNativeOKB,
    provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
  };
}
