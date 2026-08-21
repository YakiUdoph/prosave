import { type PreparedTransaction, type ApprovalRequirement } from "./simulation";

export type ExecutionMode = "DEMO_SIMULATION" | "TESTNET_LIVE" | "MAINNET_LIVE";

export type ExecutionStepStatus =
  | "idle"
  | "approving"
  | "signing"
  | "broadcasting"
  | "pending"
  | "confirmed"
  | "failed";

export type ExecutionStep = {
  type: "approval" | "swap";
  symbol: string;
  amount: number;
  status: ExecutionStepStatus;
  txHash?: string;
  error?: string;
};

export type ExecutionState =
  | "READY_TO_SIGN"
  | "AWAITING_WALLET_SIGNATURE"
  | "USER_REJECTED"
  | "SIGNED"
  | "BROADCASTING"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "REFRESHING_PORTFOLIO"
  | "COMPLETE"
  | "CONFIRMATION_TIMEOUT"
  | "FAILED_SAFE";

export type ConfirmedTransaction = {
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  status: "success" | "reverted";
  chainId: number;
  timestamp: number;
  mode: ExecutionMode;
};

export type ExecutionSession = {
  mode: ExecutionMode;
  state: ExecutionState;
  steps: ExecutionStep[];
  currentStepIndex: number;
  targetAmount: number;
  securedAmount: number;
  activeTxHash?: string;
  confirmedTransactions: ConfirmedTransaction[];
  error?: string;
};

export type WalletVerificationState =
  | "NOT_PERFORMED"
  | "READY"
  | "AWAITING_WALLET_SIGNATURE"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "USER_REJECTED"
  | "CONFIRMATION_TIMEOUT"
  | "FAILED_SAFE";

export type WalletVerificationSession = {
  state: WalletVerificationState;
  transaction?: ConfirmedTransaction;
  activeTxHash?: string;
  error?: string;
};

export type WalletVerificationAction = "AUTHORIZE" | "POLL_EXISTING" | "BLOCK" | "RESET_REQUIRED";

export function getWalletVerificationAction(session: WalletVerificationSession): WalletVerificationAction {
  if (session.state === "CONFIRMED" || session.state === "AWAITING_WALLET_SIGNATURE" || session.state === "PENDING_CONFIRMATION") {
    return "BLOCK";
  }
  if (session.activeTxHash) {
    return session.state === "CONFIRMATION_TIMEOUT" ? "POLL_EXISTING" : "RESET_REQUIRED";
  }
  return "AUTHORIZE";
}

export const XLAYER_WALLET_VERIFICATION_WEI = "100000000000000";

export function buildXLayerWalletVerificationTransaction(
  walletAddress: string,
  timestamp: number = Date.now(),
): PreparedTransaction {
  return {
    evmChainId: 1952,
    okxChainIndex: 1952,
    environment: "testnet",
    to: walletAddress,
    from: walletAddress,
    value: XLAYER_WALLET_VERIFICATION_WEI,
    data: "0x",
    source: "live",
    quoteTimestamp: timestamp,
    verificationStatus: "LIVE_CHAIN",
  };
}

export function validateWalletVerificationPreconditions(
  tx: PreparedTransaction,
  connectedAddress: string | null,
  connectedChainId: number | null,
  hasGasReserve: boolean,
): { valid: boolean; reason?: string } {
  if (!connectedAddress) return { valid: false, reason: "Wallet disconnected" };
  if (connectedChainId !== 1952 || tx.evmChainId !== 1952) {
    return { valid: false, reason: "X Layer Testnet (1952) is required" };
  }
  if (tx.from.toLowerCase() !== connectedAddress.toLowerCase() || tx.to.toLowerCase() !== connectedAddress.toLowerCase()) {
    return { valid: false, reason: "Wallet verification address mismatch" };
  }
  if (tx.value !== XLAYER_WALLET_VERIFICATION_WEI || tx.data !== "0x") {
    return { valid: false, reason: "Invalid wallet verification transaction" };
  }
  if (tx.verificationStatus !== "LIVE_CHAIN" || tx.source !== "live") {
    return { valid: false, reason: "Wallet verification provenance is invalid" };
  }
  if (!hasGasReserve) return { valid: false, reason: "Insufficient native OKB for wallet verification" };
  return { valid: true };
}

export function confirmWalletVerification(
  txHash: string,
  blockNumber: number,
  gasUsed: string,
  timestamp: number = Date.now(),
): WalletVerificationSession {
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash) || blockNumber <= 0 || !gasUsed || gasUsed === "0") {
    return { state: "FAILED_SAFE", activeTxHash: txHash, error: "Invalid X Layer verification receipt" };
  }
  return {
    state: "CONFIRMED",
    activeTxHash: txHash,
    transaction: {
      transactionHash: txHash,
      blockNumber,
      gasUsed,
      status: "success",
      chainId: 1952,
      timestamp,
      mode: "TESTNET_LIVE",
    },
  };
}

// Error codes for EIP-1193
const USER_REJECTED_CODE = 4001;

/**
 * Validates pre-conditions for transaction execution before wallet prompt.
 */
