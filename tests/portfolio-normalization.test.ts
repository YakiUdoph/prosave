import { describe, expect, test } from "bun:test";
import { scanPortfolio } from "../src/lib/xlayer";

describe("Portfolio Normalization & Filtering Tests", () => {
  test("Scanned mock portfolio normalizes assets and retains dust", async () => {
    // Calling scanPortfolio with null returns the default mock portfolio
    const result = await scanPortfolio(null);
    
    expect(result.assets.length).toBe(15); // Total rich fallback mock assets
    expect(result.totalValue).toBeGreaterThan(0);

    // Verify all assets conform to extended PortfolioAsset / ScannedAsset structure
    for (const asset of result.assets) {
      expect(asset.symbol).toBeDefined();
      expect(asset.chain).toBeDefined();
      expect(asset.balance).toBeDefined();
      expect(asset.value).toBeDefined();
      expect(asset.dataSource).toBeDefined();
      expect(asset.chainIndex).toBeDefined();
      expect(asset.evmChainId).toBeDefined();
    }

    // Verify presence of dust tokens
    const dustTokens = result.assets.filter(a => a.value < 1.00);
    expect(dustTokens.length).toBe(5); // 5 dust tokens listed in rich mock
    expect(dustTokens.some(d => d.symbol === "SHIB")).toBe(true);
    expect(dustTokens.some(d => d.symbol === "PEPE")).toBe(true);
    
    // Verify provenance is set to demo/unverified for mocks
    for (const d of dustTokens) {
      expect(["demo", "unverified"]).toContain(d.dataSource);
    }
  });

  test("Chain detection isolates EVM from non-EVM", async () => {
    const result = await scanPortfolio(null);
    const chains = new Set(result.assets.map(a => a.chainIndex));
    
    // Chains indices present in mock portfolio:
    // 1 (Ethereum), 196 (X Layer), 42161 (Arbitrum), 8453 (Base), 137 (Polygon)
    expect(chains.has(1)).toBe(true);
    expect(chains.has(196)).toBe(true);
    expect(chains.has(42161)).toBe(true);
    expect(chains.has(8453)).toBe(true);
    expect(chains.has(137)).toBe(true);

    // Check EVM Chain IDs are present
    expect(result.assets.every(a => a.evmChainId !== undefined)).toBe(true);
  });
});
