import { simulatePlan, type PreparedTransaction, type VerifiedApproval } from "../src/lib/simulation";
import { solveRescue, type CandidatePlan } from "../src/lib/rescue-solver";
import { type ScannedAsset } from "../src/lib/xlayer";
import { type SaveIntent } from "../src/lib/intent-parser";

// Baseline Canonical Portfolio (USDC = $180, OKB = $300, TKX = $210, ETH = $420)
const canonicalPortfolio: ScannedAsset[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    chain: "X Layer",
    balance: "0.14625", // $420
    value: 420,
    change24h: -1.2,
    liquidity: 98,
    risk: "protected",
    note: "Protected reserve",
    isNative: false,
    isProtected: true,
    dataSource: "demo",
    priceSource: "estimated",
  },
  {
    symbol: "OKB",
    name: "OKB",
    chain: "X Layer",
    balance: "6.3600", // $300
    value: 300,
    change24h: -4.6,
    liquidity: 88,
    risk: "medium",
    note: "Medium risk asset",
    isNative: true,
    isProtected: false,
    dataSource: "demo",
    priceSource: "estimated",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    chain: "X Layer",
    balance: "180.00", // $180
    value: 180,
    change24h: 0.0,
    liquidity: 100,
    risk: "protected",
    note: "Target stable reserve",
    isNative: false,
    isProtected: true,
    dataSource: "demo",
    priceSource: "estimated",
  },
  {
    symbol: "TKX",
    name: "Token X",
    chain: "X Layer",
    balance: "7500.00", // $210
    value: 210,
    change24h: -18.4,
    liquidity: 34,
    risk: "high",
    note: "High risk meme asset",
    isNative: false,
    isProtected: false,
    dataSource: "demo",
    priceSource: "demo",
  },
];

const intentB: SaveIntent = {
  rawInput: "Get me $700 USDC. Don't sell ETH unless necessary.",
  targetAsset: "USDC",
  targetAmount: 700,
  protectedAssets: ["ETH"],
  avoidAssets: [],
  objective: "MINIMIZE_DAMAGE",
  urgency: "NORMAL",
  protectedAssetPolicy: "LAST_RESORT",
  confidence: 1.0,
  warnings: [],
};

