import { getAssetIdentity, type ScannedAsset, type DataSource } from "./xlayer";
import { type SaveIntent } from "./intent-parser";

export type RouteQuote = {
  source: "OKX_EXACT" | "OKX_DERIVED_ESTIMATE" | "DEMO_ESTIMATE";
  chain: { chainIndex: number; name: string };
  fromToken: { symbol: string; address?: string; decimals?: number };
  toToken: { symbol: string; address?: string; decimals?: number };
  fromSymbol: string;
  toSymbol: string;
  inputAmount: number;
  outputAmount: number; // Net expected output (after slippage and price impact)
  conservativeExpectedOutput: number;
  gasCostUsd: number;
  slippagePercent: number;
  priceImpactPercent: number;
  reliabilityScore: number; // 0 to 1
  provider: string;
  dataSource: DataSource;
  spenderAddress?: string;
  chainIndex?: number;
  timestamp: number;
  confidence: "HIGH" | "ESTIMATED" | "UNAVAILABLE";
  availability: "AVAILABLE" | "FALLBACK" | "UNAVAILABLE";
  fallbackReason?: string;
  routeMetadata?: Record<string, string | number | boolean>;
};

export type LiquidateAction = {
  symbol: string;
  sellAmount: number;
  usdValue: number;
  quote: RouteQuote | null;
  assetChainIndex?: number;
  assetAddress?: string;
  assetId: string;
  assetIsNative: boolean;
};

export type QuoteReference = {
  assetKey: string;
  quote?: RouteQuote;
  fallbackReason?: string;
  requestedAmount: number;
};

