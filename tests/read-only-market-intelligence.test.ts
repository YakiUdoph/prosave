import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { getReadOnlyQuoteReferences, normalizeFallbackReason, toBaseUnits, type QuoteRequest } from "../src/lib/market-intelligence.server";
import { solveRescue, type RouteQuote } from "../src/lib/rescue-solver";
import { parseSaveIntent } from "../src/lib/intent-parser";
import { getAssetIdentity, type ScannedAsset } from "../src/lib/xlayer";

const OKB = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const WOKB = "0xe538905cf8410324e03a5a23c1c177a474d59b2b";
const USDC = "0x74b7f16337b8972027f6196a17a631ac6de26d22";
const now = 1_800_000_000_000;
const request: QuoteRequest = { assetKey: `196:${WOKB}`, chainIndex: 196, fromTokenAddress: WOKB, fromDecimals: 18, toTokenAddress: USDC, amount: 2 };
const quote = (overrides: Partial<RouteQuote> = {}): RouteQuote => ({
  source: "OKX_EXACT", chain: { chainIndex: 196, name: "X Layer Mainnet" },
  fromToken: { symbol: "WOKB", address: WOKB, decimals: 18 }, toToken: { symbol: "USDC", address: USDC, decimals: 6 },
  fromSymbol: "WOKB", toSymbol: "USDC", inputAmount: 2, outputAmount: 123, conservativeExpectedOutput: 123,
  gasCostUsd: 0.42, slippagePercent: 0.2, priceImpactPercent: 0.1, reliabilityScore: 1,
  provider: "OKX DEX Aggregator", dataSource: "live", chainIndex: 196, timestamp: now,
  confidence: "HIGH", availability: "AVAILABLE", routeMetadata: { readOnly: true }, ...overrides,
});
const tokens = async () => ({ success: true, data: [
  { symbol: "WOKB", name: "Wrapped OKB", address: WOKB, decimals: 18, chainIndex: 196, source: "LIVE_OKX" as const },
  { symbol: "USDC", name: "USD Coin", address: USDC, decimals: 6, chainIndex: 196, source: "LIVE_OKX" as const },
] });
const asset = (partial: Partial<ScannedAsset>): ScannedAsset => ({ symbol: "WOKB", name: "Wrapped OKB", chain: "X Layer", balance: "2", value: 123, change24h: 0, liquidity: 90, risk: "high", note: "", isNative: false, isProtected: false, dataSource: "demo", priceSource: "estimated", chainIndex: 196, ...partial });
const portfolio = [
  asset({ mainnetReferenceChainIndex: 196, mainnetReferenceAddress: WOKB, mainnetReferenceDecimals: 18 }),
  asset({ symbol: "OKB", name: "OKB", balance: "2", value: 94, risk: "medium", isNative: true, contractAddress: OKB, mainnetReferenceChainIndex: 196, mainnetReferenceAddress: OKB, mainnetReferenceDecimals: 18 }),
  asset({ symbol: "USDC", name: "USD Coin", balance: "0", value: 0, risk: "protected", isNative: false, isProtected: true, contractAddress: USDC, mainnetReferenceChainIndex: 196, mainnetReferenceAddress: USDC, mainnetReferenceDecimals: 6 }),
];

