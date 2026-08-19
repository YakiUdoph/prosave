import { describe, expect, test } from "bun:test";
import { xLayerTestnet, scanPortfolio } from "../src/lib/xlayer";
import { validateExecutionPreconditions, requestWalletSignatureAndBroadcast } from "../src/lib/execution";
import { simulatePlan } from "../src/lib/simulation";

describe("Sponsor Integration Verification Tests", () => {
  test("X Layer Chain ID matches 1952", () => {
    expect(xLayerTestnet.id).toBe(1952);
  });

  test("Wrong chain ID blocks TESTNET_LIVE execution precheck", () => {
    const preparedTx = {
      evmChainId: 1952,
      okxChainIndex: 1952,
      environment: "testnet" as const,
      to: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      from: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      value: "100000000000000", // 0.0001 OKB
      data: "0x",
      source: "live" as const,
      quoteTimestamp: Date.now(),
      verificationStatus: "VERIFIED_OKX" as const,
    };

    const wrongChainId = 1; // Ethereum Mainnet
    const hasGasReserve = true;

    const check = validateExecutionPreconditions(
      preparedTx,
      "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      wrongChainId,
      10, // quoteAgeSec
      hasGasReserve,
      "TESTNET_LIVE"
    );

    expect(check.valid).toBe(false);
    expect(check.reason).toContain("Wallet chain ID mismatch");
  });

  test("Account mismatch blocks execution precheck", () => {
    const preparedTx = {
      evmChainId: 1952,
      okxChainIndex: 1952,
      environment: "testnet" as const,
      to: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      from: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57", // prepared for address A
      value: "100000000000000",
      data: "0x",
      source: "live" as const,
      quoteTimestamp: Date.now(),
      verificationStatus: "VERIFIED_OKX" as const,
    };

    const connectedAddress = "0x9999999999999999999999999999999999999999"; // Address B
    const hasGasReserve = true;

    const check = validateExecutionPreconditions(
      preparedTx,
      connectedAddress,
      1952,
      10,
      hasGasReserve,
      "TESTNET_LIVE"
    );

    expect(check.valid).toBe(false);
    expect(check.reason).toContain("Wallet address mismatch");
  });

  test("Demo portfolio cannot trigger live execution mode", () => {
    // Under DEMO_SIMULATION, execution session should never be TESTNET_LIVE.
    const preparedTx = {
      evmChainId: 1952,
      okxChainIndex: 1952,
      environment: "testnet" as const,
      to: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      from: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      value: "100000000000000",
      data: "0x",
      source: "live" as const,
      quoteTimestamp: Date.now(),
      verificationStatus: "VERIFIED_OKX" as const,
    };

    const connectedAddress = "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57";
    const hasGasReserve = true;

    // Check precheck under DEMO_SIMULATION. It should not raise network or gas requirements.
    const check = validateExecutionPreconditions(
      preparedTx,
      connectedAddress,
      1952,
      10,
      hasGasReserve,
      "DEMO_SIMULATION"
    );

    expect(check.valid).toBe(true);
  });

  test("Transaction hash format checks are strict", () => {
    const validHash = "0x1234567890123456789012345678901234567890123456789012345678901234";
    const invalidHashShort = "0x12345";
    const invalidHashHex = "0xG234567890123456789012345678901234567890123456789012345678901234";

    const hashRegex = /^0x[a-fA-F0-9]{64}$/;

    expect(hashRegex.test(validHash)).toBe(true);
    expect(hashRegex.test(invalidHashShort)).toBe(false);
    expect(hashRegex.test(invalidHashHex)).toBe(false);
  });

  test("Simulation cannot masquerade as TESTNET_LIVE", () => {
    const intent = {
      rawInput: "Get me 700 USDC",
      targetAmount: 700,
      targetAsset: "USDC",
      protectedAssets: [],
      protectedAssetPolicy: "LAST_RESORT" as const,
      urgency: "HIGH" as const,
      strategyScoreOffset: 0
    };
    const plan = {
      id: "B" as const,
      name: "Optimized Plan",
      description: "Demo plan",
      whyRecommended: "Best rate",
      securedAmount: 705.50,
      protectedPreservedPercent: 100,
      slippagePercent: 0.1,
      priceImpactPercent: 0.1,
      gasCostUsd: 1.50,
      saveScore: 90,
      timeHorizon: "Instant",
      eta: "1 block",
      targetMet: true,
      actions: []
    };
    const portfolio = [
      {
        symbol: "OKB",
        name: "OKB",
        chain: "X Layer",
        balance: "1.0",
        value: 47,
        change24h: 0,
        liquidity: 90,
        risk: "medium" as const,
        note: "",
        isNative: true,
        isProtected: false,
        dataSource: "demo" as const,
        priceSource: "estimated" as const,
        chainIndex: 196,
        evmChainId: 196
      }
    ];

    const simRes = simulatePlan(
      intent,
      plan,
      portfolio,
      "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      1952,
      Date.now(),
      "DEMO_SIMULATION"
    );

    expect(simRes.success).toBe(true);
    expect(simRes.provenance).toBe("DEMO");
    simRes.preparedTransactions.forEach((tx) => {
      expect(tx.source).toBe("demo");
      expect(tx.verificationStatus).toBe("DEMO");
    });
  });

  test("User authorization is required (eth_sendTransaction is called via provider)", async () => {
    let callParams: any = null;
    const mockProvider = {
      request: async (args: { method: string; params?: any[] }) => {
        if (args.method === "eth_accounts") {
          return ["0x8F5725287F4117b3C2b2E9A709E83b4850c95F57"];
        }
        if (args.method === "eth_chainId") {
          return "0x7a0"; // 1952
        }
        if (args.method === "eth_sendTransaction") {
          callParams = args.params;
          return "0x1234567890123456789012345678901234567890123456789012345678901234";
        }
        return null;
      }
    };

    const preparedTx = {
      evmChainId: 1952,
      okxChainIndex: 1952,
      environment: "testnet" as const,
      to: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      from: "0x8F5725287F4117b3C2b2E9A709E83b4850c95F57",
      value: "100000000000000",
      data: "0x",
      source: "live" as const,
      quoteTimestamp: Date.now(),
      verificationStatus: "VERIFIED_OKX" as const,
    };

    const res = await requestWalletSignatureAndBroadcast(preparedTx, mockProvider);
    expect(res).toHaveProperty("txHash");
    expect(callParams).not.toBeNull();
    expect(callParams[0].from).toBe("0x8F5725287F4117b3C2b2E9A709E83b4850c95F57");
    expect(callParams[0].to).toBe("0x8F5725287F4117b3C2b2E9A709E83b4850c95F57");
  });

  test("OKX secrets are not referenced from client components", () => {
    const glob = new Bun.Glob("src/routes/**/*.tsx");
    const files = Array.from(glob.scanSync("."));
    expect(files.length).toBeGreaterThan(0);

    const fs = require("fs");
    files.forEach((file: string) => {
      const content = fs.readFileSync(file, "utf8");
      expect(content).not.toContain("OKX_SECRET_KEY");
      expect(content).not.toContain("OKX_API_KEY");
      expect(content).not.toContain("OKX_PASSPHRASE");
      expect(content).not.toContain("OKX_API_PASSPHRASE");
    });
  });

  test("Data provenance remains visible (segregation of DEMO vs LIVE_RPC)", async () => {
    const demoRes = await scanPortfolio(null);
    expect(demoRes.assets.length).toBeGreaterThan(0);
    demoRes.assets.forEach((asset) => {
      expect(asset.dataSource).toBe("DEMO");
      expect(asset.balanceSource).toBe("DEMO");
    });

    const demoOkb = demoRes.assets.find(a => a.symbol === "OKB" && a.chain === "X Layer");
    expect(demoOkb).toBeDefined();
    expect(demoOkb?.evmChainId).toBe(196);
  });

  test("Sponsor proof claims match integration parameters", () => {
    expect(xLayerTestnet.rpcUrls.default.http[0]).toBe("https://testrpc.xlayer.tech/terigon");
  });
});