export type SolverQuoteOptions = { references?: QuoteReference[] };

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
  feasibilityConfidence: "EXACT" | "ESTIMATED" | "DEMO" | "NOT_MET";
  marketDataCoverage: {
    exactActions: number;
    derivedActions: number;
    demoActions: number;
    totalActions: number;
    exactPercent: number;
    derivedPercent: number;
    demoPercent: number;
  };
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
  portfolioMode?: string;
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
  intent: SaveIntent,
  hasFeasiblePlanWithoutProtectedSale?: boolean
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

      // Additional avoidable protected sale penalty (surcharge for unnecessary liquidation)
      if (hasFeasiblePlanWithoutProtectedSale) {
        protectedViolationPenalty += 25;
      }
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
    const orig = portfolio.find((p) => getAssetIdentity(p) === act.assetId);
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
  intent: SaveIntent,
  portfolioMode?: string,
  quoteOptions: SolverQuoteOptions = {}
): RescueResult {
  const result: RescueResult = {
    feasible: false,
    plans: [],
    rejected: [],
    recommendedPlanId: null,
    portfolioMode,
  };

  if (!intent.targetAmount) {
    return result;
  }

  const nativeGasSymbol = "OKB";
  const okbAssetForGas = portfolio.find((a) => a.symbol === nativeGasSymbol && a.chainIndex === 196)
    || portfolio.find((a) => a.symbol === nativeGasSymbol);
  const okbBalanceForGas = okbAssetForGas ? parseFloat(okbAssetForGas.balance) : 0;
  const nativeGasPrice = (okbAssetForGas && okbBalanceForGas > 0)
    ? (okbAssetForGas.value / okbBalanceForGas)
    : 47.17;

  const targetSymbol = intent.targetAsset || "USDC";
  const targetAsset = portfolio.find((a) => a.symbol === targetSymbol && (a.mainnetReferenceChainIndex === 196 || a.chainIndex === 196))
    ?? portfolio.find((a) => a.symbol === targetSymbol);
  const targetAssetId = targetAsset ? getAssetIdentity(targetAsset) : null;
  const existingUSDC = targetAsset ? parseFloat(targetAsset.balance) : 0;
  const requiredTarget = Math.max(0, intent.targetAmount - existingUSDC);

  const totalPortfolioVal = portfolio.reduce((sum, a) => sum + a.value, 0);
  const initialHighRiskVal = portfolio.filter((a) => a.risk === "high").reduce((sum, a) => sum + a.value, 0);
  const initialProtectedVal = portfolio.filter((a) => intent.protectedAssets.includes(a.symbol)).reduce((sum, a) => sum + a.value, 0);

  const references = quoteOptions.references ?? [];

  const getMockQuote = (asset: ScannedAsset, inputAmount: number): RouteQuote => {
    const balanceNum = parseFloat(asset.balance);
    let price = 0;
    if (balanceNum > 0 && typeof asset.value === "number" && isFinite(asset.value)) {
      price = asset.value / balanceNum;
    } else {
      const isEth = asset.symbol === "ETH";
      const isOkb = asset.symbol === "OKB";
      price = isEth ? 2871.73 : isOkb ? 47.17 : 0.028;
    }
    price = Math.max(0, price);

    const isEth = asset.symbol === "ETH";
    const isOkb = asset.symbol === "OKB";
    const slippagePercent = isEth ? 0.10 : isOkb ? 0.15 : 1.20;
    const priceImpactPercent = isEth ? 0.05 : isOkb ? 0.08 : 0.95;

    const netOutputRatio = 1 - (slippagePercent / 100) - (priceImpactPercent / 100);
    const outputAmount = inputAmount * price * netOutputRatio;

    const key = getAssetIdentity(asset);
    const assetReferences = references.filter((reference) => reference.assetKey === key);
    const exactReference = assetReferences.find((candidate) => Math.abs(candidate.requestedAmount - inputAmount) < 1e-9);
    if (exactReference?.quote && exactReference.quote.availability === "AVAILABLE") return exactReference.quote;
    const reference = exactReference && !exactReference.quote
      ? assetReferences.find((candidate) => candidate.quote?.availability === "AVAILABLE")
      : undefined;
    if (reference?.quote && reference.quote.inputAmount > 0) {
      const scale = inputAmount / reference.quote.inputAmount;
      const outputAmount = reference.quote.outputAmount * scale;
      return {
        ...reference.quote,
        source: "OKX_DERIVED_ESTIMATE",
        inputAmount,
        outputAmount,
        conservativeExpectedOutput: outputAmount * 0.99,
        confidence: "ESTIMATED",
        routeMetadata: {
          ...reference.quote.routeMetadata,
          referenceInputAmount: reference.quote.inputAmount,
          proportionallyScaledForSolver: Math.abs(scale - 1) >= 1e-9,
        },
      };
    }
    const fallbackReason = reference?.fallbackReason || (!asset.mainnetReferenceAddress
      ? "UNSUPPORTED_ASSET_IDENTITY"
      : "OKX_QUOTE_UNAVAILABLE");
    return {
      source: "DEMO_ESTIMATE",
      chain: { chainIndex: asset.chainIndex ?? 0, name: asset.chain },
      fromToken: { symbol: asset.symbol, address: asset.contractAddress ?? asset.tokenAddress, decimals: asset.decimals },
      toToken: { symbol: targetSymbol, address: targetAsset?.contractAddress ?? targetAsset?.tokenAddress, decimals: targetAsset?.decimals },
      fromSymbol: asset.symbol,
      toSymbol: targetSymbol,
      inputAmount,
      outputAmount,
      conservativeExpectedOutput: outputAmount * 0.98,
      gasCostUsd: isEth ? 1.10 : isOkb ? 1.20 : 1.80,
      slippagePercent,
      priceImpactPercent,
      reliabilityScore: isEth ? 0.99 : isOkb ? 0.99 : 0.88,
      provider: "SAVE Demo Route Estimator",
      dataSource: "demo",
      spenderAddress: "0x1111111254fb6c44bac0bed2854e76f90643097d",
      chainIndex: 1952,
      timestamp: Date.now(),
      confidence: "ESTIMATED",
      availability: "FALLBACK",
      fallbackReason,
      routeMetadata: { mode: "SIMULATION_ONLY" },
    };
  };

  const candidates = portfolio.filter((a) => getAssetIdentity(a) !== targetAssetId);
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
      const quote = getMockQuote(asset, balance);
      estimatedGasUsd += quote.gasCostUsd;
      if (asset.symbol !== nativeGasSymbol) {
        estimatedApprovalCount++;
      }
      tempRemaining -= quote.conservativeExpectedOutput;
    }

    if (tempRemaining > 0.005 && allowProtected) {
      for (const asset of protectedSequence) {
        if (tempRemaining <= 0.005) break;
        const balance = parseFloat(asset.balance);
        if (balance <= 0) continue;
        const quote = getMockQuote(asset, balance);
        estimatedGasUsd += quote.gasCostUsd;
        if (asset.symbol !== nativeGasSymbol) {
          estimatedApprovalCount++;
        }
        tempRemaining -= quote.conservativeExpectedOutput;
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

      const quote = getMockQuote(asset, balance);
      const maxOutput = quote.conservativeExpectedOutput;

      if (maxOutput <= remaining) {
        actions.push({
          symbol: asset.symbol,
          sellAmount: balance,
          usdValue: assetUsdValue,
          quote,
          assetChainIndex: asset.chainIndex,
          assetAddress: asset.contractAddress ?? asset.tokenAddress,
          assetId: getAssetIdentity(asset),
          assetIsNative: asset.isNative,
        });
        remaining -= maxOutput;
        actualGasUsd += quote.gasCostUsd;
        if (asset.symbol !== nativeGasSymbol) {
          actualApprovalCount++;
        }
      } else {
        const fraction = remaining / maxOutput;
        const sellAmount = balance * fraction;
        const partialQuote = getMockQuote(asset, sellAmount);

        actions.push({
          symbol: asset.symbol,
          sellAmount,
          usdValue: assetUsdValue * fraction,
          quote: partialQuote,
          assetChainIndex: asset.chainIndex,
          assetAddress: asset.contractAddress ?? asset.tokenAddress,
          assetId: getAssetIdentity(asset),
          assetIsNative: asset.isNative,
        });
        remaining = Math.max(0, remaining - partialQuote.conservativeExpectedOutput);
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

        const quote = getMockQuote(asset, balance);
        const maxOutput = quote.conservativeExpectedOutput;

        if (maxOutput <= remaining) {
          actions.push({
            symbol: asset.symbol,
            sellAmount: balance,
            usdValue: assetUsdValue,
            quote,
            assetChainIndex: asset.chainIndex,
            assetAddress: asset.contractAddress ?? asset.tokenAddress,
            assetId: getAssetIdentity(asset),
            assetIsNative: asset.isNative,
          });
          remaining -= maxOutput;
          actualGasUsd += quote.gasCostUsd;
          if (asset.symbol !== nativeGasSymbol) {
            actualApprovalCount++;
          }
        } else {
          const fraction = remaining / maxOutput;
          const sellAmount = balance * fraction;
          const partialQuote = getMockQuote(asset, sellAmount);

          actions.push({
            symbol: asset.symbol,
            sellAmount,
            usdValue: assetUsdValue * fraction,
            quote: partialQuote,
            assetChainIndex: asset.chainIndex,
            assetAddress: asset.contractAddress ?? asset.tokenAddress,
            assetId: getAssetIdentity(asset),
            assetIsNative: asset.isNative,
          });
          remaining = Math.max(0, remaining - partialQuote.conservativeExpectedOutput);
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
    const soldAssetIds = new Set(actions.filter((act) => act.sellAmount > 0).map((act) => act.assetId));
    const assetsPreserved = portfolio
      .filter((a) => !soldAssetIds.has(getAssetIdentity(a)) && getAssetIdentity(a) !== targetAssetId)
      .map((a) => `${a.symbol} (${a.chain})`);
      
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
        const orig = portfolio.find((p) => getAssetIdentity(p) === act.assetId);
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
      const asset = portfolio.find((p) => getAssetIdentity(p) === act.assetId);
      return asset && asset.chainIndex !== 196 && asset.chain !== "X Layer";
    });
    const executionReadiness = requiresBridge ? "REQUIRES_BRIDGE" : "READY_TO_SIGN";
    const exactActions = actions.filter((action) => action.quote?.source === "OKX_EXACT").length;
    const derivedActions = actions.filter((action) => action.quote?.source === "OKX_DERIVED_ESTIMATE").length;
    const totalActions = actions.length;
    const demoActions = totalActions - exactActions - derivedActions;
    const feasibilityConfidence: CandidatePlan["feasibilityConfidence"] = !targetMet
      ? "NOT_MET"
      : demoActions > 0
        ? "DEMO"
        : derivedActions > 0
          ? "ESTIMATED"
          : "EXACT";
    const quoteWeight = actions.reduce((sum, action) => sum + action.usdValue, 0);
    const planSlippage = quoteWeight > 0
      ? actions.reduce((sum, action) => sum + (action.quote?.slippagePercent ?? 0) * action.usdValue, 0) / quoteWeight
      : slippagePercent;
    const planPriceImpact = quoteWeight > 0
      ? actions.reduce((sum, action) => sum + (action.quote?.priceImpactPercent ?? 0) * action.usdValue, 0) / quoteWeight
      : priceImpactPercent;

    return {
      id,
      name,
      description,
      targetMet,
      securedAmount,
      actions,
      protectedPreservedPercent,
      gasCostUsd,
      slippagePercent: planSlippage,
      priceImpactPercent: planPriceImpact,
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
      feasibilityConfidence,
      marketDataCoverage: {
        exactActions,
        derivedActions,
        demoActions,
        totalActions,
        exactPercent: totalActions > 0 ? Math.round((exactActions / totalActions) * 100) : 0,
        derivedPercent: totalActions > 0 ? Math.round((derivedActions / totalActions) * 100) : 0,
        demoPercent: totalActions > 0 ? Math.round((demoActions / totalActions) * 100) : 0,
      },
    };
  };

  const candidatePlans: CandidatePlan[] = [];

  // 1. Pre-run solvers to evaluate avoidable protected sale eligibility
  const planBSellSequence = [...highRiskAssets, ...mediumRiskAssets];
  const allowBProtected = intent.protectedAssetPolicy === "LAST_RESORT";
  const runB = runRescueSolver(planBSellSequence, protectedAssets, requiredTarget, allowBProtected);

  const planASellSequence = [...protectedAssets, ...mediumRiskAssets, ...highRiskAssets];
  const runA = runRescueSolver(planASellSequence, [], requiredTarget, false);

  const runC = runRescueSolver(highRiskAssets, [], requiredTarget, false);

  const runBTargetMet = runB.gasReserveStatus !== "INSUFFICIENT_GAS_RESERVE" && (runB.remainingShortfall <= 0.005);
  const runBHasProtectedSale = runB.actions.some((act) => intent.protectedAssets.includes(act.symbol));

  const runATargetMet = runA.gasReserveStatus !== "INSUFFICIENT_GAS_RESERVE" && (runA.remainingShortfall <= 0.005);
  const runAHasProtectedSale = runA.actions.some((act) => intent.protectedAssets.includes(act.symbol));

  const runCTargetMet = runC.gasReserveStatus !== "INSUFFICIENT_GAS_RESERVE" && (runC.remainingShortfall <= 0.005);
  const runCHasProtectedSale = runC.actions.some((act) => intent.protectedAssets.includes(act.symbol));

  const hasFeasiblePlanWithoutProtectedSale = 
    (runBTargetMet && !runBHasProtectedSale) ||
    (runATargetMet && !runAHasProtectedSale) ||
    (runCTargetMet && !runCHasProtectedSale);

  // 2. Build Plan B — Balanced Rescue
  if (runB.gasReserveStatus === "INSUFFICIENT_GAS_RESERVE") {
    result.rejected.push({
      name: "Plan B — Balanced Rescue",
      reason: "INSUFFICIENT_GAS_RESERVE",
      description: `Required gas ${runB.requiredGasOKB.toFixed(4)} OKB exceeds wallet balance.`,
    });
  } else {
    const planBTargetMet = runB.remainingShortfall <= 0.005;
    const planBSecured = runB.actions.reduce((sum, action) => sum + (action.quote?.outputAmount ?? 0), 0);
    const scoresB = calculatePlanScore(planBTargetMet, planBSecured, requiredTarget, runB.actions, portfolio, intent, hasFeasiblePlanWithoutProtectedSale);

    const hasStrictB = intent.protectedAssetPolicy === "STRICT" && 
      runB.actions.some((act) => intent.protectedAssets.includes(act.symbol));

    if (hasStrictB) {
      result.rejected.push({
        name: "Plan B — Balanced Rescue",
        reason: "PROTECTED_ASSET_VIOLATION",
        description: "Violates strict ETH protection constraint because non-protected funds were insufficient.",
      });
    } else {
      candidatePlans.push(
        compilePlanDetails(
          "B",
          "Plan B — Balanced Rescue",
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

  // 3. Build Plan A — Liquidity First
  if (runA.gasReserveStatus === "INSUFFICIENT_GAS_RESERVE") {
    result.rejected.push({
      name: "Plan A — Liquidity First",
      reason: "INSUFFICIENT_GAS_RESERVE",
      description: `Required gas ${runA.requiredGasOKB.toFixed(4)} OKB exceeds wallet balance.`,
    });
  } else {
    const planATargetMet = runA.remainingShortfall <= 0.005;
    const planASecured = runA.actions.reduce((sum, action) => sum + (action.quote?.outputAmount ?? 0), 0);
    const scoresA = calculatePlanScore(planATargetMet, planASecured, requiredTarget, runA.actions, portfolio, intent, hasFeasiblePlanWithoutProtectedSale);

    const hasStrictA = intent.protectedAssetPolicy === "STRICT" && 
      runA.actions.some((act) => intent.protectedAssets.includes(act.symbol));

    if (hasStrictA) {
      result.rejected.push({
        name: "Plan A — Liquidity First",
        reason: "PROTECTED_ASSET_VIOLATION",
        description: "Violates strict ETH protection constraint by liquidating protected reserves.",
      });
    } else {
      candidatePlans.push(
        compilePlanDetails(
          "A",
          "Plan A — Liquidity First",
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

  // 4. Build Plan C — Preservation First
  if (runC.gasReserveStatus === "INSUFFICIENT_GAS_RESERVE") {
    result.rejected.push({
      name: "Plan C — Preservation First",
      reason: "INSUFFICIENT_GAS_RESERVE",
      description: `Required gas ${runC.requiredGasOKB.toFixed(4)} OKB exceeds wallet balance.`,
    });
  } else {
    const planCTargetMet = runC.remainingShortfall <= 0.005;
    const planCSecured = runC.actions.reduce((sum, action) => sum + (action.quote?.outputAmount ?? 0), 0);
    const scoresC = calculatePlanScore(planCTargetMet, planCSecured, requiredTarget, runC.actions, portfolio, intent, hasFeasiblePlanWithoutProtectedSale);

    candidatePlans.push(
      compilePlanDetails(
        "C",
        "Plan C — Preservation First",
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
    if (result.plans.length === 1) {
      result.explanation = `Only 1 distinct rescue strategy is available for this portfolio structure and target constraints. Duplicate strategies were consolidated.`;
    } else {
      result.explanation = `Only ${result.plans.length} distinct rescue strategies are available for this portfolio structure and target constraints. Duplicate strategies were consolidated.`;
    }
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
