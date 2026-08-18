import { describe, expect, test } from "bun:test";
import { solveRescue, arePlansDiverse, type CandidatePlan } from "../src/lib/rescue-solver";
import type { ScannedAsset } from "../src/lib/xlayer";
import { parseSaveIntent } from "../src/lib/intent-parser";

describe("Rescue Strategy Solver & Diversity Engine Tests", () => {
  const mockPortfolio: ScannedAsset[] = [
    {
      symbol: "ETH",
      name: "Ethereum",
      chain: "Ethereum",
      balance: "1.5",
      value: 4300,
      change24h: -1.5,
      liquidity: 99,
      risk: "protected",
      note: "Core holding",
      isNative: true,
      isProtected: true,
      dataSource: "demo",
      priceSource: "estimated",
    },
    {
      symbol: "OKB",
      name: "OKB",
      chain: "X Layer",
      balance: "50",
      value: 2358,
      change24h: -3.2,
      liquidity: 90,
      risk: "medium",
      note: "Utility asset",
      isNative: true,
      isProtected: false,
      dataSource: "demo",
      priceSource: "estimated",
    },
    {
      symbol: "TKX",
      name: "Token X",
      chain: "X Layer",
      balance: "10000",
      value: 280,
      change24h: -15.4,
      liquidity: 40,
      risk: "high",
      note: "Volatile meme",
      isNative: false,
      isProtected: false,
      dataSource: "demo",
      priceSource: "demo",
    },
  ];

  test("solveRescue generates materially different plans (arePlansDiverse)", () => {
    const intent = parseSaveIntent("Secures $800 USDC, protect ETH, policy: LAST_RESORT");
    const result = solveRescue(mockPortfolio, intent);
    
    expect(result.feasible).toBe(true);
    expect(result.plans.length).toBeGreaterThan(0);

    // Verify that any two plans in result.plans are diverse
    for (let i = 0; i < result.plans.length; i++) {
      for (let j = i + 1; j < result.plans.length; j++) {
        const p1 = result.plans[i];
        const p2 = result.plans[j];
        const diverse = arePlansDiverse(p1, p2);
        expect(diverse).toBe(true);
      }
    }
  });

  test("Simple portfolio returns fewer than 3 plans (de-duplication)", () => {
    // A simple portfolio with only a single volatile asset and no other options
    const simplePortfolio: ScannedAsset[] = [
      {
        symbol: "TKX",
        name: "Token X",
        chain: "X Layer",
        balance: "100",
        value: 2.8,
        change24h: -15.0,
        liquidity: 40,
        risk: "high",
        note: "Meme token",
        isNative: false,
        isProtected: false,
        dataSource: "demo",
        priceSource: "demo",
      },
    ];

    const intent = parseSaveIntent("Secure $1.00 USDC");
    const result = solveRescue(simplePortfolio, intent);

    // Should return 1 or 2 plans since duplication check will merge identical strategies
    expect(result.plans.length).toBeLessThan(3);
    if (result.plans.length < 3) {
      expect(result.explanation).toBeDefined();
    }
  });

  test("Time horizon modifies strategy thesis and parameters", () => {
    const intent = parseSaveIntent("Secures $800 USDC, protect ETH, policy: LAST_RESORT");
    const result = solveRescue(mockPortfolio, intent);

    const planA = result.plans.find(p => p.id === "A");
    const planB = result.plans.find(p => p.id === "B");
    const planC = result.plans.find(p => p.id === "C");

    if (planA) {
      expect(planA.timeHorizon).toBe("IMMEDIATE");
      expect(planA.eta).toBe("1–2 min");
      expect(planA.targetConfidence).toBe(0.99);
    }
    if (planB) {
      expect(planB.timeHorizon).toBe("FAST");
      expect(planB.eta).toBe("5–15 min");
      expect(planB.targetConfidence).toBe(0.95);
    }
    if (planC) {
      expect(planC.timeHorizon).toBe("CONTROLLED");
      expect(planC.eta).toBe("30 min–4 hr");
      expect(planC.targetConfidence).toBe(0.82);
    }
  });

  test("Dynamic post-rescue metrics recompute correctly", () => {
    const intent = parseSaveIntent("Secures $500 USDC, protect ETH, policy: LAST_RESORT");
    const result = solveRescue(mockPortfolio, intent);
    
    for (const plan of result.plans) {
      // Post stablecoin value should include target / secured output
      expect(plan.postRescueStablecoinPercent).toBeGreaterThanOrEqual(0);
      expect(plan.postRescueStablecoinPercent).toBeLessThanOrEqual(100);
      
      // High-risk exposure should decrease or stay same
      expect(plan.postRescueHighRiskPercent).toBeLessThanOrEqual(
        Math.round((280 / (4300 + 2358 + 280)) * 100)
      );
    }
  });

  test("Recommended Plan ID is not hardcoded to Plan B", () => {
    const intent = parseSaveIntent("Secures $500 USDC, protect ETH, policy: LAST_RESORT");
    const result = solveRescue(mockPortfolio, intent);
    
    // Recommended plan ID should be evaluated from saveScore dynamically
    expect(result.recommendedPlanId).not.toBeNull();
    const recommended = result.plans.find(p => p.id === result.recommendedPlanId);
    if (recommended) {
      // The recommended plan should have the highest SAVE score among those satisfying the target
      const satisfying = result.plans.filter(p => p.targetMet);
      if (satisfying.length > 0) {
        const maxScore = Math.max(...satisfying.map(p => p.saveScore));
        expect(recommended.saveScore).toBe(maxScore);
      }
    }
  });
});