function runTests() {
  console.log("==================================================");
  console.log("      RUNNING HARDENED FINAL VERIFICATION TESTS   ");
  console.log("==================================================");

  let passed = true;

  // Pre-requisite: Solve for Plan B (sells TKX + OKB + minimal ETH)
  const resRescue = solveRescue(canonicalPortfolio, intentB);
  const planB = resRescue.plans.find((p) => p.id === "B")!;
  const tkxAssetId = planB.actions.find((action) => action.symbol === "TKX")!.assetId;
  const ethAssetId = planB.actions.find((action) => action.symbol === "ETH")!.assetId;

  const connectedAddress = "0x9812A2b918D3b584dC81E3b584dc81E3B584dc81";
  const connectedChainId = 1952; // X Layer Testnet
  const freshQuoteTimestamp = Date.now();

  // A. live quote + arbitrary spender != VERIFIED_OKX
  console.log("\nTest A: Live quote with arbitrary spender must NOT become VERIFIED_OKX");
  const simA = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "LIVE_SIMULATION",
    [] // No verified approvals provided
  );

  const tkxAppA = simA.requiredApprovals.find(a => a.token === "TKX");
  if (!simA.success && simA.reason === "UNKNOWN_SPENDER" && tkxAppA && tkxAppA.verificationStatus === "UNKNOWN") {
    console.log("✅ Passed (Arbitrary spender rejected as UNKNOWN status)");
  } else {
    passed = false;
    console.log(`❌ Failed (Arbitrary spender incorrectly bypassed, result: ${JSON.stringify(simA)})`);
  }

  // B. authenticated OKX approval response -> VERIFIED_OKX
  console.log("\nTest B: Authenticated OKX approval response yields VERIFIED_OKX");
  const mockVerifiedApprovals: VerifiedApproval[] = [
    {
      assetId: tkxAssetId,
      tokenAddress: "TKX",
      chainIndex: 1952,
      approveAmount: 7500,
      transactionTo: "0x1111111254fb6c44bac0bed2854e76f90643097d",
      transactionData: "0x095d1a22...",
      source: "OKX_APPROVE_TRANSACTION",
      timestamp: Date.now(),
      verificationStatus: "VERIFIED_OKX"
    },
    {
      assetId: ethAssetId,
      tokenAddress: "ETH",
      chainIndex: 1952,
      approveAmount: 0.1,
      transactionTo: "0x1111111254fb6c44bac0bed2854e76f90643097d",
      transactionData: "0x095d1a22...",
      source: "OKX_APPROVE_TRANSACTION",
      timestamp: Date.now(),
      verificationStatus: "VERIFIED_OKX"
    }
  ];

  const mockSwapTx: PreparedTransaction = {
    evmChainId: 1952,
    okxChainIndex: 1952,
    environment: "testnet",
    to: "0x1111111254fb6c44bac0bed2854e76f90643097d",
    from: connectedAddress,
    value: "0",
    data: "0xMockSwapData",
    source: "live",
    quoteTimestamp: freshQuoteTimestamp,
    verificationStatus: "VERIFIED_OKX"
  };

  const simB = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "LIVE_SIMULATION",
    mockVerifiedApprovals,
    true, // allowance checked
    mockSwapTx
  );

  const tkxAppB = simB.requiredApprovals.find(a => a.token === "TKX");
  if (simB.success && tkxAppB && tkxAppB.verificationStatus === "VERIFIED_OKX") {
    console.log("✅ Passed (Authenticated OKX approval response yields VERIFIED_OKX)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected VERIFIED_OKX status, got: ${JSON.stringify(simB)})`);
  }

  // C. missing approval response -> UNKNOWN
  console.log("\nTest C: Missing approval response defaults to UNKNOWN");
  const partialVerifiedApprovals: VerifiedApproval[] = [
    {
      assetId: ethAssetId,
      tokenAddress: "ETH",
      chainIndex: 1952,
      approveAmount: 0.1,
      transactionTo: "0x1111111254fb6c44bac0bed2854e76f90643097d",
      transactionData: "0x095d1a22...",
      source: "OKX_APPROVE_TRANSACTION",
      timestamp: Date.now(),
      verificationStatus: "VERIFIED_OKX"
    }
  ];

  const simC = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "LIVE_SIMULATION",
    partialVerifiedApprovals, // Missing TKX approval
    true,
    mockSwapTx
  );

  const tkxAppC = simC.requiredApprovals.find(a => a.token === "TKX");
  if (!simC.success && simC.reason === "UNKNOWN_SPENDER" && tkxAppC && tkxAppC.verificationStatus === "UNKNOWN") {
    console.log("✅ Passed (Missing TKX approval successfully defaults to UNKNOWN)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected UNKNOWN rejection, got: ${JSON.stringify(simC)})`);
  }

  // D. native OKB -> no approval
  console.log("\nTest D: Native OKB requires no approval");
  const okbAppB = simB.requiredApprovals.find(a => a.token === "OKB");
  if (!okbAppB) {
    console.log("✅ Passed (Native OKB excluded from approval list)");
  } else {
    passed = false;
    console.log("❌ Failed (Native OKB incorrectly included in approvals)");
  }

  // E. real allowance query required before allowance is considered known
  console.log("\nTest E: Real allowance query required before allowance is known");
  const simE = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "LIVE_SIMULATION",
    mockVerifiedApprovals,
    false, // allowance NOT checked
    mockSwapTx
  );

  const tkxAppE = simE.requiredApprovals.find(a => a.token === "TKX");
  if (simE.success && tkxAppE && tkxAppE.currentAllowance === null) {
    console.log("✅ Passed (Allowance is null/UNKNOWN when real allowance query is not checked)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected currentAllowance to be null/UNKNOWN, got: ${JSON.stringify(tkxAppE)})`);
  }

  // F. quote alone cannot transition to READY_TO_SIGN
  console.log("\nTest F: Quote alone cannot transition to READY_TO_SIGN");
  const simF = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "LIVE_SIMULATION",
    mockVerifiedApprovals,
    true,
    null // Missing swap transaction payload!
  );

  if (!simF.success && simF.reason === "UNKNOWN_SPENDER") {
    console.log("✅ Passed (Quote alone blocked from transitioning to READY_TO_SIGN)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected rejection for missing swap transaction, got: ${JSON.stringify(simF)})`);
  }

  // G. swap transaction response must match expected EVM chain
  console.log("\nTest G: Swap transaction chain ID mismatch is rejected");
  const wrongChainSwapTx: PreparedTransaction = {
    ...mockSwapTx,
    evmChainId: 1 // Mainnet chain ID instead of 1952
  };

  const simG = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "LIVE_SIMULATION",
    mockVerifiedApprovals,
    true,
    wrongChainSwapTx
  );

  if (!simG.success && simG.reason === "WRONG_NETWORK") {
    console.log("✅ Passed (Mismatched swap transaction chain ID successfully rejected with WRONG_NETWORK)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected WRONG_NETWORK rejection, got: ${JSON.stringify(simG)})`);
  }

  // H. okxChainIndex and evmChainId are distinct fields
  console.log("\nTest H: okxChainIndex and evmChainId are distinct conceptually");
  const appRequirement = simB.requiredApprovals[0];
  const prepTx = simB.preparedTransactions[0];

  if (
    appRequirement &&
    prepTx &&
    "okxChainIndex" in appRequirement &&
    "evmChainId" in appRequirement &&
    "okxChainIndex" in prepTx &&
    "evmChainId" in prepTx
  ) {
    console.log("✅ Passed (okxChainIndex and evmChainId are distinct semantic properties in approvals and transactions)");
  } else {
    passed = false;
    console.log("❌ Failed (Mismatched or missing semantic properties on output objects)");
  }

  console.log("\n==================================================");
  console.log(passed ? "Summary: All Final Verification Hardening Tests Passed" : "Summary: Tests Failed");
  console.log("==================================================");

  if (!passed) {
    process.exit(1);
  }
}

runTests();