export function validateExecutionPreconditions(
  tx: PreparedTransaction,
  connectedAddress: string | null,
  connectedChainId: number | null,
  quoteAgeSec: number,
  hasGasReserve: boolean,
  mode: ExecutionMode
): { valid: boolean; reason?: string } {
  // 1. Connection check
  if (!connectedAddress) {
    return { valid: false, reason: "Wallet disconnected" };
  }

  // 2. Address matching
  if (tx.from.toLowerCase() !== connectedAddress.toLowerCase()) {
    return { valid: false, reason: "Wallet address mismatch" };
  }

  // 3. Chain ID matching
  if (tx.evmChainId !== connectedChainId) {
    return { valid: false, reason: "Wallet chain ID mismatch" };
  }

  // 4. Verification status
  if (tx.verificationStatus === "UNKNOWN") {
    return { valid: false, reason: "Unverified transaction payload" };
  }

  // 5. Quote age check (60s stale limit)
  if (quoteAgeSec >= 60) {
    return { valid: false, reason: "Stale quote blocks execution" };
  }

  // 6. Native gas budget sufficiency
  if (!hasGasReserve) {
    return { valid: false, reason: "Insufficient native gas reserve" };
  }

  // 7. Source vs Mode protection
  if (mode !== "DEMO_SIMULATION" && tx.source === "demo") {
    return { valid: false, reason: "Demo calldata cannot be signed under live mode" };
  }

  return { valid: true };
};

/**
 * Request EIP-1193 signature and broadcast a prepared transaction.
 */
export async function requestWalletSignatureAndBroadcast(
  tx: PreparedTransaction,
  provider: any
): Promise<{ txHash: string } | { error: "USER_REJECTED" | "BROADCAST_ERROR"; details: string }> {
  try {
    console.log("AUTHORIZE_CLICKED");
    if (!provider) {
      console.log("PROVIDER_ERROR", "Wallet provider unavailable");
      return { error: "BROADCAST_ERROR", details: "Wallet provider unavailable" };
    }
    console.log("PROVIDER_FOUND");

    // Query active account
    const accounts = await provider.request({ method: "eth_accounts" });
    const activeAccount = accounts && accounts[0];
    if (!activeAccount || activeAccount.toLowerCase() !== tx.from.toLowerCase()) {
      console.log("PROVIDER_ERROR", "Connected account mismatch");
      return {
        error: "BROADCAST_ERROR",
        details: `Connected account mismatch. Displayed: ${tx.from}, Wallet: ${activeAccount || "none"}`
      };
    }
    console.log("ACCOUNT_VERIFIED");

    // Query active chain ID
    const chainIdHex = await provider.request({ method: "eth_chainId" });
    const decimalChainId = typeof chainIdHex === "string" ? parseInt(chainIdHex, 16) : chainIdHex;
    if (decimalChainId !== 1952) {
      console.log("PROVIDER_ERROR", "Wrong network");
      return {
        error: "BROADCAST_ERROR",
        details: `Wrong network. Detected: ${chainIdHex} (decimal: ${decimalChainId}). Expected: 0x7a0 (1952).`
      };
    }
    console.log("CHAIN_VERIFIED");

    // Prepare transaction parameters
    const params = [
      {
        from: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value !== "0" ? "0x" + BigInt(tx.value).toString(16) : undefined,
      },
    ];
    console.log("TRANSACTION_PREPARED", params[0]);

    console.log("SIGNATURE_REQUESTED");
    const txHash = await provider.request({
      method: "eth_sendTransaction",
      params,
    });

    if (!txHash || typeof txHash !== "string") {
      console.log("PROVIDER_ERROR", "Empty transaction hash received");
      return { error: "BROADCAST_ERROR", details: "Provider returned empty transaction hash" };
    }

    const isValidHash = typeof txHash === "string" && /^0x[a-fA-F0-9]{64}$/.test(txHash);
    if (!isValidHash) {
      console.log("PROVIDER_ERROR", "invalid transaction hash format");
      return { error: "BROADCAST_ERROR", details: "Provider returned invalid transaction hash format" };
    }

    console.log("TX_HASH_RECEIVED", txHash);
    return { txHash };
  } catch (err: any) {
    if (err.code === USER_REJECTED_CODE || err.message?.includes("User rejected") || err.message?.includes("rejected")) {
      console.log("USER_REJECTED");
      return { error: "USER_REJECTED", details: "Transaction signing rejected by user" };
    }
    console.log("PROVIDER_ERROR", err.message || "Failed to broadcast transaction");
    return { error: "BROADCAST_ERROR", details: err.message || "Failed to broadcast transaction" };
  }
}

/**
 * Recalculates remaining target after a swap transaction completes.
 */
export function recalculateRemainingTarget(
  targetAmount: number,
  currentSecured: number,
  newSecuredFromLeg: number
): { remainingTarget: number; targetMet: boolean } {
  const totalSecured = currentSecured + newSecuredFromLeg;
  const remaining = Math.max(0, targetAmount - totalSecured);
  return {
    remainingTarget: remaining,
    targetMet: remaining <= 0.005, // Within 0.005 USD tolerance
  };
}
