import { simulatePlan, type PreparedTransaction } from "../src/lib/simulation";
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
  console.log("             RUNNING SIMULATION HARDENING TESTS   ");
  console.log("==================================================");

  let passed = true;

  // Pre-requisite: Solve for Plan B (sells TKX + OKB + minimal ETH)
  const resRescue = solveRescue(canonicalPortfolio, intentB);
  const planB = resRescue.plans.find((p) => p.id === "B")!;
  const planA = resRescue.plans.find((p) => p.id === "A")!;

  const connectedAddress = "0x9812A2b918D3b584dC81E3b584dc81E3B584dc81";
  const connectedChainId = 1952; // X Layer Testnet
  const freshQuoteTimestamp = Date.now();

  // Test A: Valid plan becomes SIMULATION_READY
  console.log("\nTest A: Valid Plan Simulation readiness");
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
    console.log("✅ Passed (Valid plan yields SIMULATION_READY status)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected simulation success, got: ${JSON.stringify(simA)})`);
  }

  // Test B: Stale quote is rejected
  console.log("\nTest B: Stale Quote rejection");
  const staleTimestamp = Date.now() - 75 * 1000;
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
    console.log("✅ Passed (Stale quote successfully rejected with QUOTE_STALE)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected rejection with QUOTE_STALE, got: ${JSON.stringify(simB)})`);
  }

  // Test C: Insufficient OKB gas reserve is rejected
  console.log("\nTest C: Insufficient native gas reserve rejection");
  const lowGasPortfolio: ScannedAsset[] = canonicalPortfolio.map((p) => {
    if (p.symbol === "OKB") {
      return { ...p, balance: "0.001", value: 0.05 };
    }
    return p;
  });

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
      console.log("✅ Passed (Exhausted native gas reserve correctly rejected)");
    } else {
      passed = false;
      console.log(`❌ Failed (Expected simulation failure, got: ${JSON.stringify(simC)})`);
    }
  } else {
    console.log("✅ Passed (Solver blocked plan generation during solveRescue due to low native gas)");
  }

  // Test D: Wrong network is rejected
  console.log("\nTest D: Wrong network rejection");
  const simD = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    1,
    freshQuoteTimestamp,
    "DEMO_SIMULATION"
  );

  if (!simD.success && simD.reason === "WRONG_NETWORK") {
    console.log("✅ Passed (Mismatch connected network correctly rejected)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected WRONG_NETWORK error, got: ${JSON.stringify(simD)})`);
  }

  // Test E: Protected asset constraint violation is rejected
  console.log("\nTest E: Protected asset constraint violation check");
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
    console.log("✅ Passed (Strict protection sale rejected with PROTECTED_ASSET_VIOLATION)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected PROTECTED_ASSET_VIOLATION, got: ${JSON.stringify(simE)})`);
  }

  // Test F: No universal hardcoded spender is used
  console.log("\nTest F: Spender is dynamically extracted from quote (No universal spender)");
  // If we modify Plan B to have quotes with different spender addresses, it should populate those different spender addresses
  const customPlan: CandidatePlan = JSON.parse(JSON.stringify(planB));
  const tkxAction = customPlan.actions.find(a => a.symbol === "TKX")!;
  tkxAction.quote!.spenderAddress = "0x2222222222222222222222222222222222222222";
  
  const simF = simulatePlan(
    intentB,
    customPlan,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "DEMO_SIMULATION"
  );

  const tkxApp = simF.requiredApprovals.find(a => a.token === "TKX")!;
  if (simF.success && tkxApp.spender === "0x2222222222222222222222222222222222222222") {
    console.log("✅ Passed (Spender address is dynamically extracted from quote: 0x2222...)");
  } else {
    passed = false;
    console.log(`❌ Failed (Spender address was not dynamic: ${JSON.stringify(tkxApp)})`);
  }

  // Test G: Native OKB has no ERC-20 approval requirement
  console.log("\nTest G: Native OKB has no approval requirement");
  const okbApp = simA.requiredApprovals.find(a => a.token === "OKB");
  if (!okbApp) {
    console.log("✅ Passed (Native OKB correctly excluded from approval requirements)");
  } else {
    passed = false;
    console.log("❌ Failed (Native OKB should not require approval)");
  }

  // Test H: ERC-20 with unknown spender cannot become READY_TO_SIGN
  console.log("\nTest H: ERC-20 with unknown spender is rejected");
  const planUnknownSpender: CandidatePlan = JSON.parse(JSON.stringify(planB));
  const tkxAct = planUnknownSpender.actions.find(a => a.symbol === "TKX")!;
  tkxAct.quote!.spenderAddress = ""; // Empty/unknown spender

  const simH = simulatePlan(
    intentB,
    planUnknownSpender,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "DEMO_SIMULATION"
  );

  if (!simH.success && simH.reason === "UNKNOWN_SPENDER") {
    console.log("✅ Passed (Unknown spender rejected with UNKNOWN_SPENDER error status)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected UNKNOWN_SPENDER rejection, got: ${JSON.stringify(simH)})`);
  }

  // Test I: Mainnet approval cannot be applied to Testnet wallet
  console.log("\nTest I: Mainnet approval rejected on Testnet wallet");
  const planMainnetApproval: CandidatePlan = JSON.parse(JSON.stringify(planB));
  const ethAct = planMainnetApproval.actions.find(a => a.symbol === "ETH")!;
  ethAct.quote!.chainIndex = 196; // Mainnet X Layer index
  
  // Set quotes as live source to bypass unknown spender checks under LIVE_SIMULATION
  planMainnetApproval.actions.forEach((act) => {
    if (act.quote) {
      act.quote.dataSource = "live";
    }
  });

  const simI = simulatePlan(
    intentB,
    planMainnetApproval,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "LIVE_SIMULATION"
  );

  if (!simI.success && simI.reason === "WRONG_NETWORK") {
    console.log("✅ Passed (Mainnet quote/approval index 196 rejected on Testnet wallet chain index 1952)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected WRONG_NETWORK rejection, got: ${JSON.stringify(simI)})`);
  }

  // Test J: DEMO approval requirement remains DEMO
  console.log("\nTest J: DEMO approval status remains DEMO");
  const simJ = simulatePlan(
    intentB,
    planB,
    canonicalPortfolio,
    connectedAddress,
    connectedChainId,
    freshQuoteTimestamp,
    "DEMO_SIMULATION"
  );

  const tkxAppJ = simJ.requiredApprovals.find(a => a.token === "TKX")!;
  if (simJ.success && tkxAppJ.verificationStatus === "DEMO" && simJ.provenance === "DEMO") {
    console.log("✅ Passed (Verification status locked to DEMO under demo simulation)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected verification status DEMO, got: ${tkxAppJ.verificationStatus})`);
  }

  // Test K: No fabrication of transaction hashes
  console.log("\nTest K: No fabrication of transaction hashes");
  const hasTxHash = simA.preparedTransactions.some((tx: any) => tx.txHash || tx.hash);
  if (!hasTxHash) {
    console.log("✅ Passed (Prepared transactions contain zero fabricated hashes)");
  } else {
    passed = false;
    console.log("❌ Failed (Fabricated transaction hashes leaked!)");
  }

  console.log("\n==================================================");
  console.log(passed ? "Summary: All Simulation Hardening Tests Passed" : "Summary: Tests Failed");
  console.log("==================================================");

  if (!passed) {
    process.exit(1);
  }
}

runTests();
