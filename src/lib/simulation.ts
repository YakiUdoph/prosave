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
  | "CONFIRMATION_TIMEOUT"
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

export type VerifiedApproval = {
  assetId?: string;
  tokenAddress: string;
  chainIndex: number;
  approveAmount: number;
  transactionTo: string;
  transactionData: string;
  source: "OKX_APPROVE_TRANSACTION";
  timestamp: number;
  verificationStatus: "VERIFIED_OKX";
};

export type ApprovalRequirement = {
  token: string;
  owner: string;
  spender: string;
  requiredAmount: number;
  currentAllowance: number | null; // null represents UNKNOWN
  approvalNeeded: boolean;
  okxChainIndex: number;
  evmChainId: number;
  environment: "testnet" | "mainnet";
  source: "demo" | "live";
  verificationStatus: "VERIFIED_OKX" | "LIVE_CHAIN" | "DEMO" | "UNKNOWN";
};

export type PreparedTransaction = {
  evmChainId: number;
  okxChainIndex: number;
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
  connectedEvmChainId: number | null,
  quoteTimestamp: number,
  simulationMode: "DEMO_SIMULATION" | "LIVE_SIMULATION",
  verifiedApprovals: VerifiedApproval[] = [],
  allowanceChecked: boolean = false,
  verifiedSwapTx: PreparedTransaction | null = null
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
  if (connectedEvmChainId !== expectedChainId) {
    return {
      success: false,
      reason: "WRONG_NETWORK",
      description: `Connected to EVM chain ${connectedEvmChainId}. Expected X Layer Testnet (${expectedChainId}).`,
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
    const isNativeGasAction = act.assetIsNative && act.symbol === nativeGasSymbol;
    if (!isNativeGasAction) {
      const quoteSpender = act.quote?.spenderAddress;
      const quoteChainIndex = act.quote?.chainIndex || 1952;
      
      // Separate fields conceptually
      const okxChainIndex = quoteChainIndex; 
      const evmChainId = quoteChainIndex === 196 ? 196 : 1952;

      let verificationStatus: "VERIFIED_OKX" | "LIVE_CHAIN" | "DEMO" | "UNKNOWN" = "UNKNOWN";
      let spenderToUse = quoteSpender || "";

      // Find matching VerifiedApproval
      const match = verifiedApprovals.find(
        (app) =>
          (app.assetId && app.assetId === act.assetId) ||
          (!!act.assetAddress && app.tokenAddress.toLowerCase() === act.assetAddress.toLowerCase() && app.chainIndex === act.assetChainIndex)
      );

      if (simulationMode === "DEMO_SIMULATION") {
        verificationStatus = "DEMO";
      } else if (match && match.verificationStatus === "VERIFIED_OKX") {
        verificationStatus = "VERIFIED_OKX";
        spenderToUse = match.transactionTo;
      } else {
        verificationStatus = "UNKNOWN";
      }

      requiredApprovals.push({
        token: act.symbol,
        owner: connectedAddress,
        spender: spenderToUse,
        requiredAmount: act.sellAmount,
        // Allowance must be verified by a real chain read, otherwise mark it null (UNKNOWN)
        currentAllowance: allowanceChecked ? 0 : null,
        approvalNeeded: true,
        okxChainIndex,
        evmChainId,
        environment: evmChainId === 1952 ? "testnet" : "mainnet",
        source: simulationMode === "LIVE_SIMULATION" ? "live" : "demo",
        verificationStatus,
      });
    }
  }

  // Spender Verification Gate
  const hasUnknownSpender = requiredApprovals.some((app) => app.verificationStatus === "UNKNOWN");
  if (hasUnknownSpender) {
    return {
      success: false,
      reason: "UNKNOWN_SPENDER",
      description: "DEX router spender address is unverified. Authenticated OKX approval data is required.",
      requiredApprovals,
      preparedTransactions: [],
      gasReserveNative: 0,
      remainingNativeOKB: 0,
      provenance: simulationMode === "LIVE_SIMULATION" ? "LIVE" : "DEMO",
    };
  }

  // Chain Matching Validation
  // evmChainId and okxChainIndex must match connected wallet evmChainId (1952)
  for (const app of requiredApprovals) {
    if (app.evmChainId !== 1952) {
      return {
        success: false,
        reason: "WRONG_NETWORK",
        description: `Approval EVM Chain ID ${app.evmChainId} does not match connected wallet ID ${connectedEvmChainId}.`,
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

  // 8. Swap Transaction Verification
  // We can construct prepared transactions ONLY when verified swap transaction data is available (or under DEMO)
  const preparedTransactions: PreparedTransaction[] = [];

  // Construct approval transactions
  for (const app of requiredApprovals) {
    preparedTransactions.push({
      evmChainId: app.evmChainId,
      okxChainIndex: app.okxChainIndex,
      environment: "testnet",
      to: "0xMockTokenAddressFor" + app.token,
      from: connectedAddress,
      value: "0",
      data: "0x095d1a22" + app.spender.slice(2).padStart(64, "0") + "ffffff",
      source: simulationMode === "LIVE_SIMULATION" ? "live" : "demo",
      quoteTimestamp,
      verificationStatus: app.verificationStatus,
    });
  }

  // Swap transaction verification check
  if (simulationMode === "LIVE_SIMULATION") {
    if (!verifiedSwapTx) {
      return {
        success: false,
        reason: "UNKNOWN_SPENDER",
        description: "Verified swap transaction data is missing. Do not transition to READY_TO_SIGN without swap payload.",
        requiredApprovals,
        preparedTransactions: [],
        gasReserveNative,
        remainingNativeOKB,
        provenance: "LIVE",
      };
    }

    // Verify swap tx properties
    if (verifiedSwapTx.from.toLowerCase() !== connectedAddress.toLowerCase()) {
      return {
        success: false,
        reason: "SIMULATION_DATA_MALFORMED",
        description: "Swap transaction 'from' address does not match connected wallet owner.",
        requiredApprovals,
        preparedTransactions: [],
        gasReserveNative,
        remainingNativeOKB,
        provenance: "LIVE",
      };
    }

    if (verifiedSwapTx.evmChainId !== connectedEvmChainId) {
      return {
        success: false,
        reason: "WRONG_NETWORK",
        description: `Swap transaction EVM chain ${verifiedSwapTx.evmChainId} does not match connected wallet ${connectedEvmChainId}.`,
        requiredApprovals,
        preparedTransactions: [],
        gasReserveNative,
        remainingNativeOKB,
        provenance: "LIVE",
      };
    }

    if (!verifiedSwapTx.data || verifiedSwapTx.data === "") {
      return {
        success: false,
        reason: "SIMULATION_DATA_MALFORMED",
        description: "Swap transaction payload is missing execution calldata.",
        requiredApprovals,
        preparedTransactions: [],
        gasReserveNative,
        remainingNativeOKB,
        provenance: "LIVE",
      };
    }

    preparedTransactions.push(verifiedSwapTx);
  } else {
    // Demo simulation fallback swap transactions construction
    for (const act of plan.actions) {
      preparedTransactions.push({
        evmChainId: expectedChainId,
        okxChainIndex: act.quote?.chainIndex || 1952,
        environment: "testnet",
        to: act.quote?.spenderAddress || "0x1111111254fb6c44bac0bed2854e76f90643097d",
        from: connectedAddress,
        value: act.symbol === nativeGasSymbol ? Math.round(act.sellAmount * 1e18).toString() : "0",
        data: "0xMockSwapCalldataFor" + act.symbol,
        source: "demo",
        quoteTimestamp,
        verificationStatus: "DEMO",
      });
    }
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
