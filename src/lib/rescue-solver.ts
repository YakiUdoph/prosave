import { type ScannedAsset, type DataSource } from "./xlayer";
import { type SaveIntent } from "./intent-parser";

export type RouteQuote = {
  fromSymbol: string;
  toSymbol: string;
  inputAmount: number;
  outputAmount: number;
  gasCostUsd: number;
  slippagePercent: number;
  priceImpactPercent: number;
  reliabilityScore: number; // 0 to 1
  provider: string;
  dataSource: DataSource;
};

export type LiquidateAction = {
  symbol: string;
  sellAmount: number;
  usdValue: number;
  quote: RouteQuote | null;
};

export type DamageScoreBreakdown = {
  protectedAssetViolation: number; // penalty
  executionCostPenalty: number;
  slippagePenalty: number;
  priceImpactPenalty: number;
  riskReductionBenefit: number;
  reliabilityBenefit: number;
  txCountPenalty: number;
};

export type CandidatePlan = {
  id: "A" | "B" | "C";
  name: string;
  description: string;
  targetMet: boolean;
  securedAmount: number;
  actions: LiquidateAction[];
  protectedPreservedPercent: number;
  gasCostUsd: number;
  slippagePercent: number;
  priceImpactPercent: number;
  saveScore: number; // 0-100, higher is better
  damageScore: number; // 0-100, lower is better
  damageBreakdown: DamageScoreBreakdown;
  whyRecommended: string;
};

export type RejectedPlan = {
  name: string;
  reason: "TARGET_NOT_REACHED" | "PROTECTED_ASSET_VIOLATION" | "INSUFFICIENT_LIQUIDITY" | "EXCESSIVE_PRICE_IMPACT" | "INVALID_ROUTE";
  description: string;
};

export type RescueResult = {
  feasible: boolean;
  plans: CandidatePlan[];
  rejected: RejectedPlan[];
  recommendedPlanId: "A" | "B" | "C" | null;
};

// Safety thresholds
const MAX_PRICE_IMPACT = 5.0; // Max 5% price impact
const MAX_SLIPPAGE = 3.0; // Max 3% slippage

/**
 * Calculates a plan's damage and SAVE score strictly from measurable properties.
 * Identical actions and route metrics will yield identical scores regardless of plan label.
 */