describe("Phase B three-level market provenance", () => {
  test("exact action amount becomes OKX_EXACT", async () => {
    const result = await getReadOnlyQuoteReferences([request], { getTokens: tokens, getQuote: async () => ({ success: true, data: quote() }), now: () => now });
    expect(result[0].quote?.source).toBe("OKX_EXACT");
    expect(result[0].requestedAmount).toBe(2);
  });

  test("different solver amount becomes an OKX_DERIVED_ESTIMATE", () => {
    const intent = parseSaveIntent("Save $50 USDC");
    const baseReference = { assetKey: `196:${WOKB}`, requestedAmount: 2, quote: quote() };
    const attemptedAmount = solveRescue(portfolio, intent, "DEMO_PORTFOLIO", { references: [baseReference] }).plans[0].actions[0].sellAmount;
    const result = solveRescue(portfolio, intent, "DEMO_PORTFOLIO", { references: [
      { assetKey: `196:${WOKB}`, requestedAmount: attemptedAmount, fallbackReason: "OKX_TIMEOUT" },
      baseReference,
    ] });
    const action = result.plans.flatMap((plan) => plan.actions).find((item) => item.symbol === "WOKB");
    expect(action?.quote?.source).toBe("OKX_DERIVED_ESTIMATE");
    expect(action?.quote?.confidence).toBe("ESTIMATED");
    expect(action!.quote!.conservativeExpectedOutput).toBeLessThan(action!.quote!.outputAmount);
  });

  test("unsupported action uses DEMO_ESTIMATE with DEMO feasibility", () => {
    const demoPortfolio = [asset({ symbol: "TKX", name: "Token X", mainnetReferenceAddress: undefined, mainnetReferenceChainIndex: undefined }), ...portfolio.slice(1)];
    const result = solveRescue(demoPortfolio, parseSaveIntent("Save $50 USDC"), "DEMO_PORTFOLIO");
    const plan = result.plans.find((candidate) => candidate.targetMet)!;
    expect(plan.actions[0].quote?.source).toBe("DEMO_ESTIMATE");
    expect(plan.feasibilityConfidence).toBe("DEMO");
  });

  test("exact quote can produce EXACT feasibility and exact coverage", () => {
    const result = solveRescue(portfolio, parseSaveIntent("Save $123 USDC"), "DEMO_PORTFOLIO", { references: [{ assetKey: `196:${WOKB}`, requestedAmount: 2, quote: quote() }] });
    const plan = result.plans.find((candidate) => candidate.targetMet && candidate.actions[0]?.quote?.source === "OKX_EXACT")!;
    expect(plan.feasibilityConfidence).toBe("EXACT");
    expect(plan.marketDataCoverage).toMatchObject({ exactActions: 1, derivedActions: 0, demoActions: 0 });
  });

  test("derived and exact coverage are separate and derived is never exact", () => {
    const intent = parseSaveIntent("Save $50 USDC");
    const baseReference = { assetKey: `196:${WOKB}`, requestedAmount: 4, quote: quote({ inputAmount: 4, outputAmount: 246, conservativeExpectedOutput: 246 }) };
    const fullFailure = { assetKey: `196:${WOKB}`, requestedAmount: 2, fallbackReason: "OKX_TIMEOUT" };
    const attemptedAmount = solveRescue(portfolio, intent, "DEMO_PORTFOLIO", { references: [fullFailure, baseReference] }).plans[0].actions[0].sellAmount;
    const result = solveRescue(portfolio, intent, "DEMO_PORTFOLIO", { references: [
      { assetKey: `196:${WOKB}`, requestedAmount: attemptedAmount, fallbackReason: "OKX_TIMEOUT" },
      fullFailure,
      baseReference,
    ] });
    const plan = result.plans.find((candidate) => candidate.targetMet)!;
    expect(plan.feasibilityConfidence).toBe("ESTIMATED");
    expect(plan.marketDataCoverage.exactPercent).toBe(0);
    expect(plan.marketDataCoverage.derivedActions).toBeGreaterThan(0);
  });

  test("stable public fallback reasons cover failures and unexpected exceptions", async () => {
    const failed = await getReadOnlyQuoteReferences([request], { getTokens: async () => ({ success: false, error: "TIMEOUT" }), getQuote: async () => ({ success: false }), now: () => now });
    expect(failed[0].fallbackReason).toBe("OKX_TIMEOUT");
    expect(normalizeFallbackReason("arbitrary low-level exception detail")).toBe("OKX_UNAVAILABLE");
  });

  test("unsupported, invalid, stale, zero, identity and chain failures are normalized", async () => {
    const deps = { getTokens: tokens, getQuote: async () => ({ success: true, data: quote() }), now: () => now };
    expect((await getReadOnlyQuoteReferences([{ ...request, chainIndex: 1 }], deps))[0].fallbackReason).toBe("CHAIN_MISMATCH");
    expect((await getReadOnlyQuoteReferences([{ ...request, fromDecimals: -1 }], deps))[0].fallbackReason).toBe("INVALID_AMOUNT");
    expect((await getReadOnlyQuoteReferences([{ ...request, fromTokenAddress: "0x0000000000000000000000000000000000000001" }], deps))[0].fallbackReason).toBe("UNSUPPORTED_PAIR");
    expect((await getReadOnlyQuoteReferences([request], { ...deps, getQuote: async () => ({ success: true, data: quote({ outputAmount: 0 }) }) }))[0].fallbackReason).toBe("MALFORMED_RESPONSE");
    expect((await getReadOnlyQuoteReferences([request], { ...deps, getQuote: async () => ({ success: true, data: quote({ timestamp: now - 60_000 }) }) }))[0].fallbackReason).toBe("STALE_QUOTE");
  });

  test("chain-aware identities keep same-symbol assets distinct", () => {
    const eth = asset({ symbol: "ETH", chain: "Ethereum", chainIndex: 1, mainnetReferenceAddress: undefined, mainnetReferenceChainIndex: undefined });
    const arbEth = asset({ symbol: "ETH", chain: "Arbitrum", chainIndex: 42161, mainnetReferenceAddress: undefined, mainnetReferenceChainIndex: undefined });
    const baseEth = asset({ symbol: "ETH", chain: "Base", chainIndex: 8453, mainnetReferenceAddress: undefined, mainnetReferenceChainIndex: undefined });
    const ethUsdc = asset({ symbol: "USDC", chain: "Ethereum", chainIndex: 1, contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", mainnetReferenceAddress: undefined, mainnetReferenceChainIndex: undefined });
    expect(new Set([eth, arbEth, baseEth].map(getAssetIdentity)).size).toBe(3);
    expect(getAssetIdentity(ethUsdc)).not.toBe(getAssetIdentity(portfolio[2]));
  });

  test("X Layer target accounting does not select Ethereum USDC by symbol", () => {
    const ethereumUsdc = asset({ symbol: "USDC", chain: "Ethereum", chainIndex: 1, balance: "999", value: 999, risk: "medium", contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", mainnetReferenceAddress: undefined, mainnetReferenceChainIndex: undefined });
    const result = solveRescue([ethereumUsdc, ...portfolio], parseSaveIntent("Save $123 USDC"), "DEMO_PORTFOLIO", { references: [{ assetKey: `196:${WOKB}`, requestedAmount: 2, quote: quote() }] });
    expect(result.plans.every((plan) => plan.actions.length > 0)).toBe(true);
    expect(result.plans.some((plan) => plan.actions.some((action) => action.assetId === getAssetIdentity(portfolio[0])))).toBe(true);
  });

  test("UI uses three labels and no contradictory static provider label", () => {
    const plan = readFileSync("src/routes/plan.tsx", "utf8");
    const simulate = readFileSync("src/routes/simulate.tsx", "utf8");
    const result = readFileSync("src/routes/protected.tsx", "utf8");
    for (const source of [plan, simulate]) {
      expect(source).toContain("OKX EXACT QUOTE");
      expect(source).toContain("OKX-DERIVED ESTIMATE");
      expect(source).toContain("DEMO ROUTE ESTIMATE");
    }
    expect(`${simulate}${result}`).not.toContain("OKX-compatible adapter");
  });

  test("market intelligence has quote-only endpoint isolation", () => {
    const source = readFileSync("src/lib/market-intelligence.server.ts", "utf8");
    expect(source).toContain("getLiveQuote");
    expect(source).not.toContain("getOkxApproveTransaction");
    expect(source).not.toContain("getOkxSwapTransaction");
    expect(source).not.toContain("eth_sendTransaction");
  });

  test("base units, solver weights, recommendation, non-broadcast and verification remain guarded", () => {
    expect(toBaseUnits(31.5, 18)).toBe("31500000000000000000");
    const solver = readFileSync("src/lib/rescue-solver.ts", "utf8");
    expect(solver).toContain("protectedViolationPenalty = 90");
    expect(solver).toContain("prev.saveScore > current.saveScore");
    expect(readFileSync("src/routes/protected.tsx", "utf8")).toContain("NOT BROADCAST");
    expect(readFileSync("src/lib/save-context.tsx", "utf8")).toContain("verifyWalletOnXLayer");
  });
});
