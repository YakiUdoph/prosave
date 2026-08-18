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
  
  // Detailed Plan Metrics
  thesis: string;
  targetConfidence: number;
  eta: string;
  timeHorizon: "IMMEDIATE" | "FAST" | "CONTROLLED" | "PATIENT";
  assetsPreserved: string[];
  protectedAssetImpact: string;
  postRescueStablecoinPercent: number;
  postRescueHighRiskPercent: number;
  concentrationChange: string;
  executionReadiness: "READY_TO_SIGN" | "REQUIRES_BRIDGE" | "ANALYSIS_ONLY";
  tradeOff: string;
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
  explanation?: string; // Optional explanation for simple portfolios with fewer plans
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
export function arePlansDiverse(p1: CandidatePlan, p2: CandidatePlan): boolean {
  let differences = 0;
  
  // 1. Check if the set of sold assets differ
  const sold1 = p1.actions.filter(a => a.sellAmount > 0).map(a => a.symbol).sort().join(",");
  const sold2 = p2.actions.filter(a => a.sellAmount > 0).map(a => a.symbol).sort().join(",");
  if (sold1 !== sold2) {
    differences++;
  }
  
  // 2. Gas cost
  if (Math.abs(p1.gasCostUsd - p2.gasCostUsd) > 0.20) {
    differences++;
  }
  
  // 3. Secured amount
  if (Math.abs(p1.securedAmount - p2.securedAmount) > 1.0) {
    differences++;
  }
  
  // 4. Protected asset preserved %
  if (p1.protectedPreservedPercent !== p2.protectedPreservedPercent) {
    differences++;
  }

  // 5. Time horizon
  if (p1.timeHorizon !== p2.timeHorizon) {
    differences++;
  }

  // 6. Transaction count
  if (p1.actions.length !== p2.actions.length) {
    differences++;
  }
  
  return differences >= 2;
}

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

  const nativeGasSymbol = "OKB";
  const nativeGasPrice = 47.17;
  const targetSymbol = intent.targetAsset || "USDC";
  const targetAsset = portfolio.find((a) => a.symbol === targetSymbol);
  const existingUSDC = targetAsset ? parseFloat(targetAsset.balance) : 0;
  const requiredTarget = Math.max(0, intent.targetAmount - existingUSDC);

  const totalPortfolioVal = portfolio.reduce((sum, a) => sum + a.value, 0);
  const initialHighRiskVal = portfolio.filter((a) => a.risk === "high").reduce((sum, a) => sum + a.value, 0);
  const initialProtectedVal = portfolio.filter((a) => intent.protectedAssets.includes(a.symbol)).reduce((sum, a) => sum + a.value, 0);

  const getMockQuote = (symbol: string, inputAmount: number): RouteQuote => {
    const isEth = symbol === "ETH";
    const isOkb = symbol === "OKB";
    const price = isEth ? 2871.73 : isOkb ? 47.17 : 0.028;
    const slippagePercent = isEth ? 0.10 : isOkb ? 0.15 : 1.20;
    const priceImpactPercent = isEth ? 0.05 : isOkb ? 0.08 : 0.95;

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
  const highRiskAssets = candidates.filter((a) => a.risk === "high");
  const mediumRiskAssets = candidates.filter((a) => a.risk === "medium" && !intent.protectedAssets.includes(a.symbol));
  const protectedAssets = candidates.filter((a) => intent.protectedAssets.includes(a.symbol));

  const runRescueSolver = (
    sellSequence: ScannedAsset[],
    protectedSequence: ScannedAsset[],
    targetShortfall: number,
    allowProtected: boolean
  ) => {
    let estimatedGasUsd = 0;
    let tempRemaining = targetShortfall;
    let estimatedApprovalCount = 0;

    for (const asset of sellSequence) {
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

    const safetyMultiplier = 1.2;
    const totalEstimatedGasUsd = estimatedGasUsd + (estimatedApprovalCount * 0.15);
    const requiredGasOKB = (totalEstimatedGasUsd / nativeGasPrice) * safetyMultiplier;
    const okbAsset = portfolio.find((a) => a.symbol === nativeGasSymbol);
    const startingOKB = okbAsset ? parseFloat(okbAsset.balance) : 0;

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

    let remaining = targetShortfall;
    const actions: LiquidateAction[] = [];
    let actualGasUsd = 0;
    let actualApprovalCount = 0;

    for (const asset of sellSequence) {
      if (remaining <= 0.005) break;

      let balance = parseFloat(asset.balance);
      let assetUsdValue = asset.value;

      if (assetUsdValue <= 0 || balance <= 0) continue;

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

  const compilePlanDetails = (
    id: "A" | "B" | "C",
    name: string,
    description: string,
    targetMet: boolean,
    securedAmount: number,
    actions: LiquidateAction[],
    gasCostUsd: number,
    slippagePercent: number,
    priceImpactPercent: number,
    saveScore: number,
    damageScore: number,
    breakdown: DamageScoreBreakdown,
    whyRecommended: string,
    thesis: string,
    targetConfidence: number,
    eta: string,
    timeHorizon: "IMMEDIATE" | "FAST" | "CONTROLLED" | "PATIENT",
    tradeOff: string
  ): CandidatePlan => {
    const soldSymbols = actions.filter((act) => act.sellAmount > 0).map((act) => act.symbol);
    const assetsPreserved = portfolio
      .filter((a) => !soldSymbols.includes(a.symbol) && a.symbol !== targetSymbol)
      .map((a) => a.symbol);
      
    const soldProtected = actions.filter((act) => intent.protectedAssets.includes(act.symbol) && act.sellAmount > 0);
    
    let protectedPreservedPercent = 100;
    const totalPVal = portfolio.filter((a) => intent.protectedAssets.includes(a.symbol)).reduce((sum, a) => sum + a.value, 0);
    const soldPVal = soldProtected.reduce((sum, a) => sum + a.usdValue, 0);
    if (totalPVal > 0) {
      protectedPreservedPercent = Math.max(0, Math.round((1 - soldPVal / totalPVal) * 100));
    }
    
    let protectedAssetImpact = "No impact — 100% preserved";
    if (soldProtected.length > 0) {
      const pctSold = totalPVal > 0 ? (soldPVal / totalPVal) * 100 : 0;
      protectedAssetImpact = `Breach — ${pctSold.toFixed(0)}% of protected assets liquidated`;
    }

    const postStablecoinVal = existingUSDC + (securedAmount - existingUSDC);
    const postRescueStablecoinPercent = Math.round((postStablecoinVal / (totalPortfolioVal || 1)) * 100);

    const soldHighRiskVal = actions
      .filter((act) => {
        const orig = portfolio.find((p) => p.symbol === act.symbol);
        return orig?.risk === "high" && act.sellAmount > 0;
      })
      .reduce((sum, act) => sum + act.usdValue, 0);
    const remainingHighRiskVal = Math.max(0, initialHighRiskVal - soldHighRiskVal);
    const postRescueHighRiskPercent = Math.round((remainingHighRiskVal / (totalPortfolioVal || 1)) * 100);

    const initialProtectedPct = Math.round((initialProtectedVal / (totalPortfolioVal || 1)) * 100);
    const finalProtectedVal = Math.max(0, initialProtectedVal - soldPVal);
    const finalProtectedPct = Math.round((finalProtectedVal / (totalPortfolioVal || 1)) * 100);
    const concentrationChange = `Protected holdings shift from ${initialProtectedPct}% to ${finalProtectedPct}% of portfolio`;

    const requiresBridge = actions.some((act) => {
      const asset = portfolio.find((p) => p.symbol === act.symbol);
      return asset && asset.chainIndex !== 196 && asset.chain !== "X Layer";
    });
    const executionReadiness = requiresBridge ? "REQUIRES_BRIDGE" : "READY_TO_SIGN";

    return {
      id,
      name,
      description,
      targetMet,
      securedAmount,
      actions,
      protectedPreservedPercent,
      gasCostUsd,
      slippagePercent,
      priceImpactPercent,
      saveScore,
      damageScore,
      damageBreakdown: breakdown,
      whyRecommended,
      thesis,
      targetConfidence,
      eta,
      timeHorizon,
      assetsPreserved,
      protectedAssetImpact,
      postRescueStablecoinPercent,
      postRescueHighRiskPercent,
      concentrationChange,
      executionReadiness,
      tradeOff,
    };
  };

  const candidatePlans: CandidatePlan[] = [];

  // 1. Build Plan B (SAVE Recommended)
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
    const scoresB = calculatePlanScore(planBTargetMet, planBSecured, requiredTarget, runB.actions, portfolio, intent);

    const hasStrictB = intent.protectedAssetPolicy === "STRICT" && 
      runB.actions.some((act) => intent.protectedAssets.includes(act.symbol));

    if (hasStrictB) {
      result.rejected.push({
        name: "Plan B: SAVE Recommended",
        reason: "PROTECTED_ASSET_VIOLATION",
        description: "Violates strict ETH protection constraint because non-protected funds were insufficient.",
      });
    } else {
      candidatePlans.push(
        compilePlanDetails(
          "B",
          "Plan B: SAVE Recommended",
          "Optimizes capital retrieval while preserving designated protected assets.",
          planBTargetMet,
          planBSecured + existingUSDC,
          runB.actions,
          runB.gasCostUsd,
          runB.actions.length > 0 ? 0.95 : 0,
          runB.actions.length > 0 ? 0.72 : 0,
          scoresB.saveScore,
          scoresB.damageScore,
          scoresB.breakdown,
          "Achieves target liquidity while fully preserving your protected ETH holdings.",
          "Preserves protected capital assets while sequentially liquidating high and medium risk holdings.",
          0.95,
          "5–15 min",
          "FAST",
          "Requires multiple transactions, resulting in slightly higher gas fees."
        )
      );
    }
  }

  // 2. Build Plan A (Max Liquidity)
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
    const scoresA = calculatePlanScore(planATargetMet, planASecured, requiredTarget, runA.actions, portfolio, intent);

    const hasStrictA = intent.protectedAssetPolicy === "STRICT" && 
      runA.actions.some((act) => intent.protectedAssets.includes(act.symbol));

    if (hasStrictA) {
      result.rejected.push({
        name: "Plan A: Max Liquidity",
        reason: "PROTECTED_ASSET_VIOLATION",
        description: "Violates strict ETH protection constraint by liquidating protected reserves.",
      });
    } else {
      candidatePlans.push(
        compilePlanDetails(
          "A",
          "Plan A: Max Liquidity",
          "Prioritizes deep liquidity routes to secure funds rapidly.",
          planATargetMet,
          planASecured + existingUSDC,
          runA.actions,
          runA.gasCostUsd,
          runA.actions.length > 0 ? 0.12 : 0,
          runA.actions.length > 0 ? 0.05 : 0,
          scoresA.saveScore,
          scoresA.damageScore,
          scoresA.breakdown,
          "Secures required liquidity with a single transaction but incurs severe protection violations.",
          "Immediately liquidates deepest holdings to satisfy liquidity demands in one transaction.",
          0.99,
          "1–2 min",
          "IMMEDIATE",
          "Sells protected reserves, violating core preservation goals for maximum speed."
        )
      );
    }
  }

  // 3. Build Plan C (Max Preservation)
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

    candidatePlans.push(
      compilePlanDetails(
        "C",
        "Plan C: Max Preservation",
        "Refuses to liquidate key strategic reserves, limiting trades to high-risk assets.",
        planCTargetMet,
        planCSecured + existingUSDC,
        runC.actions,
        runC.gasCostUsd,
        runC.actions.length > 0 ? 1.20 : 0,
        runC.actions.length > 0 ? 0.95 : 0,
        scoresC.saveScore,
        scoresC.damageScore,
        scoresC.breakdown,
        "Fails to meet the target but completely guarantees no swaps on ETH or OKB.",
        "Reduces tail risk exposure by liquidating only volatile high-risk tokens.",
        0.82,
        "30 min–4 hr",
        "CONTROLLED",
        "Fails to secure the complete USDC target due to strict asset preservation constraints."
      )
    );
  }

  // Enforce strategy diversity de-duplication:
  const uniquePlans: CandidatePlan[] = [];
  for (const plan of candidatePlans) {
    let duplicated = false;
    for (const existing of uniquePlans) {
      if (!arePlansDiverse(plan, existing)) {
        duplicated = true;
        break;
      }
    }
    if (!duplicated) {
      uniquePlans.push(plan);
    }
  }

  result.plans = uniquePlans;

  // Simple portfolio fallback labeling:
  if (result.plans.length < 3) {
    result.explanation = `Only ${result.plans.length} distinct rescue strategies are available for this portfolio structure and target constraints. Duplicate strategies were consolidated.`;
  }

  // Set recommended winner from available candidates
  const validPlans = result.plans.filter((p) => p.targetMet);
  if (validPlans.length > 0) {
    const bestPlan = validPlans.reduce((prev, current) => (prev.saveScore > current.saveScore ? prev : current));
    result.recommendedPlanId = bestPlan.id;
  } else {
    const planCExists = result.plans.some((p) => p.id === "C");
    result.recommendedPlanId = planCExists ? "C" : result.plans[0]?.id || null;
  }

  result.feasible = result.plans.some((p) => p.targetMet);

  return result;
}