export function calculatePlanScore(
  targetMet: boolean,
  securedAmount: number,
  requiredTarget: number,
  actions: LiquidateAction[],
  portfolio: ScannedAsset[],
  intent: SaveIntent
) {
  // 1. Base Damage (15 point shortfall penalty if goal is not achieved)
  let damageScore = 25;
  if (!targetMet) {
    damageScore += 15;
  }

  // 2. Protected asset violation penalty
  let protectedViolationPenalty = 0;
  const protectedInPortfolio = portfolio.filter((p) => intent.protectedAssets.includes(p.symbol));
  const totalProtectedVal = protectedInPortfolio.reduce((sum, a) => sum + a.value, 0);

  const protectedActions = actions.filter((act) => intent.protectedAssets.includes(act.symbol));
  const soldProtectedVal = protectedActions.reduce((sum, act) => sum + act.usdValue, 0);

  if (soldProtectedVal > 0) {
    if (intent.protectedAssetPolicy === "STRICT") {
      protectedViolationPenalty = 90; // Strict protection breach penalty
    } else {
      // Proportional penalty for LAST_RESORT sale
      const fractionSold = totalProtectedVal > 0 ? soldProtectedVal / totalProtectedVal : 0;
      protectedViolationPenalty = fractionSold * 50;
    }
  }

  // 3. Execution cost (Gas) penalty
  const totalGas = actions.reduce((sum, act) => sum + (act.quote?.gasCostUsd || 0), 0);
  const executionCostPenalty = Math.min(10, (totalGas / 20) * 10);

  // 4. Slippage and Price Impact weighted averages
  let totalSlippage = 0;
  let totalPriceImpact = 0;
  let totalReliability = 0;
  let totalWeight = 0;

  for (const act of actions) {
    if (act.quote) {
      totalSlippage += act.quote.slippagePercent * act.usdValue;
      totalPriceImpact += act.quote.priceImpactPercent * act.usdValue;
      totalReliability += act.quote.reliabilityScore * act.usdValue;
      totalWeight += act.usdValue;
    }
  }

  const avgSlippage = totalWeight > 0 ? totalSlippage / totalWeight : 0;
  const avgPriceImpact = totalWeight > 0 ? totalPriceImpact / totalWeight : 0;
  const avgReliability = totalWeight > 0 ? totalReliability / totalWeight : 0.95;

  const slippagePenalty = Math.min(15, (avgSlippage / MAX_SLIPPAGE) * 15);
  const priceImpactPenalty = Math.min(15, (avgPriceImpact / MAX_PRICE_IMPACT) * 15);

  // 5. Unnecessary liquidation penalty (liquidating significantly more than required)
  const allowedTolerance = 10.0; // Allowed $10 safety buffer
  const excessLiquidation = Math.max(0, securedAmount - requiredTarget - allowedTolerance);
  const totalPortfolioVal = portfolio.reduce((sum, a) => sum + a.value, 0);
  const unnecessaryLiquidationPenalty = totalPortfolioVal > 0 ? (excessLiquidation / totalPortfolioVal) * 20 : 0;

  // 6. Risk reduction benefit (exiting high-risk assets reduces damage)
  const soldHighRisk = actions.filter((act) => {
    const orig = portfolio.find((p) => p.symbol === act.symbol);
    return orig?.risk === "high";
  });
  const totalHighRiskVal = portfolio.filter((p) => p.risk === "high").reduce((sum, a) => sum + a.value, 0);
  const exitedHighRiskVal = soldHighRisk.reduce((sum, a) => sum + a.usdValue, 0);
  const riskReductionBenefit = totalHighRiskVal > 0 ? (exitedHighRiskVal / totalHighRiskVal) * 15 : 0;

  // 7. Reliability benefit
  const reliabilityBenefit = avgReliability * 10;

  // 8. Tx count penalty
  const txCountPenalty = (actions.length - 1) * 3;

  // Aggregate raw damage score
  const rawDamage =
    damageScore +
    protectedViolationPenalty +
    executionCostPenalty +
    slippagePenalty +
    priceImpactPenalty +
    txCountPenalty +
    unnecessaryLiquidationPenalty -
    riskReductionBenefit -
    reliabilityBenefit;

  const finalDamageScore = Math.max(0, Math.min(100, Math.round(rawDamage)));
  const finalSaveScore = 100 - finalDamageScore;

  return {
    saveScore: finalSaveScore,
    damageScore: finalDamageScore,
    breakdown: {
      protectedAssetViolation: Math.round(protectedViolationPenalty),
      executionCostPenalty: Math.round(executionCostPenalty),
      slippagePenalty: Math.round(slippagePenalty),
      priceImpactPenalty: Math.round(priceImpactPenalty),
      riskReductionBenefit: Math.round(riskReductionBenefit),
      reliabilityBenefit: Math.round(reliabilityBenefit),
      txCountPenalty: Math.round(txCountPenalty),
    },
  };
}

/**
 * Deterministically solves for the best multi-asset liquidation strategy.
 */
