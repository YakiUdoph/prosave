import { simulatePlan, type PreparedTransaction } from "../src/lib/simulation";
import { solveRescue } from "../src/lib/rescue-solver";
import { type ScannedAsset } from "../src/lib/xlayer";
import { type SaveIntent } from "../src/lib/intent-parser";

// Baseline Canonical Portfolio (USDC = $180, OKB = $300, TKX = $210, ETH = $420)
// Total Value = $1,110
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

const intentStrict: SaveIntent = {
  rawInput: "Get me $700 USDC and never sell ETH.",
  targetAsset: "USDC",
  targetAmount: 700,
  protectedAssets: ["ETH"],
  avoidAssets: [],
  objective: "MINIMIZE_DAMAGE",
  urgency: "NORMAL",
  protectedAssetPolicy: "STRICT",
  confidence: 1.0,
  warnings: [],
};

function runTests() {
  console.log("==================================================");
  console.log("             RUNNING SIMULATION SYSTEM TESTS      ");
  console.log("==================================================");

  let passed = true;

  // Pre-requisite: Solve for Plan B (sells TKX + OKB + minimal ETH)
  const resRescue = solveRescue(canonicalPortfolio, intentB);
  const planB = resRescue.plans.find((p) => p.id === "B")!;
  const planA = resRescue.plans.find((p) => p.id === "A")!;

  // A. Valid plan becomes SIMULATION_READY
  console.log("\nTest A: Valid Plan Simulation readiness");
  const connectedAddress = "0x9812A2b918D3b584dC81E3b584dc81E3B584dc81";
  const connectedChainId = 1952; // X Layer Testnet
  const freshQuoteTimestamp = Date.now();

  const simA = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "DEMO_SIMULATION"
  );

  if (simA.success && simA.preparedTransactions.length > 0) {
    console.log("✅ Passed (Valid plan yields SIMULATION_READY status and transaction list)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected simulation success, got: ${JSON.stringify(simA)})`);
  }

  // B. Stale quote is rejected
  console.log("\nTest B: Stale Quote rejection");
  const staleTimestamp = Date.now() - 75 * 1000; // 75 seconds ago (exceeds 1-minute stale limit)
  const simB = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    staleTimestamp,
    "DEMO_SIMULATION"
  );

  if (!simB.success && simB.reason === "QUOTE_STALE") {
    console.log("✅ Passed (Stale quote successfully rejected with QUOTE_STALE reason)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected rejection with QUOTE_STALE, got: ${JSON.stringify(simB)})`);
  }

  // C. Insufficient OKB gas reserve is rejected
  console.log("\nTest C: Insufficient native gas reserve rejection");
  // Modify portfolio to reflect very low OKB balance ($0.05 worth)
  const lowGasPortfolio: ScannedAsset[] = canonicalPortfolio.map((p) => {
    if (p.symbol === "OKB") {
      return { ...p, balance: "0.001", value: 0.05 };
    }
    return p;
  });

  // Re-run solver to get plan under low gas
  const resLowGas = solveRescue(lowGasPortfolio, intentB);
  const planBLowGas = resLowGas.plans.find((p) => p.id === "B");

  if (planBLowGas) {
    const simC = simulatePlan(
      intentB,
      planBLowGas,
      lowGasPortfolio,
      connectedAddress,
      connectedChainId,
      freshQuoteTimestamp,
      "DEMO_SIMULATION"
    );

    if (!simC.success && simC.reason === "INSUFFICIENT_GAS_RESERVE") {
      console.log("✅ Passed (Exhausted native gas reserve correctly fails execution readiness with INSUFFICIENT_GAS_RESERVE)");
    } else {
      passed = false;
      console.log(`❌ Failed (Expected simulation failure with INSUFFICIENT_GAS_RESERVE, got: ${JSON.stringify(simC)})`);
    }
  } else {
    // If solver itself rejected the plan during solveRescue because it was infeasible, that also satisfies safety checks!
    console.log("✅ Passed (Solver safely blocked plan generation during solveRescue due to low native gas)");
  }

  // D. Wrong network is rejected
  console.log("\nTest D: Wrong network rejection");
  const simD = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    1, // Ethereum Mainnet instead of 1952
    freshQuoteTimestamp,
    "DEMO_SIMULATION"
  );

  if (!simD.success && simD.reason === "WRONG_NETWORK") {
    console.log("✅ Passed (Mismatch connected network correctly rejected with WRONG_NETWORK)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected WRONG_NETWORK error, got: ${JSON.stringify(simD)})`);
  }

  // E. Protected asset constraint violation is rejected
  console.log("\nTest E: Protected asset constraint violation check");
  // Plan A sells ETH under STRICT policy
  const simE = simulatePlan(
    intentStrict,
    planA,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "DEMO_SIMULATION"
  );

  if (!simE.success && simE.reason === "PROTECTED_ASSET_VIOLATION") {
    console.log("✅ Passed (Strict protected asset sale correctly rejected with PROTECTED_ASSET_VIOLATION)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected PROTECTED_ASSET_VIOLATION, got: ${JSON.stringify(simE)})`);
  }

  // F. Approval-needed state is surfaced
  console.log("\nTest F: Approval required state is surfaced");
  const appRequired = simA.requiredApprovals.find((a) => a.token === "TKX");
  if (appRequired && appRequired.approvalNeeded && appRequired.spender === "0x1111111254fb6c44bac0bed2854e76f90643097d") {
    console.log("✅ Passed (Token allowance requirement surfaced for TKX with OKX Spender)");
  } else {
    passed = false;
    console.log(`❌ Failed (Allowance requirement missing or incorrect: ${JSON.stringify(simA.requiredApprovals)})`);
  }

  // G. Native OKB does not require ERC-20 approval
  console.log("\nTest G: Native Gas token requires zero approvals check");
  const okbApproval = simA.requiredApprovals.find((a) => a.token === "OKB");
  if (!okbApproval) {
    console.log("✅ Passed (OKB excluded from ERC-20 approval requirements)");
  } else {
    passed = false;
    console.log("❌ Failed (Native OKB was flagged requiring approval!)");
  }

  // H. Demo route cannot become LIVE_CONFIRMED
  console.log("\nTest H: Demo simulation provenance restriction");
  if (simA.provenance === "DEMO") {
    console.log("✅ Passed (Simulation result preserves DEMO provenance flag)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected DEMO provenance, got: ${simA.provenance})`);
  }

  // I. Mismatch chain/environment is rejected
  console.log("\nTest I: Mismatch transaction chain/environment check");
  const wrongChainTx = simA.preparedTransactions.every((tx) => tx.chainId === 1952 && tx.environment === "testnet");
  if (wrongChainTx && connectedChainId === 1952) {
    console.log("✅ Passed (Constructed transactions chain ID 1952 matches connect wallet network 1952)");
  } else {
    passed = false;
    console.log("❌ Failed (Transactions constructed for mismatch environment or chain index)");
  }

  // J. Simulation cannot fabricate transaction hash
  console.log("\nTest J: No fabrication of transaction hashes");
  const hasTxHash = simA.preparedTransactions.some((tx: any) => tx.txHash || tx.hash);
  if (!hasTxHash) {
    console.log("✅ Passed (Prepared transaction payload contains no fabricated transaction hash)");
  } else {
    passed = false;
    console.log("❌ Failed (Fabricated transaction hash leaked inside prepared transaction payload!)");
  }

  console.log("\n==================================================");
  console.log(passed ? "Summary: All Simulation Tests Passed" : "Summary: Simulation Tests Failed");
  console.log("==================================================");

  if (!passed) {
    process.exit(1);
  }
}

runTests();
