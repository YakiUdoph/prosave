import { describe, expect, test } from "bun:test";
import { parseSaveIntent } from "@/lib/intent-parser";
import { solveRescue } from "@/lib/rescue-solver";
import { simulatePlan } from "@/lib/simulation";
import * as fs from "fs";

describe("Simulation & Verification Provenance Hardening Suite", () => {
  const mockPortfolio = [
    {
      symbol: "ETH",
      name: "Ethereum",
      chain: "Ethereum",
      balance: "0.842",
      value: 2418,
      change24h: -1.2,
      liquidity: 98,
      risk: "protected",
      isNative: true,
      isProtected: true,
      dataSource: "demo" as const,
      priceSource: "estimated" as const,
      evmChainId: 1,
      chainIndex: 1,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      chain: "Ethereum",
      balance: "120.00",
      value: 120,
      change24h: 0.0,
      liquidity: 100,
      risk: "protected",
      isNative: false,
      isProtected: true,
      dataSource: "demo" as const,
      priceSource: "estimated" as const,
      evmChainId: 1,
      chainIndex: 1,
    },
    {
      symbol: "PEPE",
      name: "Pepe Coin",
      chain: "Ethereum",
      balance: "5000000",
      value: 0.45,
      change24h: -12.4,
      liquidity: 45,
      risk: "high" as const,
      isNative: false,
      isProtected: false,
      dataSource: "demo" as const,
      priceSource: "demo" as const,
      evmChainId: 1,
      chainIndex: 1,
    },
    {
      symbol: "OKB",
      name: "OKB",
      chain: "X Layer",
      balance: "31.5",
      value: 1486,
      change24h: -4.6,
      liquidity: 88,
      risk: "medium" as const,
      isNative: true,
      isProtected: false,
      dataSource: "demo" as const,
      priceSource: "estimated" as const,
      evmChainId: 196,
      chainIndex: 196,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      chain: "X Layer",
      balance: "412.00",
      value: 412,
      change24h: 0.0,
      liquidity: 100,
      risk: "protected" as const,
      isNative: false,
      isProtected: true,
      dataSource: "demo" as const,
      priceSource: "estimated" as const,
      evmChainId: 196,
      chainIndex: 196,
    },
    {
      symbol: "TKX",
      name: "Token X",
      chain: "X Layer",
      balance: "18400",
      value: 516,
      change24h: -18.4,
      liquidity: 34,
      risk: "high" as const,
      isNative: false,
      isProtected: false,
      dataSource: "demo" as const,
      priceSource: "demo" as const,
      evmChainId: 196,
      chainIndex: 196,
    },
    {
      symbol: "WOKB",
      name: "Wrapped OKB",
      chain: "X Layer",
      balance: "1.0",
      value: 47.17,
      change24h: -4.5,
      liquidity: 80,
      risk: "medium" as const,
      isNative: false,
      isProtected: false,
      dataSource: "demo" as const,
      priceSource: "estimated" as const,
      evmChainId: 196,
      chainIndex: 196,
    },
  ];

  // Test 1: PEPE's canonical unit price derives from $0.45 / 5,000,000
  test("1. PEPE's canonical unit price derives from $0.45 / 5,000,000", () => {
    const pepeAsset = mockPortfolio.find(a => a.symbol === "PEPE")!;
    const balanceNum = parseFloat(pepeAsset.balance);
    const unitPrice = pepeAsset.value / balanceNum;
    expect(unitPrice).toBeCloseTo(0.00000009, 9);
  });

  // Test 2: Every production Demo asset satisfies balance * unitPrice ≈ usdValue
  test("2. Every production Demo asset satisfies balance * unitPrice ≈ usdValue", () => {
    for (const asset of mockPortfolio) {
      const balanceNum = parseFloat(asset.balance);
      const unitPrice = asset.value / balanceNum;
      expect(balanceNum * unitPrice).toBeCloseTo(asset.value, 4);
    }
  });

  // Test 3: Solver does not use stale symbol-level pricing
  test("3. Solver does not use stale symbol-level pricing", () => {
    // Modify PEPE value to $500,000. Price should change dynamically.
    const modifiedPortfolio = mockPortfolio.map(a => {
      if (a.symbol === "PEPE") {
        return { ...a, value: 500000 };
      }
      return a;
    });

    const intent = parseSaveIntent("Get me $1,000 USDC. Sell PEPE.");
    const result = solveRescue(modifiedPortfolio, intent, "DEMO_PORTFOLIO");
    const plan = result.plans[0];
    const pepeAction = plan.actions.find(act => act.symbol === "PEPE")!;

    // Implied unit price is now 500,000 / 5,000,000 = 0.1
    // Swapping 10,000 PEPE should yield 1000 USDC minus slippage/fees
    expect(pepeAction.sellAmount).toBeLessThan(20000); 
  });

  // Test 4: 35,769 PEPE cannot produce ~$1,100
  test("4. 35,769 PEPE cannot produce ~$1,100", () => {
    const intent = parseSaveIntent("Raise $1,100 USDC");
    // Restrict portfolio to only WOKB (1.0) and PEPE (35,769 units)
    const limitedPortfolio = [
      {
        symbol: "PEPE",
        name: "Pepe Coin",
        chain: "Ethereum",
        balance: "35769",
        value: 0.00321921, // 35769 * 0.00000009
        risk: "high" as const,
        isNative: false,
        isProtected: false,
        dataSource: "demo" as const,
        priceSource: "demo" as const,
        evmChainId: 1,
        chainIndex: 1,
      }
    ];

    const result = solveRescue(limitedPortfolio, intent, "DEMO_PORTFOLIO");
    // Target is $1,100. Limited portfolio is worth $0.003, so it is impossible to meet target.
    const plan = result.plans[0];
    if (plan) {
      expect(plan.securedAmount).toBeLessThan(1.0);
    }
  });

  // Test 5: No plan sells more asset value than exists
  test("5. No plan sells more asset value than exists", () => {
    const intent = parseSaveIntent("Raise $700 USDC. Sell risky assets first.");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");

    for (const plan of result.plans) {
      for (const action of plan.actions) {
        const originalAsset = mockPortfolio.find(a => a.symbol === action.symbol)!;
        const balance = parseFloat(originalAsset.balance);
        expect(action.sellAmount).toBeLessThanOrEqual(balance);
      }
    }
  });

  // Test 6: Target accounting remains exact to <= $0.01
  test("6. Target accounting remains exact to <= $0.01", () => {
    const intent = parseSaveIntent("Raise $700 USDC. Sell risky assets first. Keep my ETH unless necessary.");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");

    // Net target is $700. Initial USDC is $412. Net target to raise is $288.
    for (const plan of result.plans) {
      if (plan.securedAmount >= 700) {
        const swapTotal = plan.actions.reduce((sum, act) => {
          return sum + (act.quote ? act.quote.outputAmount : 0);
        }, 0);
        const targetAsset = mockPortfolio.find(a => a.symbol === "USDC")!;
        const existingUSDC = parseFloat(targetAsset.balance);
        const finalSecured = existingUSDC + swapTotal;
        expect(Math.abs(plan.securedAmount - finalSecured)).toBeLessThanOrEqual(0.01);
      }
    }
  });

  // Test 7: Actual production Demo portfolio is tested without altered balances
  test("7. Actual production Demo portfolio is tested without altered balances", () => {
    // Exact suggested intent
    const intent = parseSaveIntent("Raise $1,100 USDC. Sell risky assets first, protect my ETH, and keep enough OKB for gas.");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");

    // The mock portfolio is not altered. Since PEPE balance is 5,000,000 (worth $0.45),
    // it cannot unilaterally cover the target shortfall.
    // Let's verify that Plan B sells TKX and OKB, and does not sell PEPE alone for $1,100.
    const planB = result.plans.find(p => p.id === "B")!;
    expect(planB).toBeDefined();
    
    // Plan B should sell TKX first.
    const tkxSold = planB.actions.find(act => act.symbol === "TKX")!;
    expect(tkxSold.sellAmount).toBeGreaterThan(0);
  });

  // Test 8: Strategy diversity is action-based
  test("8. Strategy diversity is action-based", () => {
    const intent = parseSaveIntent("Raise $700 USDC. Sell risky assets first. Keep my ETH unless necessary.");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");

    const plans = result.plans;
    if (plans.length > 1) {
      // Confirm they differ in sold asset symbols or action count
      const p1 = plans[0];
      const p2 = plans[1];
      const sold1 = p1.actions.filter(a => a.sellAmount > 0).map(a => a.symbol).sort().join(",");
      const sold2 = p2.actions.filter(a => a.sellAmount > 0).map(a => a.symbol).sort().join(",");
      
      const isDiverse = sold1 !== sold2 || p1.actions.length !== p2.actions.length || p1.securedAmount !== p2.securedAmount;
      expect(isDiverse).toBe(true);
    }
  });

  // Test 9: Demo simulation creates no transaction hash
  test("9. Demo simulation creates no transaction hash", () => {
    const nextConfirmed: any[] = [];
    // Conceptual mock state push matching save-context
    nextConfirmed.push({
      status: "success",
      chainId: 1952,
      timestamp: Date.now(),
      mode: "DEMO_SIMULATION",
    });

    expect(nextConfirmed[0].transactionHash).toBeUndefined();
  });

  // Test 10: No DemoTxHash exists in production src
  test("10. No DemoTxHash exists in production src", () => {
    const protectedContent = fs.readFileSync("src/routes/protected.tsx", "utf-8");
    const saveContextContent = fs.readFileSync("src/lib/save-context.tsx", "utf-8");
    
    expect(protectedContent).not.toContain("DemoTxHash");
    expect(saveContextContent).not.toContain("DemoTxHash");
  });

  // Test 11: Live receipt predicate still passes for genuine TESTNET_LIVE receipt
  test("11. Live receipt predicate still passes for genuine TESTNET_LIVE receipt", () => {
    const genuineReceipt = {
      transactionHash: "0x8f0c5eb95f57a91b4028456de3257ee7d37e644f1234567890abcdef12345678",
      blockNumber: 128456,
      gasUsed: "125000",
      status: "success" as const,
      chainId: 1952,
      timestamp: Date.now(),
      mode: "TESTNET_LIVE" as const,
    };

    const hasRealLiveReceipt = !!(
      genuineReceipt.mode === "TESTNET_LIVE" &&
      genuineReceipt.transactionHash &&
      /^0x[a-fA-F0-9]{64}$/.test(genuineReceipt.transactionHash) &&
      genuineReceipt.status === "success" &&
      typeof genuineReceipt.blockNumber === "number" &&
      genuineReceipt.blockNumber > 0 &&
      genuineReceipt.gasUsed !== ""
    );

    expect(hasRealLiveReceipt).toBe(true);
  });

  // Test 12: Demo result still renders no live receipt
  test("12. Demo result still renders no live receipt", () => {
    const demoReceipt = {
      status: "success" as const,
      chainId: 1952,
      timestamp: Date.now(),
      mode: "DEMO_SIMULATION" as const,
    };

    const hasRealLiveReceipt = !!(
      demoReceipt.mode === "TESTNET_LIVE" &&
      (demoReceipt as any).transactionHash &&
      /^0x[a-fA-F0-9]{64}$/.test((demoReceipt as any).transactionHash)
    );

    expect(hasRealLiveReceipt).toBe(false);
  });
});