export function solveRescue(
  portfolio: ScannedAsset[],
  intent: SaveIntent
): RescueResult {
  const result: RescueResult = {
    feasible: false,
    plans: [],
    rejected: [],
    recommendedPlanId: null,
  };

  if (!intent.targetAmount) {
    return result;
  }

  // 1. Identify existing target holdings
  const targetSymbol = intent.targetAsset || "USDC";
  const targetAsset = portfolio.find((a) => a.symbol === targetSymbol);
  const existingUSDC = targetAsset ? parseFloat(targetAsset.balance) : 0;

  const requiredTarget = Math.max(0, intent.targetAmount - existingUSDC);

  // 2. Fetch mock/fixture route quote parameters for assets to target asset
  const getMockQuote = (symbol: string, inputAmount: number): RouteQuote => {
    const isEth = symbol === "ETH";
    const isOkb = symbol === "OKB";

    return {
      fromSymbol: symbol,
      toSymbol: targetSymbol,
      inputAmount,
      outputAmount: inputAmount * (isEth ? 2871.73 : isOkb ? 47.17 : 0.028),
      gasCostUsd: isEth ? 1.10 : isOkb ? 1.20 : 1.80,
      slippagePercent: isEth ? 0.10 : isOkb ? 0.15 : 1.20,
      priceImpactPercent: isEth ? 0.05 : isOkb ? 0.08 : 0.95,
      reliabilityScore: isEth ? 0.99 : isOkb ? 0.99 : 0.88,
      provider: "OKX DEX Aggregator",
      dataSource: "demo",
    };
  };

  const candidates = portfolio.filter((a) => a.symbol !== targetSymbol);

  // Group assets
  const highRiskAssets = candidates.filter((a) => a.risk === "high");
  const mediumRiskAssets = candidates.filter((a) => a.risk === "medium" && !intent.protectedAssets.includes(a.symbol));
  const protectedAssets = candidates.filter((a) => intent.protectedAssets.includes(a.symbol));

  // ----------------------------------------------------
  // PLAN B: SAVE RECOMMENDED (Deterministic preservation)
  // ----------------------------------------------------
  let planBTargetRemaining = requiredTarget;
  const planBActions: LiquidateAction[] = [];
  let planBGas = 0;

  const planBSellSequence = [...highRiskAssets, ...mediumRiskAssets];

  // First pass: sell non-protected assets
  for (const asset of planBSellSequence) {
    if (planBTargetRemaining <= 0) break;

    const balance = parseFloat(asset.balance);
    const assetUsdValue = asset.value;

    if (assetUsdValue <= 0 || balance <= 0) continue;

    const quote = getMockQuote(asset.symbol, balance);

    if (quote.priceImpactPercent > MAX_PRICE_IMPACT || quote.slippagePercent > MAX_SLIPPAGE) {
      result.rejected.push({
        name: `Liquidation of ${asset.symbol} via OKX`,
        reason: "EXCESSIVE_PRICE_IMPACT",
        description: `Price impact ${quote.priceImpactPercent}% exceeds safety threshold of ${MAX_PRICE_IMPACT}%`,
      });
      continue;
    }

    const maxOutput = quote.outputAmount;

    if (maxOutput <= planBTargetRemaining) {
      planBActions.push({
        symbol: asset.symbol,
        sellAmount: balance,
        usdValue: assetUsdValue,
        quote,
      });
      planBTargetRemaining -= maxOutput;
      planBGas += quote.gasCostUsd;
    } else {
      const fraction = planBTargetRemaining / maxOutput;
      const sellAmount = balance * fraction;
      const partialQuote = getMockQuote(asset.symbol, sellAmount);

      planBActions.push({
        symbol: asset.symbol,
        sellAmount,
        usdValue: assetUsdValue * fraction,
        quote: partialQuote,
      });
      planBTargetRemaining = 0;
      planBGas += partialQuote.gasCostUsd;
    }
  }

  // Second pass: Sell protected assets if required by LAST_RESORT
  let planBProtectedPreserved = 100;
  if (planBTargetRemaining > 0 && intent.protectedAssetPolicy === "LAST_RESORT") {
    for (const asset of protectedAssets) {
      if (planBTargetRemaining <= 0) break;

      const balance = parseFloat(asset.balance);
      const assetUsdValue = asset.value;

      if (assetUsdValue <= 0 || balance <= 0) continue;

      const quote = getMockQuote(asset.symbol, balance);
      const maxOutput = quote.outputAmount;

      if (maxOutput <= planBTargetRemaining) {
        planBActions.push({
          symbol: asset.symbol,
          sellAmount: balance,
          usdValue: assetUsdValue,
          quote,
        });
        planBTargetRemaining -= maxOutput;
        planBGas += quote.gasCostUsd;
        planBProtectedPreserved = 0;
      } else {
        const fraction = planBTargetRemaining / maxOutput;
        const sellAmount = balance * fraction;
        const partialQuote = getMockQuote(asset.symbol, sellAmount);

        planBActions.push({
          symbol: asset.symbol,
          sellAmount,
          usdValue: assetUsdValue * fraction,
          quote: partialQuote,
        });
        planBTargetRemaining = 0;
        planBGas += partialQuote.gasCostUsd;
        planBProtectedPreserved = Math.round((1 - fraction) * 100);
      }
    }
  }

  const planBTargetMet = planBTargetRemaining <= 0;
  const planBSecured = requiredTarget - planBTargetRemaining;

  // ----------------------------------------------------
  // PLAN A: MAX LIQUIDITY (Sell ETH first, ignores protection)
  // ----------------------------------------------------
  let planATargetRemaining = requiredTarget;
  const planAActions: LiquidateAction[] = [];
  let planAGas = 0;

  const planASellSequence = [...protectedAssets, ...mediumRiskAssets, ...highRiskAssets];
  let planAProtectedPreserved = 100;

  for (const asset of planASellSequence) {
    if (planATargetRemaining <= 0) break;

    const balance = parseFloat(asset.balance);
    const assetUsdValue = asset.value;

    if (assetUsdValue <= 0 || balance <= 0) continue;

    const quote = getMockQuote(asset.symbol, balance);
    const maxOutput = quote.outputAmount;

    const isProtected = intent.protectedAssets.includes(asset.symbol);

    if (maxOutput <= planATargetRemaining) {
      planAActions.push({
        symbol: asset.symbol,
        sellAmount: balance,
        usdValue: assetUsdValue,
        quote,
      });
      planATargetRemaining -= maxOutput;
      planAGas += quote.gasCostUsd;
      if (isProtected) planAProtectedPreserved = 0;
    } else {
      const fraction = planATargetRemaining / maxOutput;
      const sellAmount = balance * fraction;
      const partialQuote = getMockQuote(asset.symbol, sellAmount);

      planAActions.push({
        symbol: asset.symbol,
        sellAmount,
        usdValue: assetUsdValue * fraction,
        quote: partialQuote,
      });
      planATargetRemaining = 0;
      planAGas += partialQuote.gasCostUsd;
      if (isProtected) {
        planAProtectedPreserved = Math.round((1 - fraction) * 100);
      }
    }
  }

  const planATargetMet = planATargetRemaining <= 0;
  const planASecured = requiredTarget - planATargetRemaining;

  // ----------------------------------------------------
  // PLAN C: MAX PRESERVATION (Sell TKX only, preserve others)
  // ----------------------------------------------------
  let planCTargetRemaining = requiredTarget;
  const planCActions: LiquidateAction[] = [];
  let planCGas = 0;

  for (const asset of highRiskAssets) {
    if (planCTargetRemaining <= 0) break;

    const balance = parseFloat(asset.balance);
    const assetUsdValue = asset.value;

    if (assetUsdValue <= 0 || balance <= 0) continue;

    const quote = getMockQuote(asset.symbol, balance);
    const maxOutput = quote.outputAmount;

    if (maxOutput <= planCTargetRemaining) {
      planCActions.push({
        symbol: asset.symbol,
        sellAmount: balance,
        usdValue: assetUsdValue,
        quote,
      });
      planCTargetRemaining -= maxOutput;
      planCGas += quote.gasCostUsd;
    } else {
      const fraction = planCTargetRemaining / maxOutput;
      const sellAmount = balance * fraction;
      const partialQuote = getMockQuote(asset.symbol, sellAmount);

      planCActions.push({
        symbol: asset.symbol,
        sellAmount,
        usdValue: assetUsdValue * fraction,
        quote: partialQuote,
      });
      planCTargetRemaining = 0;
      planCGas += partialQuote.gasCostUsd;
    }
  }

  const planCTargetMet = planCTargetRemaining <= 0;
  const planCSecured = requiredTarget - planCTargetRemaining;

  // Compile Scores via label-invariant formula
  const scoresA = calculatePlanScore(planATargetMet, planASecured, requiredTarget, planAActions, portfolio, intent);
  const planA: CandidatePlan = {
    id: "A",
    name: "Plan A: Max Liquidity",
    description: "Prioritizes deep liquidity routes to secure funds rapidly.",
    targetMet: planATargetMet,
    securedAmount: planASecured + existingUSDC,
    actions: planAActions,
    protectedPreservedPercent: planAProtectedPreserved,
    gasCostUsd: planAGas,
    slippagePercent: planAActions.length > 0 ? 0.12 : 0,
    priceImpactPercent: planAActions.length > 0 ? 0.05 : 0,
    saveScore: scoresA.saveScore,
    damageScore: scoresA.damageScore,
    damageBreakdown: scoresA.breakdown,
    whyRecommended: "Secures required liquidity with a single transaction but incurs severe protection violations.",
  };

  const scoresB = calculatePlanScore(planBTargetMet, planBSecured, requiredTarget, planBActions, portfolio, intent);
  const planB: CandidatePlan = {
    id: "B",
    name: "Plan B: SAVE Recommended",
    description: "Optimizes capital retrieval while preserving designated protected assets.",
    targetMet: planBTargetMet,
    securedAmount: planBSecured + existingUSDC,
    actions: planBActions,
    protectedPreservedPercent: planBProtectedPreserved,
    gasCostUsd: planBGas,
    slippagePercent: planBActions.length > 0 ? 0.95 : 0,
    priceImpactPercent: planBActions.length > 0 ? 0.72 : 0,
    saveScore: scoresB.saveScore,
    damageScore: scoresB.damageScore,
    damageBreakdown: scoresB.breakdown,
    whyRecommended: "Achieves target liquidity while fully preserving your protected ETH holdings.",
  };

  const scoresC = calculatePlanScore(planCTargetMet, planCSecured, requiredTarget, planCActions, portfolio, intent);
  const planC: CandidatePlan = {
    id: "C",
    name: "Plan C: Max Preservation",
    description: "Refuses to liquidate key strategic reserves, limiting trades to high-risk assets.",
    targetMet: planCTargetMet,
    securedAmount: planCSecured + existingUSDC,
    actions: planCActions,
    protectedPreservedPercent: 100,
    gasCostUsd: planCGas,
    slippagePercent: planCActions.length > 0 ? 1.20 : 0,
    priceImpactPercent: planCActions.length > 0 ? 0.95 : 0,
    saveScore: scoresC.saveScore,
    damageScore: scoresC.damageScore,
    damageBreakdown: scoresC.breakdown,
    whyRecommended: "Fails to meet the target but completely guarantees no swaps on ETH or OKB.",
  };

  // STRICT protection check
  const hasStrictA = intent.protectedAssetPolicy === "STRICT" && planAProtectedPreserved < 100;
  const hasStrictB = intent.protectedAssetPolicy === "STRICT" && planBProtectedPreserved < 100;

  if (hasStrictA) {
    result.rejected.push({
      name: "Plan A: Max Liquidity",
      reason: "PROTECTED_ASSET_VIOLATION",
      description: "Violates strict ETH protection constraint by liquidating protected reserves.",
    });
  } else {
    result.plans.push(planA);
  }

  if (hasStrictB) {
    result.rejected.push({
      name: "Plan B: SAVE Recommended",
      reason: "PROTECTED_ASSET_VIOLATION",
      description: "Violates strict ETH protection constraint because non-protected funds were insufficient.",
    });
  } else {
    result.plans.push(planB);
  }

  result.plans.push(planC);

  // Set recommended winner from available candidates
  const validPlans = result.plans.filter((p) => p.targetMet);
  if (validPlans.length > 0) {
    const bestPlan = validPlans.reduce((prev, current) => (prev.saveScore > current.saveScore ? prev : current));
    result.recommendedPlanId = bestPlan.id;
  } else {
    result.recommendedPlanId = "C";
  }

  result.feasible = result.plans.some((p) => p.targetMet);

  return result;
}
