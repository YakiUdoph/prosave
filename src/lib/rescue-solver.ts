import { type ScannedAsset, type DataSource } from "./xlayer";
import { type SaveIntent } from "./intent-parser";

export type RouteQuote = {
  fromSymbol: string;
  toSymbol: string;
  inputAmount: number;
  outputAmount: number; // Net expected output (after slippage and price impact)
  gasCostUsd: number;
  slippagePercent: number;
  priceImpactPercent: number;
  reliabilityScore: number; // 0 to 1
  provider: string;
  dataSource: DataSource;
  spenderAddress?: string;
  chainIndex?: number;
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
  securedAmount: number; // existing USDC + sum(netExpectedOutputs)
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
  reason: "TARGET_NOT_REACHED" | "PROTECTED_ASSET_VIOLATION" | "INSUFFICIENT_LIQUIDITY" | "EXCESSIVE_PRICE_IMPACT" | "INVALID_ROUTE" | "INSUFFICIENT_GAS_RESERVE";
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
      // Proportional penalty for LAST_RESORT sale (scaled up to 50 points)
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
  const allowedTolerancePercent = 0.02; // Allowed 2% safety buffer (e.g. $14 on $700 target)
  const allowedTolerance = requiredTarget * allowedTolerancePercent;
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

  // Native gas asset parameters (OKB is the native gas asset on X Layer)
  const nativeGasSymbol = "OKB";
  const nativeGasPrice = 47.17;

  // 1. Identify existing target holdings
  const targetSymbol = intent.targetAsset || "USDC";
  const targetAsset = portfolio.find((a) => a.symbol === targetSymbol);
  const existingUSDC = targetAsset ? parseFloat(targetAsset.balance) : 0;

  const requiredTarget = Math.max(0, intent.targetAmount - existingUSDC);

  // 2. Fetch mock/fixture route quote parameters for assets to target asset
  const getMockQuote = (symbol: string, inputAmount: number): RouteQuote => {
    const isEth = symbol === "ETH";
    const isOkb = symbol === "OKB";
    const price = isEth ? 2871.73 : isOkb ? 47.17 : 0.028;
    const slippagePercent = isEth ? 0.10 : isOkb ? 0.15 : 1.20;
    const priceImpactPercent = isEth ? 0.05 : isOkb ? 0.08 : 0.95;

    // Calculate net output expected after slippage and price impact
    const netOutputRatio = 1 - (slippagePercent / 100) - (priceImpactPercent / 100);
    const outputAmount = inputAmount * price * netOutputRatio;

    return {
      fromSymbol: symbol,
      toSymbol: targetSymbol,
      inputAmount,
      outputAmount,
      gasCostUsd: isEth ? 1.10 : isOkb ? 1.20 : 1.80,
      slippagePercent,
      priceImpactPercent,
      reliabilityScore: isEth ? 0.99 : isOkb ? 0.99 : 0.88,
      provider: "OKX DEX Aggregator",
      dataSource: "demo",
      spenderAddress: "0x1111111254fb6c44bac0bed2854e76f90643097d",
      chainIndex: 1952,
    };
  };

  const candidates = portfolio.filter((a) => a.symbol !== targetSymbol);

  // Group assets
  const highRiskAssets = candidates.filter((a) => a.risk === "high");
  const mediumRiskAssets = candidates.filter((a) => a.risk === "medium" && !intent.protectedAssets.includes(a.symbol));
  const protectedAssets = candidates.filter((a) => intent.protectedAssets.includes(a.symbol));

  // Two-pass executor function with native gas reserve tracking
  const runRescueSolver = (
    sellSequence: ScannedAsset[],
    protectedSequence: ScannedAsset[],
    targetShortfall: number,
    allowProtected: boolean
  ) => {
    // Pass 1: Estimate actions sequence to calculate expected native gas required
    let estimatedGasUsd = 0;
    let tempRemaining = targetShortfall;
    let estimatedApprovalCount = 0;

    // Simulate non-protected sequence
    for (const asset of sellSequence) {
      if (tempRemaining <= 0.005) break;
      const balance = parseFloat(asset.balance);
      if (balance <= 0) continue;
      const quote = getMockQuote(asset.symbol, balance);
      estimatedGasUsd += quote.gasCostUsd;
      if (asset.symbol !== nativeGasSymbol) {
        estimatedApprovalCount++; // non-native asset requires approval
      }
      tempRemaining -= quote.outputAmount;
    }

    // Simulate protected sequence if allowed
    if (tempRemaining > 0.005 && allowProtected) {
      for (const asset of protectedSequence) {
        if (tempRemaining <= 0.005) break;
        const balance = parseFloat(asset.balance);
        if (balance <= 0) continue;
        const quote = getMockQuote(asset.symbol, balance);
        estimatedGasUsd += quote.gasCostUsd;
        if (asset.symbol !== nativeGasSymbol) {
          estimatedApprovalCount++;
        }
        tempRemaining -= quote.outputAmount;
      }
    }

    // Total estimated execution gas includes approval transactions fee ($0.15 USD each)
    const safetyMultiplier = 1.2;
    const totalEstimatedGasUsd = estimatedGasUsd + (estimatedApprovalCount * 0.15);

    // Convert estimated gas USD requirement to native OKB quantity
    const requiredGasOKB = (totalEstimatedGasUsd / nativeGasPrice) * safetyMultiplier;

    // Retrieve starting native OKB balance in the wallet
    const okbAsset = portfolio.find((a) => a.symbol === nativeGasSymbol);
    const startingOKB = okbAsset ? parseFloat(okbAsset.balance) : 0;

    // Feasibility gate: If starting OKB is less than required gas reserve, mark as non-executable
    if (startingOKB < requiredGasOKB) {
      return {
        feasible: false,
        actions: [],
        gasCostUsd: totalEstimatedGasUsd,
        requiredGasOKB,
        gasReserveStatus: "INSUFFICIENT_GAS_RESERVE" as const,
        remainingShortfall: targetShortfall,
      };
    }

    // Pass 2: Execute actual swaps capping OKB liquidation by subtracting gas reserve
    let remaining = targetShortfall;
    const actions: LiquidateAction[] = [];
    let actualGasUsd = 0;
    let actualApprovalCount = 0;

    // Non-protected swaps execution
    for (const asset of sellSequence) {
      if (remaining <= 0.005) break;

      let balance = parseFloat(asset.balance);
      let assetUsdValue = asset.value;

      if (assetUsdValue <= 0 || balance <= 0) continue;

      // Cap OKB swap balance by subtracting the required gas reserve
      if (asset.symbol === nativeGasSymbol) {
        balance = Math.max(0, balance - requiredGasOKB);
        assetUsdValue = balance * nativeGasPrice;
      }

      if (balance <= 0) continue;

      const quote = getMockQuote(asset.symbol, balance);
      const maxOutput = quote.outputAmount;

      if (maxOutput <= remaining) {
        actions.push({
          symbol: asset.symbol,
          sellAmount: balance,
          usdValue: assetUsdValue,
          quote,
        });
        remaining -= maxOutput;
        actualGasUsd += quote.gasCostUsd;
        if (asset.symbol !== nativeGasSymbol) {
          actualApprovalCount++;
        }
      } else {
        const fraction = remaining / maxOutput;
        const sellAmount = balance * fraction;
        const partialQuote = getMockQuote(asset.symbol, sellAmount);

        actions.push({
          symbol: asset.symbol,
          sellAmount,
          usdValue: assetUsdValue * fraction,
          quote: partialQuote,
        });
        remaining = 0;
        actualGasUsd += partialQuote.gasCostUsd;
        if (asset.symbol !== nativeGasSymbol) {
          actualApprovalCount++;
        }
      }
    }

    // Protected swaps execution (under LAST_RESORT policy)
    if (remaining > 0.005 && allowProtected) {
      for (const asset of protectedSequence) {
        if (remaining <= 0.005) break;

        const balance = parseFloat(asset.balance);
        const assetUsdValue = asset.value;

        if (assetUsdValue <= 0 || balance <= 0) continue;

        const quote = getMockQuote(asset.symbol, balance);
        const maxOutput = quote.outputAmount;

        if (maxOutput <= remaining) {
          actions.push({
            symbol: asset.symbol,
            sellAmount: balance,
            usdValue: assetUsdValue,
            quote,
          });
          remaining -= maxOutput;
          actualGasUsd += quote.gasCostUsd;
          if (asset.symbol !== nativeGasSymbol) {
            actualApprovalCount++;
          }
        } else {
          const fraction = remaining / maxOutput;
          const sellAmount = balance * fraction;
          const partialQuote = getMockQuote(asset.symbol, sellAmount);

          actions.push({
            symbol: asset.symbol,
            sellAmount,
            usdValue: assetUsdValue * fraction,
            quote: partialQuote,
          });
          remaining = 0;
          actualGasUsd += partialQuote.gasCostUsd;
          if (asset.symbol !== nativeGasSymbol) {
            actualApprovalCount++;
          }
        }
      }
    }

    const totalActualGasUsd = actualGasUsd + (actualApprovalCount * 0.15);

    return {
      feasible: true,
      actions,
      gasCostUsd: totalActualGasUsd,
      requiredGasOKB,
      gasReserveStatus: "SUCCESS" as const,
      remainingShortfall: remaining,
    };
  };

  // ----------------------------------------------------
  // PLAN B: SAVE RECOMMENDED (Deterministic preservation)
  // ----------------------------------------------------
  const planBSellSequence = [...highRiskAssets, ...mediumRiskAssets];
  const allowBProtected = intent.protectedAssetPolicy === "LAST_RESORT";
  const runB = runRescueSolver(planBSellSequence, protectedAssets, requiredTarget, allowBProtected);

  if (runB.gasReserveStatus === "INSUFFICIENT_GAS_RESERVE") {
    result.rejected.push({
      name: "Plan B: SAVE Recommended",
      reason: "INSUFFICIENT_GAS_RESERVE",
      description: `Required gas ${runB.requiredGasOKB.toFixed(4)} OKB exceeds wallet balance.`,
    });
  } else {
    const planBTargetMet = runB.remainingShortfall <= 0.005;
    const planBSecured = requiredTarget - runB.remainingShortfall;

    // Calculate preserved percentage of protected assets
    let planBProtectedPreserved = 100;
    const totalProtectedVal = protectedAssets.reduce((sum, a) => sum + a.value, 0);
    const planBSoldProtectedVal = runB.actions
      .filter((act) => intent.protectedAssets.includes(act.symbol))
      .reduce((sum, act) => sum + act.usdValue, 0);
    if (totalProtectedVal > 0) {
      planBProtectedPreserved = Math.round((1 - planBSoldProtectedVal / totalProtectedVal) * 100);
    }

    const scoresB = calculatePlanScore(planBTargetMet, planBSecured, requiredTarget, runB.actions, portfolio, intent);

    result.plans.push({
      id: "B",
      name: "Plan B: SAVE Recommended",
      description: "Optimizes capital retrieval while preserving designated protected assets.",
      targetMet: planBTargetMet,
      securedAmount: planBSecured + existingUSDC,
      actions: runB.actions,
      protectedPreservedPercent: planBProtectedPreserved,
      gasCostUsd: runB.gasCostUsd,
      slippagePercent: runB.actions.length > 0 ? 0.95 : 0,
      priceImpactPercent: runB.actions.length > 0 ? 0.72 : 0,
      saveScore: scoresB.saveScore,
      damageScore: scoresB.damageScore,
      damageBreakdown: scoresB.breakdown,
      whyRecommended: "Achieves target liquidity while fully preserving your protected ETH holdings.",
    });
  }

  // ----------------------------------------------------
  // PLAN A: MAX LIQUIDITY (Sell ETH first, ignores protection)
  // ----------------------------------------------------
  const planASellSequence = [...protectedAssets, ...mediumRiskAssets, ...highRiskAssets];
  const runA = runRescueSolver(planASellSequence, [], requiredTarget, false);

  if (runA.gasReserveStatus === "INSUFFICIENT_GAS_RESERVE") {
    result.rejected.push({
      name: "Plan A: Max Liquidity",
      reason: "INSUFFICIENT_GAS_RESERVE",
      description: `Required gas ${runA.requiredGasOKB.toFixed(4)} OKB exceeds wallet balance.`,
    });
  } else {
    const planATargetMet = runA.remainingShortfall <= 0.005;
    const planASecured = requiredTarget - runA.remainingShortfall;

    let planAProtectedPreserved = 100;
    const totalProtectedVal = protectedAssets.reduce((sum, a) => sum + a.value, 0);
    const planASoldProtectedVal = runA.actions
      .filter((act) => intent.protectedAssets.includes(act.symbol))
      .reduce((sum, act) => sum + act.usdValue, 0);
    if (totalProtectedVal > 0) {
      planAProtectedPreserved = Math.round((1 - planASoldProtectedVal / totalProtectedVal) * 100);
    }

    const scoresA = calculatePlanScore(planATargetMet, planASecured, requiredTarget, runA.actions, portfolio, intent);

    const planA: CandidatePlan = {
      id: "A",
      name: "Plan A: Max Liquidity",
      description: "Prioritizes deep liquidity routes to secure funds rapidly.",
      targetMet: planATargetMet,
      securedAmount: planASecured + existingUSDC,
      actions: runA.actions,
      protectedPreservedPercent: planAProtectedPreserved,
      gasCostUsd: runA.gasCostUsd,
      slippagePercent: runA.actions.length > 0 ? 0.12 : 0,
      priceImpactPercent: runA.actions.length > 0 ? 0.05 : 0,
      saveScore: scoresA.saveScore,
      damageScore: scoresA.damageScore,
      damageBreakdown: scoresA.breakdown,
      whyRecommended: "Secures required liquidity with a single transaction but incurs severe protection violations.",
    };

    // STRICT protection check filters/rejects Plan A if it sells protected assets
    const hasStrictA = intent.protectedAssetPolicy === "STRICT" && planAProtectedPreserved < 100;
    if (hasStrictA) {
      result.rejected.push({
        name: "Plan A: Max Liquidity",
        reason: "PROTECTED_ASSET_VIOLATION",
        description: "Violates strict ETH protection constraint by liquidating protected reserves.",
      });
    } else {
      result.plans.push(planA);
    }
  }

  // ----------------------------------------------------
  // PLAN C: MAX PRESERVATION (Sell TKX only, preserve others)
  // ----------------------------------------------------
  const runC = runRescueSolver(highRiskAssets, [], requiredTarget, false);

  if (runC.gasReserveStatus === "INSUFFICIENT_GAS_RESERVE") {
    result.rejected.push({
      name: "Plan C: Max Preservation",
      reason: "INSUFFICIENT_GAS_RESERVE",
      description: `Required gas ${runC.requiredGasOKB.toFixed(4)} OKB exceeds wallet balance.`,
    });
  } else {
    const planCTargetMet = runC.remainingShortfall <= 0.005;
    const planCSecured = requiredTarget - runC.remainingShortfall;

    const scoresC = calculatePlanScore(planCTargetMet, planCSecured, requiredTarget, runC.actions, portfolio, intent);

    result.plans.push({
      id: "C",
      name: "Plan C: Max Preservation",
      description: "Refuses to liquidate key strategic reserves, limiting trades to high-risk assets.",
      targetMet: planCTargetMet,
      securedAmount: planCSecured + existingUSDC,
      actions: runC.actions,
      protectedPreservedPercent: 100,
      gasCostUsd: runC.gasCostUsd,
      slippagePercent: runC.actions.length > 0 ? 1.20 : 0,
      priceImpactPercent: runC.actions.length > 0 ? 0.95 : 0,
      saveScore: scoresC.saveScore,
      damageScore: scoresC.damageScore,
      damageBreakdown: scoresC.breakdown,
      whyRecommended: "Fails to meet the target but completely guarantees no swaps on ETH or OKB.",
    });
  }

  // STRICT protection check filters/rejects Plan B if it sells protected assets
  const planBIndex = result.plans.findIndex((p) => p.id === "B");
  if (planBIndex >= 0) {
    const pB = result.plans[planBIndex];
    const hasStrictB = intent.protectedAssetPolicy === "STRICT" && pB.protectedPreservedPercent < 100;
    if (hasStrictB) {
      result.rejected.push({
        name: "Plan B: SAVE Recommended",
        reason: "PROTECTED_ASSET_VIOLATION",
        description: "Violates strict ETH protection constraint because non-protected funds were insufficient.",
      });
      result.plans.splice(planBIndex, 1);
    }
  }

  // Set recommended winner from available candidates
  const validPlans = result.plans.filter((p) => p.targetMet);
  if (validPlans.length > 0) {
    const bestPlan = validPlans.reduce((prev, current) => (prev.saveScore > current.saveScore ? prev : current));
    result.recommendedPlanId = bestPlan.id;
  } else {
    // Try to recommend Plan C as fallback if it exists, otherwise first valid
    const planCExists = result.plans.some((p) => p.id === "C");
    result.recommendedPlanId = planCExists ? "C" : result.plans[0]?.id || null;
  }

  result.feasible = result.plans.some((p) => p.targetMet);

  return result;
}
