import { describe, expect, test, mock, beforeAll, afterAll } from "bun:test";
import { scanPortfolio } from "../src/lib/xlayer";
import { solveRescue } from "../src/lib/rescue-solver";
import { simulatePlan } from "../src/lib/simulation";

let originalFetch: any;

beforeAll(() => {
  originalFetch = global.fetch;
  global.fetch = async (url: any) => {
    if (typeof url === "string" && (url.includes("xlayer") || url.includes("terigon"))) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: "0x5af3107a4000", // 0.0001 OKB
        }),
      } as any;
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        code: "0",
        msg: "",
        data: []
      }),
    } as any;
  };
});

afterAll(() => {
  global.fetch = originalFetch;
});

// Mock server function call to prevent actual network fetch in tests
mock.module("../src/lib/okx.server", () => {
  return {
    serverGetAllTokenBalances: async () => {
      return { success: true, data: [] };
    }
  };
});

describe("Portfolio Data Honesty and Mode Isolation Tests", () => {
  test("Disconnected wallet scan (address = null) yields demo assets with DEMO provenance", async () => {
    const result = await scanPortfolio(null);
    expect(result.assets.length).toBe(15);
    expect(result.assets.every(a => a.dataSource === "DEMO")).toBe(true);
    expect(result.assets.every(a => a.balanceSource === "DEMO")).toBe(true);
    expect(result.assets.every(a => a.priceSource === "ESTIMATED")).toBe(true);
    expect(result.assets.every(a => a.sourceLabel === "SAVE Demo Portfolio")).toBe(true);
  });

  test("Connected wallet scan (with address) initializes to empty array and adds only discovered assets", async () => {
    // OKX returns [] via mock, RPC might fail or return native balance.
    // If it fails/offline, result assets list must only contain at most the RPC native OKB balance.
    const address = "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57";
    const result = await scanPortfolio(address);

    // Should NOT contain the 14 mock assets (like ETH, PEPE, WOKB)
    const hasETHMock = result.assets.some(a => a.symbol === "ETH" && a.dataSource === "DEMO");
    expect(hasETHMock).toBe(false);

    // Any asset returned must have proper LIVE provenance
    for (const asset of result.assets) {
      expect(["LIVE_RPC", "LIVE_OKX"]).toContain(asset.dataSource);
      expect(["LIVE_RPC", "LIVE_OKX"]).toContain(asset.balanceSource);
      expect(["ESTIMATED", "LIVE_OKX", "UNAVAILABLE"]).toContain(asset.priceSource);
      expect(["X Layer RPC", "OKX OnchainOS API"]).toContain(asset.sourceLabel || "");
    }
  });

  test("solveRescue isolates mock vs live portfolios depending on portfolioMode", () => {
    const mockPortfolio = [
      {
        symbol: "USDC",
        name: "USD Coin",
        chain: "Ethereum",
        balance: "180.00",
        value: 180,
        change24h: 0,
        liquidity: 100,
        risk: "protected" as const,
        note: "",
        isNative: false,
        isProtected: true,
        dataSource: "DEMO" as const,
        priceSource: "ESTIMATED" as const,
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        chain: "Ethereum",
        balance: "1.0",
        value: 2800,
        change24h: 0,
        liquidity: 90,
        risk: "protected" as const,
        note: "",
        isNative: true,
        isProtected: true,
        dataSource: "DEMO" as const,
        priceSource: "ESTIMATED" as const,
      }
    ];

    const intent = {
      targetAmount: 700,
      targetAsset: "USDC",
      protectedAssets: ["ETH"],
      protectedAssetPolicy: "STRICT" as const,
      timeHorizon: "FAST" as const,
    };

    // If portfolioMode is LIVE_WALLET, mock assets should be solved under strict live constraints
    const liveRes = solveRescue(mockPortfolio, intent, "LIVE_WALLET");
    expect(liveRes.portfolioMode).toBe("LIVE_WALLET");

    const demoRes = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");
    expect(demoRes.portfolioMode).toBe("DEMO_PORTFOLIO");
  });

  test("simulatePlan restricts TESTNET_LIVE verification when mode is DEMO_SIMULATION", () => {
    const activePlan = {
      id: "A" as const,
      name: "Immediate Rescue Plan",
      description: "Liquidates assets directly",
      targetMet: true,
      securedAmount: 750,
      actions: [],
      protectedPreservedPercent: 100,
      gasCostUsd: 2.5,
      slippagePercent: 0.1,
      priceImpactPercent: 0.05,
      saveScore: 92,
      damageScore: 8,
      damageBreakdown: {
        protectedAssetViolation: 0,
        executionCostPenalty: 0,
        slippagePenalty: 0,
        priceImpactPenalty: 0,
        riskReductionBenefit: 0,
        reliabilityBenefit: 0,
        txCountPenalty: 0,
      },
      whyRecommended: "",
      thesis: "",
      targetConfidence: 1,
      eta: "instant",
      timeHorizon: "IMMEDIATE" as const,
      assetsPreserved: [],
      protectedAssetImpact: "none",
      postRescueStablecoinPercent: 100,
      postRescueHighRiskPercent: 0,
      concentrationChange: "none",
      executionReadiness: "READY_TO_SIGN" as const,
      tradeOff: "none",
    };

    const intent = {
      targetAmount: 700,
      targetAsset: "USDC",
      protectedAssets: [],
      protectedAssetPolicy: "STRICT" as const,
      timeHorizon: "FAST" as const,
    };

    const mockPortfolio: any[] = [];

    // Under DEMO_SIMULATION, provenance of simulated output must be DEMO
    const simRes = simulatePlan(
      intent,
      activePlan,
      mockPortfolio,
      "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      1952,
      Date.now(),
      "DEMO_SIMULATION"
    );

    expect(simRes.provenance).toBe("DEMO");
  });
});
