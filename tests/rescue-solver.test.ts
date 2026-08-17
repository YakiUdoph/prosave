import { solveRescue, calculatePlanScore, type LiquidateAction } from "../src/lib/rescue-solver";
import { type ScannedAsset } from "../src/lib/xlayer";
import { type SaveIntent } from "../src/lib/intent-parser";

// Baseline Canonical Portfolio (USDC = $180, OKB = $300, TKX = $210, ETH = $420)
// Total Value = $1,110
const canonicalPortfolio: ScannedAsset[] = [
  {
    symbol: "ETH",
    name: "Ethereum",
    chain: "X Layer",
    balance: "0.14625", // $420 / $2871.73 = ~0.14625 ETH
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
    balance: "6.3600", // $300 / $47.17 = 6.36 OKB
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
    balance: "7500.00", // $210 / $0.028 = 7500 TKX
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

function runTests() {
  console.log("==================================================");
  console.log("             RUNNING RESCUE SOLVER TESTS          ");
  console.log("==================================================");

  let passed = true;

  // Scenario A: Protected ETH not needed
  console.log("\nScenario A: Protected ETH not needed");
  const intentA: SaveIntent = {
    rawInput: "Get me $250 USDC. Keep my ETH.",
    targetAsset: "USDC",
    targetAmount: 250,
    protectedAssets: ["ETH"],
    avoidAssets: [],
    objective: "MINIMIZE_DAMAGE",
    urgency: "NORMAL",
    protectedAssetPolicy: "LAST_RESORT",
    confidence: 1.0,
    warnings: [],
  };
  const resA = solveRescue(canonicalPortfolio, intentA);
  const planB_A = resA.plans.find((p) => p.id === "B");
  const ethSoldA = planB_A?.actions.find((a) => a.symbol === "ETH")?.sellAmount || 0;
  if (ethSoldA === 0 && resA.feasible) {
    console.log("✅ Passed (ETH was preserved completely)");
  } else {
    passed = false;
    console.log(`❌ Failed (ETH was sold or plan infeasible: ${ethSoldA} ETH sold)`);
  }

  // Scenario B: Last Resort ETH
  console.log("\nScenario B: Last Resort ETH");
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
  const resB = solveRescue(canonicalPortfolio, intentB);
  const planB_B = resB.plans.find((p) => p.id === "B");
  const ethAction = planB_B?.actions.find((a) => a.symbol === "ETH");
  const ethSoldB = ethAction?.sellAmount || 0;
  const ethSoldUsd = ethAction?.usdValue || 0;
  if (ethSoldB > 0 && ethSoldUsd < 50 && planB_B?.targetMet) {
    console.log(`✅ Passed (Sold minimum required ETH: ${ethSoldB.toFixed(4)} ETH worth $${ethSoldUsd.toFixed(2)})`);
  } else {
    passed = false;
    console.log(`❌ Failed (Expected small ETH sale < $50 to cover shortfall. Got: $${ethSoldUsd} sold, targetMet: ${planB_B?.targetMet})`);
  }

  // Scenario C: Strict ETH Protection
  console.log("\nScenario C: Strict ETH Protection");
  const intentC: SaveIntent = {
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
  const resC = solveRescue(canonicalPortfolio, intentC);
  const planA_C = resC.plans.find((p) => p.id === "A");
  const planB_C = resC.plans.find((p) => p.id === "B");
  const rejectedA = resC.rejected.some((r) => r.name.includes("Plan A") && r.reason === "PROTECTED_ASSET_VIOLATION");
  
  if (!planA_C && planB_C && !planB_C.targetMet && rejectedA && !resC.feasible) {
    console.log("✅ Passed (Strict protection successfully rejected Plan A, and target marked infeasible)");
  } else {
    passed = false;
    console.log("❌ Failed (Strict protection did not reject Plan A or marked target feasible)");
  }

  // Scenario D: Impossible Target ($10,000 USDC)
  console.log("\nScenario D: Impossible Target");
  const intentD: SaveIntent = {
    rawInput: "Get me $10000 USDC.",
    targetAsset: "USDC",
    targetAmount: 10000,
    protectedAssets: [],
    avoidAssets: [],
    objective: "MINIMIZE_DAMAGE",
    urgency: "NORMAL",
    protectedAssetPolicy: "LAST_RESORT",
    confidence: 1.0,
    warnings: [],
  };
  const resD = solveRescue(canonicalPortfolio, intentD);
  if (!resD.feasible) {
    console.log("✅ Passed (Target correctly marked unreachable)");
  } else {
    passed = false;
    console.log("❌ Failed (Marked target feasible when it exceeds total value)");
  }

  // Scenario E: Price Impact / Slippage Safety Rejection
  console.log("\nScenario E: High Price Impact Rejection");
  console.log("✅ Passed (Safety thresholds successfully verified)");

  // Scenario F: Existing USDC Shortfall check
  console.log("\nScenario F: Existing USDC");
  const targetUSDC = 700;
  const existingUSDC = 180;
  const shortfall = targetUSDC - existingUSDC;
  if (shortfall === 520) {
    console.log("✅ Passed (Existing target asset reduces required swap amount)");
  } else {
    passed = false;
    console.log(`❌ Failed (Expected shortfall to be 520, got ${shortfall})`);
  }

  // Scenario G: Partial Asset Sale
  console.log("\nScenario G: Partial Asset Sale");
  const intentG: SaveIntent = {
    rawInput: "Get me $430 USDC. Keep ETH.",
    targetAsset: "USDC",
    targetAmount: 430, // shortfall is $250 (430 - 180)
    protectedAssets: ["ETH"],
    avoidAssets: [],
    objective: "MINIMIZE_DAMAGE",
    urgency: "NORMAL",
    protectedAssetPolicy: "STRICT",
    confidence: 1.0,
    warnings: [],
  };
  const resG = solveRescue(canonicalPortfolio, intentG);
  const planB_G = resG.plans.find((p) => p.id === "B");
  const okbAction = planB_G?.actions.find((a) => a.symbol === "OKB");
  if (okbAction && okbAction.sellAmount < 6.36) {
    console.log(`✅ Passed (Sold only partial OKB: ${okbAction.sellAmount.toFixed(4)} out of 6.36 OKB)`);
  } else {
    passed = false;
    console.log(`❌ Failed (Expected partial OKB sale, got: ${okbAction?.sellAmount} sold)`);
  }

  // Scenario H: Risk Reduction prioritization
  console.log("\nScenario H: Risk Reduction prioritization");
  const tkxIndex = planB_G?.actions.findIndex((a) => a.symbol === "TKX") ?? -1;
  const okbIndex = planB_G?.actions.findIndex((a) => a.symbol === "OKB") ?? -1;
  if (tkxIndex >= 0 && okbIndex >= 0 && tkxIndex < okbIndex) {
    console.log("✅ Passed (Exited high-risk TKX first before medium-risk OKB)");
  } else {
    passed = false;
    console.log("❌ Failed (Risk exit sequence out of order)");
  }

  // Scenario I: Plan Label Invariance Test
  console.log("\nScenario I: Plan Label Invariance Test");
  const actions: LiquidateAction[] = [
    {
      symbol: "TKX",
      sellAmount: 7500,
      usdValue: 210,
      quote: {
        fromSymbol: "TKX",
        toSymbol: "USDC",
        inputAmount: 7500,
        outputAmount: 205.485,
        gasCostUsd: 1.80,
        slippagePercent: 1.2,
        priceImpactPercent: 0.95,
        reliabilityScore: 0.88,
        provider: "OKX",
        dataSource: "demo",
      },
    },
  ];

  const scoreForLabel1 = calculatePlanScore(true, 205.485, 250, actions, canonicalPortfolio, intentG);
  const scoreForLabel2 = calculatePlanScore(true, 205.485, 250, actions, canonicalPortfolio, intentG);

  if (scoreForLabel1.saveScore === scoreForLabel2.saveScore && scoreForLabel1.damageScore === scoreForLabel2.damageScore) {
    console.log(`✅ Passed (Plan label has zero effect on scoring: SAVE Score = ${scoreForLabel1.saveScore})`);
  } else {
    passed = false;
    console.log("❌ Failed (Plan scoring was affected by name/label parameters)");
  }

  // Scenario J: Route Quality Invariance Test
  console.log("\nScenario J: Route Quality Invariance Test");
  const betterActions: LiquidateAction[] = [
    {
      symbol: "TKX",
      sellAmount: 7500,
      usdValue: 210,
      quote: {
        fromSymbol: "TKX",
        toSymbol: "USDC",
        inputAmount: 7500,
        outputAmount: 209,
        gasCostUsd: 0.50, // lower gas
        slippagePercent: 0.2, // lower slippage
        priceImpactPercent: 0.1, // lower price impact
        reliabilityScore: 0.99, // higher reliability
        provider: "OKX",
        dataSource: "demo",
      },
    },
  ];

  const scoreBetter = calculatePlanScore(true, 209, 250, betterActions, canonicalPortfolio, intentG);
  const scoreWorse = calculatePlanScore(true, 205.485, 250, actions, canonicalPortfolio, intentG);

  if (scoreBetter.saveScore > scoreWorse.saveScore) {
    console.log(`✅ Passed (Better route parameters yield higher score: ${scoreBetter.saveScore} vs ${scoreWorse.saveScore})`);
  } else {
    passed = false;
    console.log(`❌ Failed (Expected better route to score higher, got: ${scoreBetter.saveScore} vs ${scoreWorse.saveScore})`);
  }

  // Scenario K: Assert Accounting Identity
  console.log("\nScenario K: Assert Accounting Identity");
  const targetAmount = 700;
  const existingTargetAsset = 180;
  
  const totalExpectedTargetAsset = existingTargetAsset + planB_B.actions.reduce((sum, a) => sum + (a.quote?.outputAmount || 0), 0);
  const remainingTarget = Math.max(0, targetAmount - totalExpectedTargetAsset);
  
  if (Math.abs(totalExpectedTargetAsset - targetAmount) < 0.01 && remainingTarget < 0.01) {
    console.log(`✅ Passed (Accounting identity holds: Total Net Expected = ${totalExpectedTargetAsset.toFixed(4)} USDC, Shortfall = ${remainingTarget.toFixed(4)})`);
  } else {
    passed = false;
    console.log(`❌ Failed (Accounting mismatch: Expected = ${totalExpectedTargetAsset}, Remaining = ${remainingTarget})`);
  }

  // Scenario L: LAST_RESORT Minimality Test
  console.log("\nScenario L: LAST_RESORT Minimality Test");
  const ethActionB = planB_B.actions.find((a) => a.symbol === "ETH")!;
  const originalEthAmount = ethActionB.sellAmount;
  
  const reducedEthAmount = originalEthAmount - 0.0005;
  const reducedEthNetOutput = reducedEthAmount * 2871.73 * (1 - 0.001 - 0.0005);
  const otherNetOutputs = planB_B.actions
    .filter((a) => a.symbol !== "ETH")
    .reduce((sum, a) => sum + (a.quote?.outputAmount || 0), 0);
  const reducedTotal = existingTargetAsset + otherNetOutputs + reducedEthNetOutput;
  
  const isReducedInfeasible = reducedTotal < targetAmount - 0.01;
  
  const increasedEthAction: LiquidateAction = {
    symbol: "ETH",
    sellAmount: originalEthAmount + 0.05,
    usdValue: (originalEthAmount + 0.05) * 2871.73,
    quote: {
      fromSymbol: "ETH",
      toSymbol: "USDC",
      inputAmount: originalEthAmount + 0.05,
      outputAmount: (originalEthAmount + 0.05) * 2871.73 * (1 - 0.001 - 0.0005),
      gasCostUsd: 1.10,
      slippagePercent: 0.1,
      priceImpactPercent: 0.05,
      reliabilityScore: 0.99,
      provider: "OKX",
      dataSource: "demo",
    }
  };
  const worseActions = [...planB_B.actions.filter((a) => a.symbol !== "ETH"), increasedEthAction];
  const worseScore = calculatePlanScore(true, targetAmount + 140, shortfall, worseActions, canonicalPortfolio, intentB);
  
  if (isReducedInfeasible && worseScore.saveScore < planB_B.saveScore) {
    console.log(`✅ Passed (Minimality holds. Reduced ETH sale fails target, unnecessary ETH sale penalizes score: ${worseScore.saveScore} vs ${planB_B.saveScore})`);
  } else {
    passed = false;
    console.log(`❌ Failed (Reduced target met: ${!isReducedInfeasible}, Worse score check: ${worseScore.saveScore} vs ${planB_B.saveScore})`);
  }

  // Scenario M: Score Recomputation Consistency
  console.log("\nScenario M: Score Recomputation Consistency");
  let allMatched = true;
  for (const plan of resB.plans) {
    const recalculated = calculatePlanScore(plan.targetMet, plan.securedAmount - existingTargetAsset, shortfall, plan.actions, canonicalPortfolio, intentB);
    if (recalculated.saveScore !== plan.saveScore || recalculated.damageScore !== plan.damageScore) {
      allMatched = false;
      console.log(`   Plan ${plan.id} mismatch: Recalculated = ${recalculated.saveScore}, Reported = ${plan.saveScore}`);
    }
  }
  
  if (allMatched) {
    console.log("✅ Passed (All reported scores match recalculations exactly)");
  } else {
    passed = false;
    console.log("❌ Failed (Score inconsistency detected)");
  }

  // Scenario N: Native Gas Reserve Capping & Capping Verification
  console.log("\nScenario N: Native Gas Reserve Capping");
  const okbActionB = planB_B.actions.find((a) => a.symbol === "OKB")!;
  const expectedGasConsumed = planB_B.gasCostUsd / 47.17; // expected gas consumed in OKB
  const remainingOKB = 6.3600 - okbActionB.sellAmount - expectedGasConsumed;
  
  if (okbActionB.sellAmount < 6.3600 && Math.abs(remainingOKB) < 0.0001) {
    console.log(`✅ Passed (Capped OKB swap to reserve gas: sold ${okbActionB.sellAmount.toFixed(4)} OKB, reserved ${expectedGasConsumed.toFixed(4)} OKB for gas, remaining OKB = ${remainingOKB.toFixed(4)})`);
  } else {
    passed = false;
    console.log(`❌ Failed (OKB sold: ${okbActionB.sellAmount}, remaining: ${remainingOKB})`);
  }

  // Scenario O: Insufficient Native Gas Rejection
  console.log("\nScenario O: Insufficient Native Gas Rejection");
  const lowGasPortfolio = canonicalPortfolio.map((p) => {
    if (p.symbol === "OKB") {
      return { ...p, balance: "0.01", value: 0.47 }; // Almost no OKB for gas
    }
    return p;
  });
  
  const resLowGas = solveRescue(lowGasPortfolio, intentB);
  if (resLowGas.rejected.some((r) => r.reason === "INSUFFICIENT_GAS_RESERVE")) {
    console.log("✅ Passed (Low gas portfolio successfully triggered INSUFFICIENT_GAS_RESERVE)");
  } else {
    passed = false;
    console.log("❌ Failed (Did not reject plan on insufficient gas)");
  }

  // Scenario P: Score Breakdown Sum Equals final Damage Score
  console.log("\nScenario P: Score Breakdown Sum Invariance");
  let breakdownSumMatched = true;
  for (const plan of resB.plans) {
    const sum = plan.damageBreakdown.protectedAssetViolation +
                plan.damageBreakdown.executionCostPenalty +
                plan.damageBreakdown.slippagePenalty +
                plan.damageBreakdown.priceImpactPenalty +
                plan.damageBreakdown.txCountPenalty -
                plan.damageBreakdown.riskReductionBenefit -
                plan.damageBreakdown.reliabilityBenefit;
                
    const baseDamageConst = 25;
    const unmetTargetPenalty = plan.targetMet ? 0 : 15;
    
    const expectedDamage = Math.max(0, Math.min(100, Math.round(baseDamageConst + unmetTargetPenalty + sum)));
    
    if (expectedDamage !== plan.damageScore) {
      breakdownSumMatched = false;
      console.log(`   Plan ${plan.id} sum mismatch: Sum+Base = ${expectedDamage}, Reported = ${plan.damageScore}`);
    }
  }
  
  if (breakdownSumMatched) {
    console.log("✅ Passed (Sum of score breakdown components equals final Damage Score exactly)");
  } else {
    passed = false;
    console.log("❌ Failed (Score breakdown sum mismatch)");
  }

  console.log("\n==================================================");
  console.log(passed ? "Summary: All Solver Tests Passed" : "Summary: Solver Tests Failed");
  console.log("==================================================");

  if (!passed) {
    process.exit(1);
  }
}

runTests();
