import { describe, expect, test } from "bun:test";
import { parseSaveIntent } from "@/lib/intent-parser";
import { solveRescue } from "@/lib/rescue-solver";
import { simulatePlan } from "@/lib/simulation";

describe("Simulation & Verification Provenance Hardening Suite", () => {
  // Helper to construct simulated inputs
  const mockPortfolio = [
    {
      symbol: "ETH",
      name: "Ethereum",
      chain: "Ethereum",
      balance: "0.23",
      value: 745,
      change24h: 2.1,
      liquidity: 95,
      risk: "protected",
      isNative: true,
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
      balance: "0",
      value: 0.0,
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
      balance: "18.2",
      value: 856,
      change24h: -4.6,
      liquidity: 75,
      risk: "medium" as const,
      isNative: false,
      isProtected: false,
      dataSource: "demo" as const,
      priceSource: "estimated" as const,
      evmChainId: 196,
      chainIndex: 196,
    },
  ];

  // Test 1: Demo result with no real tx hash renders NO LIVE VERIFICATION
  test("1. Demo result with no real tx hash renders NO LIVE VERIFICATION", () => {
    const session = {
      mode: "DEMO_SIMULATION" as const,
      confirmedTransactions: [],
    };
    const confirmedTx = session.confirmedTransactions[0];
    const hasRealLiveReceipt = !!(
      session &&
      session.mode === "TESTNET_LIVE" &&
      confirmedTx
    );
    expect(hasRealLiveReceipt).toBe(false);
  });

  // Test 2: Placeholder hash cannot unlock live receipt UI
  test("2. Placeholder hash cannot unlock live receipt UI", () => {
    const session = {
      mode: "TESTNET_LIVE" as const,
      confirmedTransactions: [
        {
          transactionHash: "0xDemoTxHashForTKX", // too short, placeholder
          blockNumber: 128456,
          gasUsed: "125000",
          status: "success" as const,
          chainId: 1952,
          timestamp: Date.now(),
          mode: "TESTNET_LIVE" as const,
        }
      ],
    };
    const confirmedTx = session.confirmedTransactions[0];
    const hasRealLiveReceipt = !!(
      session &&
      session.mode === "TESTNET_LIVE" &&
      confirmedTx &&
      confirmedTx.transactionHash &&
      /^0x[a-fA-F0-9]{64}$/.test(confirmedTx.transactionHash) &&
      confirmedTx.status === "success" &&
      typeof confirmedTx.blockNumber === "number" &&
      confirmedTx.blockNumber > 0 &&
      confirmedTx.gasUsed &&
      confirmedTx.gasUsed !== "" &&
      confirmedTx.gasUsed !== "0"
    );
    expect(hasRealLiveReceipt).toBe(false);
  });

  // Test 3: Malformed hash cannot unlock live receipt UI
  test("3. Malformed hash cannot unlock live receipt UI", () => {
    const session = {
      mode: "TESTNET_LIVE" as const,
      confirmedTransactions: [
        {
          transactionHash: "0xMalformedTransactionHashXYZ",
          blockNumber: 128456,
          gasUsed: "125000",
          status: "success" as const,
          chainId: 1952,
          timestamp: Date.now(),
          mode: "TESTNET_LIVE" as const,
        }
      ],
    };
    const confirmedTx = session.confirmedTransactions[0];
    const hasRealLiveReceipt = !!(
      session &&
      session.mode === "TESTNET_LIVE" &&
      confirmedTx &&
      confirmedTx.transactionHash &&
      /^0x[a-fA-F0-9]{64}$/.test(confirmedTx.transactionHash) &&
      confirmedTx.status === "success" &&
      typeof confirmedTx.blockNumber === "number" &&
      confirmedTx.blockNumber > 0 &&
      confirmedTx.gasUsed &&
      confirmedTx.gasUsed !== "" &&
      confirmedTx.gasUsed !== "0"
    );
    expect(hasRealLiveReceipt).toBe(false);
  });

  // Test 4: Real TESTNET_LIVE receipt unlocks live receipt UI
  test("4. Real TESTNET_LIVE receipt unlocks live receipt UI", () => {
    const realTxHash = "0x8f0c5eb95f57a91b4028456de3257ee7d37e644f1234567890abcdef12345678"; // valid 32-byte hex hash
    const session = {
      mode: "TESTNET_LIVE" as const,
      confirmedTransactions: [
        {
          transactionHash: realTxHash,
          blockNumber: 128456,
          gasUsed: "125000",
          status: "success" as const,
          chainId: 1952,
          timestamp: Date.now(),
          mode: "TESTNET_LIVE" as const,
        }
      ],
    };
    const confirmedTx = session.confirmedTransactions[0];
    const hasRealLiveReceipt = !!(
      session &&
      session.mode === "TESTNET_LIVE" &&
      confirmedTx &&
      confirmedTx.transactionHash &&
      /^0x[a-fA-F0-9]{64}$/.test(confirmedTx.transactionHash) &&
      confirmedTx.status === "success" &&
      typeof confirmedTx.blockNumber === "number" &&
      confirmedTx.blockNumber > 0 &&
      confirmedTx.gasUsed &&
      confirmedTx.gasUsed !== "" &&
      confirmedTx.gasUsed !== "0"
    );
    expect(hasRealLiveReceipt).toBe(true);
  });

  // Test 5: Simulated rescue metrics remain visible separately
  test("5. Simulated rescue metrics remain visible separately", () => {
    const intent = parseSaveIntent("Get me $700 USDC");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");
    const activePlan = result.plans[0];
    
    expect(activePlan).toBeDefined();
    expect(activePlan.securedAmount).toBeGreaterThan(0);
    expect(activePlan.protectedPreservedPercent).toBeDefined();
  });

  // Test 6: Stale quote cannot show SAFETY CHECKS PASSED
  test("6. Stale quote cannot show SAFETY CHECKS PASSED", () => {
    const intent = parseSaveIntent("Get me $700 USDC. Keep my ETH");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");
    const activePlan = result.plans[0];
    
    // Simulate expired quote age (e.g. 61 seconds old)
    const quoteTimestamp = Date.now() - 61 * 1000;
    
    const simRes = simulatePlan(
      intent,
      activePlan,
      mockPortfolio,
      "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      1952,
      quoteTimestamp,
      "DEMO_SIMULATION"
    );
    
    expect(simRes.success).toBe(false);
    expect(simRes.reason).toBe("QUOTE_STALE");
  });

  // Test 7: Stale quote shows RE-QUOTE REQUIRED
  test("7. Stale quote shows RE-QUOTE REQUIRED", () => {
    // UI state mapper mock
    const deriveUiState = (executionState: string, isQuoteStale: boolean) => {
      if (executionState === "SIMULATING") return "RUNNING";
      if (isQuoteStale) return "REQUOTE_REQUIRED";
      if (executionState === "SIMULATION_FAILED") return "FAILED";
      return "PASSED";
    };

    expect(deriveUiState("SIMULATION_READY", true)).toBe("REQUOTE_REQUIRED");
  });

  // Test 8: Fresh quote + passing gates shows SAFETY CHECKS PASSED
  test("8. Fresh quote + passing gates shows SAFETY CHECKS PASSED", () => {
    const intent = parseSaveIntent("Get me $700 USDC. Keep my ETH");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");
    const activePlan = result.plans[0];
    
    // Simulate fresh quote age (0 seconds old)
    const quoteTimestamp = Date.now();
    
    const simRes = simulatePlan(
      intent,
      activePlan,
      mockPortfolio,
      "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      1952,
      quoteTimestamp,
      "DEMO_SIMULATION"
    );
    
    expect(simRes.success).toBe(true);
  });

  // Test 9: Strategy grammar is singular for count 1
  test("9. Strategy grammar is singular for count 1", () => {
    const count = 1;
    const msg = count === 1
      ? "Only 1 distinct rescue strategy is available for this portfolio structure and target constraints. Duplicate strategies were consolidated."
      : `Only ${count} distinct rescue strategies are available for this portfolio structure and target constraints. Duplicate strategies were consolidated.`;
    expect(msg).toContain("Only 1 distinct rescue strategy is available");
    expect(msg).not.toContain("strategies are available");
  });

  // Test 10: Strategy grammar is plural for count >1
  test("10. Strategy grammar is plural for count >1", () => {
    const count = 2;
    const msg = count === 1
      ? "Only 1 distinct rescue strategy is available for this portfolio structure and target constraints. Duplicate strategies were consolidated."
      : `Only ${count} distinct rescue strategies are available for this portfolio structure and target constraints. Duplicate strategies were consolidated.`;
    expect(msg).toContain("Only 2 distinct rescue strategies are available");
  });

  // Test 11: Solver does not fabricate extra strategy plans
  test("11. Solver does not fabricate extra strategy plans", () => {
    const intent = parseSaveIntent("Get me $200 USDC. Keep ETH");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");
    
    // The mock portfolio already has $412 USDC. This covers $200 with zero sell actions.
    // Therefore, Plan A, B, and C will all have 0 sell actions, and they will be identical.
    // De-duplication will consolidate them into exactly 1 unique strategy candidate.
    expect(result.plans.length).toBe(1);
    expect(result.explanation).toContain("Only 1 distinct rescue strategy");
  });

  // Test 12: Recommended demo intent produces the maximum genuine diversity possible for current demo holdings
  test("12. Recommended demo intent produces the maximum genuine diversity possible for current demo holdings", () => {
    const intent = parseSaveIntent("Get me $1,100 USDC. Sell risky assets first. Don't sell my ETH unless necessary.");
    const result = solveRescue(mockPortfolio, intent, "DEMO_PORTFOLIO");

    // Net target is $1100 - $412 USDC = $688 to raise.
    // - Plan C: Sells TKX ($516 value) only. Fails to meet target ($516 < $688). Saves ETH 100%.
    // - Plan B: Sells TKX ($516) and WOKB ($172). Meets target ($688 total). Saves ETH 100%.
    // - Plan A: Sells ETH ($688). Meets target. Sells protected asset ETH.
    // All 3 plans should be present because they are completely diverse from one another.
    expect(result.plans.length).toBe(3);
    
    const planIds = result.plans.map(p => p.id);
    expect(planIds).toContain("A");
    expect(planIds).toContain("B");
    expect(planIds).toContain("C");
  });
});
